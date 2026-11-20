<?php

namespace Modules\Core\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Modules\Core\Contracts\TenantContextInterface;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        /** @var TenantContextInterface $tenantContext */
        $tenantContext = app(TenantContextInterface::class);

        if ($tenantContext->hasTenant()) {
            $builder->where($model->qualifyColumn('organization_id'), $tenantContext->getTenantId());
        }
    }
}
