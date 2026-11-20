<?php

namespace Modules\Media\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Modules\Core\Traits\BelongsToOrganization;

class Media extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $table = 'media';

    protected $fillable = [
        'uuid',
        'organization_id',
        'folder_id',
        'file_name',
        'stored_name',
        'disk',
        'file_path',
        'thumbnail_path',
        'mime_type',
        'file_size',
        'extension',
        'width',
        'height',
        'hash',
        'title',
        'alt_text',
        'caption',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    public function getUrl(): string
    {
        return route('api.media.preview', ['uuid' => $this->uuid]);
    }

    public function getThumbnailUrl(): string
    {
        return $this->thumbnail_path
            ? route('api.media.thumbnail', ['uuid' => $this->uuid])
            : $this->getUrl();
    }
}
