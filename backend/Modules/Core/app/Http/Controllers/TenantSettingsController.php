<?php

namespace Modules\Core\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;

class TenantSettingsController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * Get Settings for the current tenant
     */
    public function show(): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (! $tenant) {
            return $this->errorResponse('No organization context active.', null, 400);
        }

        $defaultSettings = [
            'company_name' => $tenant->name,
            'tagline' => 'Enterprise Office Portal',
            'company_registration_no' => '',
            'tax_id' => '',
            'primary_color' => '#4f46e5',
            'secondary_color' => '#06b6d4',
            'logo_url' => '',
            'favicon_url' => '',
            'timezone' => 'Asia/Dhaka',
            'currency' => 'BDT',
            'date_format' => 'd-m-Y',
            'time_format' => 'H:i',
            'working_days' => [1, 2, 3, 4, 5], // Mon-Fri
            'address' => '',
            'contact_email' => '',
            'contact_phone' => '',
            'website' => '',
        ];

        $settings = array_merge($defaultSettings, $tenant->settings ?? []);

        return $this->successResponse($settings);
    }

    /**
     * Update Settings for the current tenant
     */
    public function update(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();

        if (! $tenant) {
            return $this->errorResponse('No organization context active.', null, 400);
        }

        $validated = $request->validate([
            'company_name' => 'nullable|string|max:191',
            'tagline' => 'nullable|string|max:255',
            'company_registration_no' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:100',
            'primary_color' => 'nullable|string|regex:/^#[a-fA-F0-9]{6}$/',
            'secondary_color' => 'nullable|string|regex:/^#[a-fA-F0-9]{6}$/',
            'logo_url' => 'nullable|string|max:500',
            'favicon_url' => 'nullable|string|max:500',
            'timezone' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
            'date_format' => 'nullable|string|max:20',
            'time_format' => 'nullable|string|max:20',
            'working_days' => 'nullable|array',
            'address' => 'nullable|string',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:50',
            'website' => 'nullable|string|max:255',
        ]);

        $currentSettings = $tenant->settings ?? [];
        $merged = array_merge($currentSettings, $validated);

        if ($request->filled('company_name')) {
            $tenant->name = $request->company_name;
        }

        $tenant->settings = $merged;
        $tenant->save();

        // Audit Trail
        activity('tenant_settings')
            ->causedBy($request->user())
            ->withProperties([
                'organization_id' => $tenant->id,
                'updated_fields' => array_keys($validated),
            ])
            ->log('Tenant branding & settings updated');

        return $this->successResponse($merged, 'Settings updated successfully.');
    }
}
