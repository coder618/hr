<?php

namespace Modules\Core\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Organization extends Model
{
    use HasFactory;

    protected $table = 'organizations';

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'domain',
        'status',
        'plan_id',
        'storage_used_bytes',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
        'storage_used_bytes' => 'integer',
        'plan_id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'organization_id');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(TenantModule::class, 'organization_id');
    }

    public function isModuleEnabled(string $moduleName): bool
    {
        return $this->modules()
            ->where('module_name', $moduleName)
            ->where('is_enabled', true)
            ->exists();
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        $settings = $this->settings ?? [];
        return data_get($settings, $key, $default);
    }

    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings ?? [];
        data_set($settings, $key, $value);
        $this->settings = $settings;
        $this->save();
    }
}
