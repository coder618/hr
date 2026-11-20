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
use Modules\Payroll\Entities\EmployeeSalary;
use Modules\Payroll\Entities\PayrollRun;
use Modules\Payroll\Entities\Payslip;
use Modules\Payroll\Entities\SalaryStructure;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PayrollModuleTest extends TestCase
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
            'name' => 'Acme Payroll Corp A',
            'slug' => 'acme-payroll-a',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'payroll', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);

        $this->orgB = Organization::create([
            'name' => 'Beta Payroll Corp B',
            'slug' => 'beta-payroll-b',
            'status' => 'active',
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'payroll', 'is_enabled' => true]);
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
            'name' => 'John Employee',
            'email' => 'john.emp@acme.com',
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
            'email' => 'john.emp@acme.com',
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

    public function test_can_crud_salary_structures_and_components(): void
    {
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/payroll/structures', [
            'name' => 'Engineering Salary Structure',
            'description' => 'Structure for engineering team',
            'is_active' => true,
            'components' => [
                [
                    'name' => 'House Rent Allowance',
                    'type' => 'earning',
                    'calculation_type' => 'percentage_of_basic',
                    'percentage_value' => 20.00,
                ],
                [
                    'name' => 'Medical Allowance',
                    'type' => 'earning',
                    'calculation_type' => 'fixed',
                    'default_amount' => 2500.00,
                ],
                [
                    'name' => 'Provident Fund',
                    'type' => 'deduction',
                    'calculation_type' => 'percentage_of_basic',
                    'percentage_value' => 8.00,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $structureId = $res->json('data.id');
        $this->assertCount(3, $res->json('data.components'));

        $this->assertDatabaseHas('salary_structures', [
            'id' => $structureId,
            'organization_id' => $this->orgA->id,
            'name' => 'Engineering Salary Structure',
        ]);

        // Add additional component
        $addCompRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/payroll/structures/{$structureId}/components", [
            'name' => 'Special Bonus',
            'type' => 'earning',
            'calculation_type' => 'fixed',
            'default_amount' => 5000.00,
        ]);
        $addCompRes->assertStatus(201);
        $compId = $addCompRes->json('data.id');

        // Delete component
        $this->actingAs($this->adminA, 'sanctum')
            ->deleteJson("/api/v1/payroll/structures/{$structureId}/components/{$compId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('salary_components', ['id' => $compId]);
    }

    public function test_can_assign_and_update_employee_salary(): void
    {
        $structure = SalaryStructure::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Standard Structure',
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/payroll/employee-salaries', [
            'employee_id' => $this->employeeA->id,
            'salary_structure_id' => $structure->id,
            'base_salary' => 50000.00,
            'payment_method' => 'bank_transfer',
            'bank_name' => 'Standard Chartered Bank',
            'bank_account_number' => '1234567890',
            'bank_routing_number' => '987654321',
            'effective_from' => '2026-01-01',
        ]);

        $res->assertStatus(200);
        $this->assertEquals(50000.00, $res->json('data.base_salary'));
        $this->assertEquals('Standard Chartered Bank', $res->json('data.bank_name'));

        $this->assertDatabaseHas('employee_salaries', [
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'base_salary' => 50000.00,
        ]);
    }

    public function test_can_create_payroll_run_and_calculate_payslips(): void
    {
        $structure = SalaryStructure::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Executive Structure',
        ]);

        $structure->components()->create([
            'organization_id' => $this->orgA->id,
            'name' => 'House Rent Allowance',
            'type' => 'earning',
            'calculation_type' => 'percentage_of_basic',
            'percentage_value' => 20.00, // 20% of 50,000 = 10,000
        ]);

        $structure->components()->create([
            'organization_id' => $this->orgA->id,
            'name' => 'Medical Allowance',
            'type' => 'earning',
            'calculation_type' => 'fixed',
            'default_amount' => 2500.00,
        ]);

        $structure->components()->create([
            'organization_id' => $this->orgA->id,
            'name' => 'Provident Fund',
            'type' => 'deduction',
            'calculation_type' => 'percentage_of_basic',
            'percentage_value' => 8.00, // 8% of 50,000 = 4,000
        ]);

        EmployeeSalary::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'salary_structure_id' => $structure->id,
            'base_salary' => 50000.00,
            'payment_method' => 'bank_transfer',
            'bank_name' => 'HSBC Bank',
            'bank_account_number' => 'HSBC-001928',
        ]);

        // Create payroll run for 2026-11
        $res = $this->actingAs($this->adminA, 'sanctum')->postJson('/api/v1/payroll/runs', [
            'year' => 2026,
            'month' => 11,
        ]);

        $res->assertStatus(201);
        $runId = $res->json('data.id');

        $this->assertEquals(1, $res->json('data.total_employees'));
        $this->assertEquals(62500.00, $res->json('data.total_gross')); // 50000 + 10000 + 2500
        $this->assertEquals(4000.00, $res->json('data.total_deductions')); // 4000
        $this->assertEquals(58500.00, $res->json('data.total_net')); // 62500 - 4000

        // Verify payslip in database
        $this->assertDatabaseHas('payslips', [
            'organization_id' => $this->orgA->id,
            'payroll_run_id' => $runId,
            'employee_id' => $this->employeeA->id,
            'base_salary' => 50000.00,
            'gross_pay' => 62500.00,
            'total_deductions' => 4000.00,
            'net_pay' => 58500.00,
            'payment_status' => 'pending',
        ]);
    }

    public function test_can_approve_payroll_run_and_mark_paid(): void
    {
        $run = PayrollRun::create([
            'organization_id' => $this->orgA->id,
            'batch_number' => 'PAY-2026-11',
            'year' => 2026,
            'month' => 11,
            'total_employees' => 1,
            'total_gross' => 60000.00,
            'total_deductions' => 3000.00,
            'total_net' => 57000.00,
            'status' => 'draft',
        ]);

        $payslip = Payslip::create([
            'organization_id' => $this->orgA->id,
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employeeA->id,
            'payslip_number' => 'PAY-202611-EMP001',
            'year' => 2026,
            'month' => 11,
            'base_salary' => 60000.00,
            'earnings_breakdown' => [['name' => 'Basic', 'amount' => 60000]],
            'deductions_breakdown' => [['name' => 'PF', 'amount' => 3000]],
            'gross_pay' => 60000.00,
            'total_deductions' => 3000.00,
            'net_pay' => 57000.00,
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
        ]);

        // Approve
        $approveRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/payroll/runs/{$run->id}/approve");
        $approveRes->assertStatus(200);
        $this->assertEquals('approved', $approveRes->json('data.status'));

        // Mark Paid
        $paidRes = $this->actingAs($this->adminA, 'sanctum')->postJson("/api/v1/payroll/runs/{$run->id}/mark-paid");
        $paidRes->assertStatus(200);
        $this->assertEquals('paid', $paidRes->json('data.status'));

        $payslip->refresh();
        $this->assertEquals('paid', $payslip->payment_status);
    }

    public function test_can_generate_and_stream_payslip_pdf(): void
    {
        $run = PayrollRun::create([
            'organization_id' => $this->orgA->id,
            'batch_number' => 'PAY-2026-11',
            'year' => 2026,
            'month' => 11,
            'status' => 'approved',
        ]);

        $payslip = Payslip::create([
            'organization_id' => $this->orgA->id,
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employeeA->id,
            'payslip_number' => 'PAY-202611-EMP-001',
            'year' => 2026,
            'month' => 11,
            'working_days' => 22,
            'present_days' => 22,
            'base_salary' => 50000.00,
            'earnings_breakdown' => [
                ['name' => 'Basic Salary', 'amount' => 50000.00],
                ['name' => 'House Rent Allowance', 'amount' => 10000.00],
            ],
            'deductions_breakdown' => [
                ['name' => 'Provident Fund', 'amount' => 4000.00],
            ],
            'gross_pay' => 60000.00,
            'total_deductions' => 4000.00,
            'net_pay' => 56000.00,
            'payment_method' => 'bank_transfer',
            'payment_status' => 'paid',
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->get("/api/v1/payroll/payslips/{$payslip->id}/pdf");
        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'application/pdf');

        // Confirm PDF binary header '%PDF'
        $content = $res->getContent();
        $this->assertStringStartsWith('%PDF', $content);
    }

    public function test_can_export_bank_transfer_csv_stream(): void
    {
        $run = PayrollRun::create([
            'organization_id' => $this->orgA->id,
            'batch_number' => 'PAY-2026-11',
            'year' => 2026,
            'month' => 11,
            'status' => 'approved',
        ]);

        EmployeeSalary::create([
            'organization_id' => $this->orgA->id,
            'employee_id' => $this->employeeA->id,
            'base_salary' => 50000.00,
            'payment_method' => 'bank_transfer',
            'bank_name' => 'City Bank Ltd',
            'bank_account_number' => 'CBL-999888',
            'bank_routing_number' => 'ROUT-1234',
        ]);

        Payslip::create([
            'organization_id' => $this->orgA->id,
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employeeA->id,
            'payslip_number' => 'PAY-202611-EMP-001',
            'year' => 2026,
            'month' => 11,
            'base_salary' => 50000.00,
            'earnings_breakdown' => [['name' => 'Basic', 'amount' => 50000]],
            'deductions_breakdown' => [],
            'gross_pay' => 50000.00,
            'total_deductions' => 0.00,
            'net_pay' => 50000.00,
            'payment_method' => 'bank_transfer',
            'payment_status' => 'pending',
        ]);

        $res = $this->actingAs($this->adminA, 'sanctum')->get("/api/v1/payroll/runs/{$run->id}/export-bank-csv");
        $res->assertStatus(200);
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));

        $csvOutput = $res->streamedContent();
        $this->assertStringContainsString('Employee Code', $csvOutput);
        $this->assertStringContainsString('Bank Name', $csvOutput);
        $this->assertStringContainsString('EMP-001', $csvOutput);
        $this->assertStringContainsString('City Bank Ltd', $csvOutput);
        $this->assertStringContainsString('CBL-999888', $csvOutput);
        $this->assertStringContainsString('50000.00', $csvOutput);
    }

    public function test_tenant_isolation_prevents_cross_tenant_access(): void
    {
        $structureA = SalaryStructure::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Secret Org A Structure',
        ]);

        $runA = PayrollRun::create([
            'organization_id' => $this->orgA->id,
            'batch_number' => 'PAY-A-2026-11',
            'year' => 2026,
            'month' => 11,
        ]);

        // Tenant B lists structures
        $resStructures = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/payroll/structures');
        $resStructures->assertStatus(200);
        $this->assertEmpty($resStructures->json('data'));

        // Tenant B attempts to fetch Tenant A structure
        $resFetch = $this->actingAs($this->adminB, 'sanctum')->getJson("/api/v1/payroll/structures/{$structureA->id}");
        $resFetch->assertStatus(404);

        // Tenant B lists runs
        $resRuns = $this->actingAs($this->adminB, 'sanctum')->getJson('/api/v1/payroll/runs');
        $resRuns->assertStatus(200);
        $this->assertEmpty($resRuns->json('data'));

        // Tenant B attempts to calculate Tenant A run
        $resCalc = $this->actingAs($this->adminB, 'sanctum')->postJson("/api/v1/payroll/runs/{$runA->id}/calculate");
        $resCalc->assertStatus(404);
    }
}
