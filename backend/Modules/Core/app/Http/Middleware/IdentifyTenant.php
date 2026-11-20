<?php

namespace Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // 1. If user is authenticated and belongs to an organization
        if ($user && $user->organization_id) {
            $tenant = Organization::find($user->organization_id);
            if ($tenant) {
                $this->tenantContext->setTenant($tenant);
                return $next($request);
            }
        }

        // 2. Fallback: check X-Organization header (by slug, uuid, or numeric id)
        $orgIdentifier = $request->header('X-Organization') ?: $request->header('X-Tenant');
        if ($orgIdentifier) {
            $tenant = Organization::where('slug', $orgIdentifier)
                ->orWhere('uuid', $orgIdentifier)
                ->orWhere('id', is_numeric($orgIdentifier) ? (int)$orgIdentifier : 0)
                ->first();

            if ($tenant) {
                // If user is logged in, ensure they either belong to this org OR are super admin
                if ($user && !$user->isSuperAdmin() && $user->organization_id !== $tenant->id) {
                    abort(403, 'Unauthorized access to this organization.');
                }
                $this->tenantContext->setTenant($tenant);
            }
        }

        return $next($request);
    }
}
