<?php

namespace Modules\Expense\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Media\Entities\Media;
use Modules\Media\Traits\HasMedia;

class OfficeExpense extends Model
{
    use HasFactory, BelongsToOrganization, HasMedia;

    protected $table = 'office_expenses';

    protected $fillable = [
        'organization_id',
        'office_expense_category_id',
        'title',
        'expense_month',
        'expense_year',
        'expense_date',
        'amount',
        'currency',
        'payment_status',
        'payment_method',
        'payment_date',
        'reference_no',
        'vendor_name',
        'notes',
        'receipt_media_id',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'expense_month' => 'integer',
            'expense_year' => 'integer',
            'expense_date' => 'date:Y-m-d',
            'payment_date' => 'date:Y-m-d',
            'amount' => 'float',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(OfficeExpenseCategory::class, 'office_expense_category_id');
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function receiptMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'receipt_media_id');
    }
}
