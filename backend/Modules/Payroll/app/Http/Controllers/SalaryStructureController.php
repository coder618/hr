<?php

namespace Modules\Payroll\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Payroll\Entities\SalaryComponent;
use Modules\Payroll\Entities\SalaryStructure;

class SalaryStructureController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(): JsonResponse
    {
        $structures = SalaryStructure::with('components')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json(['data' => $structures]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'components' => 'nullable|array',
            'components.*.name' => 'required|string|max:100',
            'components.*.type' => 'required|in:earning,deduction',
            'components.*.calculation_type' => 'required|in:fixed,percentage_of_basic',
            'components.*.default_amount' => 'nullable|numeric|min:0',
            'components.*.percentage_value' => 'nullable|numeric|min:0|max:100',
            'components.*.is_taxable' => 'boolean',
            'components.*.is_mandatory' => 'boolean',
        ]);

        $structure = SalaryStructure::create([
            'organization_id' => $this->tenantContext->getTenantId(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        if (!empty($validated['components'])) {
            foreach ($validated['components'] as $comp) {
                $structure->components()->create([
                    'organization_id' => $structure->organization_id,
                    'name' => $comp['name'],
                    'type' => $comp['type'],
                    'calculation_type' => $comp['calculation_type'],
                    'default_amount' => $comp['default_amount'] ?? 0.0,
                    'percentage_value' => $comp['percentage_value'] ?? null,
                    'is_taxable' => $comp['is_taxable'] ?? false,
                    'is_mandatory' => $comp['is_mandatory'] ?? false,
                ]);
            }
        }

        return response()->json([
            'message' => 'Salary structure created successfully.',
            'data' => $structure->load('components'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $structure = SalaryStructure::with('components')->findOrFail($id);
        return response()->json(['data' => $structure]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $structure = SalaryStructure::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $structure->update($validated);

        return response()->json([
            'message' => 'Salary structure updated successfully.',
            'data' => $structure->load('components'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $structure = SalaryStructure::findOrFail($id);
        $structure->delete();

        return response()->json([
            'message' => 'Salary structure deleted successfully.',
        ]);
    }

    public function addComponent(Request $request, int $structureId): JsonResponse
    {
        $structure = SalaryStructure::findOrFail($structureId);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'required|in:earning,deduction',
            'calculation_type' => 'required|in:fixed,percentage_of_basic',
            'default_amount' => 'nullable|numeric|min:0',
            'percentage_value' => 'nullable|numeric|min:0|max:100',
            'is_taxable' => 'boolean',
            'is_mandatory' => 'boolean',
        ]);

        $component = $structure->components()->create([
            'organization_id' => $structure->organization_id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'calculation_type' => $validated['calculation_type'],
            'default_amount' => $validated['default_amount'] ?? 0.0,
            'percentage_value' => $validated['percentage_value'] ?? null,
            'is_taxable' => $validated['is_taxable'] ?? false,
            'is_mandatory' => $validated['is_mandatory'] ?? false,
        ]);

        return response()->json([
            'message' => 'Component added successfully.',
            'data' => $component,
        ], 201);
    }

    public function deleteComponent(int $structureId, int $componentId): JsonResponse
    {
        $structure = SalaryStructure::findOrFail($structureId);
        $component = $structure->components()->findOrFail($componentId);
        $component->delete();

        return response()->json([
            'message' => 'Component removed successfully.',
        ]);
    }
}
