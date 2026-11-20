<?php

namespace Modules\Payroll\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Core\Services\TenantContext;
use Modules\Employee\Entities\Employee;
use Modules\Payroll\Entities\Payslip;
use Modules\Payroll\Services\PayslipPdfService;

class PayslipController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext,
        protected PayslipPdfService $pdfService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Payslip::with(['employee.department', 'payrollRun']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->filled('year')) {
            $query->where('year', (int) $request->query('year'));
        }

        if ($request->filled('month')) {
            $query->where('month', (int) $request->query('month'));
        }

        if ($request->filled('payroll_run_id')) {
            $query->where('payroll_run_id', $request->query('payroll_run_id'));
        }

        $payslips = $query->orderBy('id', 'desc')->paginate($request->query('per_page', 20));

        return response()->json($payslips);
    }

    /**
     * Get payslips for the authenticated employee's portal view.
     */
    public function myPayslips(Request $request): JsonResponse
    {
        $employee = Employee::where('user_id', $request->user()->id)->first();

        if (!$employee) {
            return response()->json(['data' => []]);
        }

        $payslips = Payslip::with('payrollRun')
            ->where('employee_id', $employee->id)
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get();

        return response()->json(['data' => $payslips]);
    }

    public function show(int $id): JsonResponse
    {
        $payslip = Payslip::with(['employee.department', 'employee.designation', 'payrollRun'])->findOrFail($id);
        return response()->json(['data' => $payslip]);
    }

    /**
     * Stream or download PDF payslip rendered via DomPDF.
     */
    public function downloadPdf(Request $request, int $id): Response
    {
        $payslip = Payslip::with(['employee.department', 'employee.designation'])->findOrFail($id);

        // Security check: non-admin employee can only download their own payslip
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$user->hasRole(['admin', 'hr', 'manager'])) {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || $emp->id !== $payslip->employee_id) {
                abort(403, 'Unauthorized access to this payslip.');
            }
        }

        return $this->pdfService->streamPdf($payslip);
    }
}
