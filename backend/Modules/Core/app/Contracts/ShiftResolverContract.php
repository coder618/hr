<?php

namespace Modules\Core\Contracts;

use Carbon\CarbonInterface;

interface ShiftResolverContract
{
    /**
     * Resolve the active shift definition for an employee on a specific date.
     *
     * @param int $employeeId
     * @param CarbonInterface|string $date
     * @return array{
     *     shift_id: int,
     *     shift_name: string,
     *     shift_code: string,
     *     shift_type: string,
     *     start_time: ?string,
     *     end_time: ?string,
     *     is_overnight: bool,
     *     total_work_minutes: int,
     *     break_minutes: int,
     *     grace_period_entry_minutes: int,
     *     grace_period_exit_minutes: int,
     *     expected_clock_in: ?string,
     *     expected_clock_out: ?string,
     *     late_threshold: ?string,
     *     early_exit_threshold: ?string,
     *     half_day_threshold_minutes: int,
     *     full_day_threshold_minutes: int,
     *     assignment_source: string
     * }|null
     */
    public function resolveForEmployee(int $employeeId, CarbonInterface|string $date): ?array;
}
