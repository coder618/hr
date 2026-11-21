<?php

namespace Modules\Media\Traits;

use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Modules\Media\Entities\Media;

trait HasMedia
{
    /**
     * Polymorphic relation to Media
     */
    public function media(): MorphToMany
    {
        return $this->morphToMany(
            Media::class,
            'mediable',
            'mediables',
            'mediable_id',
            'media_id'
        )->withPivot(['collection', 'order_column'])->withTimestamps();
    }

    /**
     * Attach media by ID or Media model
     */
    public function attachMedia(Media|int $media, string $collection = 'default'): void
    {
        $mediaId = $media instanceof Media ? $media->id : $media;

        $nextOrder = $this->media()
            ->wherePivot('collection', $collection)
            ->max('order_column') + 1;

        $this->media()->attach($mediaId, [
            'collection' => $collection,
            'order_column' => $nextOrder,
        ]);
    }

    /**
     * Detach media from model
     */
    public function detachMedia(Media|int $media, string $collection = 'default'): void
    {
        $mediaId = $media instanceof Media ? $media->id : $media;

        $this->media()
            ->wherePivot('collection', $collection)
            ->detach($mediaId);
    }

    /**
     * Sync single media for collection (e.g. avatar, single receipt)
     */
    public function syncSingleMedia(Media|int|null $media, string $collection = 'default'): void
    {
        $this->media()->wherePivot('collection', $collection)->detach();

        if ($media) {
            $this->attachMedia($media, $collection);
        }
    }

    /**
     * Get media collection
     */
    public function getMedia(string $collection = 'default')
    {
        return $this->media()
            ->wherePivot('collection', $collection)
            ->orderBy('order_column')
            ->get();
    }

    /**
     * Get first media item from collection
     */
    public function getFirstMedia(string $collection = 'default'): ?Media
    {
        if ($this->relationLoaded('media')) {
            return $this->media
                ->where('pivot.collection', $collection)
                ->sortBy('pivot.order_column')
                ->first();
        }

        return $this->media()
            ->wherePivot('collection', $collection)
            ->orderBy('order_column')
            ->first();
    }

    /**
     * Get first media preview URL
     */
    public function getFirstMediaUrl(string $collection = 'default'): ?string
    {
        return $this->getFirstMedia($collection)?->getUrl();
    }
}
