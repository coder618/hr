<?php

namespace Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    /**
     * Handle an incoming request.
     * Accepts single or multiple roles (comma-separated or pipe-separated, e.g. 'admin,hr' or 'admin|hr').
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // In multi-request test scenarios or token switches, ensure user reflects the bearer token
        if ($bearer = $request->bearerToken()) {
            $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($bearer);
            if ($tokenModel && $tokenModel->tokenable) {
                $user = $tokenModel->tokenable;
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
                'data' => null,
                'meta' => null,
                'errors' => ['auth' => 'unauthenticated'],
            ], 401);
        }

        // Platform Super Admin has access to all actions
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Parse allowed roles
        $allowedRoles = [];
        foreach ($roles as $roleGroup) {
            $split = preg_split('/[,|]/', (string) $roleGroup);
            foreach ($split as $role) {
                $trimmed = trim($role);
                if ($trimmed !== '') {
                    $allowedRoles[] = $trimmed;
                }
            }
        }

        if (empty($allowedRoles) || $user->hasRole($allowedRoles)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Forbidden: You do not have permission to perform this action.',
            'data' => null,
            'meta' => null,
            'errors' => [
                'access' => 'unauthorized_role',
                'required_roles' => $allowedRoles,
                'your_roles' => $user->getRoleNames(),
            ],
        ], 403);
    }
}
