<?php

namespace Modules\Core\Services;

use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;

class TenantContext implements TenantContextInterface
{
    protected ?Organization $currentTenant = null;

    public function getTenant(): ?Organization
    {
        return $this->currentTenant;
    }

    public function setTenant(?Organization $tenant): void
    {
        $this->currentTenant = $tenant;
    }

    public function getTenantId(): ?int
    {
        return $this->currentTenant?->id;
    }

    public function hasTenant(): bool
    {
        return $this->currentTenant !== null;
    }

    public function runInTenantContext(Organization $tenant, callable $callback): mixed
    {
        $previousTenant = $this->currentTenant;
        $this->currentTenant = $tenant;

        try {
            return $callback($tenant);
        } finally {
            $this->currentTenant = $previousTenant;
        }
    }

    public function runWithoutTenantContext(callable $callback): mixed
    {
        $previousTenant = $this->currentTenant;
        $this->currentTenant = null;

        try {
            return $callback();
        } finally {
            $this->currentTenant = $previousTenant;
        }
    }
}
