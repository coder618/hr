<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\Http\Middleware\EnsureTenantActive;
use Modules\Core\Http\Middleware\IdentifyTenant;
use Modules\Project\Http\Controllers\MilestoneController;
use Modules\Project\Http\Controllers\ProjectController;
use Modules\Project\Http\Controllers\TaskController;
use Modules\Project\Http\Controllers\TaskTimeLogController;

Route::prefix('v1')->middleware(['auth:sanctum', IdentifyTenant::class, EnsureTenantActive::class, 'module:project'])->group(function () {
    // Projects Overview & Management (Restricted to Admin, HR, Manager)
    Route::middleware('role:admin,hr,manager')->group(function () {
        Route::get('projects', [ProjectController::class, 'index']);
        Route::post('projects', [ProjectController::class, 'store']);
        Route::get('projects/{id}', [ProjectController::class, 'show']);
        Route::put('projects/{id}', [ProjectController::class, 'update']);
        Route::delete('projects/{id}', [ProjectController::class, 'destroy']);
        Route::post('projects/{id}/members', [ProjectController::class, 'assignMember']);
        Route::delete('projects/{id}/members/{employeeId}', [ProjectController::class, 'removeMember']);

        // Project Milestones
        Route::get('projects/{id}/milestones', [MilestoneController::class, 'index']);
        Route::post('projects/{id}/milestones', [MilestoneController::class, 'store']);
        Route::put('projects/{id}/milestones/{milestoneId}', [MilestoneController::class, 'update']);
        Route::delete('projects/{id}/milestones/{milestoneId}', [MilestoneController::class, 'destroy']);

        // Project Tasks List & Task Creation / Deletion
        Route::get('projects/{id}/tasks', [TaskController::class, 'index']);
        Route::post('projects/{id}/tasks', [TaskController::class, 'store']);
        Route::delete('tasks/{id}', [TaskController::class, 'destroy']);
    });

    // Task Execution, Kanban & Employee Self-Service
    Route::get('tasks/my', [TaskController::class, 'myTasks']);
    Route::get('tasks/{id}', [TaskController::class, 'show']);
    Route::put('tasks/{id}', [TaskController::class, 'update']);
    Route::patch('tasks/{id}/status', [TaskController::class, 'updateStatus']);
    Route::put('tasks/{id}/checklist', [TaskController::class, 'updateChecklist']);

    // Task Time Tracking / Work Logs
    Route::get('tasks/{id}/time-logs', [TaskTimeLogController::class, 'index']);
    Route::post('tasks/{id}/time-logs', [TaskTimeLogController::class, 'store']);
    Route::delete('tasks/{id}/time-logs/{logId}', [TaskTimeLogController::class, 'destroy']);
});
