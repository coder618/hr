<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Controllers\AuthController;
use Modules\Core\Http\Controllers\AuditLogController;
use Modules\Core\Http\Controllers\BrandingController;
use Modules\Core\Http\Controllers\HealthController;
use Modules\Core\Http\Controllers\InstallerController;
use Modules\Core\Http\Controllers\Platform\OrganizationController;
use Modules\Core\Http\Controllers\Platform\PlatformDashboardController;
use Modules\Core\Http\Controllers\TenantDashboardController;
use Modules\Core\Http\Controllers\TenantSettingsController;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Core\Http\Middleware\RequireSuperAdmin;

/*
|--------------------------------------------------------------------------
| API Routes for Core Module
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // 1. Public Endpoints
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::get('branding', [BrandingController::class, 'show']);
    Route::get('health', [HealthController::class, 'check']);
    Route::get('installer/status', [InstallerController::class, 'status']);
    Route::post('installer/install', [InstallerController::class, 'install']);

    // 2. Authenticated Endpoints
    Route::middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::put('auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('auth/change-password', [AuthController::class, 'changePassword']);

        // Tenant Dashboard Statistics (Personalized for employee vs management)
        Route::get('dashboard/stats', [TenantDashboardController::class, 'stats']);

        // Tenant Settings & White-Labeling (Admin Only)
        Route::middleware('role:admin')->group(function () {
            Route::get('settings', [TenantSettingsController::class, 'show']);
            Route::put('settings', [TenantSettingsController::class, 'update']);

            // Audit Logs (scoped to tenant or platform)
            Route::get('audit-logs/export', [AuditLogController::class, 'exportCsv']);
            Route::get('audit-logs', [AuditLogController::class, 'index']);
        });
    });

    // 3. Platform Administration (Super Admin Only)
    Route::prefix('platform')
        ->middleware(['auth:sanctum', RequireSuperAdmin::class])
        ->group(function () {
            Route::get('stats', [PlatformDashboardController::class, 'stats']);

            // Organizations Management
            Route::get('organizations', [OrganizationController::class, 'index']);
            Route::post('organizations', [OrganizationController::class, 'store']);
            Route::get('organizations/{id}', [OrganizationController::class, 'show']);
            Route::put('organizations/{id}', [OrganizationController::class, 'update']);
            Route::delete('organizations/{id}', [OrganizationController::class, 'destroy']);

            // Tenant Impersonation & Module Toggling
            Route::post('organizations/{id}/impersonate', [OrganizationController::class, 'impersonate']);
            Route::get('organizations/{id}/modules', [OrganizationController::class, 'getModules']);
            Route::put('organizations/{id}/modules', [OrganizationController::class, 'toggleModules']);
        });
});
