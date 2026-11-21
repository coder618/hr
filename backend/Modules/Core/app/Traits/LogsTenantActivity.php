<?php

namespace Modules\Core\Traits;

use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;
use Spatie\Activitylog\Traits\LogsActivity;

trait LogsTenantActivity
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        $logName = property_exists($this, 'activityLogName')
            ? $this->activityLogName
            : strtolower(class_basename($this));

        $options = LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName($logName);

        if (property_exists($this, 'activityLogExcept')) {
            $options->logExcept($this->activityLogExcept);
            $options->dontLogIfAttributesChangedOnly($this->activityLogExcept);
        }

        $options->setDescriptionForEvent(function (string $eventName) use ($logName) {
            $identifier = method_exists($this, 'getActivityLogLabel')
                ? $this->getActivityLogLabel()
                : ($this->name ?? $this->title ?? $this->full_name ?? ($this->code ?? "ID #{$this->id}"));

            $entityTitle = ucfirst($logName);
            return match ($eventName) {
                'created' => "Created {$entityTitle} '{$identifier}'",
                'updated' => "Updated {$entityTitle} '{$identifier}'",
                'deleted' => "Deleted {$entityTitle} '{$identifier}'",
                default => "{$entityTitle} '{$identifier}' was {$eventName}",
            };
        });

        return $options;
    }

    public function tapActivity(Activity $activity, string $eventName): void
    {
        if (! $activity->causer_id && request()?->user()) {
            $activity->causer()->associate(request()->user());
        }

        $properties = $activity->properties ? $activity->properties->toArray() : [];
        if (!empty($this->organization_id)) {
            $properties['organization_id'] = $this->organization_id;
        } elseif (request()?->user()?->organization_id) {
            $properties['organization_id'] = request()->user()->organization_id;
        }

        $properties['subject_id'] = $this->id;
        $properties['subject_type'] = static::class;

        if (method_exists($this, 'tapTenantActivityProperties')) {
            $properties = $this->tapTenantActivityProperties($properties, $eventName);
        }

        $activity->properties = collect($properties);
    }
}
