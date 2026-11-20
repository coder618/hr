import { Branch, Employee } from '../../employee/types/employee';

export interface LeaveType {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  color: string;
  type: 'paid' | 'unpaid';
  annual_entitlement: number;
  accrual_frequency: 'monthly' | 'annual_lump_sum';
  gender_restriction: 'any' | 'male' | 'female';
  requires_attachment: boolean;
  requires_approval: boolean;
  max_consecutive_days: number | null;
  allow_half_day: boolean;
  carry_forward_limit: number;
  is_active: boolean;
}

export interface Holiday {
  id: number;
  organization_id: number;
  branch_id: number | null;
  branch?: Branch | null;
  name: string;
  from_date: string;
  to_date: string;
  total_days: number;
  is_recurring: boolean;
}

export interface LeaveBalance {
  id: number;
  organization_id: number;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;
  year: number;
  allocated_days: number;
  carried_forward: number;
  accrued_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
}

export interface LeaveRequest {
  id: number;
  organization_id: number;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;
  from_date: string;
  to_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_session?: 'morning' | 'afternoon' | null;
  reason: string;
  attachment_media_id?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  actioned_by_user_id?: number | null;
  actioned_by?: {
    id: number;
    name: string;
    email: string;
  } | null;
  actioned_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}
