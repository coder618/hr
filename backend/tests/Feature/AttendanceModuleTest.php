<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Attendance\Entities\AttendanceDevice;
use Modules\Attendance\Entities\AttendanceLog;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Core\Contracts\AttendanceLookupContract;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Employee;
use Modules\Shift\Entities\Shift;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AttendanceModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;
    protected User $employeeUserA;
    protected Employee $employeeA;
    protected Branch $branchA;
    protected Shift $shiftA;
    protected string $tokenAdminA;
    protected string $tokenAdminB;
    protected string $tokenEmpA;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Setup Tenant A
        $this->orgA = Organization::create([
            'name' => 'Acme Corp',
            'slug' => 'acme-corp',
            'is_active' => true,
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'attendance', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'shift', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);

        // Branch with Dhaka HQ GPS coordinates (23.8103, 90.4125), 200m radius
        $this->branchA = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Dhaka HQ',
            'code' => 'DHK-HQ',
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'geofence_radius_meters' => 200,
        ]);

        // Default Shift (09:00 - 18:00, 15m grace)
        $this->shiftA = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'General Day Shift',
            'code' => 'GEN-01',
            'type' => 'fixed',
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
            'total_work_minutes' => 480,
            'break_minutes' => 60,
            'grace_period_entry_minutes' => 15,
            'grace_period_exit_minutes' => 15,
            'is_default' => true,
        ]);

        // Admin User
        $this->adminA = User::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Admin Acme',
            'email' => 'admin@acme.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminA->assignRole('admin');
        $this->tokenAdminA = $this->adminA->createToken('admin-token')->plainTextToken;

        // Employee and linked User account
        $this->employeeUserA = User::create([
            'organization_id' => $this->orgA->id,
            'name' => 'John Staff',
            'email' => 'john@acme.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->employeeUserA->assignRole('employee');
        $this->tokenEmpA = $this->employeeUserA->createToken('emp-token')->plainTextToken;

        $this->employeeA = Employee::create([
            'organization_id' => $this->orgA->id,
            'user_id' => $this->employeeUserA->id,
            'branch_id' => $this->branchA->id,
            'first_name' => 'John',
            'last_name' => 'Staff',
            'email' => 'john@acme.com',
            'employee_code' => 'EMP-100',
            'joining_date' => '2026-01-01',
            'status' => 'active',
        ]);

        // Setup Tenant B
        $this->orgB = Organization::create([
            'name' => 'Beta Global',
            'slug' => 'beta-global',
            'is_active' => true,
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'attendance', 'is_enabled' => true]);

        $this->adminB = User::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Admin Beta',
            'email' => 'admin@beta.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminB->assignRole('admin');
        $this->tokenAdminB = $this->adminB->createToken('admin-b-token')->plainTextToken;
    }

    public function test_can_punch_with_geofence_verification(): void
    {
        // 1. Punch inside geofence (~20 meters from branch HQ)
        $insideRes = $this->withHeader('Authorization', "Bearer {$this->tokenEmpA}")
            ->postJson('/api/v1/attendance/punch', [
                'punch_type' => 'in',
                'latitude' => 23.8104,
                'longitude' => 90.4126,
                'source' => 'web',
            ]);

        $insideRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_geofence_verified', true);

        $this->assertDatabaseHas('attendance_logs', [
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'punch_type' => 'in',
            'is_geofence_verified' => true,
        ]);

        // 2. Punch outside geofence (~10 kilometers away)
        $outsideRes = $this->withHeader('Authorization', "Bearer {$this->tokenEmpA}")
            ->postJson('/api/v1/attendance/punch', [
                'punch_type' => 'out',
                'latitude' => 23.9000,
                'longitude' => 90.5000,
                'source' => 'web',
            ]);

        $outsideRes->assertStatus(201)
            ->assertJsonPath('data.is_geofence_verified', false);

        // Fetch today's status
        $todayRes = $this->withHeader('Authorization', "Bearer {$this->tokenEmpA}")
            ->getJson('/api/v1/attendance/today');

        $todayRes->assertStatus(200)
            ->assertJsonCount(2, 'data.punches')
            ->assertJsonPath('data.employee.employee_code', 'EMP-100');
    }

    public function test_biometric_device_push_api_synchronizes_punches(): void
    {
        // Register a ZKTeco device for Tenant A
        $device = AttendanceDevice::create([
            'organization_id' => $this->orgA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Main Gate ZKTeco',
            'serial_number' => 'ZK-SN-998877',
            'device_api_key' => 'secret_zk_device_key_123',
            'is_active' => true,
        ]);

        // Push punches without any user cookies (hardware push format)
        $pushRes = $this->postJson('/api/v1/devices/attendance/push', [
            'device_api_key' => 'secret_zk_device_key_123',
            'punches' => [
                [
                    'employee_code' => 'EMP-100',
                    'punch_time' => '2026-05-10 08:55:00',
                    'punch_type' => 'in',
                ],
                [
                    'employee_code' => 'EMP-100',
                    'punch_time' => '2026-05-10 18:05:00',
                    'punch_type' => 'out',
                ],
            ],
        ]);

        $pushRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.processed_punches', 2);

        $this->assertEquals(2, AttendanceLog::where('device_id', $device->id)->count());

        // Check device heartbeat timestamp was updated
        $this->assertNotNull($device->fresh()->last_heartbeat_at);

        // Verify that attendance record was automatically computed for that date
        $record = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->whereDate('date', '2026-05-10')
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('present', $record->status);
        $this->assertFalse($record->is_late);
    }

    public function test_daily_automated_attendance_processing_command(): void
    {
        // Setup punch logs for date 2026-05-12: late clock-in at 09:30 (grace is 09:15)
        AttendanceLog::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'punch_time' => '2026-05-12 09:30:00',
            'punch_type' => 'in',
            'source' => 'web',
        ]);
        AttendanceLog::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'punch_time' => '2026-05-12 18:30:00',
            'punch_type' => 'out',
            'source' => 'web',
        ]);

        // Run scheduled console command
        $this->artisan('attendance:process-daily', [
            '--date' => '2026-05-12',
            '--organization_id' => $this->orgA->id,
        ])->assertSuccessful();

        $record = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->whereDate('date', '2026-05-12')
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('late', $record->status);
        $this->assertTrue($record->is_late);
        $this->assertEquals(30, $record->late_minutes); // 09:30 - 09:00 = 30m
    }

    public function test_can_request_and_approve_attendance_regularization(): void
    {
        // Create an absent record
        $record = AttendanceRecord::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'date' => '2026-05-14',
            'status' => 'absent',
            'work_minutes' => 0,
        ]);

        // Employee requests regularization
        $regRes = $this->withHeader('Authorization', "Bearer {$this->tokenEmpA}")
            ->postJson('/api/v1/attendance/regularize', [
                'record_id' => $record->id,
                'clock_in' => '09:00',
                'clock_out' => '18:00',
                'reason' => 'Client meeting on site; could not punch from office.',
            ]);

        $regRes->assertStatus(200)
            ->assertJsonPath('data.regularization_status', 'pending');

        // Admin approves regularization
        $approveRes = $this->withHeader('Authorization', "Bearer {$this->tokenAdminA}")
            ->postJson("/api/v1/attendance/records/{$record->id}/approve-regularization", [
                'clock_in' => '09:00',
                'clock_out' => '18:00',
            ]);

        $approveRes->assertStatus(200)
            ->assertJsonPath('data.regularization_status', 'approved')
            ->assertJsonPath('data.status', 'present');

        $this->assertEquals(540, $record->fresh()->work_minutes); // 9 hours
    }

    public function test_attendance_lookup_contract_computes_monthly_summary(): void
    {
        AttendanceRecord::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'date' => '2026-06-01',
            'status' => 'present',
            'work_minutes' => 480,
        ]);
        AttendanceRecord::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'date' => '2026-06-02',
            'status' => 'late',
            'work_minutes' => 450,
            'late_minutes' => 25,
        ]);

        /** @var AttendanceLookupContract $service */
        $service = app(AttendanceLookupContract::class);
        $summary = $service->getEmployeeMonthlySummary($this->employeeA->id, '2026-06');

        $this->assertEquals(2, $summary['total_days']);
        $this->assertEquals(1, $summary['present_days']);
        $this->assertEquals(1, $summary['late_days']);
        $this->assertEquals(930, $summary['total_work_minutes']);
        $this->assertEquals(25, $summary['total_late_minutes']);
    }

    public function test_tenant_isolation_prevents_cross_tenant_attendance_access(): void
    {
        $logA = AttendanceLog::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'punch_time' => '2026-05-01 09:00:00',
            'punch_type' => 'in',
            'source' => 'web',
        ]);

        $deviceA = AttendanceDevice::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Acme Gate 1',
            'serial_number' => 'ACME-DEV-1',
            'device_api_key' => 'key_a_123',
        ]);

        auth()->forgetGuards();

        // Tenant B lists devices: should not see Tenant A's device
        $this->withHeader('Authorization', "Bearer {$this->tokenAdminB}")
            ->getJson('/api/v1/attendance/devices')
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        // Tenant B lists records: should not see Tenant A's records
        $this->withHeader('Authorization', "Bearer {$this->tokenAdminB}")
            ->getJson('/api/v1/attendance/records')
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }
}
