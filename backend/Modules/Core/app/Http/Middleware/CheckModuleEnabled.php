<?php

namespace Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Core\Contracts\TenantContextInterface;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleEnabled
{
    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    public function handle(Request $request, Closure $next, string $module): Response
    {
        $tenant = $this->tenantContext->getTenant();

        // Platform Super Admin without tenant context can access everything
        $user = $request->user();
        if ($user && $user->isSuperAdmin() && !$tenant) {
            return $next($request);
        }

        if ($tenant && !$tenant->isModuleEnabled($module)) {
            return response()->json([
                'success' => false,
                'message' => "The '{$module}' module is disabled for your organization.",
                'data' => null,
                'meta' => null,
                'errors' => ['module' => 'disabled'],
            ], 403);
        }

        return $next($request);
    }
}
