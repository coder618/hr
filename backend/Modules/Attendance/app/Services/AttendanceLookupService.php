<?php

namespace Modules\Attendance\Services;

use Carbon\Carbon;
use Modules\Core\Contracts\AttendanceLookupContract;
use Modules\Attendance\Entities\AttendanceRecord;

class AttendanceLookupService implements AttendanceLookupContract
{
    /**
     * Get monthly attendance summary for an employee.
     */
    public function getEmployeeMonthlySummary(int $employeeId, string $month): array
    {
        $startOfMonth = Carbon::parse($month)->startOfMonth()->toDateString();
        $endOfMonth = Carbon::parse($month)->endOfMonth()->toDateString();

        $records = AttendanceRecord::withoutGlobalScopes()
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->get();

        $presentDays = 0;
        $lateDays = 0;
        $halfDays = 0;
        $absentDays = 0;
        $totalWorkMinutes = 0;
        $totalOvertimeMinutes = 0;
        $totalLateMinutes = 0;

        foreach ($records as $r) {
            $totalWorkMinutes += $r->work_minutes;
            $totalOvertimeMinutes += $r->overtime_minutes;
            $totalLateMinutes += $r->late_minutes;

            if ($r->status === 'present') {
                $presentDays++;
            } elseif ($r->status === 'late') {
                $lateDays++;
            } elseif ($r->status === 'half_day') {
                $halfDays++;
            } elseif ($r->status === 'absent') {
                $absentDays++;
            }
        }

        return [
            'total_days' => $records->count(),
            'present_days' => $presentDays,
            'late_days' => $lateDays,
            'half_days' => $halfDays,
            'absent_days' => $absentDays,
            'total_work_minutes' => $totalWorkMinutes,
            'total_overtime_minutes' => $totalOvertimeMinutes,
            'total_late_minutes' => $totalLateMinutes,
        ];
    }
}
