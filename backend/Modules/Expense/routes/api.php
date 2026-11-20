<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Expense\Http\Controllers\DepartmentBudgetController;
use Modules\Expense\Http\Controllers\ExpenseCategoryController;
use Modules\Expense\Http\Controllers\ExpenseClaimController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:expense'])->group(function () {
    // Categories & Budgets Configuration (Admin, HR, Manager)
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::get('expenses/categories', [ExpenseCategoryController::class, 'index']);
        Route::post('expenses/categories', [ExpenseCategoryController::class, 'store']);
        Route::get('expenses/categories/{id}', [ExpenseCategoryController::class, 'show']);
        Route::put('expenses/categories/{id}', [ExpenseCategoryController::class, 'update']);
        Route::delete('expenses/categories/{id}', [ExpenseCategoryController::class, 'destroy']);

        Route::get('expenses/budgets', [DepartmentBudgetController::class, 'index']);
        Route::post('expenses/budgets', [DepartmentBudgetController::class, 'storeOrUpdate']);
        Route::get('expenses/budgets/summary', [DepartmentBudgetController::class, 'summary']);
    });

    // Claims Submission & Tracking
    Route::get('expenses/claims', [ExpenseClaimController::class, 'index']);
    Route::post('expenses/claims', [ExpenseClaimController::class, 'store']);
    Route::get('expenses/claims/analytics', [ExpenseClaimController::class, 'analytics']);
    Route::get('expenses/claims/export', [ExpenseClaimController::class, 'exportCsv']);
    Route::get('expenses/claims/{id}', [ExpenseClaimController::class, 'show']);

    // Approval Workflow
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::post('expenses/claims/{id}/approve', [ExpenseClaimController::class, 'approve']);
        Route::post('expenses/claims/{id}/reject', [ExpenseClaimController::class, 'reject']);
    });

    // Reimbursement Settlement (Admin, HR)
    Route::post('expenses/claims/{id}/reimburse', [ExpenseClaimController::class, 'reimburse'])->middleware('role:admin,hr');
});
