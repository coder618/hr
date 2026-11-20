<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Leave\Http\Controllers\HolidayController;
use Modules\Leave\Http\Controllers\LeaveBalanceController;
use Modules\Leave\Http\Controllers\LeaveRequestController;
use Modules\Leave\Http\Controllers\LeaveTypeController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:leave'])->group(function () {
    // Leave Types & Policies (Configuration by Admin and HR)
    Route::get('leave/types', [LeaveTypeController::class, 'index']);
    Route::middleware('role:admin,hr')->group(function () {
        Route::post('leave/types', [LeaveTypeController::class, 'store']);
        Route::put('leave/types/{id}', [LeaveTypeController::class, 'update']);
        Route::delete('leave/types/{id}', [LeaveTypeController::class, 'destroy']);
    });

    // Holidays Calendar (Configured by Tenant Admin and Super Admin only, readable by all)
    Route::get('leave/holidays', [HolidayController::class, 'index']);
    Route::middleware('role:admin')->group(function () {
        Route::post('leave/holidays', [HolidayController::class, 'store']);
        Route::put('leave/holidays/{id}', [HolidayController::class, 'update']);
        Route::delete('leave/holidays/{id}', [HolidayController::class, 'destroy']);
    });

    // Leave Balances
    Route::get('leave/balances', [LeaveBalanceController::class, 'index'])->middleware('role:admin,hr,manager');
    Route::get('leave/balances/my', [LeaveBalanceController::class, 'myBalances']);
    Route::post('leave/balances/adjust', [LeaveBalanceController::class, 'adjust'])->middleware('role:admin,hr');

    // Leave Requests & Self-Service
    Route::post('leave/calculate-days', [LeaveRequestController::class, 'calculateDays']);
    Route::get('leave/requests', [LeaveRequestController::class, 'index']);
    Route::post('leave/requests', [LeaveRequestController::class, 'store']);
    Route::post('leave/requests/{id}/cancel', [LeaveRequestController::class, 'cancel']);

    // Leave Approvals Workflow (Admin, HR, Manager)
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::post('leave/requests/{id}/approve', [LeaveRequestController::class, 'approve']);
        Route::post('leave/requests/{id}/reject', [LeaveRequestController::class, 'reject']);
    });

    // Full Leave & Holiday Calendar
    Route::get('leave/calendar', [LeaveRequestController::class, 'calendar']);
});
