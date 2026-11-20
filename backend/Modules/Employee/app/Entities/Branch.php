<?php

namespace Modules\Employee\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;

class Branch extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'latitude',
        'longitude',
        'geofence_radius_meters',
        'address',
        'contact_phone',
        'contact_email',
        'is_head_office',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'geofence_radius_meters' => 'integer',
            'is_head_office' => 'boolean',
            'is_active' => 'boolean',
            'organization_id' => 'integer',
        ];
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'branch_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'branch_id');
    }
}
