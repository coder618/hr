<?php

namespace Modules\Leave\Services;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Modules\Employee\Entities\Employee;
use Modules\Leave\Entities\Holiday;
use Modules\Leave\Entities\LeaveBalance;
use Modules\Leave\Entities\LeaveType;
use RuntimeException;

class LeaveCalculationService
{
    /**
     * Calculate net working leave days excluding weekends and holidays.
     */
    public function calculateWorkingDays(
        int $organizationId,
        int $employeeId,
        string $fromDate,
        string $toDate,
        bool $isHalfDay = false
    ): float {
        if ($isHalfDay) {
            return 0.5;
        }

        $from = Carbon::parse($fromDate);
        $to = Carbon::parse($toDate);

        if ($to->lessThan($from)) {
            throw new RuntimeException("End date cannot be earlier than start date.");
        }

        $employee = Employee::withoutGlobalScopes()->where('id', $employeeId)->first();
        $branchId = $employee?->branch_id;

        // Fetch applicable holidays in range
        $holidays = Holiday::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id');
                if ($branchId) {
                    $q->orWhere('branch_id', $branchId);
                }
            })
            ->where(function ($q) use ($fromDate, $toDate) {
                $q->whereBetween('from_date', [$fromDate, $toDate])
                    ->orWhereBetween('to_date', [$fromDate, $toDate])
                    ->orWhere(function ($inner) use ($fromDate, $toDate) {
                        $inner->where('from_date', '<=', $fromDate)
                            ->where('to_date', '>=', $toDate);
                    });
            })
            ->get();

        $workingDays = 0;
        $period = CarbonPeriod::create($from, $to);

        foreach ($period as $date) {
            // Check weekend (Saturday = 6, Sunday = 0)
            if (in_array($date->dayOfWeek, [0, 6])) {
                continue;
            }

            // Check if falls on holiday
            $isHoliday = $holidays->contains(function ($holiday) use ($date) {
                $hFrom = Carbon::parse($holiday->from_date);
                $hTo = Carbon::parse($holiday->to_date);
                return $date->betweenIncluded($hFrom, $hTo);
            });

            if ($isHoliday) {
                continue;
            }

            $workingDays++;
        }

        return (float) $workingDays;
    }

    /**
     * Validate leave application rules against employee, leave type and balance.
     */
    public function validateApplicationRules(
        Employee $employee,
        LeaveType $leaveType,
        float $requestedDays,
        int $year,
        ?int $attachmentMediaId = null
    ): void {
        // 1. Gender restriction check
        if ($leaveType->gender_restriction !== 'any') {
            if (strtolower($employee->gender ?? '') !== strtolower($leaveType->gender_restriction)) {
                throw new RuntimeException("This leave type is only applicable for {$leaveType->gender_restriction} employees.");
            }
        }

        // 2. Max consecutive days
        if ($leaveType->max_consecutive_days && $requestedDays > $leaveType->max_consecutive_days) {
            throw new RuntimeException("Requested days ({$requestedDays}) exceeds maximum consecutive limit of {$leaveType->max_consecutive_days} days.");
        }

        // 3. Attachment requirement
        if ($leaveType->requires_attachment && empty($attachmentMediaId)) {
            throw new RuntimeException("Supporting document attachment is required for {$leaveType->name}.");
        }

        // 4. Balance check
        if ($leaveType->type === 'paid') {
            $balance = LeaveBalance::withoutGlobalScopes()
                ->where('organization_id', $employee->organization_id)
                ->where('employee_id', $employee->id)
                ->where('leave_type_id', $leaveType->id)
                ->where('year', $year)
                ->first();

            $available = $balance ? $balance->available_days : 0;
            if ($requestedDays > $available) {
                throw new RuntimeException("Insufficient leave balance. Available: {$available} days, Requested: {$requestedDays} days.");
            }
        }
    }
}
