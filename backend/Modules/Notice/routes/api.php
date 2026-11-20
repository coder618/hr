<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Notice\Http\Controllers\NoticeController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:notice'])->group(function () {
    Route::get('notices', [NoticeController::class, 'index']);
    Route::get('notices/my', [NoticeController::class, 'myNotices']);
    Route::get('notices/{id}', [NoticeController::class, 'show']);
    Route::post('notices/{id}/acknowledge', [NoticeController::class, 'acknowledge']);

    // Notice Management & Publishing (Admin, HR, Manager)
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::post('notices', [NoticeController::class, 'store']);
        Route::put('notices/{id}', [NoticeController::class, 'update']);
        Route::delete('notices/{id}', [NoticeController::class, 'destroy']);
        Route::post('notices/{id}/pin', [NoticeController::class, 'togglePin']);
        Route::get('notices/{id}/acknowledgments', [NoticeController::class, 'acknowledgments']);
    });
});
