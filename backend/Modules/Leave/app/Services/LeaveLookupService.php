<?php

namespace Modules\Leave\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Modules\Core\Contracts\LeaveLookupContract;
use Modules\Leave\Entities\LeaveRequest;

class LeaveLookupService implements LeaveLookupContract
{
    /**
     * Check if an employee is on approved leave for a specific date.
     */
    public function isEmployeeOnLeave(int $organizationId, int $employeeId, string $date): ?array
    {
        $leave = LeaveRequest::withoutGlobalScopes()
            ->with('leaveType')
            ->where('organization_id', $organizationId)
            ->where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('from_date', '<=', $date)
            ->where('to_date', '>=', $date)
            ->first();

        if (!$leave) {
            return null;
        }

        return [
            'id' => $leave->id,
            'leave_type_id' => $leave->leave_type_id,
            'leave_type_name' => $leave->leaveType?->name ?? 'Leave',
            'is_half_day' => (bool) $leave->is_half_day,
            'half_day_session' => $leave->half_day_session,
            'reason' => $leave->reason,
        ];
    }

    /**
     * Get all approved leaves for an organization on a given date.
     */
    public function getApprovedLeavesForDate(int $organizationId, string $date): Collection
    {
        return LeaveRequest::withoutGlobalScopes()
            ->with(['employee', 'leaveType'])
            ->where('organization_id', $organizationId)
            ->where('status', 'approved')
            ->where('from_date', '<=', $date)
            ->where('to_date', '>=', $date)
            ->get();
    }

    /**
     * Get leave summary statistics for an employee in a given month.
     */
    public function getMonthlyLeaveSummary(int $organizationId, int $employeeId, int $year, int $month): array
    {
        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth()->format('Y-m-d');
        $endOfMonth = Carbon::createFromDate($year, $month, 1)->endOfMonth()->format('Y-m-d');

        $requests = LeaveRequest::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('from_date', [$startOfMonth, $endOfMonth])
                    ->orWhereBetween('to_date', [$startOfMonth, $endOfMonth])
                    ->orWhere(function ($inner) use ($startOfMonth, $endOfMonth) {
                        $inner->where('from_date', '<=', $startOfMonth)
                            ->where('to_date', '>=', $endOfMonth);
                    });
            })
            ->get();

        $totalDays = $requests->sum('total_days');

        return [
            'total_approved_leaves' => $requests->count(),
            'total_leave_days' => (float) $totalDays,
        ];
    }
}
