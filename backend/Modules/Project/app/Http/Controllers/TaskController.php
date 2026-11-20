<?php

namespace Modules\Project\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Employee\Entities\Employee;
use Modules\Project\Entities\Project;
use Modules\Project\Entities\Task;

class TaskController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request, ?int $projectId = null): JsonResponse
    {
        $query = Task::with(['assignee', 'milestone', 'project']);

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('assignee_id')) {
            $query->where('assignee_id', $request->query('assignee_id'));
        }

        if ($request->filled('milestone_id')) {
            $query->where('milestone_id', $request->query('milestone_id'));
        }

        $tasks = $query->orderBy('order', 'asc')->orderBy('created_at', 'desc')->get();

        return response()->json(['data' => $tasks]);
    }

    /**
     * Get tasks assigned to the current employee.
     */
    public function myTasks(Request $request): JsonResponse
    {
        $employee = Employee::where('user_id', $request->user()->id)->first();

        if (!$employee) {
            return response()->json(['data' => []]);
        }

        $tasks = Task::with(['project', 'milestone'])
            ->where('assignee_id', $employee->id)
            ->orderBy('due_date', 'asc')
            ->get();

        return response()->json(['data' => $tasks]);
    }

    public function store(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'milestone_id' => 'nullable|exists:project_milestones,id',
            'assignee_id' => 'nullable|exists:employees,id',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:todo,in_progress,in_review,completed',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'checklist' => 'nullable|array',
            'order' => 'nullable|integer',
        ]);

        $task = Task::create([
            'organization_id' => $project->organization_id,
            'project_id' => $project->id,
            'creator_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'milestone_id' => $validated['milestone_id'] ?? null,
            'assignee_id' => $validated['assignee_id'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'status' => $validated['status'] ?? 'todo',
            'due_date' => $validated['due_date'] ?? null,
            'estimated_hours' => $validated['estimated_hours'] ?? 0.00,
            'actual_hours' => 0.00,
            'checklist' => $validated['checklist'] ?? [],
            'order' => $validated['order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Task created successfully.',
            'data' => $task->load(['assignee', 'milestone']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $task = Task::with(['project', 'milestone', 'assignee', 'creator', 'timeLogs.employee'])->findOrFail($id);
        return response()->json(['data' => $task]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'description' => 'nullable|string',
            'milestone_id' => 'nullable|exists:project_milestones,id',
            'assignee_id' => 'nullable|exists:employees,id',
            'priority' => 'sometimes|required|in:low,medium,high,urgent',
            'status' => 'sometimes|required|in:todo,in_progress,in_review,completed',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'order' => 'nullable|integer',
        ]);

        $task->update($validated);

        return response()->json([
            'message' => 'Task updated successfully.',
            'data' => $task->load(['assignee', 'milestone']),
        ]);
    }

    /**
     * Patch status and order for Kanban drag-and-drop.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:todo,in_progress,in_review,completed',
            'order' => 'nullable|integer',
        ]);

        $task->status = $validated['status'];
        if (isset($validated['order'])) {
            $task->order = $validated['order'];
        }
        $task->save();

        return response()->json([
            'message' => 'Task status updated.',
            'data' => $task,
        ]);
    }

    /**
     * Update checklist items.
     */
    public function updateChecklist(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'checklist' => 'required|array',
            'checklist.*.id' => 'required|string',
            'checklist.*.text' => 'required|string',
            'checklist.*.completed' => 'required|boolean',
        ]);

        $task->checklist = $validated['checklist'];
        $task->save();

        return response()->json([
            'message' => 'Checklist updated.',
            'data' => $task,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $task = Task::findOrFail($id);
        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }
}
