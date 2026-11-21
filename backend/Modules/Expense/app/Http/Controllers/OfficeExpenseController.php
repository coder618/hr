<?php

namespace Modules\Expense\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Expense\Entities\OfficeExpense;
use Modules\Expense\Entities\OfficeExpenseCategory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OfficeExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = OfficeExpense::where('organization_id', $orgId)
            ->with([
                'category',
                'recordedByUser:id,name,email',
                'receiptMedia',
            ]);

        if ($request->filled('month')) {
            $query->where('expense_month', (int) $request->input('month'));
        }

        if ($request->filled('year')) {
            $query->where('expense_year', (int) $request->input('year'));
        }

        if ($request->filled('office_expense_category_id')) {
            $query->where('office_expense_category_id', (int) $request->input('office_expense_category_id'));
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->input('payment_method'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('vendor_name', 'like', "%{$search}%")
                  ->orWhere('reference_no', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $expenses = $query->orderBy('expense_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $expenses,
        ]);
    }

    public function monthlySummary(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $year = (int) ($request->input('year') ?: Carbon::now()->year);
        $month = $request->filled('month') ? (int) $request->input('month') : null;

        $baseQuery = OfficeExpense::where('organization_id', $orgId)
            ->where('expense_year', $year);

        if ($month !== null) {
            $baseQuery->where('expense_month', $month);
        }

        $allExpenses = (clone $baseQuery)->with('category')->get();

        $totalAmount = (float) $allExpenses->sum('amount');
        $paidAmount = (float) $allExpenses->where('payment_status', 'paid')->sum('amount');
        $pendingAmount = (float) $allExpenses->where('payment_status', 'pending')->sum('amount');
        $overdueAmount = (float) $allExpenses->where('payment_status', 'overdue')->sum('amount');
        $totalCount = $allExpenses->count();

        // Category breakdown
        $categoryBreakdown = [];
        $groupedByCategory = $allExpenses->groupBy('office_expense_category_id');

        foreach ($groupedByCategory as $categoryId => $expensesInCat) {
            $category = $expensesInCat->first()->category;
            $catAmount = (float) $expensesInCat->sum('amount');
            $categoryBreakdown[] = [
                'category_id' => $categoryId,
                'category_name' => $category ? $category->name : 'Uncategorized',
                'category_code' => $category ? $category->code : 'OTHER',
                'count' => $expensesInCat->count(),
                'total_amount' => round($catAmount, 2),
                'percentage' => $totalAmount > 0 ? round(($catAmount / $totalAmount) * 100, 1) : 0,
            ];
        }

        usort($categoryBreakdown, fn ($a, $b) => $b['total_amount'] <=> $a['total_amount']);

        // Monthly trend for the entire year (1 to 12)
        $yearExpenses = OfficeExpense::where('organization_id', $orgId)
            ->where('expense_year', $year)
            ->get();

        $monthlyTrend = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthData = $yearExpenses->where('expense_month', $m);
            $monthName = Carbon::create($year, $m, 1)->format('M');
            $monthlyTrend[] = [
                'month' => $m,
                'month_name' => $monthName,
                'total_amount' => round((float) $monthData->sum('amount'), 2),
                'paid_amount' => round((float) $monthData->where('payment_status', 'paid')->sum('amount'), 2),
                'pending_amount' => round((float) $monthData->whereIn('payment_status', ['pending', 'overdue'])->sum('amount'), 2),
                'count' => $monthData->count(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'year' => $year,
                'month' => $month,
                'total_amount' => round($totalAmount, 2),
                'paid_amount' => round($paidAmount, 2),
                'pending_amount' => round($pendingAmount, 2),
                'overdue_amount' => round($overdueAmount, 2),
                'total_count' => $totalCount,
                'category_breakdown' => $categoryBreakdown,
                'monthly_trend' => $monthlyTrend,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $validated = $request->validate([
            'office_expense_category_id' => 'required|exists:office_expense_categories,id',
            'title' => 'required|string|max:150',
            'expense_month' => 'required|integer|between:1,12',
            'expense_year' => 'required|integer|between:2000,2100',
            'expense_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|max:10',
            'payment_status' => 'nullable|in:pending,paid,overdue',
            'payment_method' => 'nullable|in:bank_transfer,cash,card,cheque,mobile_banking,other',
            'payment_date' => 'nullable|date',
            'reference_no' => 'nullable|string|max:100',
            'vendor_name' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
            'receipt_media_id' => 'nullable|exists:media,id',
        ]);

        // Ensure category belongs to the current organization
        $category = OfficeExpenseCategory::where('organization_id', $orgId)
            ->findOrFail($validated['office_expense_category_id']);

        $expense = OfficeExpense::create([
            'organization_id' => $orgId,
            'office_expense_category_id' => $category->id,
            'title' => trim($validated['title']),
            'expense_month' => (int) $validated['expense_month'],
            'expense_year' => (int) $validated['expense_year'],
            'expense_date' => $validated['expense_date'],
            'amount' => (float) $validated['amount'],
            'currency' => $validated['currency'] ?? 'BDT',
            'payment_status' => $validated['payment_status'] ?? 'pending',
            'payment_method' => $validated['payment_method'] ?? null,
            'payment_date' => $validated['payment_date'] ?? null,
            'reference_no' => $validated['reference_no'] ?? null,
            'vendor_name' => $validated['vendor_name'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'receipt_media_id' => $validated['receipt_media_id'] ?? null,
            'recorded_by' => $request->user()->id,
        ]);

        if (! empty($validated['receipt_media_id'])) {
            $expense->attachMedia($validated['receipt_media_id'], 'office_receipts');
        }

        $expense->load(['category', 'recordedByUser:id,name,email', 'receiptMedia']);

        return response()->json([
            'status' => 'success',
            'message' => 'Monthly office expense recorded successfully.',
            'data' => $expense,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $expense = OfficeExpense::where('organization_id', $orgId)
            ->with([
                'category',
                'recordedByUser:id,name,email',
                'receiptMedia',
            ])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $expense,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $expense = OfficeExpense::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'office_expense_category_id' => 'sometimes|required|exists:office_expense_categories,id',
            'title' => 'sometimes|required|string|max:150',
            'expense_month' => 'sometimes|required|integer|between:1,12',
            'expense_year' => 'sometimes|required|integer|between:2000,2100',
            'expense_date' => 'sometimes|required|date',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'currency' => 'nullable|string|max:10',
            'payment_status' => 'sometimes|required|in:pending,paid,overdue',
            'payment_method' => 'nullable|in:bank_transfer,cash,card,cheque,mobile_banking,other',
            'payment_date' => 'nullable|date',
            'reference_no' => 'nullable|string|max:100',
            'vendor_name' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
            'receipt_media_id' => 'nullable|exists:media,id',
        ]);

        if (isset($validated['office_expense_category_id'])) {
            OfficeExpenseCategory::where('organization_id', $orgId)
                ->findOrFail($validated['office_expense_category_id']);
        }

        $expense->update($validated);

        if (array_key_exists('receipt_media_id', $validated)) {
            if ($validated['receipt_media_id']) {
                $expense->attachMedia($validated['receipt_media_id'], 'office_receipts');
            }
        }

        $expense->load(['category', 'recordedByUser:id,name,email', 'receiptMedia']);

        return response()->json([
            'status' => 'success',
            'message' => 'Office expense updated successfully.',
            'data' => $expense,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $expense = OfficeExpense::where('organization_id', $orgId)->findOrFail($id);

        $expense->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Office expense deleted successfully.',
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $orgId = $request->user()->organization_id;

        $query = OfficeExpense::where('organization_id', $orgId)
            ->with(['category', 'recordedByUser']);

        if ($request->filled('month')) {
            $query->where('expense_month', (int) $request->input('month'));
        }
        if ($request->filled('year')) {
            $query->where('expense_year', (int) $request->input('year'));
        }
        if ($request->filled('office_expense_category_id')) {
            $query->where('office_expense_category_id', (int) $request->input('office_expense_category_id'));
        }
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }

        $expenses = $query->orderBy('expense_date', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="monthly_office_expenses_' . Carbon::now()->format('Y_m_d') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($expenses) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'ID',
                'Title',
                'Category',
                'Month',
                'Year',
                'Expense Date',
                'Amount',
                'Currency',
                'Payment Status',
                'Payment Method',
                'Payment Date',
                'Vendor / Biller',
                'Reference / Bill No',
                'Notes',
                'Recorded By',
                'Created At',
            ]);

            foreach ($expenses as $expense) {
                fputcsv($file, [
                    $expense->id,
                    $expense->title,
                    $expense->category?->name ?? 'N/A',
                    $expense->expense_month,
                    $expense->expense_year,
                    $expense->expense_date?->format('Y-m-d') ?? '',
                    $expense->amount,
                    $expense->currency,
                    ucfirst($expense->payment_status),
                    $expense->payment_method ? str_replace('_', ' ', ucfirst($expense->payment_method)) : '',
                    $expense->payment_date?->format('Y-m-d') ?? '',
                    $expense->vendor_name ?? '',
                    $expense->reference_no ?? '',
                    $expense->notes ?? '',
                    $expense->recordedByUser?->name ?? '',
                    $expense->created_at?->toIso8601String() ?? '',
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }
}
