<?php

namespace Modules\Core\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Spatie\Activitylog\Models\Activity;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * List audit logs scoped by tenant or platform-wide for Super Admin
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = $this->buildAuditQuery($request, $user);

        $perPage = (int) $request->get('per_page', 20);
        $logs = $query->paginate($perPage);

        return $this->successResponse(
            $logs->items(),
            'Audit logs retrieved.',
            [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'last_page' => $logs->lastPage(),
            ]
        );
    }

    /**
     * Stream audit logs as low-memory CSV export
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $user = $request->user();
        $query = $this->buildAuditQuery($request, $user);

        $fileName = 'audit_logs_' . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return new StreamedResponse(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // UTF-8 BOM

            fputcsv($handle, [
                'Timestamp',
                'Actor Name',
                'Actor Email',
                'Event',
                'Log Name',
                'Description',
                'Subject Type',
                'Subject ID',
                'Properties',
            ]);

            foreach ($query->cursor() as $log) {
                fputcsv($handle, [
                    $log->created_at ? Carbon::parse($log->created_at)->format('d-m-Y H:i') : '',
                    $log->causer?->name ?? 'System',
                    $log->causer?->email ?? '',
                    $log->event ?? '',
                    $log->log_name ?? '',
                    $log->description ?? '',
                    $log->subject_type ?? '',
                    $log->subject_id ?? '',
                    json_encode($log->properties ?? []),
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Base query builder for audit logs
     */
    protected function buildAuditQuery(Request $request, $user)
    {
        $query = Activity::with('causer')->latest();

        $tenantId = $this->tenantContext->getTenantId() ?: $user->organization_id;

        if ($tenantId) {
            $query->where(function ($q) use ($tenantId) {
                $q->where('properties->organization_id', $tenantId)
                  ->orWhere('properties->organization_id', (string) $tenantId)
                  ->orWhereHas('causer', function ($cq) use ($tenantId) {
                      $cq->where('organization_id', $tenantId);
                  });
            });
        } elseif (! $user->isSuperAdmin()) {
            abort(403, 'Unauthorized audit log access.');
        }

        if ($request->filled('log_name')) {
            $query->where('log_name', $request->input('log_name'));
        }

        if ($request->filled('event')) {
            $event = $request->input('event');
            $query->where(function ($q) use ($event) {
                $q->where('event', $event)
                  ->orWhere('log_name', $event);
            });
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('log_name', 'like', "%{$search}%")
                  ->orWhere('event', 'like', "%{$search}%")
                  ->orWhereHas('causer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->input('end_date'));
        }

        return $query;
    }
}
