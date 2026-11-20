<?php

namespace Modules\Project\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;

class Task extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'project_id',
        'milestone_id',
        'assignee_id',
        'creator_id',
        'title',
        'description',
        'priority',
        'status',
        'due_date',
        'estimated_hours',
        'actual_hours',
        'checklist',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'estimated_hours' => 'float',
            'actual_hours' => 'float',
            'checklist' => 'array',
            'order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assignee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function timeLogs(): HasMany
    {
        return $this->hasMany(TaskTimeLog::class)->orderBy('log_date', 'desc');
    }
}
