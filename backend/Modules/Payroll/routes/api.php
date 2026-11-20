<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Payroll\Http\Controllers\EmployeeSalaryController;
use Modules\Payroll\Http\Controllers\PayrollRunController;
use Modules\Payroll\Http\Controllers\PayslipController;
use Modules\Payroll\Http\Controllers\SalaryStructureController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:payroll'])->group(function () {
    // Salary Structures & Components (Restricted to Admin and HR)
    Route::middleware('role:admin,hr')->group(function () {
        Route::get('payroll/structures', [SalaryStructureController::class, 'index']);
        Route::post('payroll/structures', [SalaryStructureController::class, 'store']);
        Route::get('payroll/structures/{id}', [SalaryStructureController::class, 'show']);
        Route::put('payroll/structures/{id}', [SalaryStructureController::class, 'update']);
        Route::delete('payroll/structures/{id}', [SalaryStructureController::class, 'destroy']);
        Route::post('payroll/structures/{id}/components', [SalaryStructureController::class, 'addComponent']);
        Route::delete('payroll/structures/{id}/components/{componentId}', [SalaryStructureController::class, 'deleteComponent']);

        // Employee Salary Assignments
        Route::get('payroll/employee-salaries', [EmployeeSalaryController::class, 'index']);
        Route::post('payroll/employee-salaries', [EmployeeSalaryController::class, 'storeOrUpdate']);
        Route::get('payroll/employee-salaries/{employeeId}', [EmployeeSalaryController::class, 'show']);

        // Payroll Processing Runs
        Route::get('payroll/runs', [PayrollRunController::class, 'index']);
        Route::post('payroll/runs', [PayrollRunController::class, 'store']);
        Route::get('payroll/runs/{id}', [PayrollRunController::class, 'show']);
        Route::post('payroll/runs/{id}/calculate', [PayrollRunController::class, 'calculate']);
        Route::post('payroll/runs/{id}/approve', [PayrollRunController::class, 'approve']);
        Route::post('payroll/runs/{id}/mark-paid', [PayrollRunController::class, 'markPaid']);
        Route::get('payroll/runs/{id}/export-bank-csv', [PayrollRunController::class, 'exportBankCsv']);
    });

    // Payslips & PDF Generation
    Route::get('payroll/payslips', [PayslipController::class, 'index'])->middleware('role:admin,hr,manager');
    Route::get('payroll/payslips/my', [PayslipController::class, 'myPayslips']);
    Route::get('payroll/payslips/{id}', [PayslipController::class, 'show']);
    Route::get('payroll/payslips/{id}/pdf', [PayslipController::class, 'downloadPdf']);
});
