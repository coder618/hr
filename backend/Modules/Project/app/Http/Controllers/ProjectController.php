<?php

namespace Modules\Project\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Project\Entities\Project;
use Modules\Project\Entities\ProjectMember;

class ProjectController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Project::with(['manager', 'teamMembers']);

        if ($request->filled('status')) {
            $status = $request->query('status');
            if ($status === 'in_progress') {
                $query->whereIn('status', ['in_progress', 'active']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%");
            });
        }

        $projects = $query->withCount([
            'tasks',
            'tasks as completed_tasks_count' => function ($q) {
                $q->where('status', 'completed');
            },
        ])->orderBy('created_at', 'desc')->paginate($request->query('per_page', 15));

        return response()->json($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'code' => 'required|string|max:30',
            'description' => 'nullable|string',
            'client_name' => 'nullable|string|max:150',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:planning,in_progress,active,on_hold,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'manager_id' => 'nullable|exists:employees,id',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:employees,id',
        ]);

        $project = Project::create([
            'organization_id' => $this->tenantContext->getTenantId(),
            'title' => $validated['title'],
            'code' => strtoupper($validated['code']),
            'description' => $validated['description'] ?? null,
            'client_name' => $validated['client_name'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'budget' => $validated['budget'] ?? 0.00,
            'status' => $validated['status'] ?? 'planning',
            'priority' => $validated['priority'] ?? 'medium',
            'manager_id' => $validated['manager_id'] ?? null,
        ]);

        // Attach members
        if (!empty($validated['member_ids'])) {
            foreach ($validated['member_ids'] as $empId) {
                $project->members()->create([
                    'organization_id' => $project->organization_id,
                    'employee_id' => $empId,
                    'role' => ($empId == $project->manager_id) ? 'manager' : 'member',
                ]);
            }
        } elseif ($project->manager_id) {
            $project->members()->create([
                'organization_id' => $project->organization_id,
                'employee_id' => $project->manager_id,
                'role' => 'manager',
            ]);
        }

        return response()->json([
            'message' => 'Project created successfully.',
            'data' => $project->load(['manager', 'teamMembers']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $project = Project::with([
            'manager',
            'teamMembers',
            'milestones',
            'tasks' => function ($q) {
                $q->with('assignee')->orderBy('order', 'asc');
            },
        ])->withCount([
            'tasks',
            'tasks as completed_tasks_count' => function ($q) {
                $q->where('status', 'completed');
            },
        ])->findOrFail($id);

        return response()->json(['data' => $project]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:150',
            'code' => 'sometimes|required|string|max:30',
            'description' => 'nullable|string',
            'client_name' => 'nullable|string|max:150',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'budget' => 'nullable|numeric|min:0',
            'status' => 'sometimes|required|in:planning,in_progress,active,on_hold,completed,cancelled',
            'priority' => 'sometimes|required|in:low,medium,high,urgent',
            'manager_id' => 'nullable|exists:employees,id',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:employees,id',
        ]);

        $memberIds = $validated['member_ids'] ?? null;
        unset($validated['member_ids']);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $project->update($validated);

        if ($request->has('member_ids') && is_array($memberIds)) {
            if ($project->manager_id && !in_array($project->manager_id, $memberIds)) {
                $memberIds[] = $project->manager_id;
            }
            $project->members()->whereNotIn('employee_id', $memberIds)->delete();
            foreach ($memberIds as $empId) {
                ProjectMember::firstOrCreate(
                    [
                        'organization_id' => $project->organization_id,
                        'project_id' => $project->id,
                        'employee_id' => $empId,
                    ],
                    [
                        'role' => ($empId == $project->manager_id) ? 'manager' : 'member',
                    ]
                );
            }
        }

        return response()->json([
            'message' => 'Project updated successfully.',
            'data' => $project->load(['manager', 'teamMembers']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }

    public function assignMember(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'role' => 'nullable|string|max:50',
        ]);

        $member = ProjectMember::firstOrCreate(
            [
                'organization_id' => $project->organization_id,
                'project_id' => $project->id,
                'employee_id' => $validated['employee_id'],
            ],
            [
                'role' => $validated['role'] ?? 'member',
            ]
        );

        return response()->json([
            'message' => 'Team member added.',
            'data' => $member->load('employee'),
        ], 201);
    }

    public function removeMember(int $projectId, int $employeeId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $project->members()->where('employee_id', $employeeId)->delete();

        return response()->json([
            'message' => 'Team member removed.',
        ]);
    }
}
