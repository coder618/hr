<?php

namespace Modules\Shift\Entities;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;

class Shift extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'type',
        'start_time',
        'end_time',
        'is_overnight',
        'total_work_minutes',
        'break_minutes',
        'half_day_threshold_minutes',
        'full_day_threshold_minutes',
        'grace_period_entry_minutes',
        'grace_period_exit_minutes',
        'is_default',
        'is_active',
        'breaks',
    ];

    protected function casts(): array
    {
        return [
            'is_overnight' => 'boolean',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'total_work_minutes' => 'integer',
            'break_minutes' => 'integer',
            'half_day_threshold_minutes' => 'integer',
            'full_day_threshold_minutes' => 'integer',
            'grace_period_entry_minutes' => 'integer',
            'grace_period_exit_minutes' => 'integer',
            'organization_id' => 'integer',
            'breaks' => 'array',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ShiftAssignment::class, 'shift_id');
    }

    /**
     * Compute expected clock-in datetime for a given calendar date.
     */
    public function getExpectedClockIn(Carbon|string $date): ?Carbon
    {
        if (empty($this->start_time)) {
            return null;
        }

        $baseDate = $date instanceof Carbon ? $date->copy() : Carbon::parse($date);
        return Carbon::parse($baseDate->format('Y-m-d') . ' ' . $this->start_time);
    }

    /**
     * Compute expected clock-out datetime for a given calendar date.
     * Takes into account overnight shifts (rolls over to next calendar day).
     */
    public function getExpectedClockOut(Carbon|string $date): ?Carbon
    {
        if (empty($this->end_time)) {
            return null;
        }

        $baseDate = $date instanceof Carbon ? $date->copy() : Carbon::parse($date);
        $clockOut = Carbon::parse($baseDate->format('Y-m-d') . ' ' . $this->end_time);

        if ($this->is_overnight) {
            $clockOut->addDay();
        }

        return $clockOut;
    }

    /**
     * Compute maximum tolerated clock-in time before being marked late.
     */
    public function getLateThreshold(Carbon|string $date): ?Carbon
    {
        $clockIn = $this->getExpectedClockIn($date);
        return $clockIn ? $clockIn->copy()->addMinutes($this->grace_period_entry_minutes) : null;
    }

    /**
     * Compute minimum clock-out time before being marked early departure.
     */
    public function getEarlyExitThreshold(Carbon|string $date): ?Carbon
    {
        $clockOut = $this->getExpectedClockOut($date);
        return $clockOut ? $clockOut->copy()->subMinutes($this->grace_period_exit_minutes) : null;
    }
}
