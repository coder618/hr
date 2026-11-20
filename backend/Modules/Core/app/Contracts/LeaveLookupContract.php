<?php

namespace Modules\Core\Contracts;

use Illuminate\Support\Collection;

interface LeaveLookupContract
{
    /**
     * Check if an employee is on approved leave for a specific date.
     * Returns leave details array if true, null if not on leave.
     */
    public function isEmployeeOnLeave(int $organizationId, int $employeeId, string $date): ?array;

    /**
     * Get all approved leaves for an organization on a given date.
     */
    public function getApprovedLeavesForDate(int $organizationId, string $date): Collection;

    /**
     * Get leave summary statistics for an employee in a given month.
     */
    public function getMonthlyLeaveSummary(int $organizationId, int $employeeId, int $year, int $month): array;
}
