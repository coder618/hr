<?php

namespace Modules\Payroll\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;

class SalaryComponent extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'salary_structure_id',
        'name',
        'type', // earning, deduction
        'calculation_type', // fixed, percentage_of_basic
        'default_amount',
        'percentage_value',
        'is_taxable',
        'is_mandatory',
    ];

    protected function casts(): array
    {
        return [
            'default_amount' => 'float',
            'percentage_value' => 'float',
            'is_taxable' => 'boolean',
            'is_mandatory' => 'boolean',
        ];
    }

    public function structure(): BelongsTo
    {
        return $this->belongsTo(SalaryStructure::class, 'salary_structure_id');
    }
}
