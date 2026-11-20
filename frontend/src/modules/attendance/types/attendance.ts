import { Branch, Employee } from '../../employee/types/employee';
import { Shift } from '../../shift/types/shift';

export interface AttendanceDevice {
  id: number;
  organization_id: number;
  branch_id?: number | null;
  name: string;
  serial_number: string;
  device_api_key: string;
  device_type: 'zkteco' | 'adms' | 'generic_api';
  ip_address?: string | null;
  last_heartbeat_at?: string | null;
  is_active: boolean;
  logs_count?: number;
  branch?: Branch | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceLog {
  id: number;
  organization_id: number;
  employee_id: number;
  device_id?: number | null;
  punch_time: string;
  punch_type: 'in' | 'out' | 'break_start' | 'break_end';
  source: 'web' | 'mobile' | 'biometric_device' | 'manual';
  latitude?: number | null;
  longitude?: number | null;
  is_geofence_verified: boolean;
  ip_address?: string | null;
  metadata?: {
    user_agent?: string;
    distance_meters?: number | null;
    notes?: string | null;
  } | null;
  created_at?: string;
}

export interface AttendanceRecord {
  id: number;
  organization_id: number;
  employee_id: number;
  shift_id?: number | null;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  work_minutes: number;
  break_minutes: number;
  overtime_minutes: number;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'on_leave' | 'holiday' | 'day_off';
  is_late: boolean;
  late_minutes: number;
  is_early_leave: boolean;
  early_leave_minutes: number;
  regularization_status: 'none' | 'pending' | 'approved' | 'rejected';
  regularization_reason?: string | null;
  approved_by?: number | null;
  notes?: string | null;
  employee?: Employee;
  shift?: Shift | null;
  created_at?: string;
  updated_at?: string;
}

export interface TodayAttendanceResponse {
  employee: {
    id: number;
    name: string;
    employee_code: string;
    branch?: {
      id: number;
      name: string;
      latitude?: number | null;
      longitude?: number | null;
      geofence_radius_meters: number;
    } | null;
  };
  punches: AttendanceLog[];
  record?: AttendanceRecord | null;
  server_time: string;
}

export interface AttendanceSummaryResponse {
  month: string;
  total_record_days: number;
  present: number;
  late: number;
  half_day: number;
  absent: number;
  total_work_hours: number;
  total_overtime_hours: number;
}
