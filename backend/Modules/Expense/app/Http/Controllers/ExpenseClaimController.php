<?php

namespace Modules\Expense\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Modules\Expense\Entities\ExpenseCategory;
use Modules\Expense\Entities\ExpenseClaim;
use Modules\Expense\Services\BudgetTrackingService;
use Modules\Expense\Services\ExpenseReportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseClaimController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = ExpenseClaim::with(['employee', 'category', 'project', 'approvedByUser', 'receiptMedia'])
            ->where('organization_id', $orgId);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }
        if ($request->filled('expense_category_id')) {
            $query->where('expense_category_id', $request->input('expense_category_id'));
        }
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }
        if ($request->filled('start_date')) {
            $query->where('claim_date', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->where('claim_date', '<=', $request->input('end_date'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('claim_number', 'like', "%{$search}%")
                  ->orWhere('merchant', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) ($request->input('per_page', 15)), 100);
        $claims = $query->orderBy('claim_date', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $claims,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'project_id' => 'nullable|exists:projects,id',
            'claim_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|max:10',
            'merchant' => 'nullable|string|max:150',
            'payment_method' => 'required|in:cash,company_card,personal_card',
            'description' => 'required|string',
            'receipt_media_id' => 'nullable|exists:media,id',
        ]);

        $orgId = $request->user()->organization_id;

        // Check category rule
        $category = ExpenseCategory::where('organization_id', $orgId)->findOrFail($validated['expense_category_id']);
        if ($category->requires_receipt && empty($validated['receipt_media_id'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Category '{$category->name}' requires a receipt attachment.",
            ], 422);
        }

        // Generate unique claim number
        $claimNumber = 'EXP-' . date('Ym') . '-' . strtoupper(Str::random(6));

        $claim = ExpenseClaim::create([
            'organization_id' => $orgId,
            'claim_number' => $claimNumber,
            'employee_id' => $validated['employee_id'],
            'expense_category_id' => $validated['expense_category_id'],
            'project_id' => $validated['project_id'] ?? null,
            'claim_date' => $validated['claim_date'],
            'amount' => $validated['amount'],
            'currency' => $validated['currency'] ?? 'USD',
            'merchant' => $validated['merchant'] ?? null,
            'payment_method' => $validated['payment_method'],
            'description' => $validated['description'],
            'receipt_media_id' => $validated['receipt_media_id'] ?? null,
            'status' => 'pending',
        ]);

        if (! empty($validated['receipt_media_id'])) {
            $claim->attachMedia($validated['receipt_media_id'], 'receipts');
        }

        $claim->load(['employee', 'category', 'project', 'receiptMedia']);

        return response()->json([
            'status' => 'success',
            'message' => 'Expense claim submitted successfully.',
            'data' => $claim,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $claim = ExpenseClaim::where('organization_id', $orgId)
            ->with(['employee', 'category', 'project', 'approvedByUser', 'receiptMedia'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $claim,
        ]);
    }

    public function approve(Request $request, int $id, BudgetTrackingService $budgetService): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $claim = ExpenseClaim::where('organization_id', $orgId)->with('employee')->findOrFail($id);

        if ($claim->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => "Only pending claims can be approved. Current status: {$claim->status}.",
            ], 422);
        }

        $claim->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        // Record against department budget
        $budgetService->recordClaimExpense($claim);

        $claim->load(['employee', 'category', 'project', 'approvedByUser', 'receiptMedia']);

        return response()->json([
            'status' => 'success',
            'message' => 'Expense claim approved successfully.',
            'data' => $claim,
        ]);
    }

    public function reject(Request $request, int $id, BudgetTrackingService $budgetService): JsonResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $orgId = $request->user()->organization_id;
        $claim = ExpenseClaim::where('organization_id', $orgId)->with('employee')->findOrFail($id);

        if ($claim->status === 'reimbursed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Reimbursed claims cannot be rejected.',
            ], 422);
        }

        // If previously approved, revert budget
        if ($claim->status === 'approved') {
            $budgetService->revertClaimExpense($claim);
        }

        $claim->update([
            'status' => 'rejected',
            'rejection_reason' => $request->input('rejection_reason'),
        ]);

        $claim->load(['employee', 'category', 'project', 'approvedByUser', 'receiptMedia']);

        return response()->json([
            'status' => 'success',
            'message' => 'Expense claim rejected.',
            'data' => $claim,
        ]);
    }

    public function reimburse(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'payment_reference' => 'nullable|string|max:100',
        ]);

        $orgId = $request->user()->organization_id;
        $claim = ExpenseClaim::where('organization_id', $orgId)->findOrFail($id);

        if ($claim->status !== 'approved') {
            return response()->json([
                'status' => 'error',
                'message' => "Only approved claims can be marked as reimbursed. Current status: {$claim->status}.",
            ], 422);
        }

        $claim->update([
            'status' => 'reimbursed',
            'reimbursed_at' => now(),
            'payment_reference' => $request->input('payment_reference'),
        ]);

        $claim->load(['employee', 'category', 'project', 'approvedByUser', 'receiptMedia']);

        return response()->json([
            'status' => 'success',
            'message' => 'Expense claim marked as reimbursed.',
            'data' => $claim,
        ]);
    }

    public function analytics(Request $request, ExpenseReportService $reportService): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $year = $request->filled('year') ? (int) $request->input('year') : null;

        $summary = $reportService->getAnalyticsSummary($orgId, $year);

        return response()->json([
            'status' => 'success',
            'data' => $summary,
        ]);
    }

    public function exportCsv(Request $request, ExpenseReportService $reportService): StreamedResponse
    {
        $orgId = $request->user()->organization_id;

        return $reportService->streamExpenseCsv($orgId, $request->all());
    }
}
