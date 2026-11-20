<?php

namespace Modules\Payroll\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;

class Payslip extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'payroll_run_id',
        'employee_id',
        'payslip_number',
        'year',
        'month',
        'working_days',
        'present_days',
        'paid_leave_days',
        'unpaid_leave_days',
        'absent_days',
        'overtime_minutes',
        'late_minutes',
        'base_salary',
        'earnings_breakdown',
        'deductions_breakdown',
        'gross_pay',
        'total_deductions',
        'net_pay',
        'payment_method',
        'payment_status',
        'pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'month' => 'integer',
            'working_days' => 'float',
            'present_days' => 'float',
            'paid_leave_days' => 'float',
            'unpaid_leave_days' => 'float',
            'absent_days' => 'float',
            'overtime_minutes' => 'integer',
            'late_minutes' => 'integer',
            'base_salary' => 'float',
            'earnings_breakdown' => 'array',
            'deductions_breakdown' => 'array',
            'gross_pay' => 'float',
            'total_deductions' => 'float',
            'net_pay' => 'float',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
