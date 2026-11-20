<?php

namespace Modules\Leave\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;

class LeaveBalance extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'leave_type_id',
        'year',
        'allocated_days',
        'carried_forward',
        'accrued_days',
        'used_days',
        'pending_days',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'allocated_days' => 'float',
            'carried_forward' => 'float',
            'accrued_days' => 'float',
            'used_days' => 'float',
            'pending_days' => 'float',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    /**
     * Total available days to take.
     */
    public function getAvailableDaysAttribute(): float
    {
        return round(max(0, ($this->accrued_days + $this->carried_forward) - ($this->used_days + $this->pending_days)), 2);
    }
}
