<?php

namespace Modules\Expense\Entities;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;

class ExpenseCategory extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $table = 'expense_categories';

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'description',
        'spending_limit',
        'requires_receipt',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'spending_limit' => 'float',
            'requires_receipt' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function claims(): HasMany
    {
        return $this->hasMany(ExpenseClaim::class, 'expense_category_id');
    }
}
