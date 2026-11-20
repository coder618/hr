<?php

namespace Modules\Project\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;

class TaskTimeLog extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'task_id',
        'employee_id',
        'log_date',
        'hours_spent',
        'description',
        'is_billable',
    ];

    protected function casts(): array
    {
        return [
            'log_date' => 'date:Y-m-d',
            'hours_spent' => 'float',
            'is_billable' => 'boolean',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
