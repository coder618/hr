<?php

namespace Modules\Payroll\Services;

use Carbon\Carbon;
use Modules\Core\Contracts\AttendanceLookupContract;
use Modules\Core\Contracts\LeaveLookupContract;
use Modules\Employee\Entities\Employee;
use Modules\Payroll\Entities\EmployeeSalary;
use Modules\Payroll\Entities\SalaryComponent;

class PayrollCalculationService
{
    public function __construct(
        protected ?AttendanceLookupContract $attendanceLookup = null,
        protected ?LeaveLookupContract $leaveLookup = null
    ) {}

    /**
     * Calculate monthly salary breakdown for an employee.
     */
    public function calculateMonthlySalary(EmployeeSalary $salary, int $year, int $month): array
    {
        $employee = $salary->employee;
        $orgId = $salary->organization_id;

        // 1. Calculate month working days
        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth = Carbon::createFromDate($year, $month, 1)->endOfMonth();

        $totalWeekdays = 0;
        $curr = $startOfMonth->copy();
        while ($curr->lessThanOrEqualTo($endOfMonth)) {
            if (!in_array($curr->dayOfWeek, [0, 6])) { // Mon-Fri
                $totalWeekdays++;
            }
            $curr->addDay();
        }
        $workingDays = max(1, $totalWeekdays);

        // 2. Fetch Attendance Metrics
        $presentDays = 0;
        $absentDays = 0;
        $overtimeMinutes = 0;
        $lateMinutes = 0;

        if ($this->attendanceLookup) {
            $monthStr = sprintf('%04d-%02d', $year, $month);
            $attSummary = $this->attendanceLookup->getEmployeeMonthlySummary($employee->id, $monthStr);
            $presentDays = (float) (($attSummary['present_days'] ?? 0) + ($attSummary['late_days'] ?? 0));
            $absentDays = (float) ($attSummary['absent_days'] ?? 0);
            $overtimeMinutes = (int) ($attSummary['total_overtime_minutes'] ?? 0);
            $lateMinutes = (int) ($attSummary['total_late_minutes'] ?? 0);
        }

        // 3. Fetch Leave Metrics
        $paidLeaveDays = 0;
        $unpaidLeaveDays = 0;
        if ($this->leaveLookup) {
            $leaveSummary = $this->leaveLookup->getMonthlyLeaveSummary($orgId, $employee->id, $year, $month);
            $paidLeaveDays = (float) ($leaveSummary['total_leave_days'] ?? 0);
        }

        // 4. Calculate Earnings
        $baseSalary = (float) $salary->base_salary;
        $earnings = [];
        $earnings[] = [
            'name' => 'Basic Salary',
            'amount' => $baseSalary,
        ];

        $structure = $salary->structure;
        $customOverrides = $salary->custom_components ?? [];

        if ($structure) {
            $structureComponents = $structure->components()->where('type', 'earning')->get();
            foreach ($structureComponents as $comp) {
                $amount = 0.0;
                if (isset($customOverrides[$comp->id])) {
                    $amount = (float) $customOverrides[$comp->id];
                } elseif ($comp->calculation_type === 'percentage_of_basic') {
                    $amount = round(($baseSalary * ($comp->percentage_value ?? 0)) / 100, 2);
                } else {
                    $amount = (float) $comp->default_amount;
                }

                if ($amount > 0) {
                    $earnings[] = [
                        'name' => $comp->name,
                        'amount' => $amount,
                    ];
                }
            }
        }

        // Overtime earnings (e.g. 1.5x hourly rate based on 176 standard work hours/month)
        if ($overtimeMinutes > 0) {
            $hourlyRate = $baseSalary / 176;
            $overtimePay = round(($overtimeMinutes / 60) * ($hourlyRate * 1.5), 2);
            if ($overtimePay > 0) {
                $earnings[] = [
                    'name' => 'Overtime Pay',
                    'amount' => $overtimePay,
                ];
            }
        }

        $grossPay = array_sum(array_column($earnings, 'amount'));

        // 5. Calculate Deductions
        $deductions = [];

        // Absent / Unpaid leave deduction
        $unpaidDays = $absentDays + $unpaidLeaveDays;
        if ($unpaidDays > 0) {
            $dailyRate = $baseSalary / $workingDays;
            $unpaidDeduction = round($dailyRate * $unpaidDays, 2);
            $deductions[] = [
                'name' => 'Unpaid Absence Deduction (' . $unpaidDays . ' days)',
                'amount' => $unpaidDeduction,
            ];
        }

        if ($structure) {
            $structureDeductions = $structure->components()->where('type', 'deduction')->get();
            foreach ($structureDeductions as $comp) {
                $amount = 0.0;
                if (isset($customOverrides[$comp->id])) {
                    $amount = (float) $customOverrides[$comp->id];
                } elseif ($comp->calculation_type === 'percentage_of_basic') {
                    $amount = round(($baseSalary * ($comp->percentage_value ?? 0)) / 100, 2);
                } else {
                    $amount = (float) $comp->default_amount;
                }

                if ($amount > 0) {
                    $deductions[] = [
                        'name' => $comp->name,
                        'amount' => $amount,
                    ];
                }
            }
        }

        $totalDeductions = array_sum(array_column($deductions, 'amount'));
        $netPay = max(0, round($grossPay - $totalDeductions, 2));

        return [
            'working_days' => (float) $workingDays,
            'present_days' => $presentDays,
            'paid_leave_days' => $paidLeaveDays,
            'unpaid_leave_days' => $unpaidLeaveDays,
            'absent_days' => $absentDays,
            'overtime_minutes' => $overtimeMinutes,
            'late_minutes' => $lateMinutes,
            'base_salary' => $baseSalary,
            'earnings' => $earnings,
            'deductions' => $deductions,
            'gross_pay' => $grossPay,
            'total_deductions' => $totalDeductions,
            'net_pay' => $netPay,
            'payment_method' => $salary->payment_method,
        ];
    }
}
