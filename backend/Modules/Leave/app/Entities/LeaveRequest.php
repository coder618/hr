<?php

namespace Modules\Leave\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;
use Modules\Media\Entities\Media;

class LeaveRequest extends Model
{
    use HasFactory, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'leave_type_id',
        'from_date',
        'to_date',
        'total_days',
        'is_half_day',
        'half_day_session',
        'reason',
        'attachment_media_id',
        'status',
        'actioned_by_user_id',
        'actioned_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'from_date' => 'date:Y-m-d',
            'to_date' => 'date:Y-m-d',
            'total_days' => 'float',
            'is_half_day' => 'boolean',
            'actioned_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function actionedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actioned_by_user_id');
    }

    public function attachment(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'attachment_media_id');
    }
}
