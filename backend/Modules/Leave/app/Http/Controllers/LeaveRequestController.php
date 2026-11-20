<?php

namespace Modules\Leave\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Core\Services\TenantContext;
use Modules\Employee\Entities\Employee;
use Modules\Leave\Entities\Holiday;
use Modules\Leave\Entities\LeaveBalance;
use Modules\Leave\Entities\LeaveRequest;
use Modules\Leave\Entities\LeaveType;
use Modules\Leave\Services\LeaveCalculationService;
use RuntimeException;

class LeaveRequestController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext,
        protected LeaveCalculationService $calculationService
    ) {}

    /**
     * Preview calculated working days before applying.
     */
    public function calculateDays(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'is_half_day' => 'boolean',
        ]);

        $employeeId = $validated['employee_id'] ?? null;
        if (!$employeeId) {
            $emp = Employee::where('user_id', $request->user()->id)->first();
            $employeeId = $emp?->id;
        }

        if (!$employeeId) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        try {
            $workingDays = $this->calculationService->calculateWorkingDays(
                $this->tenantContext->getTenantId(),
                $employeeId,
                $validated['from_date'],
                $validated['to_date'],
                $validated['is_half_day'] ?? false
            );

            return response()->json(['working_days' => $workingDays]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['employee', 'leaveType', 'actionedBy', 'attachment']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('from_date') && $request->filled('to_date')) {
            $query->whereBetween('from_date', [$request->query('from_date'), $request->query('to_date')]);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate($request->query('per_page', 15));

        return response()->json($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'is_half_day' => 'boolean',
            'half_day_session' => 'nullable|in:morning,afternoon',
            'reason' => 'required|string|max:1000',
            'attachment_media_id' => 'nullable|exists:media,id',
        ]);

        $employeeId = $validated['employee_id'] ?? null;
        if (!$employeeId) {
            $emp = Employee::where('user_id', $request->user()->id)->first();
            $employeeId = $emp?->id;
        }

        if (!$employeeId) {
            return response()->json(['message' => 'Employee record not found for current user.'], 404);
        }

        $employee = Employee::findOrFail($employeeId);
        $leaveType = LeaveType::findOrFail($validated['leave_type_id']);

        $isHalfDay = !empty($validated['is_half_day']);
        $workingDays = $this->calculationService->calculateWorkingDays(
            $this->tenantContext->getTenantId(),
            $employeeId,
            $validated['from_date'],
            $validated['to_date'],
            $isHalfDay
        );

        if ($workingDays <= 0) {
            return response()->json([
                'message' => 'Selected date range contains 0 working days (all dates fall on weekends or holidays).',
            ], 422);
        }

        $year = Carbon::parse($validated['from_date'])->year;

        try {
            $this->calculationService->validateApplicationRules(
                $employee,
                $leaveType,
                $workingDays,
                $year,
                $validated['attachment_media_id'] ?? null
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Increment pending days on balance
        if ($leaveType->type === 'paid') {
            $balance = LeaveBalance::where('employee_id', $employeeId)
                ->where('leave_type_id', $leaveType->id)
                ->where('year', $year)
                ->first();

            if ($balance) {
                $balance->increment('pending_days', $workingDays);
            }
        }

        $leaveRequest = LeaveRequest::create([
            'organization_id' => $this->tenantContext->getTenantId(),
            'employee_id' => $employeeId,
            'leave_type_id' => $leaveType->id,
            'from_date' => $validated['from_date'],
            'to_date' => $validated['to_date'],
            'total_days' => $workingDays,
            'is_half_day' => $isHalfDay,
            'half_day_session' => $validated['half_day_session'] ?? null,
            'reason' => $validated['reason'],
            'attachment_media_id' => $validated['attachment_media_id'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Leave request submitted successfully.',
            'data' => $leaveRequest->load(['employee', 'leaveType']),
        ], 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $leaveRequest = LeaveRequest::findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return response()->json([
                'message' => "Cannot approve a leave request with status {$leaveRequest->status}.",
            ], 422);
        }

        $year = Carbon::parse($leaveRequest->from_date)->year;

        // Update balance: deduct pending_days, add used_days
        $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveRequest->leave_type_id)
            ->where('year', $year)
            ->first();

        if ($balance) {
            $balance->pending_days = max(0, $balance->pending_days - $leaveRequest->total_days);
            $balance->used_days += $leaveRequest->total_days;
            $balance->save();
        }

        $leaveRequest->update([
            'status' => 'approved',
            'actioned_by_user_id' => $request->user()->id,
            'actioned_at' => Carbon::now(),
        ]);

        // Update / create Attendance Records marking status = 'on_leave'
        $period = CarbonPeriod::create($leaveRequest->from_date, $leaveRequest->to_date);
        foreach ($period as $date) {
            if (in_array($date->dayOfWeek, [0, 6])) {
                continue; // Skip weekends
            }

            $dateStr = $date->format('Y-m-d');
            $record = AttendanceRecord::firstOrNew([
                'organization_id' => $leaveRequest->organization_id,
                'employee_id' => $leaveRequest->employee_id,
                'date' => $dateStr,
            ]);

            $record->status = 'on_leave';
            $record->work_minutes = 0;
            $record->break_minutes = 0;
            $record->overtime_minutes = 0;
            $record->notes = "Approved {$leaveRequest->leaveType?->name} (#{$leaveRequest->id})";
            $record->save();
        }

        return response()->json([
            'message' => 'Leave request approved successfully.',
            'data' => $leaveRequest->load(['employee', 'leaveType', 'actionedBy']),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $leaveRequest = LeaveRequest::findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return response()->json([
                'message' => "Cannot reject a leave request with status {$leaveRequest->status}.",
            ], 422);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $year = Carbon::parse($leaveRequest->from_date)->year;

        // Restore pending_days on balance
        $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveRequest->leave_type_id)
            ->where('year', $year)
            ->first();

        if ($balance) {
            $balance->pending_days = max(0, $balance->pending_days - $leaveRequest->total_days);
            $balance->save();
        }

        $leaveRequest->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'actioned_by_user_id' => $request->user()->id,
            'actioned_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'Leave request rejected.',
            'data' => $leaveRequest->load(['employee', 'leaveType', 'actionedBy']),
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $leaveRequest = LeaveRequest::findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending leave requests can be cancelled.',
            ], 422);
        }

        $year = Carbon::parse($leaveRequest->from_date)->year;

        // Restore pending_days
        $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveRequest->leave_type_id)
            ->where('year', $year)
            ->first();

        if ($balance) {
            $balance->pending_days = max(0, $balance->pending_days - $leaveRequest->total_days);
            $balance->save();
        }

        $leaveRequest->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Leave request cancelled successfully.',
            'data' => $leaveRequest,
        ]);
    }

    /**
     * Calendar view of leaves and holidays in a month.
     */
    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer',
        ]);

        $month = (int) $request->query('month');
        $year = (int) $request->query('year');

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth()->format('Y-m-d');
        $endOfMonth = Carbon::createFromDate($year, $month, 1)->endOfMonth()->format('Y-m-d');

        $leaves = LeaveRequest::with(['employee', 'leaveType'])
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

        $holidays = Holiday::with('branch')
            ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('from_date', [$startOfMonth, $endOfMonth])
                    ->orWhereBetween('to_date', [$startOfMonth, $endOfMonth])
                    ->orWhere(function ($inner) use ($startOfMonth, $endOfMonth) {
                        $inner->where('from_date', '<=', $startOfMonth)
                            ->where('to_date', '>=', $endOfMonth);
                    });
            })
            ->get();

        return response()->json([
            'leaves' => $leaves,
            'holidays' => $holidays,
        ]);
    }
}
