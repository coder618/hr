<?php

namespace Modules\Attendance\Services;

use Carbon\Carbon;
use Modules\Core\Contracts\ShiftResolverContract;
use Modules\Core\Contracts\LeaveLookupContract;
use Modules\Employee\Entities\Employee;
use Modules\Attendance\Entities\AttendanceLog;
use Modules\Attendance\Entities\AttendanceRecord;

class AttendanceProcessorService
{
    public function __construct(
        protected ShiftResolverContract $shiftResolver,
        protected ?LeaveLookupContract $leaveLookup = null
    ) {}

    /**
     * Process daily attendance for a specific employee on a target date.
     */
    public function processEmployeeDate(int $employeeId, string|Carbon $date): AttendanceRecord
    {
        $employee = Employee::withoutGlobalScopes()->findOrFail($employeeId);
        $carbonDate = $date instanceof Carbon ? $date->copy()->startOfDay() : Carbon::parse($date)->startOfDay();
        $dateStr = $carbonDate->format('Y-m-d');
        $orgId = $employee->organization_id;

        // 1. Resolve shift definition
        $shiftData = $this->shiftResolver->resolveForEmployee($employeeId, $carbonDate);

        $shiftId = $shiftData['shift_id'] ?? null;
        $isOvernight = $shiftData['is_overnight'] ?? false;
        $totalWorkMinutes = $shiftData['total_work_minutes'] ?? 480;
        $breakMinutes = $shiftData['break_minutes'] ?? 60;
        $halfDayThreshold = $shiftData['half_day_threshold_minutes'] ?? 240;

        $expectedIn = !empty($shiftData['expected_clock_in']) ? Carbon::parse($shiftData['expected_clock_in']) : null;
        $expectedOut = !empty($shiftData['expected_clock_out']) ? Carbon::parse($shiftData['expected_clock_out']) : null;
        $lateThreshold = !empty($shiftData['late_threshold']) ? Carbon::parse($shiftData['late_threshold']) : null;
        $earlyExitThreshold = !empty($shiftData['early_exit_threshold']) ? Carbon::parse($shiftData['early_exit_threshold']) : null;

        // 2. Determine punch search window (handle overnight shift rollover)
        if ($isOvernight && $expectedIn) {
            $windowStart = $expectedIn->copy()->subHours(4);
            $windowEnd = $expectedOut ? $expectedOut->copy()->addHours(6) : $expectedIn->copy()->addHours(18);
        } else {
            $windowStart = $carbonDate->copy()->startOfDay();
            $windowEnd = $carbonDate->copy()->endOfDay();
        }

        // 3. Fetch punches in the window
        $punches = AttendanceLog::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('employee_id', $employeeId)
            ->whereBetween('punch_time', [$windowStart->toDateTimeString(), $windowEnd->toDateTimeString()])
            ->orderBy('punch_time', 'asc')
            ->get();

        $record = AttendanceRecord::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('employee_id', $employeeId)
            ->whereDate('date', $dateStr)
            ->first();

        if (!$record) {
            $record = new AttendanceRecord();
            $record->organization_id = $orgId;
            $record->employee_id = $employeeId;
            $record->date = $dateStr;
        }

        $record->shift_id = $shiftId;

        // If no punches recorded
        if ($punches->isEmpty()) {
            // If already approved through regularization, preserve it
            if ($record->regularization_status === 'approved') {
                return $record;
            }

            if ($this->leaveLookup && $this->leaveLookup->isEmployeeOnLeave($orgId, $employeeId, $dateStr)) {
                $record->status = 'on_leave';
            } else {
                $isWeekend = in_array($carbonDate->dayOfWeek, [0, 6]);
                $record->status = $isWeekend ? 'day_off' : 'absent';
            }
            $record->work_minutes = 0;
            $record->overtime_minutes = 0;
            $record->is_late = false;
            $record->late_minutes = 0;
            $record->is_early_leave = false;
            $record->early_leave_minutes = 0;
            $record->clock_in = null;
            $record->clock_out = null;
            $record->save();

            return $record;
        }

        // 4. Calculate earliest punch in and latest punch out
        $firstPunch = $punches->first();
        $lastPunch = $punches->count() > 1 ? $punches->last() : $firstPunch;

        $clockIn = Carbon::parse($firstPunch->punch_time);
        $clockOut = $punches->count() > 1 ? Carbon::parse($lastPunch->punch_time) : null;

        $record->clock_in = $clockIn;
        $record->clock_out = $clockOut;

        // 5. Calculate work minutes & breaks
        $rawMinutes = $clockOut ? (int) abs($clockOut->diffInMinutes($clockIn)) : 0;
        $actualWorkMinutes = max(0, $rawMinutes - ($rawMinutes > $breakMinutes ? $breakMinutes : 0));
        $record->work_minutes = $actualWorkMinutes;
        $record->break_minutes = $rawMinutes > $breakMinutes ? $breakMinutes : 0;

        // 6. Calculate Late & Early Exit metrics
        $isLate = false;
        $lateMins = 0;
        if ($expectedIn && $lateThreshold && $clockIn->greaterThan($lateThreshold)) {
            $isLate = true;
            $lateMins = (int) abs($clockIn->diffInMinutes($expectedIn));
        }
        $record->is_late = $isLate;
        $record->late_minutes = $lateMins;

        $isEarly = false;
        $earlyMins = 0;
        if ($expectedOut && $earlyExitThreshold && $clockOut && $clockOut->lessThan($earlyExitThreshold)) {
            $isEarly = true;
            $earlyMins = (int) abs($expectedOut->diffInMinutes($clockOut));
        }
        $record->is_early_leave = $isEarly;
        $record->early_leave_minutes = $earlyMins;

        // 7. Calculate Overtime
        $overtime = 0;
        if ($actualWorkMinutes > $totalWorkMinutes) {
            $overtime = $actualWorkMinutes - $totalWorkMinutes;
        }
        $record->overtime_minutes = $overtime;

        // 8. Determine attendance status
        if ($actualWorkMinutes < $halfDayThreshold) {
            $record->status = 'half_day';
        } elseif ($isLate) {
            $record->status = 'late';
        } else {
            $record->status = 'present';
        }

        $record->save();

        return $record;
    }

    /**
     * Process daily attendance for all active employees of an organization.
     */
    public function processOrganizationDate(int $organizationId, string|Carbon $date): int
    {
        $processed = 0;

        Employee::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->select('id', 'organization_id')
            ->chunk(100, function ($employees) use ($date, &$processed) {
                foreach ($employees as $emp) {
                    $this->processEmployeeDate($emp->id, $date);
                    $processed++;
                }
            });

        return $processed;
    }
}
