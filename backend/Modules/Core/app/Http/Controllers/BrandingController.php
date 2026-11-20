<?php

namespace Modules\Core\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Modules\Core\Traits\ApiResponseTrait;

class BrandingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * Get public white-label branding details for login and app theming
     */
    public function show(Request $request): JsonResponse
    {
        $tenant = null;

        // 1. Try to find tenant from slug in query param or header
        $slug = $request->input('slug') ?: $request->header('X-Tenant-Slug');
        if ($slug) {
            $tenant = Organization::where('slug', $slug)->first();
        }

        // 2. Fallback to active TenantContext (if authenticated)
        if (! $tenant) {
            $tenant = $this->tenantContext->getTenant();
        }

        // 3. Fallback to first active organization or default branding
        if (! $tenant) {
            $tenant = Organization::where('status', 'active')->first();
        }

        if (! $tenant) {
            return $this->successResponse([
                'company_name' => config('app.name', 'Office Management System'),
                'tagline' => 'Enterprise Multi-Tenant Office Platform',
                'logo_url' => null,
                'favicon_url' => null,
                'primary_color' => '#4f46e5',
                'secondary_color' => '#06b6d4',
            ]);
        }

        $settings = $tenant->settings ?? [];

        return $this->successResponse([
            'organization_id' => $tenant->id,
            'slug' => $tenant->slug,
            'company_name' => $settings['company_name'] ?? $tenant->name,
            'tagline' => $settings['tagline'] ?? 'Enterprise Office Portal',
            'logo_url' => $settings['logo_url'] ?? null,
            'favicon_url' => $settings['favicon_url'] ?? null,
            'primary_color' => $settings['primary_color'] ?? '#4f46e5',
            'secondary_color' => $settings['secondary_color'] ?? '#06b6d4',
            'timezone' => $settings['timezone'] ?? 'Asia/Dhaka',
            'currency' => $settings['currency'] ?? 'BDT',
        ]);
    }
}
