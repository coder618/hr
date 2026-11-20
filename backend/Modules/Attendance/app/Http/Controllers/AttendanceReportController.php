<?php

namespace Modules\Attendance\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceReportController extends Controller
{
    use ApiResponseTrait;

    /**
     * Monthly overview summary metrics for an organization.
     */
    public function summary(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;
        $month = $request->query('month', Carbon::now()->format('Y-m'));

        $start = Carbon::parse($month)->startOfMonth()->toDateString();
        $end = Carbon::parse($month)->endOfMonth()->toDateString();

        $query = AttendanceRecord::where('organization_id', $tenantId)
            ->whereBetween('date', [$start, $end]);

        if ($request->filled('branch_id')) {
            $query->whereHas('employee', fn ($q) => $q->where('branch_id', $request->query('branch_id')));
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee', fn ($q) => $q->where('department_id', $request->query('department_id')));
        }

        $records = $query->get();

        $presentCount = 0;
        $lateCount = 0;
        $halfDayCount = 0;
        $absentCount = 0;
        $totalWorkMinutes = 0;
        $totalOvertimeMinutes = 0;

        foreach ($records as $r) {
            $totalWorkMinutes += $r->work_minutes;
            $totalOvertimeMinutes += $r->overtime_minutes;

            if ($r->status === 'present') $presentCount++;
            elseif ($r->status === 'late') $lateCount++;
            elseif ($r->status === 'half_day') $halfDayCount++;
            elseif ($r->status === 'absent') $absentCount++;
        }

        return $this->successResponse([
            'month' => $month,
            'total_record_days' => $records->count(),
            'present' => $presentCount,
            'late' => $lateCount,
            'half_day' => $halfDayCount,
            'absent' => $absentCount,
            'total_work_hours' => round($totalWorkMinutes / 60, 1),
            'total_overtime_hours' => round($totalOvertimeMinutes / 60, 1),
        ]);
    }

    /**
     * Stream CSV export of attendance records (zero memory spike, safe for cPanel shared hosting).
     */
    public function export(Request $request): StreamedResponse
    {
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="attendance_' . date('Y-m-d_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($startDate, $endDate) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // UTF-8 BOM

            fputcsv($handle, [
                'Date',
                'Employee Code',
                'Employee Name',
                'Branch',
                'Department',
                'Shift',
                'Clock In',
                'Clock Out',
                'Work Hours',
                'Break Minutes',
                'Overtime Hours',
                'Status',
                'Late Minutes',
                'Regularization',
            ]);

            AttendanceRecord::with([
                'employee:id,first_name,last_name,employee_code,branch_id,department_id',
                'employee.branch:id,name',
                'employee.department:id,name',
                'shift:id,name,code',
            ])
                ->whereBetween('date', [$startDate, $endDate])
                ->orderBy('date', 'desc')
                ->lazy(100)
                ->each(function ($r) use ($handle) {
                    fputcsv($handle, [
                        $r->date ? $r->date->format('Y-m-d') : '',
                        $r->employee?->employee_code,
                        $r->employee?->full_name,
                        $r->employee?->branch?->name ?? '',
                        $r->employee?->department?->name ?? '',
                        $r->shift?->name ?? '',
                        $r->clock_in ? $r->clock_in->format('H:i:s') : '',
                        $r->clock_out ? $r->clock_out->format('H:i:s') : '',
                        round($r->work_minutes / 60, 2),
                        $r->break_minutes,
                        round($r->overtime_minutes / 60, 2),
                        $r->status,
                        $r->late_minutes,
                        $r->regularization_status,
                    ]);
                });

            fclose($handle);
        }, 200, $headers);
    }
}
