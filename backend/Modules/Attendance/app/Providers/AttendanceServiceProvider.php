<?php

namespace Modules\Attendance\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;
use Illuminate\Console\Scheduling\Schedule;

class AttendanceServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Attendance';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'attendance';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    protected array $commands = [
        \Modules\Attendance\Console\ProcessDailyAttendanceCommand::class,
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
            \Modules\Core\Contracts\AttendanceLookupContract::class,
            \Modules\Attendance\Services\AttendanceLookupService::class
        );
    }

    /**
     * Define module schedules for cPanel cron.
     */
    protected function configureSchedules(Schedule $schedule): void
    {
        // Daily automated attendance processing at 23:55 via the master cPanel cron
        $schedule->command('attendance:process-daily')->dailyAt('23:55');
    }
}
