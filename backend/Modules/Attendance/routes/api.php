<?php

use Illuminate\Support\Facades\Route;
use Modules\Attendance\Http\Controllers\AttendancePunchController;
use Modules\Attendance\Http\Controllers\AttendanceRecordController;
use Modules\Attendance\Http\Controllers\AttendanceReportController;
use Modules\Attendance\Http\Controllers\BiometricDeviceController;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;

// 1. Biometric Hardware Device Push Endpoint (Zero Session/CSRF dependency, authenticated via Device API Key)
Route::prefix('v1/devices')->group(function () {
    Route::post('attendance/push', [BiometricDeviceController::class, 'devicePush']);
});

// 2. Authenticated Attendance System Endpoints
Route::prefix('v1/attendance')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:attendance'])->group(function () {
    // Punch operations (Web & Mobile with Geofence verification) - Accessible to all employees
    Route::post('punch', [AttendancePunchController::class, 'punch']);
    Route::get('today', [AttendancePunchController::class, 'today']);

    // Attendance Records & Regularization
    Route::get('records', [AttendanceRecordController::class, 'index']);
    Route::post('regularize', [AttendanceRecordController::class, 'regularize']);

    // Management approvals for regularization (Admin, HR, Manager)
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::post('records/{id}/approve-regularization', [AttendanceRecordController::class, 'approveRegularization']);
        Route::post('records/{id}/reject-regularization', [AttendanceRecordController::class, 'rejectRegularization']);
        Route::get('reports/summary', [AttendanceReportController::class, 'summary']);
        Route::get('reports/export/csv', [AttendanceReportController::class, 'export']);
    });

    // Biometric Devices Configuration (Restricted to Admin and HR)
    Route::middleware('role:admin,hr')->group(function () {
        Route::get('devices', [BiometricDeviceController::class, 'index']);
        Route::post('devices', [BiometricDeviceController::class, 'store']);
        Route::get('devices/{id}', [BiometricDeviceController::class, 'show']);
        Route::put('devices/{id}', [BiometricDeviceController::class, 'update']);
        Route::delete('devices/{id}', [BiometricDeviceController::class, 'destroy']);
    });

    // Organization Holiday Management (Managed exclusively by Tenant Admin / Owner & Super Admin)
    Route::get('holidays', [\Modules\Leave\Http\Controllers\HolidayController::class, 'index']);
    Route::middleware('role:admin')->group(function () {
        Route::post('holidays', [\Modules\Leave\Http\Controllers\HolidayController::class, 'store']);
        Route::put('holidays/{id}', [\Modules\Leave\Http\Controllers\HolidayController::class, 'update']);
        Route::delete('holidays/{id}', [\Modules\Leave\Http\Controllers\HolidayController::class, 'destroy']);
    });
});
