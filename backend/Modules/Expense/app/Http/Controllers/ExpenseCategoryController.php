<?php

namespace Modules\Expense\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Expense\Entities\ExpenseCategory;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = ExpenseCategory::where('organization_id', $orgId);

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $categories = $query->withCount('claims')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:30',
            'description' => 'nullable|string',
            'spending_limit' => 'nullable|numeric|min:0',
            'requires_receipt' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $orgId = $request->user()->organization_id;

        // Check unique code per org
        $exists = ExpenseCategory::where('organization_id', $orgId)
            ->where('code', strtoupper($validated['code']))
            ->exists();

        if ($exists) {
            return response()->json([
                'status' => 'error',
                'message' => 'An expense category with this code already exists in your organization.',
            ], 422);
        }

        $category = ExpenseCategory::create([
            'organization_id' => $orgId,
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'description' => $validated['description'] ?? null,
            'spending_limit' => $validated['spending_limit'] ?? null,
            'requires_receipt' => $validated['requires_receipt'] ?? true,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Expense category created successfully.',
            'data' => $category,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $category = ExpenseCategory::where('organization_id', $orgId)->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $category,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $category = ExpenseCategory::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'code' => 'sometimes|required|string|max:30',
            'description' => 'nullable|string',
            'spending_limit' => 'nullable|numeric|min:0',
            'requires_receipt' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['code']) && strtoupper($validated['code']) !== $category->code) {
            $exists = ExpenseCategory::where('organization_id', $orgId)
                ->where('code', strtoupper($validated['code']))
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'An expense category with this code already exists.',
                ], 422);
            }
            $validated['code'] = strtoupper($validated['code']);
        }

        $category->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Expense category updated successfully.',
            'data' => $category,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $category = ExpenseCategory::where('organization_id', $orgId)->findOrFail($id);

        if ($category->claims()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete category with associated claims. You can deactivate it instead.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Expense category deleted successfully.',
        ]);
    }
}
