export interface Branch {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters: number;
  address?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  is_head_office: boolean;
  is_active: boolean;
  departments_count?: number;
  employees_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: number;
  organization_id: number;
  branch_id?: number | null;
  parent_id?: number | null;
  name: string;
  code?: string | null;
  is_active: boolean;
  branch?: { id: number; name: string; code: string } | null;
  parent?: { id: number; name: string } | null;
  children?: Department[];
  employees_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Designation {
  id: number;
  organization_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  employees_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface AddressInfo {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface BankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing_number?: string;
  swift_bic?: string;
}

export interface EmployeeMediaItem {
  id: number;
  uuid: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  extension: string;
  preview_url: string;
  pivot?: {
    collection: string;
    order_column: number;
  };
}

export interface EmployeeProject {
  id: number;
  title: string;
  code: string;
  status: string;
  priority: string;
  start_date?: string | null;
  due_date?: string | null;
  pivot?: {
    role: string;
  };
}

export interface EmployeeTask {
  id: number;
  project_id: number;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  project?: {
    id: number;
    title: string;
    code: string;
  };
}

export interface EmployeePayslip {
  id: number;
  payslip_number: string;
  year: number;
  month: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payment_status: string;
  payment_method?: string | null;
  pdf_path?: string | null;
}

export interface EmployeeAttendanceRecord {
  id: number;
  date: string;
  status: 'present' | 'late' | 'absent' | 'half_day' | 'on_leave';
  clock_in?: string | null;
  clock_out?: string | null;
  work_minutes?: number;
  is_late?: boolean;
  late_minutes?: number;
}

export interface EmployeeLeaveBalance {
  id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  leave_type?: {
    id: number;
    name: string;
    code: string;
    color?: string;
  };
}

export interface EmployeeSalaryInfo {
  id: number;
  base_salary: number;
  payment_type: string;
  structure?: {
    id: number;
    name: string;
  };
}

export interface Employee {
  id: number;
  uuid: string;
  organization_id: number;
  user_id?: number | null;
  branch_id: number;
  department_id?: number | null;
  designation_id?: number | null;
  reporting_manager_id?: number | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
  phone?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  date_of_birth?: string | null;
  joining_date: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  status: 'active' | 'probation' | 'suspended' | 'terminated' | 'resigned';
  emergency_contact?: EmergencyContact | null;
  address?: AddressInfo | null;
  bank_details?: BankDetails | null;
  branch?: Branch | null;
  department?: Department | null;
  designation?: Designation | null;
  reporting_manager?: { id: number; first_name: string; last_name: string; employee_code: string } | null;
  direct_reports?: Employee[];
  user?: { id: number; name: string; email: string; is_active: boolean; avatar?: string } | null;
  media?: EmployeeMediaItem[];
  salary?: EmployeeSalaryInfo | null;
  projects?: EmployeeProject[];
  assigned_tasks?: EmployeeTask[];
  payslips?: EmployeePayslip[];
  attendance_records?: EmployeeAttendanceRecord[];
  leave_balances?: EmployeeLeaveBalance[];
  created_at?: string;
  updated_at?: string;
}
