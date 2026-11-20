<?php

namespace Modules\Leave\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Core\Services\TenantContext;
use Modules\Leave\Entities\Holiday;

class HolidayController extends Controller
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Holiday::with('branch');

        if ($request->filled('branch_id')) {
            $branchId = $request->query('branch_id');
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            });
        }

        if ($request->filled('year')) {
            $year = (int) $request->query('year');
            $query->where(function ($q) use ($year) {
                $q->whereYear('from_date', $year)->orWhereYear('to_date', $year);
            });
        }

        $holidays = $query->orderBy('from_date', 'asc')->get();

        return response()->json(['data' => $holidays]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'name' => 'required|string|max:150',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'is_recurring' => 'boolean',
        ]);

        $from = Carbon::parse($validated['from_date']);
        $to = Carbon::parse($validated['to_date']);
        $validated['total_days'] = $from->diffInDays($to) + 1;

        $holiday = Holiday::create($validated);

        return response()->json([
            'message' => 'Holiday created successfully.',
            'data' => $holiday->load('branch'),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $holiday = Holiday::findOrFail($id);

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'name' => 'sometimes|required|string|max:150',
            'from_date' => 'sometimes|required|date',
            'to_date' => 'sometimes|required|date|after_or_equal:from_date',
            'is_recurring' => 'boolean',
        ]);

        if (isset($validated['from_date']) || isset($validated['to_date'])) {
            $from = Carbon::parse($validated['from_date'] ?? $holiday->from_date);
            $to = Carbon::parse($validated['to_date'] ?? $holiday->to_date);
            $validated['total_days'] = $from->diffInDays($to) + 1;
        }

        $holiday->update($validated);

        return response()->json([
            'message' => 'Holiday updated successfully.',
            'data' => $holiday->load('branch'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $holiday = Holiday::findOrFail($id);
        $holiday->delete();

        return response()->json([
            'message' => 'Holiday deleted successfully.',
        ]);
    }
}
