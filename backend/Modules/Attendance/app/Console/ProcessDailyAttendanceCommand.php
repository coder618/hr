<?php

namespace Modules\Attendance\Console;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Modules\Attendance\Services\AttendanceProcessorService;
use Modules\Core\Entities\Organization;

class ProcessDailyAttendanceCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'attendance:process-daily 
                            {--date= : The date to process (YYYY-MM-DD), defaults to yesterday or today}
                            {--organization_id= : Target specific organization ID}';

    /**
     * The console command description.
     */
    protected $description = 'Process daily attendance punch logs into aggregated records for all active organizations.';

    public function handle(AttendanceProcessorService $processor): int
    {
        $targetDate = $this->option('date') ?: Carbon::today()->toDateString();
        $targetOrgId = $this->option('organization_id');

        $this->info("Processing attendance for date: {$targetDate}...");

        $query = Organization::where('status', 'active');
        if ($targetOrgId) {
            $query->where('id', $targetOrgId);
        }

        $totalProcessed = 0;

        $query->chunk(50, function ($organizations) use ($processor, $targetDate, &$totalProcessed) {
            foreach ($organizations as $org) {
                // Check if attendance module is enabled for this organization
                if ($org->isModuleEnabled('attendance')) {
                    $count = $processor->processOrganizationDate($org->id, $targetDate);
                    $totalProcessed += $count;
                    $this->line(" - Organization [{$org->name}] (ID: {$org->id}): {$count} records processed.");
                }
            }
        });

        $this->info("Daily attendance processing completed. Total records processed: {$totalProcessed}.");

        return Command::SUCCESS;
    }
}
