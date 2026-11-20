<?php

namespace Modules\Shift\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Modules\Core\Contracts\ShiftResolverContract;
use Modules\Employee\Entities\Employee;
use Modules\Shift\Entities\Shift;
use Modules\Shift\Entities\ShiftAssignment;

class ShiftResolverService implements ShiftResolverContract
{
    /**
     * Resolve the active shift definition for an employee on a specific date.
     */
    public function resolveForEmployee(int $employeeId, CarbonInterface|string $date): ?array
    {
        $employee = Employee::withoutGlobalScopes()->find($employeeId);
        if (!$employee) {
            return null;
        }

        $carbonDate = $date instanceof Carbon ? $date->copy()->startOfDay() : Carbon::parse($date)->startOfDay();
        $dateStr = $carbonDate->format('Y-m-d');
        $dayOfWeek = $carbonDate->dayOfWeek; // 0=Sunday..6=Saturday
        $orgId = $employee->organization_id;

        $source = 'default';
        $shift = null;

        // 1. Direct Employee Assignment
        $assignment = ShiftAssignment::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('assignable_type', 'employee')
            ->where('assignable_id', $employeeId)
            ->where('is_active', true)
            ->where('start_date', '<=', $dateStr)
            ->where(function ($q) use ($dateStr) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
            })
            ->where(function ($q) use ($dayOfWeek) {
                $q->whereNull('day_of_week')->orWhere('day_of_week', $dayOfWeek);
            })
            ->with('shift')
            ->orderBy('day_of_week', 'desc') // specific day-of-week takes precedence over generic null
            ->first();

        if ($assignment && $assignment->shift) {
            $shift = $assignment->shift;
            $source = 'employee';
        }

        // 2. Department Fallback Assignment
        if (!$shift && $employee->department_id) {
            $assignment = ShiftAssignment::withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->where('assignable_type', 'department')
                ->where('assignable_id', $employee->department_id)
                ->where('is_active', true)
                ->where('start_date', '<=', $dateStr)
                ->where(function ($q) use ($dateStr) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
                })
                ->where(function ($q) use ($dayOfWeek) {
                    $q->whereNull('day_of_week')->orWhere('day_of_week', $dayOfWeek);
                })
                ->with('shift')
                ->orderBy('day_of_week', 'desc')
                ->first();

            if ($assignment && $assignment->shift) {
                $shift = $assignment->shift;
                $source = 'department';
            }
        }

        // 3. Branch Fallback Assignment
        if (!$shift && $employee->branch_id) {
            $assignment = ShiftAssignment::withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->where('assignable_type', 'branch')
                ->where('assignable_id', $employee->branch_id)
                ->where('is_active', true)
                ->where('start_date', '<=', $dateStr)
                ->where(function ($q) use ($dateStr) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
                })
                ->where(function ($q) use ($dayOfWeek) {
                    $q->whereNull('day_of_week')->orWhere('day_of_week', $dayOfWeek);
                })
                ->with('shift')
                ->orderBy('day_of_week', 'desc')
                ->first();

            if ($assignment && $assignment->shift) {
                $shift = $assignment->shift;
                $source = 'branch';
            }
        }

        // 4. Organization Default Shift Fallback
        if (!$shift) {
            $shift = Shift::withoutGlobalScopes()
                ->where('organization_id', $orgId)
                ->where('is_active', true)
                ->where('is_default', true)
                ->first();

            if (!$shift) {
                // If no default explicitly marked, take first active shift
                $shift = Shift::withoutGlobalScopes()
                    ->where('organization_id', $orgId)
                    ->where('is_active', true)
                    ->first();
            }

            $source = 'organization_default';
        }

        if (!$shift) {
            return null;
        }

        $expectedClockIn = $shift->getExpectedClockIn($carbonDate);
        $expectedClockOut = $shift->getExpectedClockOut($carbonDate);
        $lateThreshold = $shift->getLateThreshold($carbonDate);
        $earlyExitThreshold = $shift->getEarlyExitThreshold($carbonDate);

        return [
            'shift_id' => $shift->id,
            'shift_name' => $shift->name,
            'shift_code' => $shift->code,
            'shift_type' => $shift->type,
            'start_time' => $shift->start_time,
            'end_time' => $shift->end_time,
            'is_overnight' => (bool) $shift->is_overnight,
            'total_work_minutes' => (int) $shift->total_work_minutes,
            'break_minutes' => (int) $shift->break_minutes,
            'grace_period_entry_minutes' => (int) $shift->grace_period_entry_minutes,
            'grace_period_exit_minutes' => (int) $shift->grace_period_exit_minutes,
            'expected_clock_in' => $expectedClockIn?->toIso8601String(),
            'expected_clock_out' => $expectedClockOut?->toIso8601String(),
            'late_threshold' => $lateThreshold?->toIso8601String(),
            'early_exit_threshold' => $earlyExitThreshold?->toIso8601String(),
            'half_day_threshold_minutes' => (int) $shift->half_day_threshold_minutes,
            'full_day_threshold_minutes' => (int) $shift->full_day_threshold_minutes,
            'assignment_source' => $source,
        ];
    }
}
