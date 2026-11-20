<?php

namespace Modules\Leave\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;
use Illuminate\Console\Scheduling\Schedule;

class LeaveServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Leave';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'leave';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    protected array $commands = [
        \Modules\Leave\Console\AccrueLeaveCommand::class,
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

    /**
     * Register services.
     */
    public function register(): void
    {
        parent::register();

        $this->app->singleton(
            \Modules\Core\Contracts\LeaveLookupContract::class,
            \Modules\Leave\Services\LeaveLookupService::class
        );
    }

    /**
     * Define module schedules for cPanel cron.
     */
    protected function configureSchedules(Schedule $schedule): void
    {
        // Accrue monthly leave entitlements on the 1st of every month at 01:00
        $schedule->command('leave:accrue')->monthlyOn(1, '01:00');
    }
}
