<?php

namespace Modules\Core\Entities;

use Illuminate\Database\Eloquent\Model;

class SchedulerHeartbeat extends Model
{
    protected $table = 'scheduler_heartbeats';

    protected $fillable = [
        'component',
        'last_heartbeat_at',
        'metadata',
    ];

    protected $casts = [
        'last_heartbeat_at' => 'datetime',
        'metadata' => 'array',
    ];
}
