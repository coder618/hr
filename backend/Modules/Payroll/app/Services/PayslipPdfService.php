<?php

namespace Modules\Payroll\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Modules\Core\Entities\Organization;
use Modules\Payroll\Entities\Payslip;

class PayslipPdfService
{
    /**
     * Generate HTML or PDF binary for a payslip.
     */
    public function renderPdf(Payslip $payslip): \Barryvdh\DomPDF\PDF
    {
        $organization = Organization::find($payslip->organization_id);
        $employee = $payslip->employee;

        return Pdf::loadView('payroll::payslip-pdf', [
            'payslip' => $payslip,
            'organization' => $organization,
            'employee' => $employee,
        ])->setPaper('a4', 'portrait');
    }

    /**
     * Stream or download payslip PDF.
     */
    public function streamPdf(Payslip $payslip): Response
    {
        $pdf = $this->renderPdf($payslip);
        $filename = "{$payslip->payslip_number}.pdf";

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
        ]);
    }
}
