<?php

namespace Modules\Core\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Spatie\Activitylog\Models\Activity;

class SystemMaintenanceCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'system:maintenance {--days=90 : Days of audit logs to retain}';

    /**
     * The console command description.
     */
    protected $description = 'Perform cPanel low-maintenance cleanup (prunes old audit logs, failed jobs, and temporary storage files)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting system maintenance routines...');

        // 1. Prune old activity/audit logs
        $retentionDays = (int) $this->option('days');
        $cutoffDate = now()->subDays($retentionDays);

        $deletedLogs = Activity::where('created_at', '<', $cutoffDate)->delete();
        $this->info("Pruned {$deletedLogs} audit log records older than {$retentionDays} days.");

        // 2. Prune old failed jobs older than 14 days
        if (DB::getSchemaBuilder()->hasTable('failed_jobs')) {
            $deletedFailed = DB::table('failed_jobs')
                ->where('failed_at', '<', now()->subDays(14))
                ->delete();
            $this->info("Pruned {$deletedFailed} failed jobs older than 14 days.");
        }

        // 3. Clean temporary files in storage/app/
        $tempPath = storage_path('app/temp');
        $deletedFiles = 0;
        if (File::isDirectory($tempPath)) {
            $files = File::files($tempPath);
            foreach ($files as $file) {
                if (now()->timestamp - $file->getMTime() > 86400) { // 24 hours
                    File::delete($file->getPathname());
                    $deletedFiles++;
                }
            }
        }
        $this->info("Cleaned {$deletedFiles} stale temporary export/cache files.");

        $this->info('System maintenance completed successfully.');

        return Command::SUCCESS;
    }
}
