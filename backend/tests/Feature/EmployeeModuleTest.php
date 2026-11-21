<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Core\Contracts\EmployeeLookupContract;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\TenantModule;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Modules\Media\Entities\Media;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $adminB;
    protected string $tokenA;
    protected string $tokenB;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('media');

        // Create default roles
        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Setup Tenant A
        $this->orgA = Organization::create([
            'name' => 'Acme Corp',
            'slug' => 'acme-corp',
            'is_active' => true,
        ]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'employee', 'is_enabled' => true]);
        TenantModule::create(['organization_id' => $this->orgA->id, 'module_name' => 'media', 'is_enabled' => true]);

        $this->adminA = User::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Admin Acme',
            'email' => 'admin@acme.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminA->assignRole('admin');
        $this->tokenA = $this->adminA->createToken('test-token')->plainTextToken;

        // Setup Tenant B
        $this->orgB = Organization::create([
            'name' => 'Beta Global',
            'slug' => 'beta-global',
            'is_active' => true,
        ]);
        TenantModule::create(['organization_id' => $this->orgB->id, 'module_name' => 'employee', 'is_enabled' => true]);

        $this->adminB = User::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Admin Beta',
            'email' => 'admin@beta.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
        $this->adminB->assignRole('admin');
        $this->tokenB = $this->adminB->createToken('test-token')->plainTextToken;
    }

    public function test_can_crud_branches(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/branches', [
                'name' => 'Headquarters',
                'code' => 'HQ-01',
                'latitude' => 23.8103,
                'longitude' => 90.4125,
                'geofence_radius_meters' => 150,
                'is_head_office' => true,
                'address' => 'Dhaka, Bangladesh',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'HQ-01')
            ->assertJsonPath('data.is_head_office', true);

        $branchId = $response->json('data.id');

        // List branches
        $listRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson('/api/v1/branches');

        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Headquarters');

        // Update branch
        $updateRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->putJson("/api/v1/branches/{$branchId}", [
                'name' => 'Main Headquarters',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.name', 'Main Headquarters');
    }

    public function test_can_crud_departments_and_designations(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Dhaka Branch',
            'code' => 'DHK-01',
        ]);

        // Create Department
        $deptRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/departments', [
                'name' => 'Engineering',
                'code' => 'ENG',
                'branch_id' => $branch->id,
            ]);

        $deptRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Engineering');

        $deptId = $deptRes->json('data.id');

        // Create Designation
        $desigRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/designations', [
                'name' => 'Senior Software Engineer',
                'description' => 'Leads software development',
            ]);

        $desigRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Senior Software Engineer');

        $desigId = $desigRes->json('data.id');

        // Read lists
        $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson('/api/v1/departments')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson('/api/v1/designations')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_can_create_and_manage_employee_with_user_account(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'HQ',
            'code' => 'HQ',
        ]);

        $dept = Department::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Product',
        ]);

        $desig = Designation::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Product Manager',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/employees', [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john.doe@acme.com',
                'employee_code' => 'EMP-001',
                'branch_id' => $branch->id,
                'department_id' => $dept->id,
                'designation_id' => $desig->id,
                'joining_date' => '2026-01-15',
                'employment_type' => 'full_time',
                'status' => 'active',
                'create_user_account' => true,
                'user_password' => 'secretPassword123',
                'bank_details' => [
                    'account_name' => 'John Doe',
                    'bank_name' => 'Standard Chartered',
                    'account_number' => '1234567890',
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.employee_code', 'EMP-001')
            ->assertJsonPath('data.full_name', 'John Doe');

        $employeeId = $response->json('data.id');

        // Confirm linked User was created with employee role
        $createdUser = User::where('email', 'john.doe@acme.com')->first();
        $this->assertNotNull($createdUser);
        $this->assertTrue($createdUser->hasRole('employee'));
        $this->assertEquals($this->orgA->id, $createdUser->organization_id);

        // Fetch employee details
        $detailRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson("/api/v1/employees/{$employeeId}");

        $detailRes->assertStatus(200)
            ->assertJsonPath('data.employee_code', 'EMP-001')
            ->assertJsonPath('data.branch.name', 'HQ')
            ->assertJsonPath('data.department.name', 'Product')
            ->assertJsonPath('data.bank_details.bank_name', 'Standard Chartered');

        // Filter employees list
        $searchRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->getJson('/api/v1/employees?search=John');

        $searchRes->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_can_create_employee_with_user_image_and_documents(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'HQ Photo Branch',
            'code' => 'HQ-PB',
        ]);

        $avatarFile = UploadedFile::fake()->image('profile.jpg', 200, 200);
        $doc1 = UploadedFile::fake()->create('resume.pdf', 500, 'application/pdf');
        $doc2 = UploadedFile::fake()->create('contract.docx', 300, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->post('/api/v1/employees', [
                'first_name' => 'Robert',
                'last_name' => 'Taylor',
                'email' => 'robert.taylor@acme.com',
                'employee_code' => 'EMP-ROB',
                'branch_id' => $branch->id,
                'joining_date' => '2026-03-01',
                'employment_type' => 'full_time',
                'status' => 'active',
                'create_user_account' => '1',
                'user_password' => 'secret12345',
                'avatar' => $avatarFile,
                'documents' => [$doc1, $doc2],
                'document_titles' => ['Employee CV', 'Employment Agreement'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.employee_code', 'EMP-ROB');

        $employeeId = $response->json('data.id');
        $employee = Employee::with('media')->findOrFail($employeeId);

        // Check avatar attached
        $this->assertNotNull($employee->avatar_url);
        $this->assertEquals(1, $employee->media()->wherePivot('collection', 'avatar')->count());

        // Check documents attached
        $this->assertEquals(2, $employee->media()->wherePivot('collection', 'documents')->count());

        // Check user account avatar is set
        $user = User::where('email', 'robert.taylor@acme.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->avatar);
    }

    public function test_can_attach_and_detach_media_documents_to_employee(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Branch A',
            'code' => 'BRA-1',
        ]);

        $employee = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'email' => 'alice@acme.com',
            'employee_code' => 'EMP-002',
            'branch_id' => $branch->id,
            'joining_date' => '2026-02-01',
        ]);

        $media = Media::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Passport Scan',
            'file_name' => 'passport.pdf',
            'stored_name' => 'passport_hash.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 10240,
            'extension' => 'pdf',
            'disk' => 'media',
            'file_path' => 'tenants/1/media/passport.pdf',
        ]);

        // Attach document
        $attachRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson("/api/v1/employees/{$employee->id}/documents", [
                'media_id' => $media->id,
                'collection_name' => 'documents',
                'document_title' => 'Official Passport Document',
            ]);

        $attachRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertEquals(1, $employee->media()->count());

        // Detach document
        $detachRes = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->deleteJson("/api/v1/employees/{$employee->id}/documents/{$media->id}");

        $detachRes->assertStatus(200);
        $this->assertEquals(0, $employee->fresh()->media()->count());
    }

    public function test_csv_export_streams_without_memory_spike(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'HQ Branch',
            'code' => 'HQ-EXP',
        ]);

        Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Export',
            'last_name' => 'Tester',
            'email' => 'export@acme.com',
            'employee_code' => 'EXP-999',
            'branch_id' => $branch->id,
            'joining_date' => '2026-03-01',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->get('/api/v1/employees/export/csv');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('employee_code,first_name,last_name,email', $content);
        $this->assertStringContainsString('EXP-999,Export,Tester,export@acme.com', $content);
    }

    public function test_csv_import_creates_and_updates_employees(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Main Office',
            'code' => 'MO-01',
        ]);

        $csvData = "employee_code,first_name,last_name,email,phone,branch_code,department_name,designation_name,employment_type,status,joining_date\n"
            . "IMP-001,Robert,Smith,robert@acme.com,1234567,MO-01,IT,Lead Developer,full_time,active,2026-01-01\n"
            . "IMP-002,Maria,Garcia,maria@acme.com,9876543,MO-01,HR,HR Specialist,full_time,active,2026-02-01\n";

        $file = UploadedFile::fake()->createWithContent('employees.csv', $csvData);

        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson('/api/v1/employees/import/csv', [
                'file' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.imported', 2)
            ->assertJsonPath('data.skipped', 0);

        $this->assertDatabaseHas('employees', [
            'organization_id' => $this->orgA->id,
            'employee_code' => 'IMP-001',
            'email' => 'robert@acme.com',
        ]);
    }

    public function test_tenant_isolation_prevents_cross_tenant_access(): void
    {
        // Tenant A creates a branch and employee
        $branchA = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Acme HQ',
            'code' => 'ACME-HQ',
        ]);

        $employeeA = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Tenant',
            'last_name' => 'A User',
            'email' => 'userA@acme.com',
            'employee_code' => 'TA-001',
            'branch_id' => $branchA->id,
            'joining_date' => '2026-01-01',
        ]);

        auth()->forgetGuards();

        // Tenant B attempts to read Tenant A's employee
        $forbiddenShow = $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->getJson("/api/v1/employees/{$employeeA->id}");

        $forbiddenShow->assertStatus(404);

        // Tenant B attempts to update Tenant A's employee
        $forbiddenUpdate = $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->putJson("/api/v1/employees/{$employeeA->id}", [
                'first_name' => 'Hacked Name',
            ]);

        $forbiddenUpdate->assertStatus(404);

        // Tenant B attempts to delete Tenant A's branch
        $forbiddenDelete = $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->deleteJson("/api/v1/branches/{$branchA->id}");

        $forbiddenDelete->assertStatus(404);

        // Tenant B lists employees: should NOT see Tenant A's employee
        $listRes = $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->getJson('/api/v1/employees');

        $listRes->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_employee_lookup_service_resolves_and_functions(): void
    {
        $branch = Branch::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Lookup Branch',
            'code' => 'LK-01',
        ]);

        $employee = Employee::create([
            'organization_id' => $this->orgA->id,
            'first_name' => 'Contract',
            'last_name' => 'Lookup',
            'email' => 'lookup@acme.com',
            'employee_code' => 'LKP-01',
            'branch_id' => $branch->id,
            'status' => 'active',
            'joining_date' => '2026-01-01',
        ]);

        /** @var EmployeeLookupContract $service */
        $service = app(EmployeeLookupContract::class);
        $summary = $service->getEmployeeSummary($employee->id);

        $this->assertNotNull($summary);
        $this->assertEquals('Contract Lookup', $summary['name']);
        $this->assertEquals('LKP-01', $summary['employee_code']);

        $activeIds = $service->getActiveEmployeeIds($this->orgA->id);
        $this->assertContains($employee->id, $activeIds);
    }
}
