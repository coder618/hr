<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Media\Http\Controllers\MediaController;

Route::prefix('v1/media')->group(function () {
    // 1. Authorized File Delivery & Streaming (Zero Symlink Dependency)
    Route::get('{uuid}/preview', [MediaController::class, 'preview'])->name('media.preview');
    Route::get('{uuid}/thumbnail', [MediaController::class, 'thumbnail'])->name('media.thumbnail');
    Route::get('{uuid}/download', [MediaController::class, 'download'])->name('media.download');

    // 2. Authenticated Management Endpoints (Admin, HR, Manager)
    Route::middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'role:admin,hr,manager'])->group(function () {
        Route::get('/', [MediaController::class, 'index']);
        Route::post('upload', [MediaController::class, 'upload']);
        Route::post('upload-chunk', [MediaController::class, 'uploadChunk']);
        Route::put('{id}', [MediaController::class, 'update']);
        Route::delete('{id}', [MediaController::class, 'destroy']);
        Route::post('bulk-delete', [MediaController::class, 'bulkDelete']);

        // Folder Operations
        Route::get('folders/list', [MediaController::class, 'folders']);
        Route::post('folders', [MediaController::class, 'createFolder']);
        Route::delete('folders/{id}', [MediaController::class, 'deleteFolder']);
    });
});
