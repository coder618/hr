<?php

namespace Modules\Core\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Attendance\Entities\AttendanceLog;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Modules\Expense\Entities\ExpenseCategory;
use Modules\Expense\Entities\ExpenseClaim;
use Modules\Leave\Entities\Holiday;
use Modules\Leave\Entities\LeaveBalance;
use Modules\Leave\Entities\LeaveRequest;
use Modules\Leave\Entities\LeaveType;
use Modules\Notice\Entities\Notice;
use Modules\Project\Entities\Project;
use Modules\Project\Entities\Task;
use Modules\Shift\Entities\ShiftAssignment;

class TenantDashboardController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * Retrieve personalized or organizational dashboard statistics tailored to user role.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $this->tenantContext->getTenantId() ?? $user->organization_id;
        $isSuperAdmin = $user->isSuperAdmin();

        $roles = $user->getRoleNames()->toArray();
        $isEmployeeOnly = in_array('employee', $roles) && !in_array('admin', $roles) && !in_array('hr', $roles) && !in_array('manager', $roles) && !$isSuperAdmin;

        $requestedView = $request->query('view');
        if ($isEmployeeOnly || $requestedView === 'personal') {
            return $this->getEmployeeDashboardData($user, $tenantId);
        }

        return $this->getAdminDashboardData($user, $tenantId);
    }

    /**
     * Build personalized dashboard for staff employees (or admin personal tab).
     */
    protected function getEmployeeDashboardData($user, int $tenantId): JsonResponse
    {
        $employee = Employee::with(['branch', 'department', 'designation', 'reportingManager'])
            ->where('organization_id', $tenantId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)->orWhere('email', $user->email);
            })
            ->first();

        if (!$employee) {
            return $this->successResponse([
                'view_type' => 'employee',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => ['employee'],
                ],
                'employee' => null,
                'attendance' => [
                    'status' => 'not_clocked_in',
                    'punch_in_time' => null,
                    'punch_out_time' => null,
                    'shift' => null,
                    'present_days_this_month' => 0,
                    'today_punches' => [],
                ],
                'leave' => [
                    'available_days' => 0,
                    'pending_requests_count' => 0,
                    'breakdown' => [],
                ],
                'tasks' => [
                    'active_count' => 0,
                    'completed_this_month' => 0,
                ],
                'expenses' => [
                    'pending_count' => 0,
                ],
                'charts' => [
                    'personal_attendance_trend' => [],
                    'leave_entitlements' => [],
                    'tasks_by_status' => [],
                    'tasks_by_priority' => [],
                    'expenses_by_status' => [],
                ],
                'notices' => [],
                'holidays' => [],
            ], 'Personalized employee overview loaded.');
        }

        $todayCarbon = Carbon::today();
        $today = $todayCarbon->toDateString();
        $now = Carbon::now();

        // 1. Today's Attendance & Shift
        $attendanceRecord = AttendanceRecord::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        $todayLogs = AttendanceLog::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->whereDate('punch_time', $today)
            ->orderBy('punch_time', 'asc')
            ->get();

        $punchInTime = $attendanceRecord?->clock_in ? Carbon::parse($attendanceRecord->clock_in)->format('h:i A') : null;
        $punchOutTime = $attendanceRecord?->clock_out ? Carbon::parse($attendanceRecord->clock_out)->format('h:i A') : null;

        $clockStatus = 'not_clocked_in';
        if ($attendanceRecord) {
            if ($attendanceRecord->clock_out) {
                $clockStatus = 'clocked_out';
            } elseif ($attendanceRecord->clock_in) {
                $clockStatus = 'clocked_in';
            }
        }

        // Active shift assignment
        $shiftInfo = [
            'name' => 'Standard General Shift',
            'start_time' => '09:00 AM',
            'end_time' => '06:00 PM',
        ];

        $shiftAssignment = ShiftAssignment::with('shift')
            ->where('organization_id', $tenantId)
            ->where('assignable_type', Employee::class)
            ->where('assignable_id', $employee->id)
            ->where('start_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $today);
            })
            ->first();

        if ($shiftAssignment && $shiftAssignment->shift) {
            $shiftInfo = [
                'name' => $shiftAssignment->shift->name,
                'start_time' => Carbon::parse($shiftAssignment->shift->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($shiftAssignment->shift->end_time)->format('h:i A'),
            ];
        }

        // Attendance stats this month
        $currentMonth = $now->month;
        $currentYear = $now->year;
        $monthlyPresentDays = AttendanceRecord::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->whereYear('date', $currentYear)
            ->whereMonth('date', $currentMonth)
            ->whereIn('status', ['present', 'late', 'half_day'])
            ->count();

        // 2. Personal Leave Balances
        $leaveBalances = LeaveBalance::with('leaveType')
            ->where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->where('year', $currentYear)
            ->get();

        $totalAvailableDays = 0;
        $leaveTypeBreakdown = [];

        if ($leaveBalances->isNotEmpty()) {
            foreach ($leaveBalances as $lb) {
                $available = (float) $lb->available_days;
                $totalAvailableDays += $available;
                $leaveTypeBreakdown[] = [
                    'name' => $lb->leaveType?->name ?? 'Leave',
                    'available' => $available,
                    'used' => (float) $lb->used_days,
                    'total' => (float) $lb->annual_entitlement,
                    'color' => $lb->leaveType?->color ?? '#3b82f6',
                ];
            }
        } else {
            // Default active entitlements if balances not yet generated
            $activeTypes = LeaveType::where('organization_id', $tenantId)->where('is_active', true)->get();
            foreach ($activeTypes as $lt) {
                $totalAvailableDays += (float) $lt->annual_entitlement;
                $leaveTypeBreakdown[] = [
                    'name' => $lt->name,
                    'available' => (float) $lt->annual_entitlement,
                    'used' => 0,
                    'total' => (float) $lt->annual_entitlement,
                    'color' => $lt->color ?? '#10b981',
                ];
            }
        }

        $pendingLeaveRequestsCount = LeaveRequest::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->count();

        // 3. Assigned Project Tasks
        $activeTasksCount = Task::where('assignee_id', $employee->id)
            ->where('status', '!=', 'completed')
            ->count();

        $completedTasksMonthCount = Task::where('assignee_id', $employee->id)
            ->where('status', 'completed')
            ->whereMonth('updated_at', $currentMonth)
            ->count();

        // 4. Expense Claims
        $pendingExpensesCount = ExpenseClaim::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->count();

        $reimbursedExpensesSum = ExpenseClaim::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->where('status', 'reimbursed')
            ->sum('amount');

        // 5. Recent Notices
        $notices = Notice::where('organization_id', $tenantId)
            ->where('status', 'published')
            ->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get(['id', 'title', 'content', 'priority', 'published_at', 'is_pinned']);

        // 6. Upcoming Holidays
        $holidays = Holiday::where('organization_id', $tenantId)
            ->where('start_date', '>=', $today)
            ->orderBy('start_date', 'asc')
            ->limit(3)
            ->get(['id', 'name', 'start_date', 'end_date', 'is_optional']);

        // ==========================================
        // 7. CHARTS DATA FOR PERSONAL VIEW
        // ==========================================

        // Chart 1: Personal Attendance & Working Hours Trend (Past 14 Days)
        $personalAttendanceTrend = [];
        $totalHoursMonth = 0;
        $onTimeDays = 0;
        $presentDaysCount = 0;

        for ($i = 13; $i >= 0; $i--) {
            $d = $todayCarbon->copy()->subDays($i);
            $dStr = $d->toDateString();

            $rec = AttendanceRecord::where('organization_id', $tenantId)
                ->where('employee_id', $employee->id)
                ->where('date', $dStr)
                ->first();

            $workHours = $rec ? round(($rec->work_minutes ?? 0) / 60, 1) : 0;
            $overtimeHours = $rec ? round(($rec->overtime_minutes ?? 0) / 60, 1) : 0;
            $isLate = (bool) ($rec?->is_late);
            $lateMinutes = $rec?->late_minutes ?? 0;
            $status = $rec?->status ?? ($d->isWeekend() ? 'weekend' : 'not_recorded');

            if ($rec && in_array($rec->status, ['present', 'late', 'half_day'])) {
                $totalHoursMonth += $workHours;
                $presentDaysCount++;
                if (!$isLate) {
                    $onTimeDays++;
                }
            }

            $personalAttendanceTrend[] = [
                'date' => $dStr,
                'day' => $d->format('D'),
                'label' => $d->format('M d'),
                'status' => $status,
                'work_hours' => $workHours,
                'target_hours' => $d->isWeekend() ? 0 : 8.0,
                'is_late' => $isLate,
                'late_minutes' => $lateMinutes,
                'overtime_hours' => $overtimeHours,
                'clock_in' => $rec?->clock_in ? Carbon::parse($rec->clock_in)->format('h:i A') : null,
                'clock_out' => $rec?->clock_out ? Carbon::parse($rec->clock_out)->format('h:i A') : null,
            ];
        }

        // Chart 2: Personal Tasks by Status & Priority
        $personalTasksByStatus = Task::where('assignee_id', $employee->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $formattedTasksByStatus = [
            ['name' => 'To Do', 'status' => 'todo', 'count' => $personalTasksByStatus['todo'] ?? 0, 'color' => '#71717a'],
            ['name' => 'In Progress', 'status' => 'in_progress', 'count' => $personalTasksByStatus['in_progress'] ?? 0, 'color' => '#3b82f6'],
            ['name' => 'In Review', 'status' => 'review', 'count' => $personalTasksByStatus['review'] ?? 0, 'color' => '#f59e0b'],
            ['name' => 'Completed', 'status' => 'completed', 'count' => $personalTasksByStatus['completed'] ?? 0, 'color' => '#10b981'],
        ];

        $personalTasksByPriority = Task::where('assignee_id', $employee->id)
            ->selectRaw('priority, count(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();

        $formattedTasksByPriority = [
            ['priority' => 'Urgent', 'count' => $personalTasksByPriority['urgent'] ?? 0, 'color' => '#ef4444'],
            ['priority' => 'High', 'count' => $personalTasksByPriority['high'] ?? 0, 'color' => '#f97316'],
            ['priority' => 'Medium', 'count' => $personalTasksByPriority['medium'] ?? 0, 'color' => '#3b82f6'],
            ['priority' => 'Low', 'count' => $personalTasksByPriority['low'] ?? 0, 'color' => '#a1a1aa'],
        ];

        // Chart 3: Personal Expenses by Status
        $personalExpenses = ExpenseClaim::where('organization_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->selectRaw('status, sum(amount) as total_amount, count(*) as count')
            ->groupBy('status')
            ->get();

        $formattedExpenses = [
            'pending' => ['count' => 0, 'amount' => 0],
            'approved' => ['count' => 0, 'amount' => 0],
            'reimbursed' => ['count' => 0, 'amount' => 0],
            'rejected' => ['count' => 0, 'amount' => 0],
        ];

        foreach ($personalExpenses as $pe) {
            $formattedExpenses[$pe->status] = [
                'count' => (int) $pe->count,
                'amount' => round((float) $pe->total_amount, 2),
            ];
        }

        $punctualityRate = $presentDaysCount > 0 ? round(($onTimeDays / $presentDaysCount) * 100) : 100;

        return $this->successResponse([
            'view_type' => 'employee',
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->full_name,
                'employee_code' => $employee->employee_code,
                'email' => $employee->email,
                'phone' => $employee->phone,
                'designation' => $employee->designation?->name ?? 'Staff Member',
                'department' => $employee->department?->name ?? 'General',
                'branch' => $employee->branch?->name ?? 'Headquarters',
                'joining_date' => $employee->joining_date ? $employee->joining_date->format('Y-m-d') : null,
                'employment_type' => $employee->employment_type,
            ],
            'attendance' => [
                'status' => $clockStatus,
                'punch_in_time' => $punchInTime,
                'punch_out_time' => $punchOutTime,
                'shift' => $shiftInfo,
                'present_days_this_month' => $monthlyPresentDays,
                'today_punches' => $todayLogs,
                'punctuality_rate' => $punctualityRate,
                'total_work_hours' => round($totalHoursMonth, 1),
            ],
            'leave' => [
                'available_days' => $totalAvailableDays,
                'pending_requests_count' => $pendingLeaveRequestsCount,
                'breakdown' => $leaveTypeBreakdown,
            ],
            'tasks' => [
                'active_count' => $activeTasksCount,
                'completed_this_month' => $completedTasksMonthCount,
            ],
            'expenses' => [
                'pending_count' => $pendingExpensesCount,
                'reimbursed_total' => round((float) $reimbursedExpensesSum, 2),
            ],
            'charts' => [
                'personal_attendance_trend' => $personalAttendanceTrend,
                'leave_entitlements' => $leaveTypeBreakdown,
                'tasks_by_status' => $formattedTasksByStatus,
                'tasks_by_priority' => $formattedTasksByPriority,
                'expenses_by_status' => $formattedExpenses,
            ],
            'notices' => $notices,
            'holidays' => $holidays,
        ], 'Personalized employee overview loaded.');
    }

    /**
     * Build executive overview for Admin, HR, and Operations Managers with deep charts.
     */
    protected function getAdminDashboardData($user, int $tenantId): JsonResponse
    {
        $todayCarbon = Carbon::today();
        $today = $todayCarbon->toDateString();
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        // 1. Core KPIs
        $activeStaffCount = Employee::where('organization_id', $tenantId)
            ->where('status', 'active')
            ->count();

        $presentCountToday = AttendanceRecord::where('organization_id', $tenantId)
            ->where('date', $today)
            ->where(function ($q) {
                $q->whereNotNull('clock_in')->orWhereIn('status', ['present', 'late', 'half_day']);
            })
            ->count();

        $attendanceRate = $activeStaffCount > 0
            ? round(($presentCountToday / $activeStaffCount) * 100)
            : 100;

        $onLeaveTodayCount = LeaveRequest::where('organization_id', $tenantId)
            ->where('status', 'approved')
            ->where('from_date', '<=', $today)
            ->where('to_date', '>=', $today)
            ->count();

        $pendingLeavesCount = LeaveRequest::where('organization_id', $tenantId)
            ->where('status', 'pending')
            ->count();

        $pendingExpensesCount = ExpenseClaim::where('organization_id', $tenantId)
            ->where('status', 'pending')
            ->count();

        $pendingRegularizationsCount = AttendanceRecord::where('organization_id', $tenantId)
            ->where('regularization_status', 'pending')
            ->count();

        $branchesCount = Branch::where('organization_id', $tenantId)->count();
        $departmentsCount = Department::where('organization_id', $tenantId)->count();
        $activeProjectsCount = Project::where('organization_id', $tenantId)->where('status', 'active')->count();
        $activeTasksCount = Task::where('organization_id', $tenantId)->where('status', '!=', 'completed')->count();

        $monthlyExpensesSum = ExpenseClaim::where('organization_id', $tenantId)
            ->whereIn('status', ['approved', 'reimbursed'])
            ->whereYear('claim_date', $currentYear)
            ->whereMonth('claim_date', $currentMonth)
            ->sum('amount');

        $org = Organization::with('modules')->find($tenantId);
        $enabledModules = $org
            ? $org->modules->where('is_enabled', true)->pluck('module_name')->toArray()
            : [];

        // ==========================================
        // 2. EXECUTIVE CHARTS DATA
        // ==========================================

        // CHART 1: 14-Day Attendance & Workforce Presence Trend
        $attendanceTrend = [];
        for ($i = 13; $i >= 0; $i--) {
            $d = $todayCarbon->copy()->subDays($i);
            $dStr = $d->toDateString();

            $records = AttendanceRecord::where('organization_id', $tenantId)
                ->where('date', $dStr)
                ->get();

            $present = $records->whereIn('status', ['present', 'half_day'])->count();
            $late = $records->where('status', 'late')->count();
            $onLeave = LeaveRequest::where('organization_id', $tenantId)
                ->where('status', 'approved')
                ->where('from_date', '<=', $dStr)
                ->where('to_date', '>=', $dStr)
                ->count();

            $loggedCount = $present + $late + $onLeave;
            $absent = $d->isWeekend() ? 0 : max(0, $activeStaffCount - $loggedCount);
            $rate = ($activeStaffCount > 0 && !$d->isWeekend())
                ? round((($present + $late) / $activeStaffCount) * 100)
                : ($d->isWeekend() ? 100 : 0);

            $attendanceTrend[] = [
                'date' => $dStr,
                'day' => $d->format('D'),
                'label' => $d->format('M d'),
                'present' => $present,
                'late' => $late,
                'on_leave' => $onLeave,
                'absent' => $absent,
                'rate' => $rate,
                'is_weekend' => $d->isWeekend(),
            ];
        }

        // CHART 2: Department Distribution & Headcount
        $deptColors = ['#18181b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
        $departments = Department::where('organization_id', $tenantId)
            ->withCount(['employees' => fn($q) => $q->where('status', 'active')])
            ->get();

        $departmentDistribution = [];
        $colorIdx = 0;
        foreach ($departments as $dept) {
            $count = (int) $dept->employees_count;
            if ($count > 0 || $departments->count() <= 6) {
                $departmentDistribution[] = [
                    'name' => $dept->name,
                    'code' => $dept->code,
                    'count' => $count,
                    'percentage' => $activeStaffCount > 0 ? round(($count / $activeStaffCount) * 100, 1) : 0,
                    'color' => $deptColors[$colorIdx % count($deptColors)],
                ];
                $colorIdx++;
            }
        }

        // CHART 3: Employment Type Breakdown
        $empTypes = Employee::where('organization_id', $tenantId)
            ->where('status', 'active')
            ->selectRaw('employment_type, count(*) as count')
            ->groupBy('employment_type')
            ->get();

        $typeColors = [
            'full_time' => '#18181b',
            'part_time' => '#3b82f6',
            'contract' => '#10b981',
            'intern' => '#f59e0b',
            'probation' => '#8b5cf6',
        ];

        $employmentTypeDistribution = [];
        foreach ($empTypes as $et) {
            $typeKey = $et->employment_type ?? 'full_time';
            $label = ucwords(str_replace('_', ' ', $typeKey));
            $employmentTypeDistribution[] = [
                'type' => $typeKey,
                'name' => $label,
                'count' => (int) $et->count,
                'color' => $typeColors[$typeKey] ?? '#71717a',
            ];
        }

        // CHART 4: Expense Breakdown by Category & Claims by Status
        $categories = ExpenseCategory::where('organization_id', $tenantId)->get();
        $claimsByCategory = ExpenseClaim::where('organization_id', $tenantId)
            ->whereIn('status', ['approved', 'reimbursed'])
            ->selectRaw('expense_category_id, sum(amount) as total_amount, count(*) as count')
            ->groupBy('expense_category_id')
            ->get()
            ->keyBy('expense_category_id');

        $categoryColors = ['#18181b', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
        $expensesByCategory = [];
        $cIdx = 0;
        foreach ($categories as $cat) {
            $claimData = $claimsByCategory->get($cat->id);
            $amount = $claimData ? round((float) $claimData->total_amount, 2) : 0;
            $count = $claimData ? (int) $claimData->count : 0;
            $expensesByCategory[] = [
                'name' => $cat->name,
                'amount' => $amount,
                'count' => $count,
                'color' => $categoryColors[$cIdx % count($categoryColors)],
            ];
            $cIdx++;
        }

        $expensesByStatusRaw = ExpenseClaim::where('organization_id', $tenantId)
            ->selectRaw('status, sum(amount) as total_amount, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $expensesByStatus = [
            ['name' => 'Approved', 'status' => 'approved', 'count' => $expensesByStatusRaw['approved'] ?? 0, 'color' => '#10b981'],
            ['name' => 'Reimbursed', 'status' => 'reimbursed', 'count' => $expensesByStatusRaw['reimbursed'] ?? 0, 'color' => '#3b82f6'],
            ['name' => 'Pending Review', 'status' => 'pending', 'count' => $expensesByStatusRaw['pending'] ?? 0, 'color' => '#f59e0b'],
            ['name' => 'Rejected', 'status' => 'rejected', 'count' => $expensesByStatusRaw['rejected'] ?? 0, 'color' => '#ef4444'],
        ];

        // CHART 5: Leave Analytics by Type & Status
        $leaveTypes = LeaveType::where('organization_id', $tenantId)->get();
        $leavesByTypeRaw = LeaveRequest::where('organization_id', $tenantId)
            ->where('status', 'approved')
            ->selectRaw('leave_type_id, sum(total_days) as total_days, count(*) as count')
            ->groupBy('leave_type_id')
            ->get()
            ->keyBy('leave_type_id');

        $leaveAnalytics = [];
        foreach ($leaveTypes as $lt) {
            $reqData = $leavesByTypeRaw->get($lt->id);
            $days = $reqData ? (float) $reqData->total_days : 0;
            $count = $reqData ? (int) $reqData->count : 0;
            $leaveAnalytics[] = [
                'name' => $lt->name,
                'days' => $days,
                'count' => $count,
                'color' => $lt->color ?? '#3b82f6',
            ];
        }

        // CHART 6: Task Health & Priority Breakdown
        $tasksByStatusRaw = Task::where('organization_id', $tenantId)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $tasksByStatus = [
            ['name' => 'Completed', 'status' => 'completed', 'count' => $tasksByStatusRaw['completed'] ?? 0, 'color' => '#10b981'],
            ['name' => 'In Progress', 'status' => 'in_progress', 'count' => $tasksByStatusRaw['in_progress'] ?? 0, 'color' => '#3b82f6'],
            ['name' => 'In Review', 'status' => 'review', 'count' => $tasksByStatusRaw['review'] ?? 0, 'color' => '#f59e0b'],
            ['name' => 'To Do', 'status' => 'todo', 'count' => $tasksByStatusRaw['todo'] ?? 0, 'color' => '#71717a'],
        ];

        $tasksByPriorityRaw = Task::where('organization_id', $tenantId)
            ->selectRaw('priority, count(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();

        $tasksByPriority = [
            ['priority' => 'Urgent', 'count' => $tasksByPriorityRaw['urgent'] ?? 0, 'color' => '#ef4444'],
            ['priority' => 'High', 'count' => $tasksByPriorityRaw['high'] ?? 0, 'color' => '#f97316'],
            ['priority' => 'Medium', 'count' => $tasksByPriorityRaw['medium'] ?? 0, 'color' => '#3b82f6'],
            ['priority' => 'Low', 'count' => $tasksByPriorityRaw['low'] ?? 0, 'color' => '#a1a1aa'],
        ];

        $totalTasksCount = array_sum($tasksByStatusRaw);
        $completedTasksCount = $tasksByStatusRaw['completed'] ?? 0;
        $taskCompletionRate = $totalTasksCount > 0 ? round(($completedTasksCount / $totalTasksCount) * 100) : 0;

        // CHART 7: Recent Operational Activity Feeds
        $recentAttendance = AttendanceRecord::with('employee')
            ->where('organization_id', $tenantId)
            ->where('date', $today)
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($ar) {
                return [
                    'employee_name' => $ar->employee ? $ar->employee->full_name : 'Staff Member',
                    'employee_code' => $ar->employee?->employee_code,
                    'clock_in' => $ar->clock_in ? Carbon::parse($ar->clock_in)->format('h:i A') : null,
                    'clock_out' => $ar->clock_out ? Carbon::parse($ar->clock_out)->format('h:i A') : null,
                    'status' => $ar->status,
                    'is_late' => (bool) $ar->is_late,
                ];
            });

        $recentLeaveRequests = LeaveRequest::with(['employee', 'leaveType'])
            ->where('organization_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($lr) {
                return [
                    'id' => $lr->id,
                    'employee_name' => $lr->employee ? $lr->employee->full_name : 'Staff Member',
                    'leave_type' => $lr->leaveType?->name ?? 'Leave',
                    'from_date' => $lr->from_date ? Carbon::parse($lr->from_date)->format('M d') : '',
                    'to_date' => $lr->to_date ? Carbon::parse($lr->to_date)->format('M d') : '',
                    'total_days' => $lr->total_days,
                    'status' => $lr->status,
                    'reason' => $lr->reason,
                ];
            });

        $notices = Notice::where('organization_id', $tenantId)
            ->where('status', 'published')
            ->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get(['id', 'title', 'content', 'priority', 'published_at', 'is_pinned']);

        // Check if admin also has an associated employee profile
        $adminEmployee = Employee::where('organization_id', $tenantId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)->orWhere('email', $user->email);
            })
            ->first();

        return $this->successResponse([
            'view_type' => 'admin',
            'has_personal_profile' => (bool) $adminEmployee,
            'stats' => [
                'attendance_rate' => $attendanceRate,
                'present_today_count' => $presentCountToday,
                'on_leave_today' => $onLeaveTodayCount,
                'pending_approvals' => $pendingLeavesCount + $pendingExpensesCount + $pendingRegularizationsCount,
                'pending_leaves' => $pendingLeavesCount,
                'pending_expenses' => $pendingExpensesCount,
                'pending_regularizations' => $pendingRegularizationsCount,
                'active_staff' => $activeStaffCount,
                'branches_count' => $branchesCount,
                'departments_count' => $departmentsCount,
                'active_projects_count' => $activeProjectsCount,
                'active_tasks_count' => $activeTasksCount,
                'monthly_expenses_sum' => round((float) $monthlyExpensesSum, 2),
                'task_completion_rate' => $taskCompletionRate,
            ],
            'charts' => [
                'attendance_trend' => $attendanceTrend,
                'department_distribution' => $departmentDistribution,
                'employment_type_distribution' => $employmentTypeDistribution,
                'expenses_by_category' => $expensesByCategory,
                'expenses_by_status' => $expensesByStatus,
                'leaves_by_type' => $leaveAnalytics,
                'tasks_by_status' => $tasksByStatus,
                'tasks_by_priority' => $tasksByPriority,
            ],
            'recent_activity' => [
                'attendance' => $recentAttendance,
                'leave_requests' => $recentLeaveRequests,
            ],
            'enabled_modules' => $enabledModules,
            'notices' => $notices,
        ], 'Management operations overview loaded.');
    }
}
