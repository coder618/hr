<?php

namespace Modules\Core\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Core\Entities\SchedulerHeartbeat;

class AppPreflightCheck extends Command
{
    protected $signature = 'app:preflight';
    protected $description = 'Perform cPanel shared hosting preflight health, extension, and permission checks';

    public function handle(): int
    {
        $this->info('================================================================');
        $this->info(' Office Management System - cPanel Hosting Preflight Checks');
        $this->info('================================================================');

        $hasError = false;

        // 1. PHP Version
        $phpVersion = PHP_VERSION;
        if (version_compare($phpVersion, '8.2.0', '>=')) {
            $this->line("  [✓] PHP Version: {$phpVersion} (Requirement: >= 8.2.0)");
        } else {
            $this->error("  [✗] PHP Version: {$phpVersion} is too low. Required: >= 8.2.0");
            $hasError = true;
        }

        // 2. Required PHP Extensions
        $requiredExtensions = [
            'pdo_mysql',
            'mbstring',
            'openssl',
            'tokenizer',
            'xml',
            'ctype',
            'json',
            'bcmath',
            'fileinfo',
            'gd',
            'zip',
            'curl',
        ];

        $this->newLine();
        $this->info('Checking Required PHP Extensions:');
        foreach ($requiredExtensions as $ext) {
            if (extension_loaded($ext)) {
                $this->line("  [✓] Extension: {$ext}");
            } else {
                // If using sqlite locally, pdo_mysql can be flagged as warning in local env
                if ($ext === 'pdo_mysql' && config('database.default') === 'sqlite') {
                    $this->warn("  [!] Extension: pdo_mysql not loaded (OK for local SQLite, REQUIRED for production MySQL)");
                } else {
                    $this->error("  [✗] Missing required extension: {$ext}");
                    $hasError = true;
                }
            }
        }

        // 3. Writable Directories
        $this->newLine();
        $this->info('Checking Storage & Cache Directory Permissions:');
        $writablePaths = [
            storage_path('app'),
            storage_path('app/private'),
            storage_path('framework/cache'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            storage_path('logs'),
            base_path('bootstrap/cache'),
        ];

        foreach ($writablePaths as $path) {
            if (!file_exists($path)) {
                @mkdir($path, 0755, true);
            }
            if (is_writable($path)) {
                $this->line("  [✓] Directory writable: " . str_replace(base_path(), '', $path));
            } else {
                $this->error("  [✗] Directory NOT writable: " . str_replace(base_path(), '', $path));
                $hasError = true;
            }
        }

        // 4. Database Connection
        $this->newLine();
        $this->info('Checking Database Connection:');
        try {
            DB::connection()->getPdo();
            $dbName = config('database.default');
            $this->line("  [✓] Database connected successfully (driver: {$dbName})");
        } catch (\Exception $e) {
            $this->error("  [✗] Database connection failed: " . $e->getMessage());
            $hasError = true;
        }

        // 5. Scheduler Heartbeat Status
        $this->newLine();
        $this->info('Checking Scheduler Heartbeat (Cron Health):');
        try {
            $heartbeat = SchedulerHeartbeat::where('component', 'scheduler')->first();
            if ($heartbeat) {
                $diffMinutes = now()->diffInMinutes($heartbeat->last_heartbeat_at);
                if ($diffMinutes <= 2) {
                    $this->line("  [✓] Cron Active: Last heartbeat {$diffMinutes}m ago ({$heartbeat->last_heartbeat_at})");
                } else {
                    $this->warn("  [!] Cron Delayed: Last heartbeat was {$diffMinutes}m ago. Verify your cPanel cron!");
                }
            } else {
                $this->warn("  [!] No heartbeat recorded yet. Set up cron: * * * * * php artisan schedule:run");
            }
        } catch (\Exception $e) {
            $this->warn("  [!] Could not check scheduler table (run migrations first).");
        }

        $this->newLine();
        if ($hasError) {
            $this->error('PREFLIGHT FAILED: Please correct the errors above before deploying.');
            return 1;
        }

        $this->info('================================================================');
        $this->info(' PREFLIGHT PASSED: Environment meets all cPanel hosting targets.');
        $this->info('================================================================');
        return 0;
    }
}
