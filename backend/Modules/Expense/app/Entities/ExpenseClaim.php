<?php

namespace Modules\Expense\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;
use Modules\Media\Entities\Media;
use Modules\Media\Traits\HasMedia;
use Modules\Project\Entities\Project;

class ExpenseClaim extends Model
{
    use HasFactory, BelongsToOrganization, HasMedia;

    protected $table = 'expense_claims';

    protected $fillable = [
        'organization_id',
        'claim_number',
        'employee_id',
        'expense_category_id',
        'project_id',
        'claim_date',
        'amount',
        'currency',
        'merchant',
        'payment_method',
        'description',
        'receipt_media_id',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'reimbursed_at',
        'payment_reference',
    ];

    protected function casts(): array
    {
        return [
            'claim_date' => 'date:Y-m-d',
            'amount' => 'float',
            'approved_at' => 'datetime',
            'reimbursed_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receiptMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'receipt_media_id');
    }
}
