<?php

namespace Modules\Employee\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeImportExportController extends Controller
{
    use ApiResponseTrait;

    /**
     * Stream CSV export with zero memory overhead (cPanel safe).
     */
    public function export(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="employees_' . date('Y-m-d_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            // Add UTF-8 BOM for Microsoft Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            // Header row
            fputcsv($handle, [
                'employee_code',
                'first_name',
                'last_name',
                'email',
                'phone',
                'branch_code',
                'department_name',
                'designation_name',
                'employment_type',
                'status',
                'joining_date',
            ]);

            // Stream rows lazily in chunks of 100
            Employee::with(['branch', 'department', 'designation'])
                ->orderBy('id')
                ->lazy(100)
                ->each(function ($emp) use ($handle) {
                    fputcsv($handle, [
                        $emp->employee_code,
                        $emp->first_name,
                        $emp->last_name,
                        $emp->email,
                        $emp->phone ?? '',
                        $emp->branch?->code ?? '',
                        $emp->department?->name ?? '',
                        $emp->designation?->name ?? '',
                        $emp->employment_type,
                        $emp->status,
                        $emp->joining_date ? $emp->joining_date->format('d-m-Y') : '',
                    ]);
                });

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Chunked CSV import validating rows and resolving organizational entities.
     */
    public function import(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $path = $file->getRealPath();
        $handle = fopen($path, 'r');

        if (!$handle) {
            return $this->errorResponse('Failed to open uploaded CSV file.');
        }

        // Read header
        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return $this->errorResponse('Empty CSV file provided.');
        }

        // Normalize header keys (lowercase, trim, strip BOM)
        $cleanHeaders = array_map(function ($h) {
            $h = preg_replace('/[\xEF\xBB\xBF]/', '', $h);
            return strtolower(trim($h));
        }, $header);

        $requiredHeaders = ['employee_code', 'first_name', 'last_name', 'email', 'branch_code'];
        foreach ($requiredHeaders as $req) {
            if (!in_array($req, $cleanHeaders)) {
                fclose($handle);
                return $this->errorResponse("Missing required column in CSV: '{$req}'.");
            }
        }

        $headerMap = array_flip($cleanHeaders);

        // Preload branches, departments, designations to minimize queries
        $branches = Branch::where('organization_id', $tenantId)->get()->keyBy(fn ($b) => strtolower($b->code));
        $departments = Department::where('organization_id', $tenantId)->get()->keyBy(fn ($d) => strtolower($d->name));
        $designations = Designation::where('organization_id', $tenantId)->get()->keyBy(fn ($d) => strtolower($d->name));

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $rowNumber = 1;

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                // Skip blank lines
                if (empty(array_filter($row))) {
                    continue;
                }

                $rowData = [];
                foreach ($headerMap as $col => $idx) {
                    $rowData[$col] = isset($row[$idx]) ? trim($row[$idx]) : '';
                }

                $code = $rowData['employee_code'] ?? '';
                $firstName = $rowData['first_name'] ?? '';
                $lastName = $rowData['last_name'] ?? '';
                $email = $rowData['email'] ?? '';
                $branchCode = strtolower($rowData['branch_code'] ?? '');

                if (empty($code) || empty($firstName) || empty($lastName) || empty($email) || empty($branchCode)) {
                    $errors[] = "Row {$rowNumber}: Missing mandatory fields.";
                    $skipped++;
                    continue;
                }

                $branch = $branches->get($branchCode);
                if (!$branch) {
                    $errors[] = "Row {$rowNumber}: Branch with code '{$rowData['branch_code']}' not found.";
                    $skipped++;
                    continue;
                }

                $deptName = strtolower($rowData['department_name'] ?? '');
                $deptId = null;
                if (!empty($deptName)) {
                    $dept = $departments->get($deptName);
                    if (!$dept) {
                        $dept = Department::create([
                            'organization_id' => $tenantId,
                            'branch_id' => $branch->id,
                            'name' => $rowData['department_name'],
                        ]);
                        $departments->put($deptName, $dept);
                    }
                    $deptId = $dept->id;
                }

                $desigName = strtolower($rowData['designation_name'] ?? '');
                $desigId = null;
                if (!empty($desigName)) {
                    $desig = $designations->get($desigName);
                    if (!$desig) {
                        $desig = Designation::create([
                            'organization_id' => $tenantId,
                            'name' => $rowData['designation_name'],
                        ]);
                        $designations->put($desigName, $desig);
                    }
                    $desigId = $desig->id;
                }

                $joiningDate = !empty($rowData['joining_date']) ? date('Y-m-d', strtotime($rowData['joining_date'])) : date('Y-m-d');
                $employmentType = in_array($rowData['employment_type'] ?? '', ['full_time', 'part_time', 'contract', 'intern'])
                    ? $rowData['employment_type']
                    : 'full_time';
                $status = in_array($rowData['status'] ?? '', ['active', 'probation', 'suspended', 'terminated', 'resigned'])
                    ? $rowData['status']
                    : 'active';

                $existing = Employee::where('organization_id', $tenantId)
                    ->where(function ($q) use ($code, $email) {
                        $q->where('employee_code', $code)->orWhere('email', $email);
                    })
                    ->first();

                if ($existing) {
                    $existing->update([
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'phone' => $rowData['phone'] ?? $existing->phone,
                        'branch_id' => $branch->id,
                        'department_id' => $deptId ?? $existing->department_id,
                        'designation_id' => $desigId ?? $existing->designation_id,
                        'employment_type' => $employmentType,
                        'status' => $status,
                        'joining_date' => $joiningDate,
                    ]);
                    $updated++;
                } else {
                    Employee::create([
                        'organization_id' => $tenantId,
                        'employee_code' => $code,
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $email,
                        'phone' => $rowData['phone'] ?? null,
                        'branch_id' => $branch->id,
                        'department_id' => $deptId,
                        'designation_id' => $desigId,
                        'employment_type' => $employmentType,
                        'status' => $status,
                        'joining_date' => $joiningDate,
                    ]);
                    $imported++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($handle);
            return $this->errorResponse('CSV import failed: ' . $e->getMessage());
        }

        fclose($handle);

        return $this->successResponse([
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 20), // return top 20 errors
        ], 'CSV processing complete.');
    }
}
