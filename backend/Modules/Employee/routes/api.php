<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Employee\Http\Controllers\BranchController;
use Modules\Employee\Http\Controllers\DepartmentController;
use Modules\Employee\Http\Controllers\DesignationController;
use Modules\Employee\Http\Controllers\EmployeeController;
use Modules\Employee\Http\Controllers\EmployeeImportExportController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:employee'])->group(function () {
    // Branches
    Route::get('branches', [BranchController::class, 'index']);
    Route::get('branches/{id}', [BranchController::class, 'show']);
    Route::middleware('role:admin,hr')->group(function () {
        Route::post('branches', [BranchController::class, 'store']);
        Route::put('branches/{id}', [BranchController::class, 'update']);
        Route::delete('branches/{id}', [BranchController::class, 'destroy']);
    });

    // Departments
    Route::get('departments', [DepartmentController::class, 'index']);
    Route::get('departments/{id}', [DepartmentController::class, 'show']);
    Route::middleware('role:admin,hr')->group(function () {
        Route::post('departments', [DepartmentController::class, 'store']);
        Route::put('departments/{id}', [DepartmentController::class, 'update']);
        Route::delete('departments/{id}', [DepartmentController::class, 'destroy']);
    });

    // Designations
    Route::get('designations', [DesignationController::class, 'index']);
    Route::get('designations/{id}', [DesignationController::class, 'show']);
    Route::middleware('role:admin,hr')->group(function () {
        Route::post('designations', [DesignationController::class, 'store']);
        Route::put('designations/{id}', [DesignationController::class, 'update']);
        Route::delete('designations/{id}', [DesignationController::class, 'destroy']);
    });

    // Employee Import / Export
    Route::get('employees/export/csv', [EmployeeImportExportController::class, 'export'])->middleware('role:admin,hr,manager');
    Route::post('employees/import/csv', [EmployeeImportExportController::class, 'import'])->middleware('role:admin,hr');

    // Employees Directory (Restricted to Admin, HR, and Manager)
    Route::get('employees', [EmployeeController::class, 'index'])->middleware('role:admin,hr,manager');
    Route::get('employees/{id}', [EmployeeController::class, 'show']);

    // Employee Management CRUD & Documents (restricted to Admin and HR)
    Route::middleware('role:admin,hr')->group(function () {
        Route::post('employees', [EmployeeController::class, 'store']);
        Route::put('employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('employees/{id}', [EmployeeController::class, 'destroy']);
        Route::post('employees/{id}/documents', [EmployeeController::class, 'attachDocument']);
        Route::delete('employees/{id}/documents/{mediaId}', [EmployeeController::class, 'detachDocument']);
    });
});
