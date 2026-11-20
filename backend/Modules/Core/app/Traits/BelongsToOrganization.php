<?php

namespace Modules\Core\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Modules\Core\Scopes\TenantScope;

trait BelongsToOrganization
{
    /**
     * Boot the trait to attach global tenant scope and auto-fill organization_id on create.
     */
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            /** @var TenantContextInterface $tenantContext */
            $tenantContext = app(TenantContextInterface::class);

            if (empty($model->organization_id) && $tenantContext->hasTenant()) {
                $model->organization_id = $tenantContext->getTenantId();
            }
        });
    }

    /**
     * Get the organization that owns this entity.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
