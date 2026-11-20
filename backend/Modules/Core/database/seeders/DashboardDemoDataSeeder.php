<?php

namespace Modules\Core\Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Modules\Attendance\Entities\AttendanceLog;
use Modules\Attendance\Entities\AttendanceRecord;
use Modules\Core\Entities\Organization;
use Modules\Employee\Entities\Branch;
use Modules\Employee\Entities\Department;
use Modules\Employee\Entities\Designation;
use Modules\Employee\Entities\Employee;
use Modules\Expense\Entities\ExpenseCategory;
use Modules\Expense\Entities\ExpenseClaim;
use Modules\Leave\Entities\LeaveRequest;
use Modules\Leave\Entities\LeaveType;
use Modules\Project\Entities\Project;
use Modules\Project\Entities\Task;
use Modules\Shift\Entities\Shift;
use Modules\Shift\Entities\ShiftAssignment;

class DashboardDemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::where('slug', 'acme')->first() ?? Organization::first();
        if (!$org) {
            return;
        }

        $branch = Branch::where('organization_id', $org->id)->first();
        $shift = Shift::where('organization_id', $org->id)->first();
        if (!$shift) {
            $shift = Shift::create([
                'organization_id' => $org->id,
                'name' => 'General Day Shift',
                'code' => 'GEN-01',
                'start_time' => '09:00:00',
                'end_time' => '18:00:00',
                'grace_period_minutes' => 15,
                'is_default' => true,
                'is_active' => true,
            ]);
        }

        // 1. Departments & Designations
        $deptEng = Department::firstOrCreate(['organization_id' => $org->id, 'code' => 'ENG'], ['name' => 'Software Engineering']);
        $deptHR = Department::firstOrCreate(['organization_id' => $org->id, 'code' => 'HR'], ['name' => 'Human Resources']);
        $deptSales = Department::firstOrCreate(['organization_id' => $org->id, 'code' => 'SALES'], ['name' => 'Sales & Business Dev']);
        $deptDesign = Department::firstOrCreate(['organization_id' => $org->id, 'code' => 'DESIGN'], ['name' => 'Product Design']);
        $deptOps = Department::firstOrCreate(['organization_id' => $org->id, 'code' => 'OPS'], ['name' => 'Operations & Support']);

        $desigDev = Designation::firstOrCreate(['organization_id' => $org->id, 'name' => 'Full Stack Engineer']);
        $desigLead = Designation::firstOrCreate(['organization_id' => $org->id, 'name' => 'Engineering Lead']);
        $desigHR = Designation::firstOrCreate(['organization_id' => $org->id, 'name' => 'HR Manager']);
        $desigSales = Designation::firstOrCreate(['organization_id' => $org->id, 'name' => 'Sales Executive']);
        $desigDesigner = Designation::firstOrCreate(['organization_id' => $org->id, 'name' => 'UI/UX Designer']);
        $desigOps = Designation::firstOrCreate(['organization_id' => $org->id, 'name' => 'Operations Analyst']);

        // 2. Extra Employees to give realistic distribution
        $staffRoster = [
            [
                'email' => 'nina.design@acme.local',
                'first_name' => 'Nina',
                'last_name' => 'Patel',
                'employee_code' => 'EMP-DSG01',
                'department_id' => $deptDesign->id,
                'designation_id' => $desigDesigner->id,
                'employment_type' => 'full_time',
            ],
            [
                'email' => 'liam.sales@acme.local',
                'first_name' => 'Liam',
                'last_name' => 'O\'Connor',
                'employee_code' => 'EMP-SLS01',
                'department_id' => $deptSales->id,
                'designation_id' => $desigSales->id,
                'employment_type' => 'full_time',
            ],
            [
                'email' => 'tanya.sales@acme.local',
                'first_name' => 'Tanya',
                'last_name' => 'Ross',
                'employee_code' => 'EMP-SLS02',
                'department_id' => $deptSales->id,
                'designation_id' => $desigSales->id,
                'employment_type' => 'contract',
            ],
            [
                'email' => 'marcus.ops@acme.local',
                'first_name' => 'Marcus',
                'last_name' => 'Vance',
                'employee_code' => 'EMP-OPS01',
                'department_id' => $deptOps->id,
                'designation_id' => $desigOps->id,
                'employment_type' => 'full_time',
            ],
            [
                'email' => 'elena.intern@acme.local',
                'first_name' => 'Elena',
                'last_name' => 'Kim',
                'employee_code' => 'EMP-INT01',
                'department_id' => $deptEng->id,
                'designation_id' => $desigDev->id,
                'employment_type' => 'intern',
            ],
        ];

        foreach ($staffRoster as $staff) {
            Employee::firstOrCreate(
                ['email' => $staff['email']],
                [
                    'uuid' => (string) Str::uuid(),
                    'organization_id' => $org->id,
                    'branch_id' => $branch?->id,
                    'department_id' => $staff['department_id'],
                    'designation_id' => $staff['designation_id'],
                    'employee_code' => $staff['employee_code'],
                    'first_name' => $staff['first_name'],
                    'last_name' => $staff['last_name'],
                    'joining_date' => Carbon::now()->subMonths(6)->toDateString(),
                    'employment_type' => $staff['employment_type'],
                    'status' => 'active',
                ]
            );
        }

        $allEmployees = Employee::where('organization_id', $org->id)->get();

        // 3. Shift assignments
        foreach ($allEmployees as $emp) {
            ShiftAssignment::firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'assignable_type' => Employee::class,
                    'assignable_id' => $emp->id,
                ],
                [
                    'shift_id' => $shift->id,
                    'start_date' => Carbon::now()->subMonths(3)->toDateString(),
                    'is_active' => true,
                ]
            );
        }

        // 4. Past 14 Days Attendance Records
        $today = Carbon::today();
        for ($i = 13; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i);
            $isWeekend = $date->isWeekend();

            if ($isWeekend) {
                continue;
            }

            foreach ($allEmployees as $index => $emp) {
                // Determine a pseudo-realistic status
                $rand = ($emp->id + $i * 7) % 10;
                $status = 'present';
                $workMinutes = 480 + (($emp->id + $i) % 40) - 20; // ~8 hours
                $isLate = false;
                $lateMinutes = 0;

                if ($rand === 0) {
                    $status = 'late';
                    $isLate = true;
                    $lateMinutes = 15 + (($emp->id * 5) % 25);
                } elseif ($rand === 9 && $index > 3) {
                    $status = 'absent';
                    $workMinutes = 0;
                }

                $clockIn = $status !== 'absent'
                    ? $date->copy()->setTime(9, $isLate ? $lateMinutes : 0, 0)
                    : null;
                $clockOut = $status !== 'absent'
                    ? $date->copy()->setTime(17, 30 + (($emp->id * 3) % 30), 0)
                    : null;

                AttendanceRecord::updateOrCreate(
                    [
                        'organization_id' => $org->id,
                        'employee_id' => $emp->id,
                        'date' => $date->toDateString(),
                    ],
                    [
                        'shift_id' => $shift->id,
                        'clock_in' => $clockIn,
                        'clock_out' => $clockOut,
                        'work_minutes' => $workMinutes,
                        'break_minutes' => 60,
                        'overtime_minutes' => $workMinutes > 480 ? $workMinutes - 480 : 0,
                        'status' => $status,
                        'is_late' => $isLate,
                        'late_minutes' => $lateMinutes,
                        'regularization_status' => 'none',
                    ]
                );
            }
        }

        // 5. Leave Requests
        $leaveTypes = LeaveType::where('organization_id', $org->id)->get();
        if ($leaveTypes->isNotEmpty()) {
            $al = $leaveTypes->firstWhere('code', 'AL') ?? $leaveTypes->first();
            $sl = $leaveTypes->firstWhere('code', 'SL') ?? $leaveTypes->first();
            $cl = $leaveTypes->firstWhere('code', 'CL') ?? $leaveTypes->first();

            LeaveRequest::firstOrCreate(
                ['organization_id' => $org->id, 'reason' => 'Annual family vacation'],
                [
                    'employee_id' => $allEmployees[1]->id,
                    'leave_type_id' => $al->id,
                    'from_date' => $today->copy()->subDays(2)->toDateString(),
                    'to_date' => $today->copy()->addDays(2)->toDateString(),
                    'total_days' => 5,
                    'status' => 'approved',
                ]
            );

            LeaveRequest::firstOrCreate(
                ['organization_id' => $org->id, 'reason' => 'Seasonal flu and fever'],
                [
                    'employee_id' => $allEmployees[2]->id,
                    'leave_type_id' => $sl->id,
                    'from_date' => $today->copy()->subDays(1)->toDateString(),
                    'to_date' => $today->toDateString(),
                    'total_days' => 2,
                    'status' => 'pending',
                ]
            );

            LeaveRequest::firstOrCreate(
                ['organization_id' => $org->id, 'reason' => 'Personal urgent bank work'],
                [
                    'employee_id' => $allEmployees[0]->id,
                    'leave_type_id' => $cl->id,
                    'from_date' => $today->copy()->addDays(5)->toDateString(),
                    'to_date' => $today->copy()->addDays(5)->toDateString(),
                    'total_days' => 1,
                    'status' => 'pending',
                ]
            );
        }

        // 6. Expense Categories & Claims
        $categories = ExpenseCategory::where('organization_id', $org->id)->get();
        if ($categories->isNotEmpty()) {
            $travelCat = $categories->firstWhere('code', 'TRAVEL') ?? $categories->first();
            $softCat = $categories->firstWhere('code', 'SOFTWARE') ?? $categories->first();
            $mealsCat = $categories->firstWhere('code', 'MEALS') ?? $categories->first();
            $suppliesCat = $categories->firstWhere('code', 'SUPPLIES') ?? $categories->first();

            ExpenseClaim::firstOrCreate(
                ['claim_number' => 'EXP-2026-001'],
                [
                    'organization_id' => $org->id,
                    'employee_id' => $allEmployees[0]->id,
                    'expense_category_id' => $travelCat->id,
                    'claim_date' => $today->copy()->subDays(4)->toDateString(),
                    'amount' => 340.50,
                    'currency' => 'USD',
                    'merchant' => 'Uber & Railway Ticket',
                    'description' => 'Travel to client headquarters for architecture workshop',
                    'status' => 'approved',
                ]
            );

            ExpenseClaim::firstOrCreate(
                ['claim_number' => 'EXP-2026-002'],
                [
                    'organization_id' => $org->id,
                    'employee_id' => $allEmployees[1]->id,
                    'expense_category_id' => $softCat->id,
                    'claim_date' => $today->copy()->subDays(7)->toDateString(),
                    'amount' => 450.00,
                    'currency' => 'USD',
                    'merchant' => 'JetBrains & GitHub Copilot Org Seat',
                    'description' => 'Annual developer tooling licenses',
                    'status' => 'reimbursed',
                ]
            );

            ExpenseClaim::firstOrCreate(
                ['claim_number' => 'EXP-2026-003'],
                [
                    'organization_id' => $org->id,
                    'employee_id' => $allEmployees[2]->id,
                    'expense_category_id' => $mealsCat->id,
                    'claim_date' => $today->copy()->subDays(2)->toDateString(),
                    'amount' => 125.75,
                    'currency' => 'USD',
                    'merchant' => 'Bistro Cafe & Grill',
                    'description' => 'Team engineering sprint launch dinner',
                    'status' => 'pending',
                ]
            );

            ExpenseClaim::firstOrCreate(
                ['claim_number' => 'EXP-2026-004'],
                [
                    'organization_id' => $org->id,
                    'employee_id' => $allEmployees[0]->id,
                    'expense_category_id' => $suppliesCat->id,
                    'claim_date' => $today->copy()->subDays(1)->toDateString(),
                    'amount' => 85.00,
                    'currency' => 'USD',
                    'merchant' => 'Staples Office Supplies',
                    'description' => 'Whiteboard markers and sticky notes for design sprints',
                    'status' => 'pending',
                ]
            );
        }

        // 7. Projects & Tasks
        $projectA = Project::firstOrCreate(
            ['organization_id' => $org->id, 'code' => 'PRJ-CORE'],
            [
                'title' => 'Enterprise Portal v2.0',
                'description' => 'Revamp core workplace operations and unified multi-tenant architecture.',
                'client_name' => 'Internal Acme Products',
                'start_date' => $today->copy()->subMonths(2)->toDateString(),
                'due_date' => $today->copy()->addMonths(3)->toDateString(),
                'budget' => 45000.00,
                'status' => 'active',
                'priority' => 'high',
                'manager_id' => $allEmployees[1]->id,
            ]
        );

        $projectB = Project::firstOrCreate(
            ['organization_id' => $org->id, 'code' => 'PRJ-MOB'],
            [
                'title' => 'Mobile Field Clock-in App',
                'description' => 'Native attendance GPS geofence clock-in companion app for mobile staff.',
                'client_name' => 'Internal HR Operations',
                'start_date' => $today->copy()->subMonth()->toDateString(),
                'due_date' => $today->copy()->addMonths(2)->toDateString(),
                'budget' => 28000.00,
                'status' => 'active',
                'priority' => 'medium',
                'manager_id' => $allEmployees[0]->id,
            ]
        );

        $demoTasks = [
            ['title' => 'Implement JWT refresh token mechanism', 'status' => 'completed', 'priority' => 'urgent', 'assignee_id' => $allEmployees[2]->id, 'project_id' => $projectA->id, 'estimated_hours' => 12, 'actual_hours' => 11],
            ['title' => 'Design attendance analytics widgets', 'status' => 'completed', 'priority' => 'high', 'assignee_id' => $allEmployees[0]->id, 'project_id' => $projectA->id, 'estimated_hours' => 8, 'actual_hours' => 7],
            ['title' => 'Geofencing radius calculation service', 'status' => 'in_progress', 'priority' => 'urgent', 'assignee_id' => $allEmployees[2]->id, 'project_id' => $projectB->id, 'estimated_hours' => 16, 'actual_hours' => 9],
            ['title' => 'Export monthly payslip PDF template', 'status' => 'in_progress', 'priority' => 'medium', 'assignee_id' => $allEmployees[1]->id, 'project_id' => $projectA->id, 'estimated_hours' => 10, 'actual_hours' => 4],
            ['title' => 'Audit log export in CSV and JSON format', 'status' => 'review', 'priority' => 'medium', 'assignee_id' => $allEmployees[0]->id, 'project_id' => $projectA->id, 'estimated_hours' => 6, 'actual_hours' => 5],
            ['title' => 'Setup automated bi-weekly payroll tests', 'status' => 'todo', 'priority' => 'low', 'assignee_id' => $allEmployees[2]->id, 'project_id' => $projectA->id, 'estimated_hours' => 8, 'actual_hours' => 0],
            ['title' => 'Bluetooth beacon BLE beacon scanner module', 'status' => 'todo', 'priority' => 'high', 'assignee_id' => $allEmployees[1]->id, 'project_id' => $projectB->id, 'estimated_hours' => 20, 'actual_hours' => 0],
        ];

        foreach ($demoTasks as $t) {
            Task::firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'title' => $t['title'],
                ],
                [
                    'project_id' => $t['project_id'],
                    'assignee_id' => $t['assignee_id'],
                    'status' => $t['status'],
                    'priority' => $t['priority'],
                    'estimated_hours' => $t['estimated_hours'],
                    'actual_hours' => $t['actual_hours'],
                    'due_date' => $today->copy()->addDays(7)->toDateString(),
                ]
            );
        }
    }
}
