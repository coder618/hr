<?php

namespace Modules\Core\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Core\Entities\SchedulerHeartbeat;
use Modules\Core\Traits\ApiResponseTrait;

class HealthController extends Controller
{
    use ApiResponseTrait;

    /**
     * Check system health (DB, Cache, Storage, Cron Heartbeat, Queue)
     */
    public function check(): JsonResponse
    {
        $checks = [
            'database' => false,
            'cache' => false,
            'storage' => false,
            'cron' => false,
            'queue' => false,
        ];

        // 1. Database Check
        try {
            DB::connection()->getPdo();
            $checks['database'] = true;
        } catch (\Exception $e) {
            $checks['database_error'] = $e->getMessage();
        }

        // 2. Cache Check
        try {
            $key = 'health_check_' . time();
            Cache::put($key, 'ok', 10);
            $checks['cache'] = Cache::get($key) === 'ok';
            Cache::forget($key);
        } catch (\Exception $e) {
            $checks['cache_error'] = $e->getMessage();
        }

        // 3. Storage Check
        $testFile = storage_path('app/health_test.tmp');
        try {
            @file_put_contents($testFile, 'ok');
            $checks['storage'] = file_exists($testFile);
            @unlink($testFile);
        } catch (\Exception $e) {
            $checks['storage_error'] = $e->getMessage();
        }

        // 4. Cron Heartbeat Check
        $heartbeat = SchedulerHeartbeat::where('component', 'scheduler')->first();
        $lastHeartbeat = null;
        $heartbeatAgeMinutes = null;

        if ($heartbeat && $heartbeat->last_heartbeat_at) {
            $lastHeartbeat = $heartbeat->last_heartbeat_at->toIso8601String();
            $heartbeatAgeMinutes = round($heartbeat->last_heartbeat_at->diffInSeconds(now()) / 60, 1);
            // Healthy if heartbeat is within 5 minutes
            $checks['cron'] = $heartbeatAgeMinutes <= 5.0;
        }

        // 5. Queue Backlog Check (database driver)
        $pendingJobs = 0;
        $failedJobs = 0;
        try {
            if (DB::getSchemaBuilder()->hasTable('jobs')) {
                $pendingJobs = DB::table('jobs')->count();
            }
            if (DB::getSchemaBuilder()->hasTable('failed_jobs')) {
                $failedJobs = DB::table('failed_jobs')->count();
            }
            $checks['queue'] = true;
        } catch (\Exception $e) {
            $checks['queue_error'] = $e->getMessage();
        }

        // Environment info for cPanel debugging
        $environment = [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'server_time' => now()->toIso8601String(),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time') . 's',
            'upload_max_filesize' => ini_get('upload_max_filesize'),
        ];

        $overallHealthy = $checks['database'] && $checks['cache'] && $checks['storage'];

        $payload = [
            'status' => $overallHealthy ? 'healthy' : 'degraded',
            'checks' => $checks,
            'cron_details' => [
                'active' => $checks['cron'],
                'last_heartbeat_at' => $lastHeartbeat,
                'age_minutes' => $heartbeatAgeMinutes,
            ],
            'queue_details' => [
                'pending_jobs' => $pendingJobs,
                'failed_jobs' => $failedJobs,
            ],
            'environment' => $environment,
        ];

        return $this->successResponse(
            $payload,
            $overallHealthy ? 'System healthy' : 'System degraded',
            null,
            $overallHealthy ? 200 : 503
        );
    }
}
