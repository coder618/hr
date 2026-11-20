<?php

namespace Modules\Core\Contracts;

interface AttendanceLookupContract
{
    /**
     * Get monthly attendance summary for an employee.
     *
     * @param int $employeeId
     * @param string $month Format 'YYYY-MM'
     * @return array{
     *     total_days: int,
     *     present_days: int,
     *     late_days: int,
     *     half_days: int,
     *     absent_days: int,
     *     total_work_minutes: int,
     *     total_overtime_minutes: int,
     *     total_late_minutes: int
     * }
     */
    public function getEmployeeMonthlySummary(int $employeeId, string $month): array;
}
