<?php

namespace Modules\Employee\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Employee;
use Modules\Media\Entities\Media;

class EmployeeController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Employee::with([
            'branch:id,name,code',
            'department:id,name',
            'designation:id,name',
            'reportingManager:id,first_name,last_name,employee_code',
        ]);

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_code', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->query('branch_id'));
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->query('department_id'));
        }

        if ($request->filled('designation_id')) {
            $query->where('designation_id', $request->query('designation_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('employment_type')) {
            $query->where('employment_type', $request->query('employment_type'));
        }

        $perPage = min((int) $request->query('per_page', 15), 100);
        $employees = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $this->successResponse($employees->items(), 'Employees retrieved successfully.', [
            'current_page' => $employees->currentPage(),
            'per_page' => $employees->perPage(),
            'total' => $employees->total(),
            'last_page' => $employees->lastPage(),
        ]);
    }

    public function store(Request $request, TenantContextInterface $tenantContext): JsonResponse
    {
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => [
                'required',
                'email',
                'max:191',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $exists = Employee::where('organization_id', $tenantId)->where('email', $value)->exists();
                    if ($exists) {
                        $fail('An employee with this email already exists in your organization.');
                    }
                },
            ],
            'employee_code' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $exists = Employee::where('organization_id', $tenantId)->where('employee_code', $value)->exists();
                    if ($exists) {
                        $fail('An employee with this code already exists in your organization.');
                    }
                },
            ],
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'designation_id' => 'nullable|exists:designations,id',
            'reporting_manager_id' => 'nullable|exists:employees,id',
            'phone' => 'nullable|string|max:50',
            'gender' => 'nullable|string|in:male,female,other',
            'date_of_birth' => 'nullable|date',
            'joining_date' => 'required|date',
            'employment_type' => 'nullable|string|in:full_time,part_time,contract,intern',
            'status' => 'nullable|string|in:active,probation,suspended,terminated,resigned',
            'emergency_contact' => 'nullable|array',
            'address' => 'nullable|array',
            'bank_details' => 'nullable|array',
            'create_user_account' => 'nullable|boolean',
            'user_password' => 'nullable|string|min:8',
        ]);

        return DB::transaction(function () use ($validated, $tenantId) {
            $userId = null;

            if (!empty($validated['create_user_account'])) {
                $password = !empty($validated['user_password']) ? $validated['user_password'] : Str::random(12);

                $user = User::create([
                    'organization_id' => $tenantId,
                    'name' => "{$validated['first_name']} {$validated['last_name']}",
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? null,
                    'password' => Hash::make($password),
                    'is_active' => true,
                ]);

                $user->assignRole('employee');
                $userId = $user->id;
            }

            unset($validated['create_user_account'], $validated['user_password']);
            $validated['user_id'] = $userId;

            $employee = Employee::create($validated);

            return $this->successResponse(
                $employee->load(['branch', 'department', 'designation', 'reportingManager', 'user']),
                'Employee created successfully.',
                null,
                201
            );
        });
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $employee = Employee::with([
            'branch',
            'department',
            'designation',
            'reportingManager',
            'directReports',
            'user:id,name,email,is_active,avatar',
            'media',
        ])->findOrFail($id);

        $user = $request->user();
        if ($user && !$user->isSuperAdmin()) {
            $roles = $user->getRoleNames()->toArray();
            $isEmployeeOnly = in_array('employee', $roles) && !in_array('admin', $roles) && !in_array('hr', $roles) && !in_array('manager', $roles);
            if ($isEmployeeOnly && $employee->user_id !== $user->id && $employee->email !== $user->email) {
                return $this->errorResponse('Forbidden: You do not have permission to view other employee profiles.', null, 403);
            }
        }

        return $this->successResponse($employee);
    }

    public function update(Request $request, int $id, TenantContextInterface $tenantContext): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $tenantId = $tenantContext->getTenantId() ?? $request->user()?->organization_id;

        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:191',
                function ($attribute, $value, $fail) use ($tenantId, $id) {
                    $exists = Employee::where('organization_id', $tenantId)
                        ->where('email', $value)
                        ->where('id', '!=', $id)
                        ->exists();
                    if ($exists) {
                        $fail('An employee with this email already exists in your organization.');
                    }
                },
            ],
            'employee_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($tenantId, $id) {
                    $exists = Employee::where('organization_id', $tenantId)
                        ->where('employee_code', $value)
                        ->where('id', '!=', $id)
                        ->exists();
                    if ($exists) {
                        $fail('An employee with this code already exists in your organization.');
                    }
                },
            ],
            'branch_id' => 'sometimes|required|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'designation_id' => 'nullable|exists:designations,id',
            'reporting_manager_id' => [
                'nullable',
                'exists:employees,id',
                function ($attribute, $value, $fail) use ($id) {
                    if ($value == $id) {
                        $fail('An employee cannot report to themselves.');
                    }
                },
            ],
            'phone' => 'nullable|string|max:50',
            'gender' => 'nullable|string|in:male,female,other',
            'date_of_birth' => 'nullable|date',
            'joining_date' => 'sometimes|required|date',
            'employment_type' => 'nullable|string|in:full_time,part_time,contract,intern',
            'status' => 'nullable|string|in:active,probation,suspended,terminated,resigned',
            'emergency_contact' => 'nullable|array',
            'address' => 'nullable|array',
            'bank_details' => 'nullable|array',
        ]);

        $employee->update($validated);

        return $this->successResponse(
            $employee->load(['branch', 'department', 'designation', 'reportingManager']),
            'Employee updated successfully.'
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $employee->delete();

        return $this->successResponse(null, 'Employee deleted successfully.');
    }

    /**
     * Attach an uploaded media document to the employee.
     */
    public function attachDocument(Request $request, int $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        $validated = $request->validate([
            'media_id' => 'required|exists:media,id',
            'collection_name' => 'nullable|string|max:50',
            'document_title' => 'nullable|string|max:191',
        ]);

        $media = Media::findOrFail($validated['media_id']);

        if (!empty($validated['document_title'])) {
            $media->update(['title' => $validated['document_title']]);
        }

        $employee->attachMedia($media->id, $validated['collection_name'] ?? 'documents');

        return $this->successResponse(
            $employee->load('media'),
            'Document attached to employee successfully.'
        );
    }

    /**
     * Detach a document from the employee.
     */
    public function detachDocument(Request $request, int $id, int $mediaId): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $collection = $request->query('collection_name', 'documents');
        $employee->detachMedia($mediaId, $collection);

        return $this->successResponse(
            $employee->load('media'),
            'Document detached from employee successfully.'
        );
    }
}
