<?php

namespace Modules\Shift\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Core\Contracts\ShiftResolverContract;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Employee;
use Modules\Shift\Entities\Shift;
use Modules\Shift\Entities\ShiftAssignment;

class ShiftAssignmentController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = ShiftAssignment::with('shift');

        if ($request->filled('assignable_type')) {
            $query->where('assignable_type', $request->query('assignable_type'));
        }

        if ($request->filled('assignable_id')) {
            $query->where('assignable_id', $request->query('assignable_id'));
        }

        if ($request->filled('shift_id')) {
            $query->where('shift_id', $request->query('shift_id'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $assignments = $query->orderBy('start_date', 'desc')->get();

        return $this->successResponse($assignments);
    }

    public function store(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'shift_id' => 'required|exists:shifts,id',
            'assignable_type' => 'required|string|in:employee,department,branch',
            'assignable_id' => 'required|integer',
            'day_of_week' => 'nullable|integer|between:0,6',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'nullable|boolean',
        ]);

        $assignment = ShiftAssignment::create($validated);

        return $this->successResponse(
            $assignment->load('shift'),
            'Shift assignment created successfully.',
            null,
            201
        );
    }

    /**
     * Batch assign multiple targets (e.g. list of employee IDs or departments) to a shift.
     */
    public function batch(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'shift_id' => 'required|exists:shifts,id',
            'assignable_type' => 'required|string|in:employee,department,branch',
            'assignable_ids' => 'required|array|min:1',
            'assignable_ids.*' => 'required|integer',
            'days_of_week' => 'nullable|array',
            'days_of_week.*' => 'integer|between:0,6',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $shiftId = $validated['shift_id'];
        $type = $validated['assignable_type'];
        $startDate = $validated['start_date'];
        $endDate = $validated['end_date'] ?? null;
        $daysOfWeek = !empty($validated['days_of_week']) ? $validated['days_of_week'] : [null];

        $created = 0;

        DB::transaction(function () use ($validated, $tenantId, $shiftId, $type, $startDate, $endDate, $daysOfWeek, &$created) {
            foreach ($validated['assignable_ids'] as $targetId) {
                foreach ($daysOfWeek as $dow) {
                    ShiftAssignment::create([
                        'organization_id' => $tenantId,
                        'shift_id' => $shiftId,
                        'assignable_type' => $type,
                        'assignable_id' => $targetId,
                        'day_of_week' => $dow,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'is_active' => true,
                    ]);
                    $created++;
                }
            }
        });

        return $this->successResponse([
            'assigned_count' => $created,
        ], "{$created} shift assignment(s) created successfully.");
    }

    public function destroy(int $id): JsonResponse
    {
        $assignment = ShiftAssignment::findOrFail($id);
        $assignment->delete();

        return $this->successResponse(null, 'Shift assignment deleted successfully.');
    }

    /**
     * Preview employee monthly/weekly roster resolved through the ShiftResolverContract.
     */
    public function getEmployeeRoster(
        Request $request,
        int $employeeId,
        ShiftResolverContract $shiftResolver
    ): JsonResponse {
        $employee = Employee::with(['branch', 'department', 'designation'])->findOrFail($employeeId);

        $startDateStr = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDateStr = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        $start = Carbon::parse($startDateStr);
        $end = Carbon::parse($endDateStr);

        // Limit range to max 62 days to safeguard shared hosting memory & performance
        if ($end->diffInDays($start) > 62) {
            $end = $start->copy()->addDays(62);
        }

        $roster = [];
        $current = $start->copy();

        while ($current->lessThanOrEqualTo($end)) {
            $resolved = $shiftResolver->resolveForEmployee($employeeId, $current);

            $roster[] = [
                'date' => $current->toDateString(),
                'day_of_week' => $current->dayOfWeek,
                'day_name' => $current->format('l'),
                'is_weekend' => in_array($current->dayOfWeek, [0, 6]), // Sun/Sat default
                'shift' => $resolved,
            ];

            $current->addDay();
        }

        return $this->successResponse([
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->full_name,
                'employee_code' => $employee->employee_code,
                'branch' => $employee->branch?->name,
                'department' => $employee->department?->name,
            ],
            'range' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'roster' => $roster,
        ]);
    }
}
