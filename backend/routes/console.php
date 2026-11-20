<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Schedule Configuration for cPanel Master Cron
|--------------------------------------------------------------------------
| Driven by single cPanel cron job: * * * * * artisan schedule:run
| NO Redis, NO Supervisor, NO daemon runtime required.
*/

// 1. Cron Heartbeat Monitor (Runs every minute to prove cron is healthy)
Schedule::command('scheduler:heartbeat')
    ->everyMinute()
    ->runInBackground();

// 2. Queue Worker (Runs for at most 50 seconds or until queue empty, ensuring low memory on shared hosting)
Schedule::command('queue:work --stop-when-empty --max-time=50')
    ->everyMinute()
    ->withoutOverlapping(10);

// 3. Automated Daily Attendance Processing (Compiles biometric/mobile punches at 23:55)
Schedule::command('attendance:process-daily')
    ->dailyAt('23:55')
    ->withoutOverlapping();

// 4. Monthly Leave Accrual (Accrues balances on the 1st of every month at 01:00)
Schedule::command('leave:accrue')
    ->monthlyOn(1, '01:00')
    ->withoutOverlapping();

// 5. System Maintenance (Prunes stale logs and temporary files at 02:00)
Schedule::command('system:maintenance')
    ->dailyAt('02:00')
    ->withoutOverlapping();
