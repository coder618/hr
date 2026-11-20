<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CoreAuthAndTenancyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
    }

    public function test_super_admin_can_login_and_access_platform_stats(): void
    {
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@test.local',
            'password' => Hash::make('password123'),
            'is_super_admin' => true,
            'is_active' => true,
        ]);
        $superAdmin->assignRole('super_admin');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin@test.local',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'user']]);

        $token = $response->json('data.token');

        // Access platform stats
        $statsResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/platform/stats');

        $statsResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['total_organizations', 'active_organizations']]);
    }

    public function test_tenant_admin_cannot_access_platform_endpoints(): void
    {
        $org = Organization::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Test Org',
            'slug' => 'test-org',
            'status' => 'active',
        ]);

        $admin = User::create([
            'organization_id' => $org->id,
            'name' => 'Org Admin',
            'email' => 'admin@test-org.local',
            'password' => Hash::make('password123'),
            'is_super_admin' => false,
            'is_active' => true,
        ]);
        $admin->assignRole('admin');

        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/platform/stats');

        $response->assertStatus(403);
    }

    public function test_tenant_isolation_prevents_cross_tenant_data_leakage(): void
    {
        // Tenant A
        $orgA = Organization::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Org Alpha',
            'slug' => 'org-alpha',
            'status' => 'active',
        ]);

        $userA = User::create([
            'organization_id' => $orgA->id,
            'name' => 'User Alpha',
            'email' => 'alpha@test.local',
            'password' => Hash::make('password123'),
            'is_super_admin' => false,
            'is_active' => true,
        ]);

        // Tenant B
        $orgB = Organization::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Org Beta',
            'slug' => 'org-beta',
            'status' => 'active',
        ]);

        $userB = User::create([
            'organization_id' => $orgB->id,
            'name' => 'User Beta',
            'email' => 'beta@test.local',
            'password' => Hash::make('password123'),
            'is_super_admin' => false,
            'is_active' => true,
        ]);

        // When Tenant A context is set, querying User must NOT return Tenant B user
        $tenantContext = app(TenantContextInterface::class);
        $tenantContext->setTenant($orgA);

        $usersSeenByA = User::all();
        $this->assertTrue($usersSeenByA->contains('id', $userA->id));
        $this->assertFalse($usersSeenByA->contains('id', $userB->id));

        // When creating a model while in Tenant A context, it auto-assigns organization_id = orgA->id
        $newMember = User::create([
            'name' => 'Auto Tenant Member',
            'email' => 'auto@test.local',
            'password' => Hash::make('password123'),
        ]);
        $this->assertEquals($orgA->id, $newMember->organization_id);

        // Switch to Tenant B context
        $tenantContext->setTenant($orgB);
        $usersSeenByB = User::all();
        $this->assertTrue($usersSeenByB->contains('id', $userB->id));
        $this->assertFalse($usersSeenByB->contains('id', $userA->id));
    }

    public function test_suspended_tenant_is_blocked_from_authenticated_api(): void
    {
        $org = Organization::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Suspended Org',
            'slug' => 'suspended-org',
            'status' => 'suspended',
        ]);

        $user = User::create([
            'organization_id' => $org->id,
            'name' => 'Suspended User',
            'email' => 'user@suspended.local',
            'password' => Hash::make('password123'),
            'is_super_admin' => false,
            'is_active' => true,
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(403)
            ->assertJsonPath('errors.status', 'suspended');
    }

    public function test_health_check_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.checks.database', true)
            ->assertJsonPath('data.checks.cache', true)
            ->assertJsonPath('data.checks.storage', true);
    }

    public function test_super_admin_can_create_organization_and_toggle_modules(): void
    {
        $superAdmin = User::create([
            'name' => 'Platform Lead',
            'email' => 'lead@platform.local',
            'password' => Hash::make('password123'),
            'is_super_admin' => true,
            'is_active' => true,
        ]);

        $token = $superAdmin->createToken('super-token')->plainTextToken;

        // 1. Create Organization
        $createResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/platform/organizations', [
                'name' => 'Stark Industries',
                'admin_name' => 'Tony Stark',
                'admin_email' => 'tony@stark.local',
                'admin_password' => 'secret1234',
                'enabled_modules' => ['employee', 'payroll'],
            ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.organization.name', 'Stark Industries')
            ->assertJsonPath('data.admin_user.email', 'tony@stark.local');

        $orgId = $createResponse->json('data.organization.id');

        // 2. Impersonate the Tenant Admin
        $impersonateResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/platform/organizations/{$orgId}/impersonate");

        $impersonateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'user', 'organization']]);

        // 3. Toggle Modules (disable payroll, enable shift)
        $toggleResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/platform/organizations/{$orgId}/modules", [
                'modules' => [
                    ['module_name' => 'payroll', 'is_enabled' => false],
                    ['module_name' => 'shift', 'is_enabled' => true],
                ],
            ]);

        $toggleResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $org = Organization::find($orgId);
        $this->assertFalse($org->isModuleEnabled('payroll'));
        $this->assertTrue($org->isModuleEnabled('shift'));
    }

    public function test_preflight_artisan_command_passes(): void
    {
        $this->artisan('app:preflight')
            ->assertExitCode(0);
    }
}
