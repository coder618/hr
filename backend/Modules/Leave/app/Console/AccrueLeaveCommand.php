<?php

namespace Modules\Leave\Console;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Modules\Leave\Services\LeaveAccrualService;

class AccrueLeaveCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'leave:accrue {--organization= : The ID of a specific organization} {--year= : The target year} {--month= : The target month (1-12)}';

    /**
     * The console command description.
     */
    protected $description = 'Accrue monthly or annual leave entitlements for employees (designed for 1-minute cPanel cron runner).';

    /**
     * Execute the console command.
     */
    public function handle(LeaveAccrualService $accrualService): int
    {
        $now = Carbon::now();
        $year = (int) ($this->option('year') ?: $now->year);
        $month = (int) ($this->option('month') ?: $now->month);
        $orgId = $this->option('organization');

        $this->info("Starting leave accrual processing for {$year}-{$month}...");

        if ($orgId) {
            $count = $accrualService->accrueForOrganization((int) $orgId, $year, $month);
            $this->info("Accrued/updated {$count} leave balances for organization #{$orgId}.");
        } else {
            $count = $accrualService->accrueAll($year, $month);
            $this->info("Accrued/updated {$count} total leave balances across all active organizations.");
        }

        return self::SUCCESS;
    }
}
