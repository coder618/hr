<?php

namespace Modules\Attendance\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Attendance\Entities\AttendanceDevice;
use Modules\Attendance\Entities\AttendanceLog;
use Modules\Attendance\Services\AttendanceProcessorService;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Employee;

class BiometricDeviceController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected AttendanceProcessorService $processor
    ) {}

    public function index(): JsonResponse
    {
        $devices = AttendanceDevice::with('branch:id,name,code')->orderBy('name')->get();

        return $this->successResponse($devices);
    }

    public function store(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'serial_number' => [
                'required',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $exists = AttendanceDevice::where('organization_id', $tenantId)
                        ->where('serial_number', $value)
                        ->exists();
                    if ($exists) {
                        $fail('A device with this serial number already exists in your organization.');
                    }
                },
            ],
            'branch_id' => 'nullable|exists:branches,id',
            'device_type' => 'nullable|string|in:zkteco,adms,generic_api',
            'ip_address' => 'nullable|string|max:45',
            'is_active' => 'nullable|boolean',
        ]);

        $device = AttendanceDevice::create($validated);

        return $this->successResponse($device->load('branch'), 'Device registered successfully.', null, 201);
    }

    public function show(int $id): JsonResponse
    {
        $device = AttendanceDevice::with('branch')->withCount('logs')->findOrFail($id);

        return $this->successResponse($device);
    }

    public function update(Request $request, int $id, TenantContextInterface $tenantContext): JsonResponse
    {
        $device = AttendanceDevice::findOrFail($id);
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'serial_number' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($tenantId, $id) {
                    $exists = AttendanceDevice::where('organization_id', $tenantId)
                        ->where('serial_number', $value)
                        ->where('id', '!=', $id)
                        ->exists();
                    if ($exists) {
                        $fail('A device with this serial number already exists.');
                    }
                },
            ],
            'branch_id' => 'nullable|exists:branches,id',
            'device_type' => 'nullable|string|in:zkteco,adms,generic_api',
            'ip_address' => 'nullable|string|max:45',
            'is_active' => 'nullable|boolean',
        ]);

        $device->update($validated);

        return $this->successResponse($device->load('branch'), 'Device updated successfully.');
    }

    public function destroy(int $id): JsonResponse
    {
        $device = AttendanceDevice::findOrFail($id);
        $device->delete();

        return $this->successResponse(null, 'Device deleted successfully.');
    }

    /**
     * Hardware Push Endpoint for Biometric Devices (ZKTeco / ADMS / Push API).
     * Authenticated strictly via Device API Key (exempt from CSRF and user tokens).
     */
    public function devicePush(Request $request): JsonResponse
    {
        $apiKey = $request->bearerToken()
            ?: $request->header('X-Device-Key')
            ?: $request->input('device_api_key');

        if (!$apiKey) {
            return $this->errorResponse('Missing device authentication key.', null, 401);
        }

        $device = AttendanceDevice::withoutGlobalScopes()
            ->where('device_api_key', $apiKey)
            ->where('is_active', true)
            ->first();

        if (!$device) {
            return $this->errorResponse('Invalid or deactivated biometric device API key.', null, 403);
        }

        // Update device heartbeat and IP
        $device->update([
            'last_heartbeat_at' => Carbon::now(),
            'ip_address' => $request->ip(),
        ]);

        $validated = $request->validate([
            'punches' => 'required|array|min:1',
            'punches.*.employee_code' => 'required|string',
            'punches.*.punch_time' => 'required|date',
            'punches.*.punch_type' => 'nullable|string|in:in,out,break_start,break_end',
        ]);

        $orgId = $device->organization_id;
        $employeeCodes = array_column($validated['punches'], 'employee_code');

        $employees = Employee::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->whereIn('employee_code', $employeeCodes)
            ->get()
            ->keyBy('employee_code');

        $processed = 0;
        $affectedDates = [];

        foreach ($validated['punches'] as $punch) {
            $emp = $employees->get($punch['employee_code']);
            if (!$emp) {
                continue;
            }

            $punchTime = Carbon::parse($punch['punch_time']);

            AttendanceLog::create([
                'organization_id' => $orgId,
                'employee_id' => $emp->id,
                'device_id' => $device->id,
                'punch_time' => $punchTime,
                'punch_type' => $punch['punch_type'] ?? 'in',
                'source' => 'biometric_device',
                'is_geofence_verified' => true,
                'ip_address' => $request->ip(),
            ]);

            $affectedDates[$emp->id][] = $punchTime->toDateString();
            $processed++;
        }

        // Process daily attendance for affected employee days
        foreach ($affectedDates as $empId => $dates) {
            $uniqueDates = array_unique($dates);
            foreach ($uniqueDates as $d) {
                $this->processor->processEmployeeDate($empId, $d);
            }
        }

        return $this->successResponse([
            'device' => $device->name,
            'processed_punches' => $processed,
            'server_time' => Carbon::now()->toIso8601String(),
        ], 'Biometric device data synchronized successfully.');
    }
}
