<?php

namespace Modules\Expense\Services;

use Carbon\Carbon;
use Modules\Expense\Entities\DepartmentBudget;
use Modules\Expense\Entities\ExpenseClaim;

class BudgetTrackingService
{
    /**
     * Record an approved expense against department budget if one exists
     */
    public function recordClaimExpense(ExpenseClaim $claim): ?DepartmentBudget
    {
        $employee = $claim->employee;
        if (! $employee || ! $employee->department_id) {
            return null;
        }

        $year = $claim->claim_date ? Carbon::parse($claim->claim_date)->year : (int) date('Y');

        $budget = DepartmentBudget::where('organization_id', $claim->organization_id)
            ->where('department_id', $employee->department_id)
            ->where('year', $year)
            ->first();

        if ($budget) {
            $budget->increment('spent_amount', (float) $claim->amount);
            $budget->refresh();
        }

        return $budget;
    }

    /**
     * Revert an expense amount from department budget (e.g. if rejected or cancelled)
     */
    public function revertClaimExpense(ExpenseClaim $claim): ?DepartmentBudget
    {
        $employee = $claim->employee;
        if (! $employee || ! $employee->department_id) {
            return null;
        }

        $year = $claim->claim_date ? Carbon::parse($claim->claim_date)->year : (int) date('Y');

        $budget = DepartmentBudget::where('organization_id', $claim->organization_id)
            ->where('department_id', $employee->department_id)
            ->where('year', $year)
            ->first();

        if ($budget) {
            $newSpent = max(0.0, (float) $budget->spent_amount - (float) $claim->amount);
            $budget->update(['spent_amount' => $newSpent]);
            $budget->refresh();
        }

        return $budget;
    }
}
