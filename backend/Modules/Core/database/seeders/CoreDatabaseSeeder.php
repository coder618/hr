<?php

namespace Modules\Core\Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\SchedulerHeartbeat;
use Modules\Core\Entities\TenantModule;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Spatie\Permission\Models\Role;

class CoreDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Seed Roles
        $roles = ['super_admin', 'admin', 'hr', 'manager', 'employee'];
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $defaultPassword = 'Password123!';

        // 2. Seed Platform Super Admin
        $superAdminEmail = env('SUPER_ADMIN_EMAIL', 'superadmin@platform.local');
        $superAdminPassword = env('SUPER_ADMIN_PASSWORD', $defaultPassword);
        $superAdminName = env('SUPER_ADMIN_NAME', 'Platform Super Administrator');

        $superAdmin = User::updateOrCreate(
            ['email' => $superAdminEmail],
            [
                'name' => $superAdminName,
                'password' => Hash::make($superAdminPassword),
                'is_super_admin' => true,
                'is_active' => true,
                'organization_id' => null,
            ]
        );
        $superAdmin->syncRoles(['super_admin']);

        // 3. Seed Demo Tenant Organization
        $demoOrg = Organization::updateOrCreate(
            ['slug' => 'acme'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Acme Corporation',
                'status' => 'active',
                'settings' => [
                    'company_name' => 'Acme Corporation',
                    'tagline' => 'Enterprise Multi-Tenant Solutions',
                    'timezone' => 'Asia/Dhaka',
                    'currency' => 'BDT',
                    'date_format' => 'd-m-Y',
                    'time_format' => 'H:i',
                    'primary_color' => '#4f46e5',
                    'secondary_color' => '#06b6d4',
                    'working_days' => [1, 2, 3, 4, 5],
                    'address' => '100 Silicon Way, Tech City',
                    'contact_email' => 'contact@acme.local',
                ],
            ]
        );

        // 4. Seed Tenant Enabled Modules
        $modules = [
            'core', 'media', 'employee', 'shift', 'attendance', 'leave',
            'payroll', 'project', 'expense', 'notice',
        ];

        foreach ($modules as $mod) {
            TenantModule::updateOrCreate(
                [
                    'organization_id' => $demoOrg->id,
                    'module_name' => $mod,
                ],
                [
                    'is_enabled' => true,
                ]
            );
        }

        // 5. Seed Demo Organization Structure (Branch, Department, Designation)
        $branch = Branch::firstOrCreate(
            [
                'organization_id' => $demoOrg->id,
                'code' => 'HQ-01',
            ],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Headquarters',
                'code' => 'HQ-01',
                'address' => '100 Silicon Way, Tech City',
                'is_head_office' => true,
                'latitude' => 37.774929,
                'longitude' => -122.419416,
                'geofence_radius_meters' => 200,
            ]
        );

        $department = Department::firstOrCreate(
            [
                'organization_id' => $demoOrg->id,
                'code' => 'ENG',
            ],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Software Engineering',
                'code' => 'ENG',
            ]
        );

        $hrDepartment = Department::firstOrCreate(
            [
                'organization_id' => $demoOrg->id,
                'code' => 'HR',
            ],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Human Resources',
                'code' => 'HR',
            ]
        );

        $desigLead = Designation::firstOrCreate(
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Engineering Lead',
            ],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Engineering Lead',
                'description' => 'Technical leader and architect',
            ]
        );

        $desigEngineer = Designation::firstOrCreate(
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Full Stack Engineer',
            ],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Full Stack Engineer',
                'description' => 'Core application developer',
            ]
        );

        $desigHR = Designation::firstOrCreate(
            [
                'organization_id' => $demoOrg->id,
                'name' => 'HR Manager',
            ],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'HR Manager',
                'description' => 'Human resources and people operations',
            ]
        );

        // 6. Seed Demo Tenant Admin User
        $demoAdmin = User::updateOrCreate(
            ['email' => 'admin@acme.local'],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Acme Admin',
                'password' => Hash::make($defaultPassword),
                'is_super_admin' => false,
                'is_active' => true,
            ]
        );
        $demoAdmin->syncRoles(['admin']);

        // 7. Seed Demo HR User & Employee
        $demoHR = User::updateOrCreate(
            ['email' => 'hr@acme.local'],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Sarah HR Manager',
                'password' => Hash::make($defaultPassword),
                'is_super_admin' => false,
                'is_active' => true,
            ]
        );
        $demoHR->syncRoles(['hr']);

        Employee::firstOrCreate(
            ['email' => 'hr@acme.local'],
            [
                'uuid' => (string) Str::uuid(),
                'organization_id' => $demoOrg->id,
                'user_id' => $demoHR->id,
                'branch_id' => $branch->id,
                'department_id' => $hrDepartment->id,
                'designation_id' => $desigHR->id,
                'employee_code' => 'EMP-HR01',
                'first_name' => 'Sarah',
                'last_name' => 'Jenkins',
                'email' => 'hr@acme.local',
                'joining_date' => '2024-01-15',
                'employment_type' => 'full_time',
                'status' => 'active',
            ]
        );

        // 8. Seed Demo Team Manager User & Employee
        $demoManager = User::updateOrCreate(
            ['email' => 'manager@acme.local'],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'David Manager',
                'password' => Hash::make($defaultPassword),
                'is_super_admin' => false,
                'is_active' => true,
            ]
        );
        $demoManager->syncRoles(['manager']);

        Employee::firstOrCreate(
            ['email' => 'manager@acme.local'],
            [
                'uuid' => (string) Str::uuid(),
                'organization_id' => $demoOrg->id,
                'user_id' => $demoManager->id,
                'branch_id' => $branch->id,
                'department_id' => $department->id,
                'designation_id' => $desigLead->id,
                'employee_code' => 'EMP-MGR01',
                'first_name' => 'David',
                'last_name' => 'Miller',
                'email' => 'manager@acme.local',
                'joining_date' => '2024-02-01',
                'employment_type' => 'full_time',
                'status' => 'active',
            ]
        );

        // 9. Seed Demo Staff Employee User & Employee
        $demoEmployee = User::updateOrCreate(
            ['email' => 'employee@acme.local'],
            [
                'organization_id' => $demoOrg->id,
                'name' => 'Alex Developer',
                'password' => Hash::make($defaultPassword),
                'is_super_admin' => false,
                'is_active' => true,
            ]
        );
        $demoEmployee->syncRoles(['employee']);

        Employee::firstOrCreate(
            ['email' => 'employee@acme.local'],
            [
                'uuid' => (string) Str::uuid(),
                'organization_id' => $demoOrg->id,
                'user_id' => $demoEmployee->id,
                'branch_id' => $branch->id,
                'department_id' => $department->id,
                'designation_id' => $desigEngineer->id,
                'employee_code' => 'EMP-DEV01',
                'first_name' => 'Alex',
                'last_name' => 'Developer',
                'email' => 'employee@acme.local',
                'joining_date' => '2024-03-01',
                'employment_type' => 'full_time',
                'status' => 'active',
            ]
        );

        // 10. Seed Scheduler Heartbeat
        SchedulerHeartbeat::updateOrCreate(
            ['component' => 'scheduler'],
            [
                'last_heartbeat_at' => now(),
                'metadata' => [
                    'seeded' => true,
                    'php_version' => PHP_VERSION,
                ],
            ]
        );
    }
}
