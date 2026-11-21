<?php

namespace Modules\Expense\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;

class OfficeExpenseCategory extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $table = 'office_expense_categories';

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(OfficeExpense::class, 'office_expense_category_id');
    }
}
