<?php

namespace Modules\Project\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Employee\Entities\Employee;
use Modules\Project\Entities\Task;
use Modules\Project\Entities\TaskTimeLog;

class TaskTimeLogController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(int $taskId): JsonResponse
    {
        $task = Task::findOrFail($taskId);
        $logs = $task->timeLogs()->with('employee')->get();

        return response()->json(['data' => $logs]);
    }

    public function store(Request $request, int $taskId): JsonResponse
    {
        $task = Task::findOrFail($taskId);

        $validated = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'log_date' => 'required|date',
            'hours_spent' => 'required|numeric|min:0.1|max:24',
            'description' => 'nullable|string|max:500',
            'is_billable' => 'boolean',
        ]);

        $employeeId = $validated['employee_id'] ?? null;
        if (!$employeeId) {
            $emp = Employee::where('user_id', $request->user()->id)->first();
            $employeeId = $emp?->id;
        }

        if (!$employeeId) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $log = $task->timeLogs()->create([
            'organization_id' => $task->organization_id,
            'employee_id' => $employeeId,
            'log_date' => $validated['log_date'],
            'hours_spent' => $validated['hours_spent'],
            'description' => $validated['description'] ?? null,
            'is_billable' => $validated['is_billable'] ?? true,
        ]);

        // Roll up actual_hours onto the task
        $task->actual_hours = $task->timeLogs()->sum('hours_spent');
        $task->save();

        return response()->json([
            'message' => 'Work time logged successfully.',
            'data' => $log->load('employee'),
            'task_actual_hours' => $task->actual_hours,
        ], 201);
    }

    public function destroy(int $taskId, int $logId): JsonResponse
    {
        $task = Task::findOrFail($taskId);
        $log = $task->timeLogs()->findOrFail($logId);
        $log->delete();

        // Roll up actual_hours onto the task
        $task->actual_hours = $task->timeLogs()->sum('hours_spent');
        $task->save();

        return response()->json([
            'message' => 'Time log deleted.',
            'task_actual_hours' => $task->actual_hours,
        ]);
    }
}
