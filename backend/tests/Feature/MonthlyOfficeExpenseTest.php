<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Expense\Entities\OfficeExpense;
use Modules\Expense\Entities\OfficeExpenseCategory;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MonthlyOfficeExpenseTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $hrA;
    protected User $managerA;
    protected User $employeeA;
    protected User $adminB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Setup Org A
        $this->orgA = Organization::create([
            'name' => 'Acme Corp A',
            'slug' => 'acme-a',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'expense', 'is_enabled' => true]);

        // Setup Org B
        $this->orgB = Organization::create([
            'name' => 'Beta Corp B',
            'slug' => 'beta-b',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'expense', 'is_enabled' => true]);

        // Users for Org A
        $this->adminA = User::factory()->create([
            'organization_id' => $this->orgA->id,
            'email' => 'admin@acme-a.test',
        ]);
        $this->adminA->assignRole('admin');

        $this->hrA = User::factory()->create([
            'organization_id' => $this->orgA->id,
            'email' => 'hr@acme-a.test',
        ]);
        $this->hrA->assignRole('hr');

        $this->managerA = User::factory()->create([
            'organization_id' => $this->orgA->id,
            'email' => 'manager@acme-a.test',
        ]);
        $this->managerA->assignRole('manager');

        $this->employeeA = User::factory()->create([
            'organization_id' => $this->orgA->id,
            'email' => 'employee@acme-a.test',
        ]);
        $this->employeeA->assignRole('employee');

        // Admin for Org B
        $this->adminB = User::factory()->create([
            'organization_id' => $this->orgB->id,
            'email' => 'admin@beta-b.test',
        ]);
        $this->adminB->assignRole('admin');
    }

    public function test_tenant_admin_and_hr_can_manage_office_expense_categories(): void
    {
        // 1. Admin creates category
        $createRes = $this->actingAs($this->adminA, 'sanctum')
            ->postJson('/api/v1/expenses/office-categories', [
                'name' => 'Office Rent',
                'code' => 'RENT',
                'description' => 'Commercial premise rent',
                'is_active' => true,
            ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'Office Rent')
            ->assertJsonPath('data.code', 'RENT');

        $categoryId = $createRes->json('data.id');

        // 2. HR can list categories
        $listRes = $this->actingAs($this->hrA, 'sanctum')
            ->getJson('/api/v1/expenses/office-categories');

        $listRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data');

        // 3. HR can update category
        $updateRes = $this->actingAs($this->hrA, 'sanctum')
            ->putJson("/api/v1/expenses/office-categories/{$categoryId}", [
                'description' => 'Updated commercial premise rent and service fees',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.description', 'Updated commercial premise rent and service fees');
    }

    public function test_tenant_admin_and_hr_can_track_monthly_office_expenses(): void
    {
        // Create category
        $category = OfficeExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Electricity Bill',
            'code' => 'ELEC',
            'is_active' => true,
        ]);

        // 1. HR records an electricity bill
        $res = $this->actingAs($this->hrA, 'sanctum')
            ->postJson('/api/v1/expenses/office-expenses', [
                'office_expense_category_id' => $category->id,
                'title' => 'DESCO Power Bill - November 2026',
                'expense_month' => 11,
                'expense_year' => 2026,
                'expense_date' => '2026-11-05',
                'amount' => 650.00,
                'currency' => 'BDT',
                'payment_status' => 'paid',
                'payment_method' => 'mobile_banking',
                'payment_date' => '2026-11-06',
                'reference_no' => 'BILL-ELEC-9988',
                'vendor_name' => 'DESCO Power Authority',
                'notes' => 'Monthly electricity payment for workstations and AC units.',
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.amount', 650)
            ->assertJsonPath('data.payment_status', 'paid');

        $expenseId = $res->json('data.id');

        // 2. Admin can view monthly summary
        $summaryRes = $this->actingAs($this->adminA, 'sanctum')
            ->getJson('/api/v1/expenses/office-expenses/summary?year=2026&month=11');

        $summaryRes->assertStatus(200)
            ->assertJsonPath('data.total_amount', 650)
            ->assertJsonPath('data.paid_amount', 650)
            ->assertJsonPath('data.pending_amount', 0)
            ->assertJsonPath('data.category_breakdown.0.category_name', 'Electricity Bill');

        // 3. Admin can update payment status or notes
        $updateRes = $this->actingAs($this->adminA, 'sanctum')
            ->putJson("/api/v1/expenses/office-expenses/{$expenseId}", [
                'notes' => 'Verified with bank statement.',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.notes', 'Verified with bank statement.');

        // 4. Admin can export CSV
        $exportRes = $this->actingAs($this->adminA, 'sanctum')
            ->get('/api/v1/expenses/office-expenses/export?year=2026&month=11');

        $exportRes->assertStatus(200);
        $this->assertStringContainsString('DESCO Power Bill - November 2026', $exportRes->streamedContent());
    }

    public function test_manager_and_employee_are_forbidden_from_viewing_or_modifying_office_expenses(): void
    {
        $category = OfficeExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Office Rent',
            'code' => 'RENT',
            'is_active' => true,
        ]);

        $expense = OfficeExpense::create([
            'organization_id' => $this->orgA->id,
            'office_expense_category_id' => $category->id,
            'title' => 'November Office Rent',
            'expense_month' => 11,
            'expense_year' => 2026,
            'expense_date' => '2026-11-01',
            'amount' => 4500.00,
            'payment_status' => 'paid',
        ]);

        // Manager tries to list office expenses -> 403 Forbidden
        $this->actingAs($this->managerA, 'sanctum')
            ->getJson('/api/v1/expenses/office-expenses')
            ->assertStatus(403);

        // Employee tries to list office expenses -> 403 Forbidden
        $this->actingAs($this->employeeA, 'sanctum')
            ->getJson('/api/v1/expenses/office-expenses')
            ->assertStatus(403);

        // Employee tries to create office expense -> 403 Forbidden
        $this->actingAs($this->employeeA, 'sanctum')
            ->postJson('/api/v1/expenses/office-expenses', [
                'office_expense_category_id' => $category->id,
                'title' => 'Water Bill',
                'expense_month' => 11,
                'expense_year' => 2026,
                'expense_date' => '2026-11-02',
                'amount' => 100.00,
            ])
            ->assertStatus(403);

        // Manager tries to view categories -> 403 Forbidden
        $this->actingAs($this->managerA, 'sanctum')
            ->getJson('/api/v1/expenses/office-categories')
            ->assertStatus(403);

        // Employee tries to view categories -> 403 Forbidden
        $this->actingAs($this->employeeA, 'sanctum')
            ->getJson('/api/v1/expenses/office-categories')
            ->assertStatus(403);
    }

    public function test_tenant_isolation_prevents_cross_tenant_office_expense_access(): void
    {
        $categoryA = OfficeExpenseCategory::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Org A Rent',
            'code' => 'RENT_A',
            'is_active' => true,
        ]);

        $expenseA = OfficeExpense::create([
            'organization_id' => $this->orgA->id,
            'office_expense_category_id' => $categoryA->id,
            'title' => 'Org A Secret Rent Payment',
            'expense_month' => 11,
            'expense_year' => 2026,
            'expense_date' => '2026-11-01',
            'amount' => 9000.00,
            'payment_status' => 'paid',
        ]);

        // Admin B cannot view Org A's expense
        $this->actingAs($this->adminB, 'sanctum')
            ->getJson("/api/v1/expenses/office-expenses/{$expenseA->id}")
            ->assertStatus(404);

        // Admin B's list should not include Org A's expense
        $res = $this->actingAs($this->adminB, 'sanctum')
            ->getJson('/api/v1/expenses/office-expenses');

        $res->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }
}
