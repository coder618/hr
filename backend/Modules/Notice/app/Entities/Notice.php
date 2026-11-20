<?php

namespace Modules\Notice\Entities;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\Traits\BelongsToOrganization;
use Modules\Employee\Entities\Employee;
use Modules\Media\Traits\HasMedia;

class Notice extends Model
{
    use HasFactory, BelongsToOrganization, HasMedia;

    protected $table = 'notices';

    protected $fillable = [
        'organization_id',
        'title',
        'content',
        'priority',
        'target_type',
        'status',
        'is_pinned',
        'requires_acknowledgment',
        'published_at',
        'expires_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'requires_acknowledgment' => 'boolean',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function targets(): HasMany
    {
        return $this->hasMany(NoticeTarget::class);
    }

    public function acknowledgments(): HasMany
    {
        return $this->hasMany(NoticeAcknowledgment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('published_at')
                  ->orWhere('published_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
    }

    public function scopeVisibleToEmployee(Builder $query, Employee $employee): Builder
    {
        return $query->where(function ($q) use ($employee) {
            $q->where('target_type', 'all')
              ->orWhere(function ($targetQ) use ($employee) {
                  $targetQ->where('target_type', 'department')
                          ->whereHas('targets', function ($t) use ($employee) {
                              $t->where('target_type', 'department')
                                ->where('target_id', $employee->department_id);
                          });
              })
              ->orWhere(function ($targetQ) use ($employee) {
                  $targetQ->where('target_type', 'branch')
                          ->whereHas('targets', function ($t) use ($employee) {
                              $t->where('target_type', 'branch')
                                ->where('target_id', $employee->branch_id);
                          });
              });
        });
    }
}
