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
use Modules\Project\Entities\Project;
use Modules\Project\Entities\ProjectMilestone;
use Modules\Project\Entities\Task;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectModuleTest extends TestCase
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
            'name' => 'Acme Project Corp A',
            'slug' => 'acme-project-a',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'project', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);

        $this->orgB = Organization::create([
            'name' => 'Beta Project Corp B',
            'slug' => 'beta-project-b',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'project', 'is_enabled' => true]);
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
            'name' => 'Engineering',
            'code' => 'ENG',
        ]);

        $desigA = Designation::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Software Engineer',
            'code' => 'SE',
        ]);

        $userEmpA = User::create([
            'name' => 'John Developer',
            'email' => 'john.dev@acme.com',
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
            'employee_code' => 'EMP-001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.dev@acme.com',
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

    public function test_can_crud_projects_and_assign_team_members(): void
    {
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/projects', [
            'title' => 'Office Management System Redesign',
            'code' => 'OMS-2026',
            'description' => 'Rebuilding frontend and REST API for high concurrency',
            'client_name' => 'Internal Platforms',
            'start_date' => '2026-01-01',
            'due_date' => '2026-06-30',
            'budget' => 250000.00,
            'status' => 'in_progress',
            'priority' => 'high',
            'manager_id' => $this->employeeA->id,
        ]);

        $res->assertStatus(201);
        $projectId = $res->json('data.id');
        $this->assertEquals('OMS-2026', $res->json('data.code'));

        $this->assertDatabaseHas('projects', [
            'id' => $projectId,
            'organization_id' => $this->orgA->id,
            'code' => 'OMS-2026',
            'status' => 'in_progress',
        ]);

        // Manager auto-assigned as member
        $this->assertDatabaseHas('project_members', [
            'project_id' => $projectId,
            'employee_id' => $this->employeeA->id,
            'role' => 'manager',
        ]);

        // Update project
        $updateRes = $this->actingAs($this->adminA, 'sanctum')->putJson("/api/v1/projects/{$projectId}", [
            'budget' => 300000.00,
            'priority' => 'urgent',
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals(300000.00, $updateRes->json('data.budget'));

        // Delete project
        $this->actingAs($this->adminA, 'sanctum')->deleteJson("/api/v1/projects/{$projectId}")->assertStatus(200);
        $this->assertDatabaseMissing('projects', ['id' => $projectId]);
    }

    public function test_can_manage_project_milestones(): void
    {
        $project = Project::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Portal Migration',
            'code' => 'MIG-01',
            'status' => 'in_progress',
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/projects/{$project->id}/milestones", [
            'title' => 'Database Schema Migration',
            'description' => 'Migrate SQLite & MariaDB tables',
            'due_date' => '2026-03-31',
            'order' => 1,
        ]);
        $res->assertStatus(201);
        $milestoneId = $res->json('data.id');

        $this->assertDatabaseHas('project_milestones', [
            'id' => $milestoneId,
            'project_id' => $project->id,
            'status' => 'pending',
        ]);

        // Update to completed
        $this->actingAs($this->adminA, 'sanctum')->putJson("/api/v1/projects/{$project->id}/milestones/{$milestoneId}", [
            'status' => 'completed',
        ])->assertStatus(200);

        $this->assertDatabaseHas('project_milestones', [
            'id' => $milestoneId,
            'status' => 'completed',
        ]);
    }

    public function test_can_crud_tasks_and_update_kanban_status(): void
    {
        $project = Project::create([
            'organization_id' => $this->orgA->id,
            'title' => 'API Optimization',
            'code' => 'API-OPT',
        ]);

        $milestone = ProjectMilestone::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $project->id,
            'title' => 'Phase 1 - Endpoint Caching',
        ]);

        // Create Task
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks", [
            'title' => 'Profile Database Query Indexing',
            'description' => 'Add composite indexes for tenant queries',
            'milestone_id' => $milestone->id,
            'assignee_id' => $this->employeeA->id,
            'priority' => 'high',
            'status' => 'todo',
            'estimated_hours' => 8.0,
            'checklist' => [
                ['id' => 'c1', 'text' => 'Inspect slow query log', 'completed' => false],
                ['id' => 'c2', 'text' => 'Add indexes to migrations', 'completed' => false],
            ],
        ]);

        $res->assertStatus(201);
        $taskId = $res->json('data.id');

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'project_id' => $project->id,
            'assignee_id' => $this->employeeA->id,
            'status' => 'todo',
        ]);

        // Update Kanban Status to 'in_progress'
        $statusRes = $this->actingAs($this->adminA, 'sanctum')->patchJson("/api/v1/tasks/{$taskId}/status", [
            'status' => 'in_progress',
            'order' => 2,
        ]);
        $statusRes->assertStatus(200);
        $this->assertDatabaseHas('tasks', ['id' => $taskId, 'status' => 'in_progress']);

        // Update Checklist item completion
        $checklistRes = $this->actingAs($this->adminA, 'sanctum')->putJson("/api/v1/tasks/{$taskId}/checklist", [
            'checklist' => [
                ['id' => 'c1', 'text' => 'Inspect slow query log', 'completed' => true],
                ['id' => 'c2', 'text' => 'Add indexes to migrations', 'completed' => false],
            ],
        ]);
        $checklistRes->assertStatus(200);
        $this->assertTrue($checklistRes->json('data.checklist.0.completed'));

        // Check My Tasks endpoint
        $myTasksRes = $this->actingAs($this->employeeA->user, 'sanctum')->getJson('/api/v1/tasks/my');
        $myTasksRes->assertStatus(200);
        $this->assertCount(1, $myTasksRes->json('data'));
    }

    public function test_can_log_work_time_and_rollup_hours(): void
    {
        $project = Project::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Client Portal Integration',
            'code' => 'CLI-01',
        ]);

        $task = Task::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $project->id,
            'title' => 'Build OAuth token authentication flow',
            'estimated_hours' => 10.0,
            'actual_hours' => 0.0,
        ]);

        // Log 3.5 hours
        $res1 = $this->actingAs($this->employeeA->user, 'sanctum')->postJson("/api/v1/tasks/{$task->id}/time-logs", [
            'log_date' => '2026-11-20',
            'hours_spent' => 3.5,
            'description' => 'Drafted Sanctum token controllers',
        ]);
        $res1->assertStatus(201);
        $log1Id = $res1->json('data.id');

        $task->refresh();
        $this->assertEquals(3.5, $task->actual_hours);

        // Log another 2.5 hours
        $res2 = $this->actingAs($this->employeeA->user, 'sanctum')->postJson("/api/v1/tasks/{$task->id}/time-logs", [
            'log_date' => '2026-11-20',
            'hours_spent' => 2.5,
            'description' => 'Added unit tests and token refresh',
        ]);
        $res2->assertStatus(201);

        $task->refresh();
        $this->assertEquals(6.0, $task->actual_hours);

        // Delete first log (3.5 hours)
        $delRes = $this->actingAs($this->adminA, 'sanctum')->deleteJson("/api/v1/tasks/{$task->id}/time-logs/{$log1Id}");
        $delRes->assertStatus(200);

        $task->refresh();
        $this->assertEquals(2.5, $task->actual_hours);
    }

    public function test_tenant_isolation_prevents_cross_tenant_access(): void
    {
        $projectA = Project::create([
            'organization_id' => $this->orgA->id,
            'title' => 'Top Secret Project A',
            'code' => 'SECRET-A',
        ]);

        $taskA = Task::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $projectA->id,
            'title' => 'Confidential Task A',
        ]);

        // Tenant B lists projects
        $resProjects = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/projects');
        $resProjects->assertStatus(200);
        $this->assertEmpty($resProjects->json('data'));

        // Tenant B attempts to fetch Tenant A project
        $resShow = $this->actingAs($this->adminB, 'sanctum')->getJson("/api/v1/projects/{$projectA->id}");
        $resShow->assertStatus(404);

        // Tenant B attempts to access Tenant A task
        $resTask = $this->actingAs($this->adminB, 'sanctum')->getJson("/api/v1/tasks/{$taskA->id}");
        $resTask->assertStatus(404);
    }
}
