<?php

namespace Modules\Core\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Modules\Core\Traits\ApiResponseTrait;

class AuthController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * User / Admin / Super Admin Login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'organization_slug' => 'nullable|string',
        ]);

        $query = User::withoutGlobalScopes()->where('email', $request->email);

        // If organization slug is specified, filter by that org
        if ($request->filled('organization_slug')) {
            $org = Organization::where('slug', $request->organization_slug)
                ->orWhere('uuid', $request->organization_slug)
                ->first();

            if (!$org) {
                return $this->errorResponse('Organization not found.', ['organization' => 'Invalid organization identifier.'], 404);
            }

            $query->where('organization_id', $org->id);
        }

        $user = $query->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            activity('security')
                ->event('failed_login')
                ->withProperties([
                    'email' => $request->email,
                    'ip' => $request->ip(),
                ])
                ->log("Failed login attempt for {$request->email}");

            return $this->errorResponse('Invalid credentials provided.', ['email' => 'These credentials do not match our records.'], 422);
        }

        if (!$user->is_active) {
            return $this->errorResponse('Your account is deactivated. Please contact your administrator.', null, 403);
        }

        // If user belongs to a tenant, check if tenant is active
        if ($user->organization_id) {
            $org = Organization::find($user->organization_id);
            if ($org && $org->status !== 'active') {
                return $this->errorResponse('Your organization account is currently suspended.', ['status' => 'suspended'], 403);
            }
        }

        $user->update(['last_login_at' => now()]);

        activity('security')
            ->event('login')
            ->causedBy($user)
            ->withProperties([
                'organization_id' => $user->organization_id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ])
            ->log("User {$user->name} ({$user->email}) logged in");

        // Create Sanctum Token
        $token = $user->createToken('auth-token')->plainTextToken;

        $roles = $user->getRoleNames();
        $enabledModules = [];

        if ($user->organization_id) {
            $org = Organization::with('modules')->find($user->organization_id);
            if ($org) {
                $enabledModules = $org->modules
                    ->where('is_enabled', true)
                    ->pluck('module_name')
                    ->values()
                    ->toArray();
            }
        } elseif ($user->isSuperAdmin()) {
            $enabledModules = [
                'core', 'media', 'employee', 'shift', 'attendance', 'leave',
                'payroll', 'project', 'expense', 'notice',
            ];
        }

        return $this->successResponse([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'is_super_admin' => $user->isSuperAdmin(),
                'organization_id' => $user->organization_id,
                'roles' => $roles,
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
            'organization' => $user->organization ? [
                'id' => $user->organization->id,
                'uuid' => $user->organization->uuid,
                'name' => $user->organization->name,
                'slug' => $user->organization->slug,
                'status' => $user->organization->status,
                'settings' => $user->organization->settings,
            ] : null,
            'enabled_modules' => $enabledModules,
        ], 'Login successful.');
    }

    /**
     * Get Current Authenticated User profile with roles and permissions
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        // Load tenant context if user belongs to an org
        $organization = null;
        $enabledModules = [];

        if ($user->organization_id) {
            $org = Organization::with('modules')->find($user->organization_id);
            if ($org) {
                $organization = [
                    'id' => $org->id,
                    'uuid' => $org->uuid,
                    'name' => $org->name,
                    'slug' => $org->slug,
                    'status' => $org->status,
                    'settings' => $org->settings,
                ];

                $enabledModules = $org->modules
                    ->where('is_enabled', true)
                    ->pluck('module_name')
                    ->values()
                    ->toArray();
            }
        }

        // If super admin, all standard modules are considered enabled for platform view
        if ($user->isSuperAdmin()) {
            $enabledModules = ['core', 'media', 'employee', 'shift', 'attendance', 'leave', 'payroll', 'project', 'expense', 'notice_board', 'asset', 'subscription'];
        }

        return $this->successResponse([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'is_super_admin' => $user->isSuperAdmin(),
                'organization_id' => $user->organization_id,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
            'organization' => $organization,
            'enabled_modules' => $enabledModules,
        ]);
    }

    /**
     * User Logout
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            activity('security')
                ->event('logout')
                ->causedBy($user)
                ->withProperties([
                    'organization_id' => $user->organization_id,
                    'ip' => $request->ip(),
                ])
                ->log("User {$user->name} ({$user->email}) logged out");

            $user->currentAccessToken()?->delete();
        }

        return $this->successResponse(null, 'Successfully logged out.');
    }

    /**
     * Update Profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'phone' => 'nullable|string|max:50',
            'email' => 'required|email|max:191|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return $this->successResponse($user, 'Profile updated successfully.');
    }

    /**
     * Change Password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->errorResponse('Current password does not match.', ['current_password' => 'Incorrect current password.'], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        activity('security')
            ->event('password_change')
            ->causedBy($user)
            ->withProperties([
                'organization_id' => $user->organization_id,
                'ip' => $request->ip(),
            ])
            ->log("User {$user->name} ({$user->email}) changed their password");

        return $this->successResponse(null, 'Password changed successfully.');
    }
}
