<?php

namespace Modules\Core\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Modules\Core\Console\AppPreflightCheck;
use Modules\Core\Console\SchedulerHeartbeatCommand;
use Modules\Core\Console\SystemMaintenanceCommand;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Services\TenantContext;
use Nwidart\Modules\Support\ModuleServiceProvider;

class CoreServiceProvider extends ModuleServiceProvider
{
    protected string $name = 'Core';
    protected string $nameLower = 'core';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    protected array $commands = [
        AppPreflightCheck::class,
        SchedulerHeartbeatCommand::class,
        SystemMaintenanceCommand::class,
    ];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [
        EventServiceProvider::class,
        RouteServiceProvider::class,
    ];

    public function register(): void
    {
        parent::register();

        // Register TenantContext as singleton
        $this->app->singleton(TenantContextInterface::class, function () {
            return new TenantContext();
        });
        $this->app->alias(TenantContextInterface::class, TenantContext::class);
        $this->app->alias(TenantContextInterface::class, 'tenant.context');
    }

    /**
     * Configure module schedules for cPanel cron.
     */
    public function boot(): void
    {
        parent::boot();

        if ($this->app->runningInConsole()) {
            $this->app->booted(function () {
                $schedule = $this->app->make(Schedule::class);

                // 1. Scheduler Heartbeat (Runs every minute)
                $schedule->command('app:scheduler:heartbeat')->everyMinute();

                // 2. Queue Worker (Runs every minute, drains queue within 50s)
                $schedule->command('queue:work --stop-when-empty --max-time=50')
                    ->everyMinute()
                    ->withoutOverlapping();
            });
        }
    }
}
