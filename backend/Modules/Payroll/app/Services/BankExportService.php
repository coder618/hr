<?php

namespace Modules\Payroll\Services;

use Modules\Payroll\Entities\PayrollRun;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BankExportService
{
    /**
     * Stream low-memory CSV of bank transfer instructions for a payroll run.
     */
    public function streamBankTransferCsv(PayrollRun $run): StreamedResponse
    {
        $filename = "Bank_Disbursement_{$run->batch_number}.csv";

        return response()->stream(function () use ($run) {
            $handle = fopen('php://output', 'w');

            // Header row
            fputcsv($handle, [
                'Employee Code',
                'Employee Name',
                'Bank Name',
                'Account Number',
                'Routing Number',
                'Net Salary',
                'Payment Method',
                'Batch Number',
                'Payment Status',
            ]);

            $payslipsQuery = $run->payslips()
                ->with(['employee.user', 'employee'])
                ->orderBy('id', 'asc');

            // Chunked streaming to prevent memory spikes
            $payslipsQuery->chunk(100, function ($payslips) use ($handle, $run) {
                foreach ($payslips as $slip) {
                    $emp = $slip->employee;
                    $empSalary = $emp?->salary;

                    fputcsv($handle, [
                        $emp?->employee_code ?? '',
                        $emp ? "{$emp->first_name} {$emp->last_name}" : '',
                        $empSalary?->bank_name ?? 'N/A',
                        $empSalary?->bank_account_number ?? 'N/A',
                        $empSalary?->bank_routing_number ?? 'N/A',
                        number_format($slip->net_pay, 2, '.', ''),
                        $slip->payment_method,
                        $run->batch_number,
                        $slip->payment_status,
                    ]);
                }
            });

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
