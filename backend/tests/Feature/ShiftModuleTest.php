<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Core\Contracts\ShiftResolverContract;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Employee;
use Modules\Shift\Entities\Shift;
use Modules\Shift\Entities\ShiftAssignment;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ShiftModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;
    protected string $tokenA;
    protected string $tokenB;

    protected function setUp(): void
    {
        parent::setUp();

        // Create default roles
        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Setup Tenant A
        $this->orgA = Organization::create([
            'name' => 'Acme Corp',
            'slug' => 'acme-corp',
            'is_active' => true,
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'shift', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);

        $this->adminA = User::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Admin Acme',
            'email' => 'admin@acme.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminA->assignRole('admin');
        $this->tokenA = $this->adminA->createToken('test-token')->plainTextToken;

        // Setup Tenant B
        $this->orgB = Organization::create([
            'name' => 'Beta Global',
            'slug' => 'beta-global',
            'is_active' => true,
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'shift', 'is_enabled' => true]);

        $this->adminB = User::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Admin Beta',
            'email' => 'admin@beta.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminB->assignRole('admin');
        $this->tokenB = $this->adminB->createToken('test-token')->plainTextToken;
    }

    public function test_can_crud_shifts_and_auto_detect_overnight_shifts(): void
    {
        // 1. Regular Day Shift (09:00 to 18:00)
        $resDay = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/shifts', [
                'name' => 'General Day Shift',
                'code' => 'GEN-DAY',
                'type' => 'fixed',
                'start_time' => '09:00',
                'end_time' => '18:00',
                'grace_period_entry_minutes' => 15,
                'grace_period_exit_minutes' => 15,
                'is_default' => true,
            ]);

        $resDay->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'GEN-DAY')
            ->assertJsonPath('data.is_overnight', false)
            ->assertJsonPath('data.is_default', true);

        $shiftId = $resDay->json('data.id');

        // 2. Overnight Night Shift (21:00 to 06:00 next day)
        $resNight = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/shifts', [
                'name' => 'Overnight Graveyard Shift',
                'code' => 'NIGHT-01',
                'type' => 'rotational',
                'start_time' => '21:00',
                'end_time' => '06:00',
                'grace_period_entry_minutes' => 10,
            ]);

        $resNight->assertStatus(201)
            ->assertJsonPath('data.is_overnight', true);

        // List shifts
        $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson('/api/v1/shifts')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        // Update shift
        $updateRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->putJson("/api/v1/shifts/{$shiftId}", [
                'name' => 'Standard General Day Shift',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.name', 'Standard General Day Shift');
    }

    public function test_can_set_default_shift(): void
    {
        $shift1 = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Shift One',
            'code' => 'S1',
            'type' => 'fixed',
            'is_default' => true,
        ]);

        $shift2 = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Shift Two',
            'code' => 'S2',
            'type' => 'fixed',
            'is_default' => false,
        ]);

        $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson("/api/v1/shifts/{$shift2->id}/set-default")
            ->assertStatus(200)
            ->assertJsonPath('data.is_default', true);

        $this->assertFalse($shift1->fresh()->is_default);
        $this->assertTrue($shift2->fresh()->is_default);
    }

    public function test_can_batch_assign_shifts_and_prevent_shift_deletion_if_assigned(): void
    {
        $branch = Branch::create(['organization_id' => $this->orgA->id, 'name' => 'HQ', 'code' => 'HQ']);
        $emp1 = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Dev',
            'last_name' => 'One',
            'email' => 'dev1@acme.com',
            'employee_code' => 'DEV-01',
            'branch_id' => $branch->id,
            'joining_date' => '2026-01-01',
        ]);
        $emp2 = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Dev',
            'last_name' => 'Two',
            'email' => 'dev2@acme.com',
            'employee_code' => 'DEV-02',
            'branch_id' => $branch->id,
            'joining_date' => '2026-01-01',
        ]);

        $shift = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Dev Morning Shift',
            'code' => 'DEV-MORN',
            'type' => 'fixed',
            'start_time' => '08:00',
            'end_time' => '17:00',
        ]);

        // Batch assign emp1 and emp2 for weekdays (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5)
        $batchRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/shift-assignments/batch', [
                'shift_id' => $shift->id,
                'assignable_type' => 'employee',
                'assignable_ids' => [$emp1->id, $emp2->id],
                'days_of_week' => [1, 2, 3, 4, 5],
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
            ]);

        $batchRes->assertStatus(200)
            ->assertJsonPath('data.assigned_count', 10); // 2 employees * 5 days

        // Attempt deleting shift: must fail because 10 assignments exist
        $deleteRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->deleteJson("/api/v1/shifts/{$shift->id}");

        $deleteRes->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_shift_resolver_prioritizes_hierarchy_and_calculates_thresholds(): void
    {
        $branch = Branch::create(['organization_id' => $this->orgA->id, 'name' => 'Dhaka Branch', 'code' => 'DHK']);
        $dept = Department::create(['organization_id' => $this->orgA->id, 'name' => 'Customer Support', 'branch_id' => $branch->id]);

        $emp = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Support',
            'last_name' => 'Hero',
            'email' => 'support@acme.com',
            'employee_code' => 'SUP-001',
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'joining_date' => '2026-01-01',
        ]);

        // Default Shift (09:00 - 18:00)
        $defaultShift = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Standard Shift',
            'code' => 'STD',
            'type' => 'fixed',
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
            'is_default' => true,
        ]);

        // Department Shift (10:00 - 19:00)
        $deptShift = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Support Shift',
            'code' => 'SUP',
            'type' => 'fixed',
            'start_time' => '10:00:00',
            'end_time' => '19:00:00',
        ]);
        ShiftAssignment::create([
            'organization_id' => $this->orgA->id,
            'shift_id' => $deptShift->id,
            'assignable_type' => 'department',
            'assignable_id' => $dept->id,
            'start_date' => '2026-01-01',
        ]);

        /** @var ShiftResolverContract $resolver */
        $resolver = app(ShiftResolverContract::class);

        // Date 2026-05-15: Should resolve department shift (10:00) instead of organization default
        $resolvedDept = $resolver->resolveForEmployee($emp->id, '2026-05-15');
        $this->assertNotNull($resolvedDept);
        $this->assertEquals('SUP', $resolvedDept['shift_code']);
        $this->assertEquals('department', $resolvedDept['assignment_source']);
        $this->assertEquals('2026-05-15T10:00:00+00:00', Carbon::parse($resolvedDept['expected_clock_in'])->toIso8601String());

        // Now add a direct employee override for Friday (2026-05-15 is a Friday, day_of_week=5)
        $overnightShift = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Friday Night Roster',
            'code' => 'FRI-NIGHT',
            'type' => 'rotational',
            'start_time' => '22:00:00',
            'end_time' => '06:00:00',
            'is_overnight' => true,
            'grace_period_entry_minutes' => 20,
        ]);
        ShiftAssignment::create([
            'organization_id' => $this->orgA->id,
            'shift_id' => $overnightShift->id,
            'assignable_type' => 'employee',
            'assignable_id' => $emp->id,
            'day_of_week' => 5, // Friday
            'start_date' => '2026-01-01',
        ]);

        // Re-resolve for 2026-05-15: Direct employee assignment takes top priority
        $resolvedOverride = $resolver->resolveForEmployee($emp->id, '2026-05-15');
        $this->assertNotNull($resolvedOverride);
        $this->assertEquals('FRI-NIGHT', $resolvedOverride['shift_code']);
        $this->assertEquals('employee', $resolvedOverride['assignment_source']);
        $this->assertTrue($resolvedOverride['is_overnight']);

        // Check overnight clock-out rolls over to 2026-05-16 06:00:00
        $clockIn = Carbon::parse($resolvedOverride['expected_clock_in']);
        $clockOut = Carbon::parse($resolvedOverride['expected_clock_out']);
        $lateThreshold = Carbon::parse($resolvedOverride['late_threshold']);

        $this->assertEquals('2026-05-15 22:00:00', $clockIn->format('Y-m-d H:i:s'));
        $this->assertEquals('2026-05-16 06:00:00', $clockOut->format('Y-m-d H:i:s'));
        $this->assertEquals('2026-05-15 22:20:00', $lateThreshold->format('Y-m-d H:i:s'));
    }

    public function test_can_preview_employee_monthly_roster(): void
    {
        $branch = Branch::create(['organization_id' => $this->orgA->id, 'name' => 'HQ', 'code' => 'HQ']);
        $emp = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Roster',
            'last_name' => 'Employee',
            'email' => 'roster@acme.com',
            'employee_code' => 'RST-01',
            'branch_id' => $branch->id,
            'joining_date' => '2026-01-01',
        ]);

        Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Default Shift',
            'code' => 'DEF',
            'type' => 'fixed',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_default' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson("/api/v1/shifts/employee/{$emp->id}/schedule?start_date=2026-06-01&end_date=2026-06-07");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(7, 'data.roster')
            ->assertJsonPath('data.employee.employee_code', 'RST-01')
            ->assertJsonPath('data.roster.0.shift.shift_code', 'DEF');
    }

    public function test_tenant_isolation_prevents_cross_tenant_shift_access(): void
    {
        $shiftA = Shift::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Acme Secret Shift',
            'code' => 'ACME-SEC',
            'type' => 'fixed',
        ]);

        auth()->forgetGuards();

        // Tenant B attempts to read Tenant A's shift
        $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->getJson("/api/v1/shifts/{$shiftA->id}")
            ->assertStatus(404);

        // Tenant B attempts to update Tenant A's shift
        $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->putJson("/api/v1/shifts/{$shiftA->id}", [
                'name' => 'Hacked Shift',
            ])
            ->assertStatus(404);

        // Tenant B lists shifts: 0 shifts returned
        $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->getJson('/api/v1/shifts')
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }
}
