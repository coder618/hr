<?php

namespace Modules\Payroll\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Payroll\Entities\EmployeeSalary;

class EmployeeSalaryController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = EmployeeSalary::with(['employee.department', 'employee.designation', 'structure.components']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        $salaries = $query->paginate($request->query('per_page', 20));

        return response()->json($salaries);
    }

    public function storeOrUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'salary_structure_id' => 'nullable|exists:salary_structures,id',
            'base_salary' => 'required|numeric|min:0',
            'payment_method' => 'required|in:bank_transfer,cash,cheque',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:50',
            'bank_routing_number' => 'nullable|string|max:50',
            'custom_components' => 'nullable|array',
            'effective_from' => 'nullable|date',
        ]);

        $salary = EmployeeSalary::firstOrNew([
            'organization_id' => $this->tenantContext->getTenantId(),
            'employee_id' => $validated['employee_id'],
        ]);

        $salary->fill($validated);
        $salary->save();

        return response()->json([
            'message' => 'Employee salary profile updated successfully.',
            'data' => $salary->load(['employee', 'structure.components']),
        ], 200);
    }

    public function show(int $employeeId): JsonResponse
    {
        $salary = EmployeeSalary::with(['employee', 'structure.components'])
            ->where('employee_id', $employeeId)
            ->first();

        if (!$salary) {
            return response()->json(['message' => 'Salary profile not found for this employee.'], 404);
        }

        return response()->json(['data' => $salary]);
    }
}
