<?php

namespace Modules\Employee\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Branch;

class BranchController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Branch::query();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $branches = $query->withCount(['departments', 'employees'])->orderBy('name')->get();

        return $this->successResponse($branches);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'code' => 'required|string|max:50',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'geofence_radius_meters' => 'nullable|integer|min:10|max:10000',
            'address' => 'nullable|string',
            'contact_phone' => 'nullable|string|max:50',
            'contact_email' => 'nullable|email|max:191',
            'is_head_office' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_head_office'])) {
            Branch::where('is_head_office', true)->update(['is_head_office' => false]);
        }

        $branch = Branch::create($validated);

        return $this->successResponse($branch, 'Branch created successfully.', null, 201);
    }

    public function show(int $id): JsonResponse
    {
        $branch = Branch::withCount(['departments', 'employees'])->findOrFail($id);

        return $this->successResponse($branch);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'code' => 'sometimes|required|string|max:50',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'geofence_radius_meters' => 'nullable|integer|min:10|max:10000',
            'address' => 'nullable|string',
            'contact_phone' => 'nullable|string|max:50',
            'contact_email' => 'nullable|email|max:191',
            'is_head_office' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_head_office'])) {
            Branch::where('id', '!=', $id)->where('is_head_office', true)->update(['is_head_office' => false]);
        }

        $branch->update($validated);

        return $this->successResponse($branch, 'Branch updated successfully.');
    }

    public function destroy(int $id): JsonResponse
    {
        $branch = Branch::withCount('employees')->findOrFail($id);

        if ($branch->employees_count > 0) {
            return $this->errorResponse('Cannot delete branch because it has active assigned employees.', [
                'employees_count' => $branch->employees_count,
            ], 422);
        }

        $branch->delete();

        return $this->successResponse(null, 'Branch deleted successfully.');
    }
}
