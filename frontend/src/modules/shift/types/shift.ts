export interface ShiftBreak {
  name: string;
  start_time: string;
  end_time: string;
  is_paid?: boolean;
}

export interface Shift {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  type: 'fixed' | 'flexible' | 'rotational';
  start_time?: string | null;
  end_time?: string | null;
  is_overnight: boolean;
  total_work_minutes: number;
  break_minutes: number;
  half_day_threshold_minutes: number;
  full_day_threshold_minutes: number;
  grace_period_entry_minutes: number;
  grace_period_exit_minutes: number;
  is_default: boolean;
  is_active: boolean;
  breaks?: ShiftBreak[] | null;
  assignments_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftAssignment {
  id: number;
  organization_id: number;
  shift_id: number;
  assignable_type: 'employee' | 'department' | 'branch';
  assignable_id: number;
  day_of_week?: number | null; // 0=Sunday..6=Saturday
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  shift?: Shift;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedShift {
  shift_id: number;
  shift_name: string;
  shift_code: string;
  shift_type: string;
  start_time?: string | null;
  end_time?: string | null;
  is_overnight: boolean;
  total_work_minutes: number;
  break_minutes: number;
  grace_period_entry_minutes: number;
  grace_period_exit_minutes: number;
  expected_clock_in?: string | null;
  expected_clock_out?: string | null;
  late_threshold?: string | null;
  early_exit_threshold?: string | null;
  half_day_threshold_minutes: number;
  full_day_threshold_minutes: number;
  assignment_source: 'employee' | 'department' | 'branch' | 'organization_default';
}

export interface RosterDay {
  date: string;
  day_of_week: number;
  day_name: string;
  is_weekend: boolean;
  shift?: ResolvedShift | null;
}

export interface EmployeeRosterResponse {
  employee: {
    id: number;
    name: string;
    employee_code: string;
    branch?: string;
    department?: string;
  };
  range: {
    start_date: string;
    end_date: string;
  };
  roster: RosterDay[];
}
