<?php

namespace Modules\Leave\Services;

use Modules\Core\Entities\Organization;
use Modules\Employee\Entities\Employee;
use Modules\Leave\Entities\LeaveBalance;
use Modules\Leave\Entities\LeaveType;

class LeaveAccrualService
{
    /**
     * Accrue or initialize leave balances for employees.
     */
    public function accrueForOrganization(int $organizationId, int $year, int $month): int
    {
        $organization = Organization::find($organizationId);
        if (!$organization) {
            return 0;
        }

        $employees = Employee::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->get();

        $leaveTypes = LeaveType::withoutGlobalScopes()
            ->where('organization_id', $organizationId)
            ->where('is_active', true)
            ->get();

        $updatedCount = 0;

        foreach ($employees as $employee) {
            foreach ($leaveTypes as $type) {
                // Skip if gender restricted
                if ($type->gender_restriction !== 'any') {
                    if (strtolower($employee->gender ?? '') !== strtolower($type->gender_restriction)) {
                        continue;
                    }
                }

                $balance = LeaveBalance::withoutGlobalScopes()->firstOrNew([
                    'organization_id' => $organizationId,
                    'employee_id' => $employee->id,
                    'leave_type_id' => $type->id,
                    'year' => $year,
                ]);

                if (!$balance->exists) {
                    $balance->allocated_days = $type->annual_entitlement;
                    $balance->carried_forward = 0;
                    $balance->used_days = 0;
                    $balance->pending_days = 0;

                    if ($type->accrual_frequency === 'annual_lump_sum') {
                        $balance->accrued_days = $type->annual_entitlement;
                    } else {
                        // Monthly accrual: months passed up to current month
                        $monthlyRate = round($type->annual_entitlement / 12, 2);
                        $balance->accrued_days = min($type->annual_entitlement, round($monthlyRate * $month, 2));
                    }
                } else {
                    if ($type->accrual_frequency === 'monthly') {
                        $monthlyRate = round($type->annual_entitlement / 12, 2);
                        $newAccrued = min($type->annual_entitlement, round($monthlyRate * $month, 2));
                        if ($newAccrued > $balance->accrued_days) {
                            $balance->accrued_days = $newAccrued;
                        }
                    }
                }

                $balance->save();
                $updatedCount++;
            }
        }

        return $updatedCount;
    }

    /**
     * Run accrual across all active organizations.
     */
    public function accrueAll(int $year, int $month): int
    {
        $organizations = Organization::where('status', 'active')->get();
        $total = 0;
        foreach ($organizations as $org) {
            $total += $this->accrueForOrganization($org->id, $year, $month);
        }
        return $total;
    }
}
