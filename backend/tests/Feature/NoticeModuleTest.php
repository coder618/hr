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
use Modules\Notice\Entities\Notice;
use Modules\Notice\Entities\NoticeAcknowledgment;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NoticeModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;
    protected User $userEmployeeA1;
    protected User $userEmployeeA2;
    protected Employee $employeeA1;
    protected Employee $employeeA2;
    protected Department $deptEngineering;
    protected Department $deptMarketing;
    protected Branch $branchHQ;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Org A setup
        $this->orgA = Organization::create([
            'name' => 'Acme Notice Corp A',
            'slug' => 'acme-notice-a',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'notice', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'media', 'is_enabled' => true]);

        // Org B setup
        $this->orgB = Organization::create([
            'name' => 'Beta Notice Corp B',
            'slug' => 'beta-notice-b',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'notice', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'employee', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'media', 'is_enabled' => true]);

        $this->adminA = User::create([
            'name' => 'Admin Org A',
            'email' => 'admin-a@acme.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgA->id,
            'is_active' => true,
        ]);
        $this->adminA->assignRole('admin');

        $this->adminB = User::create([
            'name' => 'Admin Org B',
            'email' => 'admin-b@beta.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgB->id,
            'is_active' => true,
        ]);
        $this->adminB->assignRole('admin');

        $this->branchHQ = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'HQ Branch',
            'code' => 'HQ-01',
            'is_headquarters' => true,
        ]);

        $this->deptEngineering = Department::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Engineering',
            'code' => 'ENG',
        ]);

        $this->deptMarketing = Department::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Marketing',
            'code' => 'MKT',
        ]);

        $desig = Designation::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Team Member',
            'code' => 'TM',
        ]);

        // Employee A1: In Engineering
        $this->userEmployeeA1 = User::create([
            'name' => 'Alice Engineer',
            'email' => 'alice.eng@acme.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgA->id,
            'is_active' => true,
        ]);
        $this->userEmployeeA1->assignRole('employee');

        $this->employeeA1 = Employee::create([
            'organization_id' => $this->orgA->id,
            'user_id' => $this->userEmployeeA1->id,
            'branch_id' => $this->branchHQ->id,
            'department_id' => $this->deptEngineering->id,
            'designation_id' => $desig->id,
            'employee_code' => 'EMP-ENG01',
            'first_name' => 'Alice',
            'last_name' => 'Engineer',
            'email' => 'alice.eng@acme.com',
            'joining_date' => '2025-01-01',
            'employment_type' => 'full_time',
            'status' => 'active',
        ]);

        // Employee A2: In Marketing
        $this->userEmployeeA2 = User::create([
            'name' => 'Mark Marketer',
            'email' => 'mark.mkt@acme.com',
            'password' => bcrypt('Password123!'),
            'organization_id' => $this->orgA->id,
            'is_active' => true,
        ]);
        $this->userEmployeeA2->assignRole('employee');

        $this->employeeA2 = Employee::create([
            'organization_id' => $this->orgA->id,
            'user_id' => $this->userEmployeeA2->id,
            'branch_id' => $this->branchHQ->id,
            'department_id' => $this->deptMarketing->id,
            'designation_id' => $desig->id,
            'employee_code' => 'EMP-MKT01',
            'first_name' => 'Mark',
            'last_name' => 'Marketer',
            'email' => 'mark.mkt@acme.com',
            'joining_date' => '2025-01-01',
            'employment_type' => 'full_time',
            'status' => 'active',
        ]);
    }

    public function test_can_crud_notices_and_toggle_pin(): void
    {
        // 1. Create company-wide notice
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/notices', [
            'title' => 'Annual Strategy Townhall',
            'content' => 'Join us this Friday at 3 PM for our annual strategic overview.',
            'priority' => 'urgent',
            'target_type' => 'all',
            'is_pinned' => true,
            'requires_acknowledgment' => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'Annual Strategy Townhall')
            ->assertJsonPath('data.is_pinned', true)
            ->assertJsonPath('data.requires_acknowledgment', true);

        $noticeId = $res->json('data.id');

        // 2. Fetch list
        $listRes = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/notices');
        $listRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data.data');

        // 3. Toggle pin
        $pinRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/notices/{$noticeId}/pin");
        $pinRes->assertStatus(200)
            ->assertJsonPath('data.is_pinned', false);

        // 4. Update notice
        $updRes = $this->actingAs($this->adminA, 'sanctum')->putJson("/api/v1/notices/{$noticeId}", [
            'title' => 'Updated: Annual Strategy Townhall (Virtual)',
            'priority' => 'important',
        ]);
        $updRes->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated: Annual Strategy Townhall (Virtual)')
            ->assertJsonPath('data.priority', 'important');

        // 5. Delete notice
        $delRes = $this->actingAs($this->adminA, 'sanctum')->deleteJson("/api/v1/notices/{$noticeId}");
        $delRes->assertStatus(200);

        $this->assertDatabaseMissing('notices', ['id' => $noticeId]);
    }

    public function test_can_target_notices_by_department(): void
    {
        // Notice targeted specifically to Engineering department
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/notices', [
            'title' => 'Engineering Code Freeze',
            'content' => 'All production deployments paused starting midnight.',
            'priority' => 'urgent',
            'target_type' => 'department',
            'target_ids' => [$this->deptEngineering->id],
            'status' => 'published',
            'published_at' => now()->subHour(),
        ]);
        $res->assertStatus(201);

        // Alice (Engineering) can see this notice
        $aliceRes = $this->actingAs($this->userEmployeeA1, 'sanctum')->getJson('/api/v1/notices/my');
        $aliceRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Engineering Code Freeze');

        // Mark (Marketing) does NOT see this notice
        $markRes = $this->actingAs($this->userEmployeeA2, 'sanctum')->getJson('/api/v1/notices/my');
        $markRes->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_employee_can_acknowledge_notice_and_view_read_receipts(): void
    {
        $notice = Notice::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Updated Remote Work Guidelines',
            'content' => 'Review and acknowledge the revised guidelines.',
            'target_type' => 'all',
            'status' => 'published',
            'requires_acknowledgment' => true,
            'published_at' => now(),
        ]);

        // Alice acknowledges notice
        $ackRes = $this->actingAs($this->userEmployeeA1, 'sanctum')->postJson("/api/v1/notices/{$notice->id}/acknowledge");
        $ackRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.notice_id', $notice->id)
            ->assertJsonPath('data.employee_id', $this->employeeA1->id);

        // Acknowledge is idempotent
        $ackRes2 = $this->actingAs($this->userEmployeeA1, 'sanctum')->postJson("/api/v1/notices/{$notice->id}/acknowledge");
        $ackRes2->assertStatus(200);

        // In Alice's notices feed, is_acknowledged is true
        $myRes = $this->actingAs($this->userEmployeeA1, 'sanctum')->getJson('/api/v1/notices/my');
        $myRes->assertStatus(200)
            ->assertJsonPath('data.0.is_acknowledged', true);

        // Admin checks acknowledgments
        $listAcks = $this->actingAs($this->adminA, 'sanctum')->getJson("/api/v1/notices/{$notice->id}/acknowledgments");
        $listAcks->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.employee.email', 'alice.eng@acme.com');
    }

    public function test_expired_or_draft_notices_are_hidden_from_employees(): void
    {
        // Draft notice
        Notice::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Draft Internal Memo',
            'content' => 'Not ready for release yet.',
            'status' => 'draft',
            'target_type' => 'all',
        ]);

        // Expired notice
        Notice::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Past Lunch Event',
            'content' => 'Event already passed yesterday.',
            'status' => 'published',
            'target_type' => 'all',
            'published_at' => now()->subDays(5),
            'expires_at' => now()->subDay(),
        ]);

        // Active notice
        Notice::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Active Notice Today',
            'content' => 'Current policy.',
            'status' => 'published',
            'target_type' => 'all',
            'published_at' => now()->subDay(),
            'expires_at' => now()->addDays(5),
        ]);

        $res = $this->actingAs($this->userEmployeeA1, 'sanctum')->getJson('/api/v1/notices/my');
        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Active Notice Today');
    }

    public function test_tenant_isolation_prevents_cross_tenant_notice_access(): void
    {
        $noticeA = Notice::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Confidential Acquisition Org A',
            'content' => 'Top secret.',
            'status' => 'published',
            'target_type' => 'all',
        ]);

        // User from Org B cannot view Org A's notice
        $viewRes = $this->actingAs($this->adminB, 'sanctum')->getJson("/api/v1/notices/{$noticeA->id}");
        $viewRes->assertStatus(404);

        // User from Org B cannot toggle pin or delete Org A's notice
        $pinRes = $this->actingAs($this->adminB, 'sanctum')->postJson("/api/v1/notices/{$noticeA->id}/pin");
        $pinRes->assertStatus(404);

        $delRes = $this->actingAs($this->adminB, 'sanctum')->deleteJson("/api/v1/notices/{$noticeA->id}");
        $delRes->assertStatus(404);

        // Notice list for Org B does not contain Org A notices
        $listRes = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/notices');
        $listRes->assertStatus(200)
            ->assertJsonMissing(['title' => 'Confidential Acquisition Org A']);
    }
}
