<?php

namespace Modules\Attendance\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Branch;

class AttendanceDevice extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'branch_id',
        'name',
        'serial_number',
        'device_api_key',
        'device_type',
        'ip_address',
        'last_heartbeat_at',
        'is_active',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (AttendanceDevice $model) {
            if (empty($model->device_api_key)) {
                $model->device_api_key = Str::random(40);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'last_heartbeat_at' => 'datetime',
            'is_active' => 'boolean',
            'organization_id' => 'integer',
            'branch_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class, 'device_id');
    }
}
