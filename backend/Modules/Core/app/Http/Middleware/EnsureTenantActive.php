<?php

namespace Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Core\Contracts\TenantContextInterface;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantActive
{
    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->tenantContext->getTenant();

        if ($tenant && $tenant->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'This organization is suspended. Please contact platform support.',
                'data' => null,
                'meta' => null,
                'errors' => ['status' => 'suspended'],
            ], 403);
        }

        return $next($request);
    }
}
