import { Employee } from '../../employee/types/employee';

export interface SalaryComponent {
  id: number;
  organization_id: number;
  salary_structure_id: number;
  name: string;
  type: 'earning' | 'deduction';
  calculation_type: 'fixed' | 'percentage_of_basic';
  default_amount: number;
  percentage_value: number | null;
  is_taxable: boolean;
  is_mandatory: boolean;
}

export interface SalaryStructure {
  id: number;
  organization_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  components?: SalaryComponent[];
}

export interface EmployeeSalary {
  id: number;
  organization_id: number;
  employee_id: number;
  employee?: Employee;
  salary_structure_id: number | null;
  structure?: SalaryStructure | null;
  base_salary: number;
  payment_method: 'bank_transfer' | 'cash' | 'cheque';
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_routing_number?: string | null;
  custom_components?: Record<number, number> | null;
  effective_from?: string | null;
}

export interface PayrollRun {
  id: number;
  organization_id: number;
  batch_number: string;
  year: number;
  month: number;
  branch_id: number | null;
  branch?: { id: number; name: string } | null;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'processing' | 'approved' | 'paid';
  approved_by?: number | null;
  approved_by_user?: { id: number; name: string } | null;
  approved_at?: string | null;
  paid_at?: string | null;
  payslips?: Payslip[];
  created_at: string;
}

export interface Payslip {
  id: number;
  organization_id: number;
  payroll_run_id: number;
  payroll_run?: PayrollRun;
  employee_id: number;
  employee?: Employee;
  payslip_number: string;
  year: number;
  month: number;
  working_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  overtime_minutes: number;
  late_minutes: number;
  base_salary: number;
  earnings_breakdown: Array<{ name: string; amount: number }>;
  deductions_breakdown: Array<{ name: string; amount: number }>;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payment_method: string;
  payment_status: 'pending' | 'paid';
  pdf_path?: string | null;
  created_at: string;
}
