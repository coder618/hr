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
use Modules\Expense\Entities\DepartmentBudget;
use Modules\Expense\Entities\ExpenseCategory;
use Modules\Expense\Entities\ExpenseClaim;
use Modules\Media\Entities\Media;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ExpenseModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;
    protected Employee $employeeA;
    protected Employee $employeeB;
    protected Department $deptA;
    protected Department $deptB;
    protected Branch $branchA;
    protected Branch $branchB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Setup Org A
        $this->orgA = Organization::create([
            'name' => 'Acme Finance Corp A',
            'slug' => 'acme-finance-a',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'expense', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'media', 'is_enabled' => true]);

        // Setup Org B
        $this->orgB = Organization::create([
            'name' => 'Beta Finance Corp B',
            'slug' => 'beta-finance-b',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'expense', 'is_enabled' => true]);
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

        $this->branchA = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Headquarters A',
            'code' => 'HQ-A',
            'is_headquarters' => true,
        ]);

        $this->branchB = Branch::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Headquarters B',
            'code' => 'HQ-B',
            'is_headquarters' => true,
        ]);

        $this->deptA = Department::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Engineering A',
            'code' => 'ENG-A',
        ]);

        $this->deptB = Department::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Engineering B',
            'code' => 'ENG-B',
        ]);

        $desigA = Designation::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Software Engineer',
            'code' => 'SWE-A',
        ]);

        $desigB = Designation::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Software Engineer',
            'code' => 'SWE-B',
        ]);

        $this->employeeA = Employee::create([
            'organization_id' => $this->orgA->id,
            'branch_id' => $this->branchA->id,
            'department_id' => $this->deptA->id,
            'designation_id' => $desigA->id,
            'employee_code' => 'EMP-A001',
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'email' => 'alice@acme.com',
            'joining_date' => '2025-01-01',
            'employment_type' => 'full_time',
            'status' => 'active',
        ]);

        $this->employeeB = Employee::create([
            'organization_id' => $this->orgB->id,
            'branch_id' => $this->branchB->id,
            'department_id' => $this->deptB->id,
            'designation_id' => $desigB->id,
            'employee_code' => 'EMP-B001',
            'first_name' => 'Bob',
            'last_name' => 'Jones',
            'email' => 'bob@beta.com',
            'joining_date' => '2025-01-01',
            'employment_type' => 'full_time',
            'status' => 'active',
        ]);
    }

    public function test_can_crud_expense_categories(): void
    {
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/expenses/categories', [
            'name' => 'Meals & Catering',
            'code' => 'MEALS',
            'description' => 'Team dinners and catering',
            'spending_limit' => 500.00,
            'requires_receipt' => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.code', 'MEALS')
            ->assertJsonPath('data.spending_limit', 500);

        $categoryId = $res->json('data.id');

        // Cannot create duplicate code in same org
        $dupRes = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/expenses/categories', [
            'name' => 'Meals Duplicate',
            'code' => 'MEALS',
        ]);
        $dupRes->assertStatus(422);

        // List categories
        $listRes = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/expenses/categories');
        $listRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data');

        // Update category
        $updRes = $this->actingAs($this->adminA, 'sanctum')->putJson("/api/v1/expenses/categories/{$categoryId}", [
            'name' => 'Meals & Team Lunches',
            'spending_limit' => 750.00,
        ]);
        $updRes->assertStatus(200)
            ->assertJsonPath('data.name', 'Meals & Team Lunches')
            ->assertJsonPath('data.spending_limit', 750);

        // Delete category
        $delRes = $this->actingAs($this->adminA, 'sanctum')->deleteJson("/api/v1/expenses/categories/{$categoryId}");
        $delRes->assertStatus(200);

        $this->assertDatabaseMissing('expense_categories', ['id' => $categoryId]);
    }

    public function test_can_allocate_department_budget_and_track_spent_amount(): void
    {
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/expenses/budgets', [
            'department_id' => $this->deptA->id,
            'year' => 2026,
            'allocated_amount' => 15000.00,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.allocated_amount', 15000)
            ->assertJsonPath('data.remaining_amount', 15000);

        // Fetch budget list
        $listRes = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/expenses/budgets?year=2026');
        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Budget summary
        $sumRes = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/expenses/budgets/summary?year=2026');
        $sumRes->assertStatus(200)
            ->assertJsonPath('data.total_allocated', 15000)
            ->assertJsonPath('data.total_spent', 0)
            ->assertJsonPath('data.total_remaining', 15000);
    }

    public function test_can_submit_expense_claim_and_approve_or_reject(): void
    {
        // 1. Create category & budget
        $category = ExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Software Licenses',
            'code' => 'SOFTWARE',
            'requires_receipt' => false,
            'is_active' => true,
        ]);

        DepartmentBudget::create([
            'organization_id' => $this->orgA->id,
            'department_id' => $this->deptA->id,
            'year' => 2026,
            'allocated_amount' => 5000.00,
            'spent_amount' => 0.00,
        ]);

        // 2. Submit claim
        $submitRes = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/expenses/claims', [
            'employee_id' => $this->employeeA->id,
            'expense_category_id' => $category->id,
            'claim_date' => '2026-06-15',
            'amount' => 299.99,
            'currency' => 'USD',
            'merchant' => 'JetBrains',
            'payment_method' => 'personal_card',
            'description' => 'PhpStorm annual license',
        ]);

        $submitRes->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.amount', 299.99);

        $claimId = $submitRes->json('data.id');

        // 3. Approve claim
        $approveRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/expenses/claims/{$claimId}/approve");
        $approveRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approved_by', $this->adminA->id);

        // Verify department budget spent_amount auto-incremented
        $budget = DepartmentBudget::where('organization_id', $this->orgA->id)
            ->where('department_id', $this->deptA->id)
            ->where('year', 2026)
            ->first();

        $this->assertEquals(299.99, $budget->spent_amount);
        $this->assertEquals(4700.01, $budget->remaining_amount);

        // 4. Reject claim (reverts spent amount)
        $rejectRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/expenses/claims/{$claimId}/reject", [
            'rejection_reason' => 'Duplicate submission found',
        ]);
        $rejectRes->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Duplicate submission found');

        $budget->refresh();
        $this->assertEquals(0.00, $budget->spent_amount);
    }

    public function test_can_mark_expense_reimbursed_with_payment_reference(): void
    {
        $category = ExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Travel',
            'code' => 'TRAVEL',
            'requires_receipt' => false,
            'is_active' => true,
        ]);

        $claim = ExpenseClaim::create([
            'organization_id' => $this->orgA->id,
            'claim_number' => 'EXP-202606-TEST01',
            'employee_id' => $this->employeeA->id,
            'expense_category_id' => $category->id,
            'claim_date' => '2026-06-10',
            'amount' => 150.00,
            'payment_method' => 'personal_card',
            'description' => 'Client meeting taxi',
            'status' => 'approved',
            'approved_by' => $this->adminA->id,
            'approved_at' => now(),
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/expenses/claims/{$claim->id}/reimburse", [
            'payment_reference' => 'WIRE-998877',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'reimbursed')
            ->assertJsonPath('data.payment_reference', 'WIRE-998877');

        // Cannot reject a reimbursed claim
        $rejRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/expenses/claims/{$claim->id}/reject", [
            'rejection_reason' => 'Too late',
        ]);
        $rejRes->assertStatus(422);
    }

    public function test_can_stream_expense_csv_export(): void
    {
        $category = ExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Supplies',
            'code' => 'SUPPLIES',
            'requires_receipt' => false,
            'is_active' => true,
        ]);

        ExpenseClaim::create([
            'organization_id' => $this->orgA->id,
            'claim_number' => 'EXP-202606-CSV001',
            'employee_id' => $this->employeeA->id,
            'expense_category_id' => $category->id,
            'claim_date' => '2026-06-12',
            'amount' => 45.50,
            'payment_method' => 'cash',
            'description' => 'Whiteboard markers and sticky notes',
            'status' => 'approved',
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->get('/api/v1/expenses/claims/export');

        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'text/csv; charset=utf-8');

        $content = $res->streamedContent();
        $this->assertStringContainsString('Claim Number', $content);
        $this->assertStringContainsString('EXP-202606-CSV001', $content);
        $this->assertStringContainsString('Whiteboard markers', $content);
    }

    public function test_can_fetch_expense_analytics(): void
    {
        $category = ExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Office Equipment',
            'code' => 'EQUIP',
            'requires_receipt' => false,
            'is_active' => true,
        ]);

        ExpenseClaim::create([
            'organization_id' => $this->orgA->id,
            'claim_number' => 'EXP-202606-AN01',
            'employee_id' => $this->employeeA->id,
            'expense_category_id' => $category->id,
            'claim_date' => '2026-06-14',
            'amount' => 500.00,
            'payment_method' => 'company_card',
            'description' => 'Ergonomic Chair',
            'status' => 'approved',
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->getJson('/api/v1/expenses/claims/analytics?year=2026');

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.year', 2026)
            ->assertJsonPath('data.total_claims', 1)
            ->assertJsonPath('data.total_amount', 500)
            ->assertJsonPath('data.approved_amount', 500);
    }

    public function test_tenant_isolation_prevents_cross_tenant_access(): void
    {
        $categoryA = ExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Org A Confidential',
            'code' => 'CONF-A',
            'requires_receipt' => false,
            'is_active' => true,
        ]);

        $claimA = ExpenseClaim::create([
            'organization_id' => $this->orgA->id,
            'claim_number' => 'EXP-A-SECRET',
            'employee_id' => $this->employeeA->id,
            'expense_category_id' => $categoryA->id,
            'claim_date' => '2026-06-10',
            'amount' => 1200.00,
            'payment_method' => 'company_card',
            'description' => 'Secret acquisition',
            'status' => 'pending',
        ]);

        // User from Org B cannot view Org A's category
        $catRes = $this->actingAs($this->adminB, 'sanctum')->getJson("/api/v1/expenses/categories/{$categoryA->id}");
        $catRes->assertStatus(404);

        // User from Org B cannot view Org A's claim
        $claimRes = $this->actingAs($this->adminB, 'sanctum')->getJson("/api/v1/expenses/claims/{$claimA->id}");
        $claimRes->assertStatus(404);

        // User from Org B cannot approve Org A's claim
        $appRes = $this->actingAs($this->adminB, 'sanctum')->postJson("/api/v1/expenses/claims/{$claimA->id}/approve");
        $appRes->assertStatus(404);

        // Org B's category list does not contain Org A's category
        $listRes = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/expenses/categories');
        $listRes->assertStatus(200)->assertJsonMissing(['code' => 'CONF-A']);
    }
}
