<?php

namespace Modules\Attendance\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;

class AttendanceLog extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'device_id',
        'punch_time',
        'punch_type',
        'source',
        'latitude',
        'longitude',
        'is_geofence_verified',
        'ip_address',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'punch_time' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'is_geofence_verified' => 'boolean',
            'metadata' => 'array',
            'organization_id' => 'integer',
            'employee_id' => 'integer',
            'device_id' => 'integer',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(AttendanceDevice::class, 'device_id');
    }
}
