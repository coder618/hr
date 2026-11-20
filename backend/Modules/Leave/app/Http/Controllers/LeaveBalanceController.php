<?php

namespace Modules\Leave\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Employee\Entities\Employee;
use Modules\Leave\Entities\LeaveBalance;

class LeaveBalanceController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = LeaveBalance::with(['employee', 'leaveType']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->filled('year')) {
            $query->where('year', (int) $request->query('year'));
        } else {
            $query->where('year', Carbon::now()->year);
        }

        $balances = $query->get()->map(function ($b) {
            $data = $b->toArray();
            $data['available_days'] = $b->available_days;
            return $data;
        });

        return response()->json(['data' => $balances]);
    }

    /**
     * Get balances for the authenticated employee.
     */
    public function myBalances(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('user_id', $user->id)->first();

        if (!$employee) {
            return response()->json(['data' => []]);
        }

        $year = (int) ($request->query('year') ?: Carbon::now()->year);

        $balances = LeaveBalance::with('leaveType')
            ->where('employee_id', $employee->id)
            ->where('year', $year)
            ->get()
            ->map(function ($b) {
                $data = $b->toArray();
                $data['available_days'] = $b->available_days;
                return $data;
            });

        return response()->json([
            'employee' => $employee,
            'data' => $balances,
        ]);
    }

    /**
     * Adjust leave balance (admin/HR).
     */
    public function adjust(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'required|integer',
            'allocated_days' => 'nullable|numeric|min:0',
            'carried_forward' => 'nullable|numeric|min:0',
            'accrued_days' => 'nullable|numeric|min:0',
        ]);

        $balance = LeaveBalance::firstOrNew([
            'organization_id' => $this->tenantContext->getTenantId(),
            'employee_id' => $validated['employee_id'],
            'leave_type_id' => $validated['leave_type_id'],
            'year' => $validated['year'],
        ]);

        if (isset($validated['allocated_days'])) {
            $balance->allocated_days = $validated['allocated_days'];
        }
        if (isset($validated['carried_forward'])) {
            $balance->carried_forward = $validated['carried_forward'];
        }
        if (isset($validated['accrued_days'])) {
            $balance->accrued_days = $validated['accrued_days'];
        }

        $balance->save();

        $data = $balance->load(['employee', 'leaveType'])->toArray();
        $data['available_days'] = $balance->available_days;

        return response()->json([
            'message' => 'Leave balance adjusted successfully.',
            'data' => $data,
        ]);
    }
}
