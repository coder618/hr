<?php

namespace Modules\Core\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Core\Traits\ApiResponseTrait;
use Spatie\Permission\Models\Role;

class InstallerController extends Controller
{
    use ApiResponseTrait;

    protected function isInstalled(): bool
    {
        return file_exists(storage_path('installed'));
    }

    /**
     * Check installation status
     */
    public function status(): JsonResponse
    {
        return $this->successResponse([
            'is_installed' => $this->isInstalled(),
            'php_version' => PHP_VERSION,
            'can_install' => !$this->isInstalled(),
        ]);
    }

    /**
     * Execute one-time Web Installer (for no-SSH cPanel setups)
     */
    public function install(Request $request): JsonResponse
    {
        if ($this->isInstalled()) {
            return $this->errorResponse('The application is already installed and locked.', null, 403);
        }

        $request->validate([
            'super_admin_name' => 'required|string|max:191',
            'super_admin_email' => 'required|email|max:191',
            'super_admin_password' => 'required|string|min:8',
            'demo_org_name' => 'nullable|string|max:191',
            'demo_admin_email' => 'nullable|email|max:191',
            'demo_admin_password' => 'nullable|string|min:8',
        ]);

        try {
            // Run Migrations
            Artisan::call('migrate', ['--force' => true]);

            // Seed Roles
            $roles = ['admin', 'hr', 'manager', 'employee'];
            foreach ($roles as $role) {
                Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
            }

            // Create Super Admin User
            $superAdmin = User::updateOrCreate(
                ['email' => $request->super_admin_email],
                [
                    'name' => $request->super_admin_name,
                    'password' => Hash::make($request->super_admin_password),
                    'is_super_admin' => true,
                    'is_active' => true,
                    'organization_id' => null,
                ]
            );

            // Optional Demo Tenant
            $demoOrgName = $request->demo_org_name ?: 'Acme Corporation';
            $demoOrg = Organization::create([
                'uuid' => (string) Str::uuid(),
                'name' => $demoOrgName,
                'slug' => Str::slug($demoOrgName),
                'status' => 'active',
                'settings' => [
                    'timezone' => 'UTC',
                    'currency' => 'USD',
                    'date_format' => 'd-m-Y',
                ],
            ]);

            // Enable default modules for demo tenant
            $defaultModules = [
                'employee', 'shift', 'attendance', 'leave', 'payroll',
                'project', 'media', 'expense', 'notice_board', 'asset'
            ];

            foreach ($defaultModules as $mod) {
                TenantModule::create([
                    'organization_id' => $demoOrg->id,
                    'module_name' => $mod,
                    'is_enabled' => true,
                ]);
            }

            // Create Demo Admin User
            $demoAdminEmail = $request->demo_admin_email ?: 'admin@acme.local';
            $demoAdminPassword = $request->demo_admin_password ?: 'password123';

            $demoAdmin = User::create([
                'organization_id' => $demoOrg->id,
                'name' => 'Demo Admin',
                'email' => $demoAdminEmail,
                'password' => Hash::make($demoAdminPassword),
                'is_super_admin' => false,
                'is_active' => true,
            ]);
            $demoAdmin->assignRole('admin');

            // Lock Installer permanently
            file_put_contents(storage_path('installed'), 'installed on ' . now()->toIso8601String());

            return $this->successResponse([
                'super_admin' => [
                    'name' => $superAdmin->name,
                    'email' => $superAdmin->email,
                ],
                'demo_organization' => [
                    'name' => $demoOrg->name,
                    'slug' => $demoOrg->slug,
                    'admin_email' => $demoAdminEmail,
                ],
            ], 'Installation completed successfully. The installer has been permanently locked.');

        } catch (\Exception $e) {
            return $this->errorResponse('Installation failed: ' . $e->getMessage(), null, 500);
        }
    }
}
