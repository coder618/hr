<?php

namespace Modules\Payroll\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Payroll\Entities\PayrollRun;
use Modules\Payroll\Services\BankExportService;
use Modules\Payroll\Services\PayrollProcessorService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollRunController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext,
        protected PayrollProcessorService $processorService,
        protected BankExportService $bankExportService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = PayrollRun::with(['branch', 'approvedByUser']);

        if ($request->filled('year')) {
            $query->where('year', (int) $request->query('year'));
        }

        $runs = $query->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->paginate($request->query('per_page', 15));

        return response()->json($runs);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2050',
            'month' => 'required|integer|between:1,12',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $batchNumber = sprintf('PAY-%04d-%02d', $validated['year'], $validated['month']);

        $run = PayrollRun::create([
            'organization_id' => $this->tenantContext->getTenantId(),
            'batch_number' => $batchNumber,
            'year' => $validated['year'],
            'month' => $validated['month'],
            'branch_id' => $validated['branch_id'] ?? null,
            'status' => 'draft',
        ]);

        // Automatically run initial calculation
        $this->processorService->processRun($run);

        return response()->json([
            'message' => 'Payroll run created and calculated successfully.',
            'data' => $run->fresh(['branch', 'payslips']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $run = PayrollRun::with(['branch', 'approvedByUser', 'payslips.employee'])->findOrFail($id);
        return response()->json(['data' => $run]);
    }

    public function calculate(int $id): JsonResponse
    {
        $run = PayrollRun::findOrFail($id);

        if ($run->status === 'approved' || $run->status === 'paid') {
            return response()->json([
                'message' => "Cannot re-calculate a payroll run that is already {$run->status}.",
            ], 422);
        }

        $this->processorService->processRun($run);

        return response()->json([
            'message' => 'Payroll calculation refreshed successfully.',
            'data' => $run->fresh(['branch', 'payslips']),
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $run = PayrollRun::findOrFail($id);

        if ($run->status !== 'draft') {
            return response()->json([
                'message' => "Payroll run is already {$run->status}.",
            ], 422);
        }

        $run->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'Payroll run approved successfully.',
            'data' => $run->load('approvedByUser'),
        ]);
    }

    public function markPaid(Request $request, int $id): JsonResponse
    {
        $run = PayrollRun::findOrFail($id);

        if ($run->status !== 'approved') {
            return response()->json([
                'message' => 'Payroll run must be approved before marking as paid.',
            ], 422);
        }

        $now = Carbon::now();
        $run->update([
            'status' => 'paid',
            'paid_at' => $now,
        ]);

        // Mark all payslips as paid
        $run->payslips()->update([
            'payment_status' => 'paid',
        ]);

        return response()->json([
            'message' => 'Payroll marked as paid.',
            'data' => $run,
        ]);
    }

    public function exportBankCsv(int $id): StreamedResponse
    {
        $run = PayrollRun::findOrFail($id);
        return $this->bankExportService->streamBankTransferCsv($run);
    }
}
