<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Core\Contracts\LeaveLookupContract;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Modules\Leave\Entities\Holiday;
use Modules\Leave\Entities\LeaveBalance;
use Modules\Leave\Entities\LeaveRequest;
use Modules\Leave\Entities\LeaveType;
use Modules\Leave\Services\LeaveCalculationService;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LeaveModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;
    protected Employee $employeeA;
    protected Employee $employeeB;
    protected Branch $branchA;
    protected Branch $branchB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->orgA = Organization::create([
            'name' => 'Acme Leave Org A',
            'slug' => 'acme-leave-a',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'leave', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'attendance', 'is_enabled' => true]);

        $this->orgB = Organization::create([
            'name' => 'Beta Leave Org B',
            'slug' => 'beta-leave-b',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'leave', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'employee', 'is_enabled' => true]);

        $this->adminA = User::create([
            'name' => 'Admin Org A',
            'email' => 'admin-a@acme.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgA->id,
            'is_super_admin' => false,
        ]);
        $this->adminA->assignRole('admin');

        $this->adminB = User::create([
            'name' => 'Admin Org B',
            'email' => 'admin-b@beta.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgB->id,
            'is_super_admin' => false,
        ]);
        $this->adminB->assignRole('admin');

        $this->branchA = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'HQ A',
            'code' => 'HQ-A',
            'latitude' => 23.8103,
            'longitude' => 90.4125,
            'geofence_radius' => 200,
        ]);

        $this->branchB = Branch::create([
            'organization_id' => $this->orgB->id,
            'name' => 'HQ B',
            'code' => 'HQ-B',
            'latitude' => 22.3569,
            'longitude' => 91.7832,
            'geofence_radius' => 200,
        ]);

        $deptA = Department::create([
            'organization_id' => $this->orgA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'IT A',
            'code' => 'IT-A',
        ]);

        $desigA = Designation::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Developer',
            'code' => 'DEV',
        ]);

        $userEmpA = User::create([
            'name' => 'John Doe Employee',
            'email' => 'john.emp@acme.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgA->id,
            'is_super_admin' => false,
        ]);
        $userEmpA->assignRole('employee');

        $this->employeeA = Employee::create([
            'organization_id' => $this->orgA->id,
            'branch_id' => $this->branchA->id,
            'department_id' => $deptA->id,
            'designation_id' => $desigA->id,
            'user_id' => $userEmpA->id,
            'employee_code' => 'EMP-A-001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.emp@acme.com',
            'gender' => 'male',
            'joining_date' => '2025-01-01',
            'status' => 'active',
        ]);

        $this->employeeB = Employee::create([
            'organization_id' => $this->orgB->id,
            'branch_id' => $this->branchB->id,
            'employee_code' => 'EMP-B-001',
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'email' => 'jane.emp@beta.com',
            'gender' => 'female',
            'joining_date' => '2025-01-01',
            'status' => 'active',
        ]);
    }

    public function test_can_crud_leave_types_with_policies(): void
    {
        $response = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/leave/types', [
            'name' => 'Casual Leave',
            'code' => 'CL',
            'color' => '#10B981',
            'type' => 'paid',
            'annual_entitlement' => 12,
            'accrual_frequency' => 'monthly',
            'gender_restriction' => 'any',
            'requires_attachment' => false,
            'requires_approval' => true,
            'max_consecutive_days' => 3,
            'allow_half_day' => true,
        ]);

        $response->assertStatus(201);
        $typeId = $response->json('data.id');

        $this->assertDatabaseHas('leave_types', [
            'id' => $typeId,
            'organization_id' => $this->orgA->id,
            'name' => 'Casual Leave',
            'code' => 'CL',
            'max_consecutive_days' => 3,
        ]);

        // Update
        $this->actingAs($this->adminA, 'sanctum')->putJson("/api/v1/leave/types/{$typeId}", [
            'max_consecutive_days' => 5,
        ])->assertStatus(200);

        $this->assertDatabaseHas('leave_types', [
            'id' => $typeId,
            'max_consecutive_days' => 5,
        ]);

        // List
        $listRes = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/leave/types');
        $listRes->assertStatus(200);
        $this->assertCount(1, $listRes->json('data'));

        // Delete
        $this->actingAs($this->adminA, 'sanctum')->deleteJson("/api/v1/leave/types/{$typeId}")->assertStatus(200);
        $this->assertDatabaseMissing('leave_types', ['id' => $typeId]);
    }

    public function test_can_manage_holidays_and_calculate_working_days(): void
    {
        // Add holiday on Wednesday 2026-11-25
        $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/leave/holidays', [
            'name' => 'Thanksgiving Eve',
            'from_date' => '2026-11-25',
            'to_date' => '2026-11-25',
            'branch_id' => $this->branchA->id,
        ])->assertStatus(201);

        // Monday 2026-11-23 to Friday 2026-11-27 is 5 calendar days.
        // Wednesday is holiday -> leaves 4 working days.
        $calcService = app(LeaveCalculationService::class);
        $days = $calcService->calculateWorkingDays(
            $this->orgA->id,
            $this->employeeA->id,
            '2026-11-23',
            '2026-11-27'
        );

        $this->assertEquals(4.0, $days);

        // Spanning a weekend: Monday 2026-11-23 to Monday 2026-11-30
        // Total 8 calendar days (2 weekend days Sat/Sun, 1 holiday Wed) -> 5 working days
        $daysWeekend = $calcService->calculateWorkingDays(
            $this->orgA->id,
            $this->employeeA->id,
            '2026-11-23',
            '2026-11-30'
        );
        $this->assertEquals(5.0, $daysWeekend);

        // Half day returns 0.5
        $halfDay = $calcService->calculateWorkingDays(
            $this->orgA->id,
            $this->employeeA->id,
            '2026-11-23',
            '2026-11-23',
            true
        );
        $this->assertEquals(0.5, $halfDay);
    }

    public function test_can_accrue_leave_balances_via_artisan_command(): void
    {
        // Create 2 leave types (one monthly, one lump-sum)
        $monthlyType = LeaveType::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Annual Leave',
            'code' => 'AL',
            'type' => 'paid',
            'annual_entitlement' => 12.0,
            'accrual_frequency' => 'monthly',
        ]);

        $lumpSumType = LeaveType::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Sick Leave',
            'code' => 'SL',
            'type' => 'paid',
            'annual_entitlement' => 10.0,
            'accrual_frequency' => 'annual_lump_sum',
        ]);

        // Run accrual for month 6 (June)
        Artisan::call('leave:accrue', [
            '--organization' => $this->orgA->id,
            '--year' => 2026,
            '--month' => 6,
        ]);

        // Annual leave (12 / 12 * 6 = 6.0 accrued)
        $this->assertDatabaseHas('leave_balances', [
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'leave_type_id' => $monthlyType->id,
            'year' => 2026,
            'accrued_days' => 6.0,
        ]);

        // Sick leave (lump sum = 10.0 accrued)
        $this->assertDatabaseHas('leave_balances', [
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'leave_type_id' => $lumpSumType->id,
            'year' => 2026,
            'accrued_days' => 10.0,
        ]);
    }

    public function test_can_apply_for_leave_and_validate_balance_and_cancel(): void
    {
        $leaveType = LeaveType::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Annual Leave',
            'code' => 'AL',
            'type' => 'paid',
            'annual_entitlement' => 14.0,
            'accrual_frequency' => 'annual_lump_sum',
        ]);

        LeaveBalance::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'leave_type_id' => $leaveType->id,
            'year' => 2026,
            'allocated_days' => 14.0,
            'accrued_days' => 14.0,
            'used_days' => 0.0,
            'pending_days' => 0.0,
        ]);

        // Apply for 3 working days: Monday 2026-11-23 to Wednesday 2026-11-25
        $res = $this->actingAs($this->employeeA->user, 'sanctum')->postJson('/api/v1/leave/requests', [
            'leave_type_id' => $leaveType->id,
            'from_date' => '2026-11-23',
            'to_date' => '2026-11-25',
            'reason' => 'Family vacation',
        ]);

        $res->assertStatus(201);
        $requestId = $res->json('data.id');
        $this->assertEquals(3.0, $res->json('data.total_days'));

        // Balance pending_days should now be 3.0
        $balance = LeaveBalance::where('employee_id', $this->employeeA->id)->first();
        $this->assertEquals(3.0, $balance->pending_days);
        $this->assertEquals(11.0, $balance->available_days);

        // Cancel the pending request
        $cancelRes = $this->actingAs($this->employeeA->user, 'sanctum')->postJson("/api/v1/leave/requests/{$requestId}/cancel");
        $cancelRes->assertStatus(200);

        // Pending days restored to 0
        $balance->refresh();
        $this->assertEquals(0.0, $balance->pending_days);
        $this->assertEquals(14.0, $balance->available_days);
    }

    public function test_can_approve_leave_request_and_update_attendance_records(): void
    {
        $leaveType = LeaveType::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Sick Leave',
            'code' => 'SL',
            'type' => 'paid',
            'annual_entitlement' => 10.0,
            'accrual_frequency' => 'annual_lump_sum',
        ]);

        LeaveBalance::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'leave_type_id' => $leaveType->id,
            'year' => 2026,
            'allocated_days' => 10.0,
            'accrued_days' => 10.0,
            'used_days' => 0.0,
            'pending_days' => 0.0,
        ]);

        // Submit request: Monday 2026-11-23 to Tuesday 2026-11-24 (2 days)
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/leave/requests', [
            'employee_id' => $this->employeeA->id,
            'leave_type_id' => $leaveType->id,
            'from_date' => '2026-11-23',
            'to_date' => '2026-11-24',
            'reason' => 'Flu recovery',
        ]);
        $res->assertStatus(201);
        $requestId = $res->json('data.id');

        // Admin approves request
        $approveRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/leave/requests/{$requestId}/approve");
        $approveRes->assertStatus(200);

        // Balance updated
        $balance = LeaveBalance::where('employee_id', $this->employeeA->id)->first();
        $this->assertEquals(0.0, $balance->pending_days);
        $this->assertEquals(2.0, $balance->used_days);
        $this->assertEquals(8.0, $balance->available_days);

        // Attendance records created with status 'on_leave'
        $this->assertDatabaseHas('attendance_records', [
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'date' => '2026-11-23',
            'status' => 'on_leave',
        ]);
        $this->assertDatabaseHas('attendance_records', [
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'date' => '2026-11-24',
            'status' => 'on_leave',
        ]);

        // Test LeaveLookupContract integration
        $lookupContract = app(LeaveLookupContract::class);
        $onLeave = $lookupContract->isEmployeeOnLeave($this->orgA->id, $this->employeeA->id, '2026-11-23');
        $this->assertNotNull($onLeave);
        $this->assertEquals('Sick Leave', $onLeave['leave_type_name']);

        $notOnLeave = $lookupContract->isEmployeeOnLeave($this->orgA->id, $this->employeeA->id, '2026-11-25');
        $this->assertNull($notOnLeave);

        // Monthly summary
        $summary = $lookupContract->getMonthlyLeaveSummary($this->orgA->id, $this->employeeA->id, 2026, 11);
        $this->assertEquals(1, $summary['total_approved_leaves']);
        $this->assertEquals(2.0, $summary['total_leave_days']);
    }

    public function test_tenant_isolation_prevents_cross_tenant_access(): void
    {
        $typeA = LeaveType::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Secret Org A Leave',
            'code' => 'SOA',
            'type' => 'paid',
            'annual_entitlement' => 10.0,
            'accrual_frequency' => 'monthly',
        ]);

        $holidayA = Holiday::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Org A Special Day',
            'from_date' => '2026-11-20',
            'to_date' => '2026-11-20',
            'total_days' => 1,
        ]);

        // Tenant B lists leave types
        $resTypes = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/leave/types');
        $resTypes->assertStatus(200);
        $this->assertEmpty($resTypes->json('data'));

        // Tenant B attempts to update Tenant A's leave type
        $resUpdate = $this->actingAs($this->adminB, 'sanctum')->putJson("/api/v1/leave/types/{$typeA->id}", [
            'name' => 'Hacked Type',
        ]);
        $resUpdate->assertStatus(404);

        // Tenant B lists holidays
        $resHolidays = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/leave/holidays');
        $resHolidays->assertStatus(200);
        $this->assertEmpty($resHolidays->json('data'));

        // Tenant B attempts to delete Tenant A's holiday
        $resDel = $this->actingAs($this->adminB, 'sanctum')->deleteJson("/api/v1/leave/holidays/{$holidayA->id}");
        $resDel->assertStatus(404);
    }
}
