<?php

namespace Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: Platform Super Admin access required.',
                'data' => null,
                'meta' => null,
                'errors' => ['access' => 'super_admin_required'],
            ], 403);
        }

        return $next($request);
    }
}
