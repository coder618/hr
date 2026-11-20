<?php

namespace Modules\Media\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Mediable extends Model
{
    protected $table = 'mediables';

    protected $fillable = [
        'media_id',
        'mediable_type',
        'mediable_id',
        'collection',
        'order_column',
    ];

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'media_id');
    }

    public function mediable(): MorphTo
    {
        return $this->morphTo();
    }
}
