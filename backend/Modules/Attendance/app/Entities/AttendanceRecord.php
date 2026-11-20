<?php

namespace Modules\Attendance\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;
use Modules\Shift\Entities\Shift;

class AttendanceRecord extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'shift_id',
        'date',
        'clock_in',
        'clock_out',
        'work_minutes',
        'break_minutes',
        'overtime_minutes',
        'status',
        'is_late',
        'late_minutes',
        'is_early_leave',
        'early_leave_minutes',
        'regularization_status',
        'regularization_reason',
        'approved_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'clock_in' => 'datetime',
            'clock_out' => 'datetime',
            'work_minutes' => 'integer',
            'break_minutes' => 'integer',
            'overtime_minutes' => 'integer',
            'is_late' => 'boolean',
            'late_minutes' => 'integer',
            'is_early_leave' => 'boolean',
            'early_leave_minutes' => 'integer',
            'organization_id' => 'integer',
            'employee_id' => 'integer',
            'shift_id' => 'integer',
            'approved_by' => 'integer',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
