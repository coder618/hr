<?php

namespace Modules\Expense\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Expense\Entities\DepartmentBudget;

class DepartmentBudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $year = (int) ($request->input('year') ?: date('Y'));

        $query = DepartmentBudget::with('department')
            ->where('organization_id', $orgId)
            ->where('year', $year);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }

        $budgets = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $budgets,
        ]);
    }

    public function storeOrUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'year' => 'required|integer|min:2020|max:2100',
            'allocated_amount' => 'required|numeric|min:0',
        ]);

        $orgId = $request->user()->organization_id;

        $budget = DepartmentBudget::updateOrCreate(
            [
                'organization_id' => $orgId,
                'department_id' => $validated['department_id'],
                'year' => $validated['year'],
            ],
            [
                'allocated_amount' => $validated['allocated_amount'],
            ]
        );

        $budget->load('department');

        return response()->json([
            'status' => 'success',
            'message' => 'Department budget saved successfully.',
            'data' => $budget,
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $year = (int) ($request->input('year') ?: date('Y'));

        $budgets = DepartmentBudget::where('organization_id', $orgId)
            ->where('year', $year)
            ->get();

        $totalAllocated = (float) $budgets->sum('allocated_amount');
        $totalSpent = (float) $budgets->sum('spent_amount');
        $totalRemaining = max(0.0, round($totalAllocated - $totalSpent, 2));

        return response()->json([
            'status' => 'success',
            'data' => [
                'year' => $year,
                'total_allocated' => round($totalAllocated, 2),
                'total_spent' => round($totalSpent, 2),
                'total_remaining' => $totalRemaining,
                'utilization_percent' => $totalAllocated > 0 ? round(($totalSpent / $totalAllocated) * 100, 1) : 0,
            ],
        ]);
    }
}
