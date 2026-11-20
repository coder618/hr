<?php

namespace Modules\Leave\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Leave\Entities\LeaveType;

class LeaveTypeController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $types = LeaveType::orderBy('name', 'asc')->get();
        return response()->json(['data' => $types]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20',
            'color' => 'nullable|string|max:20',
            'type' => 'required|in:paid,unpaid',
            'annual_entitlement' => 'required|numeric|min:0|max:365',
            'accrual_frequency' => 'required|in:monthly,annual_lump_sum',
            'gender_restriction' => 'required|in:any,male,female',
            'requires_attachment' => 'boolean',
            'requires_approval' => 'boolean',
            'max_consecutive_days' => 'nullable|integer|min:1',
            'allow_half_day' => 'boolean',
            'carry_forward_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $type = LeaveType::create($validated);

        return response()->json([
            'message' => 'Leave type created successfully.',
            'data' => $type,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $type = LeaveType::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'sometimes|required|string|max:20',
            'color' => 'nullable|string|max:20',
            'type' => 'sometimes|required|in:paid,unpaid',
            'annual_entitlement' => 'sometimes|required|numeric|min:0|max:365',
            'accrual_frequency' => 'sometimes|required|in:monthly,annual_lump_sum',
            'gender_restriction' => 'sometimes|required|in:any,male,female',
            'requires_attachment' => 'boolean',
            'requires_approval' => 'boolean',
            'max_consecutive_days' => 'nullable|integer|min:1',
            'allow_half_day' => 'boolean',
            'carry_forward_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $type->update($validated);

        return response()->json([
            'message' => 'Leave type updated successfully.',
            'data' => $type,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $type = LeaveType::findOrFail($id);

        if ($type->requests()->whereIn('status', ['pending', 'approved'])->exists()) {
            return response()->json([
                'message' => 'Cannot delete leave type with existing active or pending leave requests.',
            ], 422);
        }

        $type->delete();

        return response()->json([
            'message' => 'Leave type deleted successfully.',
        ]);
    }
}
