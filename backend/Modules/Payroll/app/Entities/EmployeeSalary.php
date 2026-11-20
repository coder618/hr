<?php

namespace Modules\Payroll\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;

class EmployeeSalary extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'salary_structure_id',
        'base_salary',
        'payment_method',
        'bank_name',
        'bank_account_number',
        'bank_routing_number',
        'custom_components',
        'effective_from',
    ];

    protected function casts(): array
    {
        return [
            'base_salary' => 'float',
            'custom_components' => 'array',
            'effective_from' => 'date:Y-m-d',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function structure(): BelongsTo
    {
        return $this->belongsTo(SalaryStructure::class, 'salary_structure_id');
    }
}
