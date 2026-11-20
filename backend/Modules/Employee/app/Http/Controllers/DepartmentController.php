<?php

namespace Modules\Employee\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Department;

class DepartmentController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Department::with(['branch:id,name,code', 'parent:id,name']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->query('branch_id'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $departments = $query->withCount('employees')->orderBy('name')->get();

        return $this->successResponse($departments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'code' => 'nullable|string|max:50',
            'branch_id' => 'nullable|exists:branches,id',
            'parent_id' => 'nullable|exists:departments,id',
            'is_active' => 'nullable|boolean',
        ]);

        $department = Department::create($validated);

        return $this->successResponse($department->load(['branch', 'parent']), 'Department created successfully.', null, 201);
    }

    public function show(int $id): JsonResponse
    {
        $department = Department::with(['branch', 'parent', 'children'])->withCount('employees')->findOrFail($id);

        return $this->successResponse($department);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'code' => 'nullable|string|max:50',
            'branch_id' => 'nullable|exists:branches,id',
            'parent_id' => [
                'nullable',
                'exists:departments,id',
                function ($attribute, $value, $fail) use ($id) {
                    if ($value == $id) {
                        $fail('A department cannot be its own parent.');
                    }
                },
            ],
            'is_active' => 'nullable|boolean',
        ]);

        $department->update($validated);

        return $this->successResponse($department->load(['branch', 'parent']), 'Department updated successfully.');
    }

    public function destroy(int $id): JsonResponse
    {
        $department = Department::withCount('employees')->findOrFail($id);

        if ($department->employees_count > 0) {
            return $this->errorResponse('Cannot delete department because it has active assigned employees.', [
                'employees_count' => $department->employees_count,
            ], 422);
        }

        $department->delete();

        return $this->successResponse(null, 'Department deleted successfully.');
    }
}
