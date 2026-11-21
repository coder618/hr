<?php

namespace Modules\Employee\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Media\Traits\HasMedia;

class Employee extends Model
{
    use HasFactory, BelongsToOrganization, HasMedia;

    protected $fillable = [
        'uuid',
        'organization_id',
        'user_id',
        'branch_id',
        'department_id',
        'designation_id',
        'reporting_manager_id',
        'employee_code',
        'first_name',
        'last_name',
        'email',
        'phone',
        'gender',
        'date_of_birth',
        'joining_date',
        'employment_type',
        'status',
        'emergency_contact',
        'address',
        'bank_details',
    ];

    protected $appends = [
        'full_name',
        'avatar_url',
    ];

    public function getAvatarUrlAttribute(): ?string
    {
        $avatar = $this->getFirstMedia('avatar');
        return $avatar ? $avatar->getUrl() : null;
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Employee $model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'joining_date' => 'date',
            'emergency_contact' => 'array',
            'address' => 'array',
            'bank_details' => 'array',
            'organization_id' => 'integer',
            'user_id' => 'integer',
            'branch_id' => 'integer',
            'department_id' => 'integer',
            'designation_id' => 'integer',
            'reporting_manager_id' => 'integer',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class, 'designation_id');
    }

    public function reportingManager(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'reporting_manager_id');
    }

    public function directReports(): HasMany
    {
        return $this->hasMany(Employee::class, 'reporting_manager_id');
    }

    public function salary(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\Modules\Payroll\Entities\EmployeeSalary::class);
    }

    public function projects(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(\Modules\Project\Entities\Project::class, 'project_members', 'employee_id', 'project_id')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function assignedTasks(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Project\Entities\Task::class, 'assignee_id');
    }

    public function payslips(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Payroll\Entities\Payslip::class, 'employee_id')->orderBy('year', 'desc')->orderBy('month', 'desc');
    }

    public function attendanceRecords(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Attendance\Entities\AttendanceRecord::class, 'employee_id')->orderBy('date', 'desc');
    }

    public function leaveBalances(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Leave\Entities\LeaveBalance::class, 'employee_id')->with('leaveType');
    }
}
