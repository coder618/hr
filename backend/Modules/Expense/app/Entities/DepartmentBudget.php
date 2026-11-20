<?php

namespace Modules\Expense\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Department;

class DepartmentBudget extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $table = 'department_budgets';

    protected $fillable = [
        'organization_id',
        'department_id',
        'year',
        'allocated_amount',
        'spent_amount',
    ];

    protected $appends = ['remaining_amount'];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'allocated_amount' => 'float',
            'spent_amount' => 'float',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0.0, round($this->allocated_amount - $this->spent_amount, 2));
    }
}
