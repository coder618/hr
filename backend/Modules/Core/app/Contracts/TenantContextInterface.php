<?php

namespace Modules\Core\Contracts;

use Modules\Core\Entities\Organization;

interface TenantContextInterface
{
    public function getTenant(): ?Organization;

    public function setTenant(?Organization $tenant): void;

    public function getTenantId(): ?int;

    public function hasTenant(): bool;

    public function runInTenantContext(Organization $tenant, callable $callback): mixed;

    public function runWithoutTenantContext(callable $callback): mixed;
}
