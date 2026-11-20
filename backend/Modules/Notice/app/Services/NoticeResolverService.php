<?php

namespace Modules\Notice\Services;

use Modules\Employee\Entities\Employee;
use Modules\Notice\Entities\Notice;
use Modules\Notice\Entities\NoticeAcknowledgment;

class NoticeResolverService
{
    /**
     * Get active notices visible to a specific employee
     */
    public function getEmployeeNotices(Employee $employee, array $filters = [])
    {
        $query = Notice::with(['creator', 'media', 'targets'])
            ->active()
            ->visibleToEmployee($employee);

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        $notices = $query->orderBy('is_pinned', 'desc')
            ->orderBy('published_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Get acknowledged notice IDs for this employee
        $acknowledgedNoticeIds = NoticeAcknowledgment::where('employee_id', $employee->id)
            ->pluck('notice_id')
            ->flip()
            ->all();

        return $notices->map(function ($notice) use ($acknowledgedNoticeIds) {
            $notice->is_acknowledged = isset($acknowledgedNoticeIds[$notice->id]);
            return $notice;
        });
    }

    /**
     * Acknowledge notice by employee
     */
    public function acknowledgeNotice(Notice $notice, Employee $employee): NoticeAcknowledgment
    {
        return NoticeAcknowledgment::firstOrCreate(
            [
                'organization_id' => $notice->organization_id,
                'notice_id' => $notice->id,
                'employee_id' => $employee->id,
            ],
            [
                'acknowledged_at' => now(),
            ]
        );
    }
}
