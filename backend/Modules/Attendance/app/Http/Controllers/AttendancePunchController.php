<?php

namespace Modules\Attendance\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Attendance\Entities\AttendanceLog;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Attendance\Services\AttendanceProcessorService;
use Modules\Attendance\Services\GeofenceService;
use Modules\Core\Traits\ApiResponseTrait;

class AttendancePunchController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected GeofenceService $geofenceService,
        protected AttendanceProcessorService $processor
    ) {}

    /**
     * Clock in / out punch from web or mobile application.
     */
    public function punch(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = $user->employee()->with('branch')->first();

        if (!$employee) {
            return $this->errorResponse('No employee profile linked to your user account.', null, 403);
        }

        $validated = $request->validate([
            'punch_type' => 'required|string|in:in,out,break_start,break_end',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'source' => 'nullable|string|in:web,mobile,manual',
            'notes' => 'nullable|string|max:500',
        ]);

        $branch = $employee->branch;
        $isGeofenceVerified = true;
        $distanceMeters = null;

        // Perform geofence verification if coordinates provided and branch has GPS set
        if (!empty($validated['latitude']) && !empty($validated['longitude']) && $branch && $branch->latitude && $branch->longitude) {
            $distanceMeters = round($this->geofenceService->calculateDistance(
                (float) $validated['latitude'],
                (float) $validated['longitude'],
                (float) $branch->latitude,
                (float) $branch->longitude
            ), 1);

            $radius = $branch->geofence_radius_meters ?: 100;
            $isGeofenceVerified = ($distanceMeters <= $radius);
        }

        $now = Carbon::now();

        $log = AttendanceLog::create([
            'organization_id' => $employee->organization_id,
            'employee_id' => $employee->id,
            'punch_time' => $now,
            'punch_type' => $validated['punch_type'],
            'source' => $validated['source'] ?? 'web',
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'is_geofence_verified' => $isGeofenceVerified,
            'ip_address' => $request->ip(),
            'metadata' => [
                'user_agent' => $request->userAgent(),
                'distance_meters' => $distanceMeters,
                'notes' => $validated['notes'] ?? null,
            ],
        ]);

        // Real-time recalculation of daily attendance record
        $record = $this->processor->processEmployeeDate($employee->id, $now);

        return $this->successResponse([
            'punch' => $log,
            'record' => $record,
            'distance_to_branch_meters' => $distanceMeters,
            'is_geofence_verified' => $isGeofenceVerified,
        ], 'Attendance punch recorded successfully.', null, 201);
    }

    /**
     * Retrieve today's punch logs and current attendance status for the authenticated user.
     */
    public function today(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = $user->employee()->with('branch')->first();

        if (!$employee) {
            return $this->errorResponse('No employee profile linked to your user account.', null, 403);
        }

        $today = Carbon::today()->toDateString();

        $punches = AttendanceLog::where('employee_id', $employee->id)
            ->whereDate('punch_time', $today)
            ->orderBy('punch_time', 'asc')
            ->get();

        $record = AttendanceRecord::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        return $this->successResponse([
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->full_name,
                'employee_code' => $employee->employee_code,
                'branch' => $employee->branch ? [
                    'id' => $employee->branch->id,
                    'name' => $employee->branch->name,
                    'latitude' => $employee->branch->latitude,
                    'longitude' => $employee->branch->longitude,
                    'geofence_radius_meters' => $employee->branch->geofence_radius_meters,
                ] : null,
            ],
            'punches' => $punches,
            'record' => $record,
            'server_time' => Carbon::now()->toIso8601String(),
        ]);
    }
}
