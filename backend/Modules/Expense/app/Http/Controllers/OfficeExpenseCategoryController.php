<?php

namespace Modules\Expense\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Expense\Entities\OfficeExpenseCategory;

class OfficeExpenseCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = OfficeExpenseCategory::where('organization_id', $orgId);

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $categories = $query->withCount('expenses')
            ->withSum('expenses', 'amount')
            ->orderBy('name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $orgId = $request->user()->organization_id;

        $code = strtoupper(trim($validated['code']));

        $exists = OfficeExpenseCategory::where('organization_id', $orgId)
            ->where('code', $code)
            ->exists();

        if ($exists) {
            return response()->json([
                'status' => 'error',
                'message' => 'An office expense category with this code already exists.',
            ], 422);
        }

        $category = OfficeExpenseCategory::create([
            'organization_id' => $orgId,
            'name' => trim($validated['name']),
            'code' => $code,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Office expense category created successfully.',
            'data' => $category,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $category = OfficeExpenseCategory::where('organization_id', $orgId)
            ->withCount('expenses')
            ->withSum('expenses', 'amount')
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $category,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $category = OfficeExpenseCategory::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'sometimes|required|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['code'])) {
            $code = strtoupper(trim($validated['code']));
            $exists = OfficeExpenseCategory::where('organization_id', $orgId)
                ->where('code', $code)
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'An office expense category with this code already exists.',
                ], 422);
            }
            $validated['code'] = $code;
        }

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $category->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Office expense category updated successfully.',
            'data' => $category,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $category = OfficeExpenseCategory::where('organization_id', $orgId)
            ->withCount('expenses')
            ->findOrFail($id);

        if ($category->expenses_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Cannot delete category '{$category->name}' because it has {$category->expenses_count} associated office expense record(s). Please reassign or delete them first, or deactivate this category.",
            ], 422);
        }

        $category->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Office expense category deleted successfully.',
        ]);
    }
}
