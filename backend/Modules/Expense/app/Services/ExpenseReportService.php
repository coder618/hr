<?php

namespace Modules\Expense\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Expense\Entities\ExpenseCategory;
use Modules\Expense\Entities\ExpenseClaim;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseReportService
{
    /**
     * Stream expense claims as low-memory CSV
     */
    public function streamExpenseCsv(int $organizationId, array $filters = []): StreamedResponse
    {
        $fileName = 'expense_claims_export_' . date('Ymd_His') . '.csv';

        $query = ExpenseClaim::with(['employee', 'employee.department', 'category', 'project'])
            ->where('organization_id', $organizationId);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['category_id'])) {
            $query->where('expense_category_id', $filters['category_id']);
        }
        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (! empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }
        if (! empty($filters['start_date'])) {
            $query->where('claim_date', '>=', $filters['start_date']);
        }
        if (! empty($filters['end_date'])) {
            $query->where('claim_date', '<=', $filters['end_date']);
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return new StreamedResponse(function () use ($query) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM for Excel compatibility
            fputs($handle, "\xEF\xBB\xBF");

            // CSV Header
            fputcsv($handle, [
                'Claim Number',
                'Date',
                'Employee Code',
                'Employee Name',
                'Department',
                'Category',
                'Project',
                'Merchant',
                'Payment Method',
                'Amount',
                'Currency',
                'Status',
                'Approved At',
                'Reimbursed At',
                'Payment Reference',
                'Description',
            ]);

            // Low-memory cursor
            foreach ($query->orderBy('claim_date', 'desc')->cursor() as $claim) {
                $employee = $claim->employee;
                $empName = $employee ? trim($employee->first_name . ' ' . $employee->last_name) : 'N/A';
                $deptName = $employee?->department?->name ?? 'N/A';

                fputcsv($handle, [
                    $claim->claim_number,
                    $claim->claim_date ? Carbon::parse($claim->claim_date)->format('d-m-Y') : '',
                    $employee?->employee_code ?? '',
                    $empName,
                    $deptName,
                    $claim->category?->name ?? 'N/A',
                    $claim->project?->title ?? '',
                    $claim->merchant ?? '',
                    $claim->payment_method,
                    number_format((float) $claim->amount, 2, '.', ''),
                    $claim->currency,
                    $claim->status,
                    $claim->approved_at ? Carbon::parse($claim->approved_at)->format('d-m-Y H:i') : '',
                    $claim->reimbursed_at ? Carbon::parse($claim->reimbursed_at)->format('d-m-Y H:i') : '',
                    $claim->payment_reference ?? '',
                    $claim->description,
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Compute analytics summary for organization & year
     */
    public function getAnalyticsSummary(int $organizationId, ?int $year = null): array
    {
        $year = $year ?: (int) date('Y');

        $baseQuery = ExpenseClaim::where('organization_id', $organizationId)
            ->whereYear('claim_date', $year);

        $totalCount = (clone $baseQuery)->count();
        $totalAmount = (float) (clone $baseQuery)->sum('amount');

        $pendingCount = (clone $baseQuery)->where('status', 'pending')->count();
        $pendingAmount = (float) (clone $baseQuery)->where('status', 'pending')->sum('amount');

        $approvedCount = (clone $baseQuery)->whereIn('status', ['approved', 'reimbursed'])->count();
        $approvedAmount = (float) (clone $baseQuery)->whereIn('status', ['approved', 'reimbursed'])->sum('amount');

        $reimbursedCount = (clone $baseQuery)->where('status', 'reimbursed')->count();
        $reimbursedAmount = (float) (clone $baseQuery)->where('status', 'reimbursed')->sum('amount');

        $rejectedCount = (clone $baseQuery)->where('status', 'rejected')->count();

        // Category breakdown
        $categories = ExpenseCategory::where('organization_id', $organizationId)->get();
        $categoryBreakdown = [];

        foreach ($categories as $cat) {
            $catClaims = (clone $baseQuery)->where('expense_category_id', $cat->id);
            $catSum = (float) (clone $catClaims)->sum('amount');
            $catCount = (clone $catClaims)->count();

            if ($catCount > 0 || $cat->is_active) {
                $categoryBreakdown[] = [
                    'category_id' => $cat->id,
                    'name' => $cat->name,
                    'code' => $cat->code,
                    'spending_limit' => $cat->spending_limit,
                    'total_count' => $catCount,
                    'total_amount' => round($catSum, 2),
                ];
            }
        }

        // Monthly breakdown
        $monthlyBreakdown = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthAmount = (float) (clone $baseQuery)
                ->whereMonth('claim_date', $m)
                ->whereIn('status', ['approved', 'reimbursed'])
                ->sum('amount');

            $monthlyBreakdown[] = [
                'month' => $m,
                'month_name' => Carbon::createFromDate($year, $m, 1)->format('M'),
                'amount' => round($monthAmount, 2),
            ];
        }

        return [
            'year' => $year,
            'total_claims' => $totalCount,
            'total_amount' => round($totalAmount, 2),
            'pending_count' => $pendingCount,
            'pending_amount' => round($pendingAmount, 2),
            'approved_count' => $approvedCount,
            'approved_amount' => round($approvedAmount, 2),
            'reimbursed_count' => $reimbursedCount,
            'reimbursed_amount' => round($reimbursedAmount, 2),
            'rejected_count' => $rejectedCount,
            'category_breakdown' => $categoryBreakdown,
            'monthly_breakdown' => $monthlyBreakdown,
        ];
    }
}
