<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\SchedulerHeartbeat;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SettingsAndHealthTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->orgA = Organization::create([
            'name' => 'Acme Global Corp',
            'slug' => 'acme-global',
            'status' => 'active',
            'settings' => [
                'company_name' => 'Acme Global Corp',
                'tagline' => 'Global Solutions',
                'primary_color' => '#1e40af',
                'secondary_color' => '#0ea5e9',
            ],
        ]);

        $this->orgB = Organization::create([
            'name' => 'Beta Industries',
            'slug' => 'beta-ind',
            'status' => 'active',
            'settings' => [
                'company_name' => 'Beta Industries',
                'primary_color' => '#dc2626',
            ],
        ]);

        $this->adminA = User::create([
            'name' => 'Admin Org A',
            'email' => 'admin@acme-global.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgA->id,
            'is_active' => true,
        ]);
        $this->adminA->assignRole('admin');

        $this->adminB = User::create([
            'name' => 'Admin Org B',
            'email' => 'admin@beta-ind.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgB->id,
            'is_active' => true,
        ]);
        $this->adminB->assignRole('admin');
    }

    public function test_can_retrieve_and_update_tenant_branding_settings(): void
    {
        // 1. Retrieve current settings
        $res = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/settings');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company_name', 'Acme Global Corp')
            ->assertJsonPath('data.primary_color', '#1e40af');

        // 2. Update settings with new branding & registration
        $updRes = $this->actingAs($this->adminA, 'sanctum')->putJson('/api/v1/settings', [
            'company_name' => 'Acme Global Holdings Inc',
            'tagline' => 'Empowering Enterprise Offices',
            'primary_color' => '#6366f1',
            'secondary_color' => '#14b8a6',
            'company_registration_no' => 'REG-2026-9901',
            'tax_id' => 'TAX-US-554433',
            'timezone' => 'America/New_York',
            'currency' => 'USD',
        ]);

        $updRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company_name', 'Acme Global Holdings Inc')
            ->assertJsonPath('data.primary_color', '#6366f1')
            ->assertJsonPath('data.company_registration_no', 'REG-2026-9901');

        // 3. Verify audit log entry was created
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'tenant_settings',
            'description' => 'Tenant branding & settings updated',
        ]);
    }

    public function test_public_branding_endpoint_returns_tenant_branding(): void
    {
        $res = $this->getJson("/api/v1/branding?slug={$this->orgA->slug}");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.slug', 'acme-global')
            ->assertJsonPath('data.company_name', 'Acme Global Corp')
            ->assertJsonPath('data.primary_color', '#1e40af');
    }

    public function test_can_query_and_export_audit_logs_as_csv(): void
    {
        // Seed an activity
        activity('security')
            ->causedBy($this->adminA)
            ->withProperties(['organization_id' => $this->orgA->id, 'ip' => '127.0.0.1'])
            ->log('Admin user updated security policy');

        // Fetch audit logs JSON
        $res = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/audit-logs');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');

        // Export as streamed CSV
        $exportRes = $this->actingAs($this->adminA, 'sanctum')->get('/api/v1/audit-logs/export');
        $exportRes->assertStatus(200);
        $exportRes->assertHeader('Content-Type', 'text/csv; charset=utf-8');

        $content = $exportRes->streamedContent();
        $this->assertStringContainsString('Timestamp', $content);
        $this->assertStringContainsString('Admin user updated security policy', $content);
    }

    public function test_system_health_endpoint_reports_checks_and_diagnostics(): void
    {
        // Record a heartbeat
        SchedulerHeartbeat::updateOrCreate(
            ['component' => 'scheduler'],
            ['last_heartbeat_at' => now()]
        );

        $res = $this->getJson('/api/v1/health');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'healthy')
            ->assertJsonPath('data.checks.database', true)
            ->assertJsonPath('data.checks.cache', true)
            ->assertJsonPath('data.checks.storage', true)
            ->assertJsonPath('data.cron_details.active', true);
    }

    public function test_system_maintenance_command_executes_successfully(): void
    {
        $exitCode = $this->artisan('system:maintenance', ['--days' => 30]);
        $exitCode->assertExitCode(0);
    }

    public function test_tenant_isolation_prevents_viewing_other_tenant_settings_or_audit_logs(): void
    {
        // Activity in Org A
        activity('finance')
            ->causedBy($this->adminA)
            ->withProperties(['organization_id' => $this->orgA->id])
            ->log('Org A confidential finance action');

        // Admin B should NOT see Org A's audit log
        $resB = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/audit-logs');
        $resB->assertStatus(200)
            ->assertJsonMissing(['description' => 'Org A confidential finance action']);
    }
}
