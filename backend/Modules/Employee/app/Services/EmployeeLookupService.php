<?php

namespace Modules\Employee\Services;

use Modules\Core\Contracts\EmployeeLookupContract;
use Modules\Employee\Entities\Employee;

class EmployeeLookupService implements EmployeeLookupContract
{
    /**
     * Get a lightweight summary array of an employee by ID.
     */
    public function getEmployeeSummary(int $employeeId): ?array
    {
        $employee = Employee::withoutGlobalScopes()
            ->with(['branch', 'department', 'designation'])
            ->find($employeeId);

        if (!$employee) {
            return null;
        }

        return [
            'id' => $employee->id,
            'uuid' => $employee->uuid,
            'name' => $employee->full_name,
            'employee_code' => $employee->employee_code,
            'email' => $employee->email,
            'branch_id' => $employee->branch_id,
            'branch_name' => $employee->branch?->name,
            'department_id' => $employee->department_id,
            'department_name' => $employee->department?->name,
            'designation_name' => $employee->designation?->name,
            'status' => $employee->status,
        ];
    }

    /**
     * Get an array of active employee IDs for an organization and optional branch.
     *
     * @return int[]
     */
    public function getActiveEmployeeIds(int $organizationId, ?int $branchId = null): array
    {
        $query = Employee::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('status', 'active');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->pluck('id')->toArray();
    }
}
