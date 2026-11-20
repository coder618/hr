<?php

namespace Modules\Leave\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;

class LeaveType extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'color',
        'type',
        'annual_entitlement',
        'accrual_frequency',
        'gender_restriction',
        'requires_attachment',
        'requires_approval',
        'max_consecutive_days',
        'allow_half_day',
        'carry_forward_limit',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'annual_entitlement' => 'float',
            'requires_attachment' => 'boolean',
            'requires_approval' => 'boolean',
            'max_consecutive_days' => 'integer',
            'allow_half_day' => 'boolean',
            'carry_forward_limit' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function balances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }
}
