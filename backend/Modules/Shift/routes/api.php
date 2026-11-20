<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Shift\Http\Controllers\ShiftAssignmentController;
use Modules\Shift\Http\Controllers\ShiftController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:shift'])->group(function () {
    // Shifts Management & Rostering (Admin, HR, Manager)
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::get('shifts', [ShiftController::class, 'index']);
        Route::post('shifts', [ShiftController::class, 'store']);
        Route::get('shifts/{id}', [ShiftController::class, 'show']);
        Route::put('shifts/{id}', [ShiftController::class, 'update']);
        Route::delete('shifts/{id}', [ShiftController::class, 'destroy']);
        Route::post('shifts/{id}/set-default', [ShiftController::class, 'setDefault']);

        // Shift Assignments & Rostering
        Route::get('shift-assignments', [ShiftAssignmentController::class, 'index']);
        Route::post('shift-assignments', [ShiftAssignmentController::class, 'store']);
        Route::post('shift-assignments/batch', [ShiftAssignmentController::class, 'batch']);
        Route::delete('shift-assignments/{id}', [ShiftAssignmentController::class, 'destroy']);
    });

    // Employee Dynamic Schedule Roster Preview (Accessible to all authenticated staff)
    Route::get('shifts/employee/{employeeId}/schedule', [ShiftAssignmentController::class, 'getEmployeeRoster']);
});
