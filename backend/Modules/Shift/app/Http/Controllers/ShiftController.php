<?php

namespace Modules\Shift\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Shift\Entities\Shift;

class ShiftController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Shift::withCount('assignments');

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        $shifts = $query->orderBy('is_default', 'desc')->orderBy('name')->get();

        return $this->successResponse($shifts);
    }

    public function store(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'code' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $exists = Shift::where('organization_id', $tenantId)->where('code', $value)->exists();
                    if ($exists) {
                        $fail('A shift with this code already exists in your organization.');
                    }
                },
            ],
            'type' => 'required|string|in:fixed,flexible,rotational',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
            'total_work_minutes' => 'nullable|integer|min:0|max:1440',
            'break_minutes' => 'nullable|integer|min:0|max:360',
            'half_day_threshold_minutes' => 'nullable|integer|min:0|max:1440',
            'full_day_threshold_minutes' => 'nullable|integer|min:0|max:1440',
            'grace_period_entry_minutes' => 'nullable|integer|min:0|max:180',
            'grace_period_exit_minutes' => 'nullable|integer|min:0|max:180',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'breaks' => 'nullable|array',
        ]);

        // Auto-detect overnight shift if end_time < start_time
        if (!empty($validated['start_time']) && !empty($validated['end_time'])) {
            $start = Carbon::parse($validated['start_time']);
            $end = Carbon::parse($validated['end_time']);
            $validated['is_overnight'] = $end->lessThan($start);

            // If total_work_minutes was not specified, compute it from start/end minus break
            if (empty($validated['total_work_minutes'])) {
                $diffMinutes = $validated['is_overnight']
                    ? $end->copy()->addDay()->diffInMinutes($start)
                    : $end->diffInMinutes($start);
                $break = $validated['break_minutes'] ?? 60;
                $validated['total_work_minutes'] = max(0, $diffMinutes - $break);
            }
        }

        if (!empty($validated['is_default'])) {
            Shift::where('organization_id', $tenantId)->update(['is_default' => false]);
        }

        $shift = Shift::create($validated);

        return $this->successResponse($shift, 'Shift created successfully.', null, 201);
    }

    public function show(int $id): JsonResponse
    {
        $shift = Shift::withCount('assignments')->findOrFail($id);

        return $this->successResponse($shift);
    }

    public function update(Request $request, int $id, TenantContextInterface $tenantContext): JsonResponse
    {
        $shift = Shift::findOrFail($id);
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($tenantId, $id) {
                    $exists = Shift::where('organization_id', $tenantId)
                        ->where('code', $value)
                        ->where('id', '!=', $id)
                        ->exists();
                    if ($exists) {
                        $fail('A shift with this code already exists in your organization.');
                    }
                },
            ],
            'type' => 'sometimes|required|string|in:fixed,flexible,rotational',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
            'total_work_minutes' => 'nullable|integer|min:0|max:1440',
            'break_minutes' => 'nullable|integer|min:0|max:360',
            'half_day_threshold_minutes' => 'nullable|integer|min:0|max:1440',
            'full_day_threshold_minutes' => 'nullable|integer|min:0|max:1440',
            'grace_period_entry_minutes' => 'nullable|integer|min:0|max:180',
            'grace_period_exit_minutes' => 'nullable|integer|min:0|max:180',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'breaks' => 'nullable|array',
        ]);

        $startTime = $validated['start_time'] ?? $shift->start_time;
        $endTime = $validated['end_time'] ?? $shift->end_time;

        if (!empty($startTime) && !empty($endTime)) {
            $start = Carbon::parse($startTime);
            $end = Carbon::parse($endTime);
            $validated['is_overnight'] = $end->lessThan($start);
        }

        if (!empty($validated['is_default'])) {
            Shift::where('organization_id', $tenantId)->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $shift->update($validated);

        return $this->successResponse($shift, 'Shift updated successfully.');
    }

    public function destroy(int $id): JsonResponse
    {
        $shift = Shift::withCount('assignments')->findOrFail($id);

        if ($shift->assignments_count > 0) {
            return $this->errorResponse('Cannot delete shift because it has active assignments.', [
                'assignments_count' => $shift->assignments_count,
            ], 422);
        }

        $shift->delete();

        return $this->successResponse(null, 'Shift deleted successfully.');
    }

    /**
     * Set a shift as the organization default.
     */
    public function setDefault(int $id, TenantContextInterface $tenantContext, Request $request): JsonResponse
    {
        $shift = Shift::findOrFail($id);
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        Shift::where('organization_id', $tenantId)->update(['is_default' => false]);
        $shift->update(['is_default' => true]);

        return $this->successResponse($shift, 'Default shift updated successfully.');
    }
}
