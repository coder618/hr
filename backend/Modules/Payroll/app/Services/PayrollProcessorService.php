<?php

namespace Modules\Payroll\Services;

use Modules\Payroll\Entities\EmployeeSalary;
use Modules\Payroll\Entities\PayrollRun;
use Modules\Payroll\Entities\Payslip;

class PayrollProcessorService
{
    public function __construct(
        protected PayrollCalculationService $calculationService
    ) {}

    /**
     * Process payroll run in chunked batches (memory safe for cPanel shared hosting).
     */
    public function processRun(PayrollRun $run): void
    {
        $orgId = $run->organization_id;

        $salaryQuery = EmployeeSalary::withoutGlobalScopes()
            ->with(['employee', 'structure.components'])
            ->where('organization_id', $orgId)
            ->whereHas('employee', function ($q) use ($run) {
                $q->where('status', 'active');
                if ($run->branch_id) {
                    $q->where('branch_id', $run->branch_id);
                }
            });

        $totalEmployees = 0;
        $totalGross = 0.0;
        $totalDeductions = 0.0;
        $totalNet = 0.0;

        // Process in small chunks to prevent cPanel memory spikes and execution timeouts
        $salaryQuery->chunk(25, function ($salaries) use ($run, &$totalEmployees, &$totalGross, &$totalDeductions, &$totalNet) {
            foreach ($salaries as $salary) {
                $employee = $salary->employee;
                if (!$employee) {
                    continue;
                }

                $breakdown = $this->calculationService->calculateMonthlySalary(
                    $salary,
                    $run->year,
                    $run->month
                );

                $payslipNumber = sprintf(
                    'PAY-%04d%02d-%s',
                    $run->year,
                    $run->month,
                    $employee->employee_code
                );

                $payslip = Payslip::withoutGlobalScopes()->firstOrNew([
                    'organization_id' => $run->organization_id,
                    'payroll_run_id' => $run->id,
                    'employee_id' => $employee->id,
                ]);

                $payslip->payslip_number = $payslipNumber;
                $payslip->year = $run->year;
                $payslip->month = $run->month;
                $payslip->working_days = $breakdown['working_days'];
                $payslip->present_days = $breakdown['present_days'];
                $payslip->paid_leave_days = $breakdown['paid_leave_days'];
                $payslip->unpaid_leave_days = $breakdown['unpaid_leave_days'];
                $payslip->absent_days = $breakdown['absent_days'];
                $payslip->overtime_minutes = $breakdown['overtime_minutes'];
                $payslip->late_minutes = $breakdown['late_minutes'];
                $payslip->base_salary = $breakdown['base_salary'];
                $payslip->earnings_breakdown = $breakdown['earnings'];
                $payslip->deductions_breakdown = $breakdown['deductions'];
                $payslip->gross_pay = $breakdown['gross_pay'];
                $payslip->total_deductions = $breakdown['total_deductions'];
                $payslip->net_pay = $breakdown['net_pay'];
                $payslip->payment_method = $breakdown['payment_method'];
                $payslip->payment_status = 'pending';
                $payslip->save();

                $totalEmployees++;
                $totalGross += $breakdown['gross_pay'];
                $totalDeductions += $breakdown['total_deductions'];
                $totalNet += $breakdown['net_pay'];
            }
        });

        // Update run summary totals
        $run->total_employees = $totalEmployees;
        $run->total_gross = round($totalGross, 2);
        $run->total_deductions = round($totalDeductions, 2);
        $run->total_net = round($totalNet, 2);
        $run->status = 'draft';
        $run->save();
    }
}
