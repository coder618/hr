<?php

namespace Modules\Core\Contracts;

interface EmployeeLookupContract
{
    /**
     * Get a lightweight summary array of an employee by ID.
     */
    public function getEmployeeSummary(int $employeeId): ?array;

    /**
     * Get an array of active employee IDs for an organization and optional branch.
     *
     * @return int[]
     */
    public function getActiveEmployeeIds(int $organizationId, ?int $branchId = null): array;
}
