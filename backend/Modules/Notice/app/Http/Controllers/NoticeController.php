<?php

namespace Modules\Notice\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Employee\Entities\Employee;
use Modules\Notice\Entities\Notice;
use Modules\Notice\Entities\NoticeAcknowledgment;
use Modules\Notice\Entities\NoticeTarget;
use Modules\Notice\Services\NoticeResolverService;

class NoticeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = Notice::with(['creator', 'targets', 'media'])
            ->withCount('acknowledgments')
            ->where('organization_id', $orgId);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('target_type')) {
            $query->where('target_type', $request->input('target_type'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) ($request->input('per_page', 15)), 100);
        $notices = $query->orderBy('is_pinned', 'desc')
            ->orderBy('published_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $notices,
        ]);
    }

    public function myNotices(Request $request, NoticeResolverService $resolver): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('organization_id', $user->organization_id)
            ->where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        if (! $employee) {
            // If superadmin or user without employee profile, return all active notices
            $notices = Notice::where('organization_id', $user->organization_id)
                ->active()
                ->orderBy('is_pinned', 'desc')
                ->orderBy('published_at', 'desc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $notices,
            ]);
        }

        $notices = $resolver->getEmployeeNotices($employee, $request->all());

        return response()->json([
            'status' => 'success',
            'data' => $notices,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'content' => 'required|string',
            'priority' => 'nullable|in:normal,important,urgent',
            'target_type' => 'nullable|in:all,department,branch',
            'target_ids' => 'nullable|array',
            'target_ids.*' => 'integer',
            'status' => 'nullable|in:draft,published,archived',
            'is_pinned' => 'nullable|boolean',
            'requires_acknowledgment' => 'nullable|boolean',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'media_ids' => 'nullable|array',
            'media_ids.*' => 'integer|exists:media,id',
        ]);

        $orgId = $request->user()->organization_id;

        $notice = Notice::create([
            'organization_id' => $orgId,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'priority' => $validated['priority'] ?? 'normal',
            'target_type' => $validated['target_type'] ?? 'all',
            'status' => $validated['status'] ?? 'published',
            'is_pinned' => $validated['is_pinned'] ?? false,
            'requires_acknowledgment' => $validated['requires_acknowledgment'] ?? false,
            'published_at' => $validated['published_at'] ?? now(),
            'expires_at' => $validated['expires_at'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        // Attach targets if targeted
        if (in_array($notice->target_type, ['department', 'branch']) && ! empty($validated['target_ids'])) {
            foreach ($validated['target_ids'] as $targetId) {
                NoticeTarget::create([
                    'notice_id' => $notice->id,
                    'target_type' => $notice->target_type,
                    'target_id' => $targetId,
                ]);
            }
        }

        // Attach media attachments if provided
        if (! empty($validated['media_ids'])) {
            foreach ($validated['media_ids'] as $mediaId) {
                $notice->attachMedia($mediaId, 'notice_attachments');
            }
        }

        $notice->load(['creator', 'targets', 'media']);

        return response()->json([
            'status' => 'success',
            'message' => 'Notice created successfully.',
            'data' => $notice,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $notice = Notice::where('organization_id', $orgId)
            ->with(['creator', 'targets', 'media'])
            ->withCount('acknowledgments')
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $notice,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $notice = Notice::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'content' => 'sometimes|required|string',
            'priority' => 'nullable|in:normal,important,urgent',
            'target_type' => 'nullable|in:all,department,branch',
            'target_ids' => 'nullable|array',
            'target_ids.*' => 'integer',
            'status' => 'nullable|in:draft,published,archived',
            'is_pinned' => 'nullable|boolean',
            'requires_acknowledgment' => 'nullable|boolean',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);

        $notice->update($validated);

        if (isset($validated['target_type']) && in_array($validated['target_type'], ['department', 'branch'])) {
            $notice->targets()->delete();
            if (! empty($validated['target_ids'])) {
                foreach ($validated['target_ids'] as $targetId) {
                    NoticeTarget::create([
                        'notice_id' => $notice->id,
                        'target_type' => $validated['target_type'],
                        'target_id' => $targetId,
                    ]);
                }
            }
        } elseif (isset($validated['target_type']) && $validated['target_type'] === 'all') {
            $notice->targets()->delete();
        }

        $notice->load(['creator', 'targets', 'media']);

        return response()->json([
            'status' => 'success',
            'message' => 'Notice updated successfully.',
            'data' => $notice,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $notice = Notice::where('organization_id', $orgId)->findOrFail($id);
        $notice->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Notice deleted successfully.',
        ]);
    }

    public function togglePin(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $notice = Notice::where('organization_id', $orgId)->findOrFail($id);
        $notice->update(['is_pinned' => ! $notice->is_pinned]);

        return response()->json([
            'status' => 'success',
            'message' => $notice->is_pinned ? 'Notice pinned.' : 'Notice unpinned.',
            'data' => $notice,
        ]);
    }

    public function acknowledge(Request $request, int $id, NoticeResolverService $resolver): JsonResponse
    {
        $user = $request->user();
        $notice = Notice::where('organization_id', $user->organization_id)->findOrFail($id);

        $employee = Employee::where('organization_id', $user->organization_id)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('email', $user->email);
            })
            ->first();

        if (! $employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'No employee profile linked to current user.',
            ], 422);
        }

        $ack = $resolver->acknowledgeNotice($notice, $employee);

        return response()->json([
            'status' => 'success',
            'message' => 'Notice acknowledged successfully.',
            'data' => $ack,
        ]);
    }

    public function acknowledgments(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $notice = Notice::where('organization_id', $orgId)->findOrFail($id);

        $acks = NoticeAcknowledgment::with('employee')
            ->where('notice_id', $notice->id)
            ->orderBy('acknowledged_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $acks,
        ]);
    }
}
