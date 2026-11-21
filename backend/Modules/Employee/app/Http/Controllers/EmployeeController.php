<?php

namespace Modules\Employee\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Employee;
use Modules\Media\Entities\Media;
use Modules\Media\Services\MediaService;

class EmployeeController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected MediaService $mediaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Employee::with([
            'branch:id,name,code',
            'department:id,name',
            'designation:id,name',
            'reportingManager:id,first_name,last_name,employee_code',
            'media',
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
            'emergency_contact' => 'nullable',
            'address' => 'nullable',
            'bank_details' => 'nullable',
            'create_user_account' => 'nullable',
            'user_password' => 'nullable|string|min:8',
            'avatar' => 'nullable|file|image|max:10240',
            'avatar_media_id' => 'nullable|integer|exists:media,id',
            'documents' => 'nullable|array',
            'documents.*' => 'nullable|file|max:51200',
            'document_media_ids' => 'nullable|array',
            'document_media_ids.*' => 'integer|exists:media,id',
            'document_titles' => 'nullable|array',
            'document_titles.*' => 'nullable|string|max:191',
        ]);

        return DB::transaction(function () use ($validated, $request, $tenantId) {
            $userId = null;
            $createUser = filter_var($validated['create_user_account'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $user = null;
            if ($createUser) {
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

            foreach (['emergency_contact', 'address', 'bank_details'] as $field) {
                if (isset($validated[$field]) && is_string($validated[$field])) {
                    $decoded = json_decode($validated[$field], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $validated[$field] = $decoded;
                    }
                }
            }

            unset(
                $validated['create_user_account'],
                $validated['user_password'],
                $validated['avatar'],
                $validated['avatar_media_id'],
                $validated['documents'],
                $validated['document_media_ids'],
                $validated['document_titles']
            );
            $validated['user_id'] = $userId;

            $employee = Employee::create($validated);

            // Handle user image upload (direct file or existing media ID)
            $avatarMediaId = null;
            if ($request->hasFile('avatar')) {
                $avatarMedia = $this->mediaService->uploadFile($request->file('avatar'), null, $request->user()?->id);
                $avatarMediaId = $avatarMedia->id;
            } elseif ($request->filled('avatar_media_id')) {
                $avatarMediaId = (int) $request->input('avatar_media_id');
            }

            if ($avatarMediaId) {
                $employee->attachMedia($avatarMediaId, 'avatar');
                if ($user) {
                    $mediaRecord = Media::find($avatarMediaId);
                    if ($mediaRecord) {
                        $user->update(['avatar' => $mediaRecord->getUrl()]);
                    }
                }
            }

            // Handle document uploads (direct files or existing media IDs)
            if ($request->hasFile('documents')) {
                $docFiles = $request->file('documents');
                $titles = $request->input('document_titles', []);
                foreach ($docFiles as $idx => $docFile) {
                    if ($docFile instanceof UploadedFile) {
                        $docMedia = $this->mediaService->uploadFile($docFile, null, $request->user()?->id);
                        if (!empty($titles[$idx])) {
                            $docMedia->update(['title' => $titles[$idx]]);
                        }
                        $employee->attachMedia($docMedia->id, 'documents');
                    }
                }
            }

            if ($request->filled('document_media_ids') && is_array($request->input('document_media_ids'))) {
                foreach ($request->input('document_media_ids') as $docId) {
                    $employee->attachMedia((int) $docId, 'documents');
                }
            }

            return $this->successResponse(
                $employee->load(['branch', 'department', 'designation', 'reportingManager', 'user', 'media']),
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
            'salary.structure',
            'projects:id,title,code,status,priority,start_date,due_date',
            'assignedTasks' => function ($q) {
                $q->with('project:id,title,code')->limit(15);
            },
            'payslips' => function ($q) {
                $q->limit(12);
            },
            'attendanceRecords' => function ($q) {
                $q->limit(30);
            },
            'leaveBalances.leaveType',
        ])->findOrFail($id);

        $user = $request->user();
        if ($user && !$user->isSuperAdmin()) {
            $roles = $user->getRoleNames()->toArray();
            $isAdminOrHr = in_array('admin', $roles) || in_array('hr', $roles);
            $isSelf = ($employee->user_id && $employee->user_id === $user->id) || $employee->email === $user->email;

            if (!$isAdminOrHr && !$isSelf) {
                return $this->errorResponse('Forbidden: Only Administrators, HR, and the account owner can view this employee profile.', null, 403);
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
            'emergency_contact' => 'nullable',
            'address' => 'nullable',
            'bank_details' => 'nullable',
            'avatar' => 'nullable|file|image|max:10240',
            'avatar_media_id' => 'nullable|integer|exists:media,id',
            'create_user_account' => 'nullable',
            'user_password' => 'nullable|string|min:8',
        ]);

        foreach (['emergency_contact', 'address', 'bank_details'] as $field) {
            if (isset($validated[$field]) && is_string($validated[$field])) {
                $decoded = json_decode($validated[$field], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $validated[$field] = $decoded;
                }
            }
        }

        $createUser = filter_var($validated['create_user_account'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $userPassword = !empty($validated['user_password']) ? $validated['user_password'] : null;

        unset(
            $validated['avatar'],
            $validated['avatar_media_id'],
            $validated['create_user_account'],
            $validated['user_password']
        );

        // Optionally create portal user if not already linked
        if ($createUser && ! $employee->user_id) {
            $password = $userPassword ?: Str::random(12);
            $user = User::create([
                'organization_id' => $tenantId,
                'name' => trim(($validated['first_name'] ?? $employee->first_name) . ' ' . ($validated['last_name'] ?? $employee->last_name)),
                'email' => $validated['email'] ?? $employee->email,
                'phone' => $validated['phone'] ?? $employee->phone,
                'password' => Hash::make($password),
                'is_active' => true,
            ]);
            $user->assignRole('employee');
            $validated['user_id'] = $user->id;
        }

        $employee->update($validated);

        // Sync linked portal user name/email/phone
        if ($employee->user) {
            $userUpdates = [];
            if (isset($validated['first_name']) || isset($validated['last_name'])) {
                $userUpdates['name'] = trim(($validated['first_name'] ?? $employee->first_name) . ' ' . ($validated['last_name'] ?? $employee->last_name));
            }
            if (isset($validated['email'])) {
                $userUpdates['email'] = $validated['email'];
            }
            if (isset($validated['phone'])) {
                $userUpdates['phone'] = $validated['phone'];
            }
            if (!empty($userUpdates)) {
                $employee->user->update($userUpdates);
            }
        }

        // Handle avatar upload / change
        $avatarMediaId = null;
        if ($request->hasFile('avatar')) {
            $avatarMedia = $this->mediaService->uploadFile($request->file('avatar'), null, $request->user()?->id);
            $avatarMediaId = $avatarMedia->id;
        } elseif ($request->filled('avatar_media_id')) {
            $avatarMediaId = (int) $request->input('avatar_media_id');
        }

        if ($avatarMediaId) {
            $employee->attachMedia($avatarMediaId, 'avatar');
            if ($employee->user) {
                $mediaRecord = Media::find($avatarMediaId);
                if ($mediaRecord) {
                    $employee->user->update(['avatar' => $mediaRecord->getUrl()]);
                }
            }

            activity('employee')
                ->event('updated')
                ->causedBy($request->user())
                ->performedOn($employee)
                ->withProperties([
                    'organization_id' => $employee->organization_id,
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->full_name,
                    'avatar_media_id' => $avatarMediaId,
                ])
                ->log("Updated avatar for employee {$employee->full_name} ({$employee->employee_code})");
        }

        return $this->successResponse(
            $employee->fresh()->load(['branch', 'department', 'designation', 'reportingManager', 'user']),
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

        activity('employee')
            ->event('updated')
            ->causedBy($request->user())
            ->performedOn($employee)
            ->withProperties([
                'organization_id' => $employee->organization_id,
                'employee_id' => $employee->id,
                'employee_name' => $employee->full_name,
                'media_id' => $media->id,
                'collection' => $validated['collection_name'] ?? 'documents',
                'title' => $media->title ?? $media->file_name,
            ])
            ->log("Attached document '{$media->file_name}' to employee {$employee->full_name} ({$employee->employee_code})");

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

        activity('employee')
            ->event('updated')
            ->causedBy($request->user())
            ->performedOn($employee)
            ->withProperties([
                'organization_id' => $employee->organization_id,
                'employee_id' => $employee->id,
                'employee_name' => $employee->full_name,
                'media_id' => $mediaId,
                'collection' => $collection,
            ])
            ->log("Detached document #{$mediaId} from employee {$employee->full_name} ({$employee->employee_code})");

        return $this->successResponse(
            $employee->load('media'),
            'Document detached from employee successfully.'
        );
    }
}
