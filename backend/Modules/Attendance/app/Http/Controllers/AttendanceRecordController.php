<?php

namespace Modules\Attendance\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Attendance\Services\AttendanceProcessorService;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;

class AttendanceRecordController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected AttendanceProcessorService $processor
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = AttendanceRecord::with([
            'employee:id,first_name,last_name,employee_code,branch_id,department_id',
            'employee.branch:id,name,code',
            'employee.department:id,name',
            'shift:id,name,code,start_time,end_time',
        ]);

        if ($request->filled('start_date')) {
            $query->whereDate('date', '>=', $request->query('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('date', '<=', $request->query('end_date'));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('regularization_status')) {
            $query->where('regularization_status', $request->query('regularization_status'));
        }

        if ($request->filled('branch_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('branch_id', $request->query('branch_id'));
            });
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->query('department_id'));
            });
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        $records = $query->orderBy('date', 'desc')->paginate($perPage);

        return $this->successResponse($records->items(), 'Attendance records retrieved.', [
            'current_page' => $records->currentPage(),
            'per_page' => $records->perPage(),
            'total' => $records->total(),
            'last_page' => $records->lastPage(),
        ]);
    }

    /**
     * Submit an attendance regularization request (by employee or admin).
     */
    public function regularize(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'record_id' => 'required|exists:attendance_records,id',
            'clock_in' => 'required|date_format:H:i',
            'clock_out' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        $record = AttendanceRecord::findOrFail($validated['record_id']);

        $record->update([
            'regularization_status' => 'pending',
            'regularization_reason' => $validated['reason'],
            'notes' => "Regularization requested: Clock In {$validated['clock_in']}, Clock Out {$validated['clock_out']}. Reason: {$validated['reason']}",
        ]);

        return $this->successResponse($record, 'Regularization request submitted successfully.');
    }

    /**
     * Approve regularization and recalculate attendance metrics.
     */
    public function approveRegularization(Request $request, int $id): JsonResponse
    {
        $record = AttendanceRecord::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'clock_in' => 'nullable|date_format:H:i',
            'clock_out' => 'nullable|date_format:H:i',
        ]);

        $dateStr = Carbon::parse($record->date)->format('Y-m-d');
        if (!empty($validated['clock_in'])) {
            $record->clock_in = Carbon::parse("{$dateStr} {$validated['clock_in']}");
        }
        if (!empty($validated['clock_out'])) {
            $record->clock_out = Carbon::parse("{$dateStr} {$validated['clock_out']}");
        }

        $record->regularization_status = 'approved';
        $record->approved_by = $user->id;
        $record->status = 'present';
        $record->is_late = false;
        $record->late_minutes = 0;

        if ($record->clock_in && $record->clock_out) {
            $rawMins = (int) abs(Carbon::parse($record->clock_out)->diffInMinutes(Carbon::parse($record->clock_in)));
            $record->work_minutes = max(0, $rawMins - ($record->break_minutes ?? 0));
        }

        $record->save();

        return $this->successResponse($record, 'Regularization request approved.');
    }

    /**
     * Reject regularization request.
     */
    public function rejectRegularization(Request $request, int $id): JsonResponse
    {
        $record = AttendanceRecord::findOrFail($id);
        $record->update([
            'regularization_status' => 'rejected',
            'approved_by' => $request->user()->id,
        ]);

        return $this->successResponse($record, 'Regularization request rejected.');
    }
}
