<?php

namespace Modules\Core\Console;

use Illuminate\Console\Command;
use Modules\Core\Entities\SchedulerHeartbeat;

class SchedulerHeartbeatCommand extends Command
{
    protected $signature = 'app:scheduler:heartbeat';
    protected $description = 'Record a timestamp heartbeat to confirm the cPanel cron job is functioning';

    public function handle(): int
    {
        SchedulerHeartbeat::updateOrCreate(
            ['component' => 'scheduler'],
            [
                'last_heartbeat_at' => now(),
                'metadata' => [
                    'php_version' => PHP_VERSION,
                    'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                ],
            ]
        );

        $this->info('Scheduler heartbeat recorded successfully.');
        return 0;
    }
}
