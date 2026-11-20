<?php

namespace Modules\Project\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Project\Entities\Project;
use Modules\Project\Entities\ProjectMilestone;

class MilestoneController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $milestones = $project->milestones()->withCount('tasks')->get();

        return response()->json(['data' => $milestones]);
    }

    public function store(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:pending,completed',
            'order' => 'nullable|integer',
        ]);

        $milestone = $project->milestones()->create([
            'organization_id' => $project->organization_id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'status' => $validated['status'] ?? 'pending',
            'order' => $validated['order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Milestone created successfully.',
            'data' => $milestone,
        ], 201);
    }

    public function update(Request $request, int $projectId, int $milestoneId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $milestone = $project->milestones()->findOrFail($milestoneId);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'status' => 'sometimes|required|in:pending,completed',
            'order' => 'nullable|integer',
        ]);

        $milestone->update($validated);

        return response()->json([
            'message' => 'Milestone updated successfully.',
            'data' => $milestone,
        ]);
    }

    public function destroy(int $projectId, int $milestoneId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $milestone = $project->milestones()->findOrFail($milestoneId);
        $milestone->delete();

        return response()->json([
            'message' => 'Milestone deleted successfully.',
        ]);
    }
}
