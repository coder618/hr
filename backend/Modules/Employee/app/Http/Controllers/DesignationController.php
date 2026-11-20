<?php

namespace Modules\Employee\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Designation;

class DesignationController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Designation::query();

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $designations = $query->withCount('employees')->orderBy('name')->get();

        return $this->successResponse($designations);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $designation = Designation::create($validated);

        return $this->successResponse($designation, 'Designation created successfully.', null, 201);
    }

    public function show(int $id): JsonResponse
    {
        $designation = Designation::withCount('employees')->findOrFail($id);

        return $this->successResponse($designation);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $designation = Designation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $designation->update($validated);

        return $this->successResponse($designation, 'Designation updated successfully.');
    }

    public function destroy(int $id): JsonResponse
    {
        $designation = Designation::withCount('employees')->findOrFail($id);

        if ($designation->employees_count > 0) {
            return $this->errorResponse('Cannot delete designation because it has active assigned employees.', [
                'employees_count' => $designation->employees_count,
            ], 422);
        }

        $designation->delete();

        return $this->successResponse(null, 'Designation deleted successfully.');
    }
}
