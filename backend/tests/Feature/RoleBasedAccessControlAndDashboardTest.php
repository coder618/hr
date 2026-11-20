<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleBasedAccessControlAndDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected Branch $branch;
    protected Department $dept;
    protected Designation $desig;
    protected User $adminUser;
    protected User $hrUser;
    protected User $empUser;
    protected Employee $employee;
    protected string $adminToken;
    protected string $hrToken;
    protected string $empToken;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        $this->org = Organization::create([
            'name' => 'Acme Test Corp',
            'slug' => 'acme-test',
            'is_active' => true,
        ]);

        foreach (['core', 'employee', 'attendance', 'leave', 'payroll', 'shift', 'notice', 'expense', 'project'] as $mod) {
            TenantModule::create([
                'organization_id' => $this->org->id,
                'module_name' => $mod,
                'is_enabled' => true,
            ]);
        }

        $this->branch = Branch::create([
            'organization_id' => $this->org->id,
            'name' => 'Test HQ',
            'code' => 'HQ-01',
            'is_head_office' => true,
        ]);

        $this->dept = Department::create([
            'organization_id' => $this->org->id,
            'branch_id' => $this->branch->id,
            'name' => 'Engineering',
            'code' => 'ENG',
        ]);

        $this->desig = Designation::create([
            'organization_id' => $this->org->id,
            'name' => 'Full Stack Engineer',
        ]);

        // 1. Admin
        $this->adminUser = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Admin User',
            'email' => 'admin@test.local',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminUser->assignRole('admin');
        $this->adminToken = $this->adminUser->createToken('admin-token')->plainTextToken;

        // 2. HR
        $this->hrUser = User::create([
            'organization_id' => $this->org->id,
            'name' => 'HR User',
            'email' => 'hr@test.local',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->hrUser->assignRole('hr');
        $this->hrToken = $this->hrUser->createToken('hr-token')->plainTextToken;

        // 3. Employee
        $this->empUser = User::create([
            'organization_id' => $this->org->id,
            'name' => 'Alex Developer',
            'email' => 'alex@test.local',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->empUser->assignRole('employee');
        $this->empToken = $this->empUser->createToken('emp-token')->plainTextToken;

        $this->employee = Employee::create([
            'organization_id' => $this->org->id,
            'user_id' => $this->empUser->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->dept->id,
            'designation_id' => $this->desig->id,
            'employee_code' => 'EMP-001',
            'first_name' => 'Alex',
            'last_name' => 'Developer',
            'email' => 'alex@test.local',
            'joining_date' => '2024-01-01',
            'employment_type' => 'full_time',
            'status' => 'active',
        ]);
    }

    public function test_employee_dashboard_returns_personalized_view(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.view_type', 'employee')
            ->assertJsonPath('data.employee.employee_code', 'EMP-001')
            ->assertJsonPath('data.employee.name', 'Alex Developer')
            ->assertJsonPath('data.attendance.status', 'not_clocked_in')
            ->assertJsonMissingPath('data.stats.active_staff')
            ->assertJsonMissingPath('data.stats.attendance_rate');
    }

    public function test_admin_dashboard_returns_management_view(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/v1/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.view_type', 'admin')
            ->assertJsonPath('data.stats.active_staff', 1)
            ->assertJsonStructure([
                'data' => [
                    'view_type',
                    'stats' => [
                        'attendance_rate',
                        'present_today_count',
                        'on_leave_today',
                        'pending_approvals',
                        'active_staff',
                        'branches_count',
                    ],
                    'enabled_modules',
                ],
            ]);
    }

    public function test_employee_is_forbidden_from_creating_employee(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->postJson('/api/v1/employees', [
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'email' => 'jane@test.local',
                'employee_code' => 'EMP-002',
                'branch_id' => $this->branch->id,
                'joining_date' => '2024-05-01',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('errors.access', 'unauthorized_role');
    }

    public function test_employee_is_forbidden_from_managing_branches_and_biometric_devices(): void
    {
        // Branch creation
        $resBranch = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->postJson('/api/v1/branches', [
                'name' => 'Illegal Branch',
                'code' => 'ILL-01',
            ]);
        $resBranch->assertStatus(403);

        // Biometric device creation
        $resDevice = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->postJson('/api/v1/attendance/devices', [
                'device_name' => 'Illegal Device',
                'device_identifier' => 'DEV-999',
            ]);
        $resDevice->assertStatus(403);
    }

    public function test_admin_and_hr_can_create_employee(): void
    {
        // HR creates employee
        $resHR = $this->withHeader('Authorization', "Bearer {$this->hrToken}")
            ->postJson('/api/v1/employees', [
                'first_name' => 'Bob',
                'last_name' => 'Engineer',
                'email' => 'bob@test.local',
                'employee_code' => 'EMP-002',
                'branch_id' => $this->branch->id,
                'joining_date' => '2024-06-01',
                'employment_type' => 'full_time',
                'status' => 'active',
            ]);
        $resHR->assertStatus(201)
            ->assertJsonPath('data.employee_code', 'EMP-002');

        // Admin updates employee
        $createdId = $resHR->json('data.id');
        $resAdmin = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->putJson("/api/v1/employees/{$createdId}", [
                'last_name' => 'Updated',
            ]);
        $resAdmin->assertStatus(200)
            ->assertJsonPath('data.last_name', 'Updated');
    }

    public function test_employee_is_forbidden_from_accessing_media_module(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson('/api/v1/media');

        $response->assertStatus(403)
            ->assertJsonPath('errors.access', 'unauthorized_role');

        // Admin can access media module
        $resAdmin = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/v1/media');
        $resAdmin->assertStatus(200);
    }

    public function test_employee_is_forbidden_from_viewing_or_creating_projects(): void
    {
        // Employee cannot view running projects list
        $resList = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson('/api/v1/projects');
        $resList->assertStatus(403)
            ->assertJsonPath('errors.access', 'unauthorized_role');

        // Employee cannot create a project
        $resCreate = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->postJson('/api/v1/projects', [
                'title' => 'Illegal Project',
                'code' => 'PRJ-ILL',
            ]);
        $resCreate->assertStatus(403)
            ->assertJsonPath('errors.access', 'unauthorized_role');

        // Admin can view and create projects
        $resAdmin = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/v1/projects');
        $resAdmin->assertStatus(200);

        // Admin creates project
        $resCreateAdmin = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/api/v1/projects', [
                'title' => 'Portal Project',
                'code' => 'PRJ-PORTAL',
                'description' => 'A test project',
                'status' => 'planning',
                'priority' => 'high',
            ]);
        $resCreateAdmin->assertStatus(201);
        $projectId = $resCreateAdmin->json('data.id');

        // HR can update the project
        $resUpdateHr = $this->withHeader('Authorization', "Bearer {$this->hrToken}")
            ->putJson("/api/v1/projects/{$projectId}", [
                'title' => 'Portal Project Updated by HR',
                'status' => 'in_progress',
            ]);
        $resUpdateHr->assertStatus(200)
            ->assertJsonPath('data.title', 'Portal Project Updated by HR')
            ->assertJsonPath('data.status', 'in_progress');

        // Employee cannot update the project
        $resUpdateEmp = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->putJson("/api/v1/projects/{$projectId}", [
                'title' => 'Hacked Project Title',
            ]);
        $resUpdateEmp->assertStatus(403);

        // Employee cannot delete the project
        $resDeleteEmp = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->deleteJson("/api/v1/projects/{$projectId}");
        $resDeleteEmp->assertStatus(403);

        // Admin can delete the project
        $resDeleteAdmin = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->deleteJson("/api/v1/projects/{$projectId}");
        $resDeleteAdmin->assertStatus(200);
    }

    public function test_employee_is_forbidden_from_viewing_other_employees_list(): void
    {
        // 1. Employee cannot view employee directory list
        $resList = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson('/api/v1/employees');
        $resList->assertStatus(403)
            ->assertJsonPath('errors.access', 'unauthorized_role');

        // 2. Create another employee (e.g. HR manager employee record)
        $otherEmployee = Employee::create([
            'organization_id' => $this->org->id,
            'user_id' => $this->hrUser->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'EMP-HR01',
            'first_name' => 'Sarah',
            'last_name' => 'HR',
            'email' => 'hr@test.local',
            'joining_date' => '2024-01-01',
            'employment_type' => 'full_time',
            'status' => 'active',
        ]);

        // 3. Employee cannot view other employee's profile
        $resOther = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson("/api/v1/employees/{$otherEmployee->id}");
        $resOther->assertStatus(403);

        // 4. Employee CAN view their OWN employee profile
        $resSelf = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson("/api/v1/employees/{$this->employee->id}");
        $resSelf->assertStatus(200)
            ->assertJsonPath('data.id', $this->employee->id);

        // 5. Admin can view employee directory and other employee profiles
        $resAdminList = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/v1/employees');
        $resAdminList->assertStatus(200);
    }

    public function test_only_admin_and_super_admin_can_update_organization_settings_and_holidays(): void
    {
        // 1. Employee cannot update organization settings
        $resEmpSettings = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->putJson('/api/v1/settings', [
                'organization_name' => 'Hacked Org Name',
            ]);
        $resEmpSettings->assertStatus(403);

        // 2. HR cannot update organization settings
        $resHrSettings = $this->withHeader('Authorization', "Bearer {$this->hrToken}")
            ->putJson('/api/v1/settings', [
                'organization_name' => 'HR Org Name',
            ]);
        $resHrSettings->assertStatus(403);

        // 3. Admin CAN update organization settings
        $resAdminSettings = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->putJson('/api/v1/settings', [
                'company_name' => 'Updated Acme Corp',
                'contact_email' => 'contact@acmecorp.com',
                'address' => '123 Business Boulevard, Tech District',
                'website' => 'https://acmecorp.com',
            ]);
        $resAdminSettings->assertStatus(200)
            ->assertJsonPath('data.company_name', 'Updated Acme Corp')
            ->assertJsonPath('data.contact_email', 'contact@acmecorp.com')
            ->assertJsonPath('data.address', '123 Business Boulevard, Tech District');

        // 4. Employee cannot create organization holiday
        $resEmpHoliday = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->postJson('/api/v1/leave/holidays', [
                'name' => 'Unauthorized Holiday',
                'from_date' => '2026-12-25',
                'to_date' => '2026-12-25',
                'total_days' => 1,
            ]);
        $resEmpHoliday->assertStatus(403);

        // 5. Admin CAN create organization holiday
        $resAdminHoliday = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/api/v1/leave/holidays', [
                'name' => 'Christmas Day',
                'from_date' => '2026-12-25',
                'to_date' => '2026-12-25',
                'total_days' => 1,
                'is_recurring_yearly' => true,
            ]);
        $resAdminHoliday->assertStatus(201)
            ->assertJsonPath('data.name', 'Christmas Day');
    }

    public function test_attendance_module_holiday_management_by_tenant_owner(): void
    {
        // 1. All tenant users can view holidays in attendance module
        $resGet = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->getJson('/api/v1/attendance/holidays');
        $resGet->assertStatus(200);

        // 2. Regular employee cannot create holiday in attendance module
        $resEmpCreate = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->postJson('/api/v1/attendance/holidays', [
                'name' => 'Employee Day Off',
                'from_date' => '2026-05-01',
                'to_date' => '2026-05-01',
            ]);
        $resEmpCreate->assertStatus(403);

        // 3. Tenant Admin / Owner CAN create holiday in attendance module
        $resAdminCreate = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson('/api/v1/attendance/holidays', [
                'name' => 'Labor Day',
                'from_date' => '2026-05-01',
                'to_date' => '2026-05-01',
                'is_recurring' => true,
            ]);
        $resAdminCreate->assertStatus(201)
            ->assertJsonPath('data.name', 'Labor Day');

        $holidayId = $resAdminCreate->json('data.id');

        // 4. Regular employee cannot update holiday in attendance module
        $resEmpUpdate = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->putJson("/api/v1/attendance/holidays/{$holidayId}", [
                'name' => 'Altered Labor Day',
            ]);
        $resEmpUpdate->assertStatus(403);

        // 5. Tenant Admin / Owner CAN update holiday
        $resAdminUpdate = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->putJson("/api/v1/attendance/holidays/{$holidayId}", [
                'name' => 'International Workers Day',
            ]);
        $resAdminUpdate->assertStatus(200)
            ->assertJsonPath('data.name', 'International Workers Day');

        // 6. Regular employee cannot delete holiday
        $resEmpDelete = $this->withHeader('Authorization', "Bearer {$this->empToken}")
            ->deleteJson("/api/v1/attendance/holidays/{$holidayId}");
        $resEmpDelete->assertStatus(403);

        // 7. Tenant Admin / Owner CAN delete holiday
        $resAdminDelete = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->deleteJson("/api/v1/attendance/holidays/{$holidayId}");
        $resAdminDelete->assertStatus(200);
    }
}
