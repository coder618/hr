<?php

namespace Modules\Core\Http\Controllers\Platform;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Core\Traits\ApiResponseTrait;
use Spatie\Permission\Models\Role;

class OrganizationController extends Controller
{
    use ApiResponseTrait;

    /**
     * List all organizations with search, status filters and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $query = Organization::withCount('users');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->get('per_page', 15);
        $organizations = $query->latest()->paginate($perPage);

        return $this->successResponse(
            $organizations->items(),
            'Organizations retrieved.',
            [
                'current_page' => $organizations->currentPage(),
                'per_page' => $organizations->perPage(),
                'total' => $organizations->total(),
                'last_page' => $organizations->lastPage(),
            ]
        );
    }

    /**
     * Create a new organization tenant and its initial Admin user
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:191',
            'slug' => 'nullable|string|max:191|unique:organizations,slug',
            'domain' => 'nullable|string|max:191',
            'admin_name' => 'required|string|max:191',
            'admin_email' => 'required|email|max:191|unique:users,email',
            'admin_password' => 'required|string|min:8',
            'enabled_modules' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request) {
            $slug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);
            
            // Ensure unique slug
            $originalSlug = $slug;
            $counter = 1;
            while (Organization::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter++;
            }

            $organization = Organization::create([
                'uuid' => (string) Str::uuid(),
                'name' => $request->name,
                'slug' => $slug,
                'domain' => $request->domain,
                'status' => 'active',
                'settings' => [
                    'timezone' => 'UTC',
                    'currency' => 'USD',
                    'date_format' => 'Y-m-d',
                ],
            ]);

            // Create Organization Admin User
            $adminUser = User::create([
                'organization_id' => $organization->id,
                'name' => $request->admin_name,
                'email' => $request->admin_email,
                'password' => Hash::make($request->admin_password),
                'is_super_admin' => false,
                'is_active' => true,
            ]);

            // Assign default admin role
            $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
            $adminUser->assignRole($adminRole);

            // Default enabled modules
            $defaultModules = $request->enabled_modules ?: [
                'employee', 'shift', 'attendance', 'leave', 'payroll',
                'project', 'media', 'expense', 'notice_board', 'asset'
            ];

            foreach ($defaultModules as $modName) {
                TenantModule::create([
                    'organization_id' => $organization->id,
                    'module_name' => $modName,
                    'is_enabled' => true,
                ]);
            }

            return $this->successResponse([
                'organization' => $organization,
                'admin_user' => [
                    'id' => $adminUser->id,
                    'name' => $adminUser->name,
                    'email' => $adminUser->email,
                ],
            ], 'Organization created successfully.', null, 201);
        });
    }

    /**
     * Show Organization details
     */
    public function show($id): JsonResponse
    {
        $organization = Organization::with(['modules', 'users'])->findOrFail($id);

        return $this->successResponse($organization);
    }

    /**
     * Update Organization details or status
     */
    public function update(Request $request, $id): JsonResponse
    {
        $organization = Organization::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'status' => 'sometimes|required|in:active,suspended',
            'domain' => 'nullable|string|max:191',
            'plan_id' => 'nullable|integer',
            'settings' => 'nullable|array',
        ]);

        $organization->update($validated);

        return $this->successResponse($organization, 'Organization updated successfully.');
    }

    /**
     * Delete an organization
     */
    public function destroy($id): JsonResponse
    {
        $organization = Organization::findOrFail($id);
        $organization->delete();

        return $this->successResponse(null, 'Organization deleted successfully.');
    }

    /**
     * Impersonate an Organization Admin
     */
    public function impersonate(Request $request, $id): JsonResponse
    {
        $organization = Organization::findOrFail($id);
        $admin = User::where('organization_id', $organization->id)->first();

        if (!$admin) {
            return $this->errorResponse('No active user found in this organization to impersonate.', null, 404);
        }

        // Generate temporary impersonation token
        $token = $admin->createToken('impersonation-token-' . $request->user()->id)->plainTextToken;

        return $this->successResponse([
            'token' => $token,
            'user' => $admin,
            'organization' => $organization,
        ], "Impersonating {$organization->name} as {$admin->name}.");
    }

    /**
     * Get Organization Modules
     */
    public function getModules($id): JsonResponse
    {
        $organization = Organization::findOrFail($id);
        $modules = TenantModule::where('organization_id', $organization->id)->get();

        return $this->successResponse($modules);
    }

    /**
     * Toggle Modules for an organization
     */
    public function toggleModules(Request $request, $id): JsonResponse
    {
        $organization = Organization::findOrFail($id);

        $request->validate([
            'modules' => 'required|array',
            'modules.*.module_name' => 'required|string',
            'modules.*.is_enabled' => 'required|boolean',
        ]);

        foreach ($request->modules as $mod) {
            TenantModule::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'module_name' => $mod['module_name'],
                ],
                [
                    'is_enabled' => $mod['is_enabled'],
                ]
            );
        }

        $modules = TenantModule::where('organization_id', $organization->id)->get();

        return $this->successResponse($modules, 'Organization modules updated successfully.');
    }
}
