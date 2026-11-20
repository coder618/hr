import { Employee } from '../../employee/types/employee';

export interface ExpenseCategory {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  description?: string | null;
  spending_limit?: number | null;
  requires_receipt: boolean;
  is_active: boolean;
  claims_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentBudget {
  id: number;
  organization_id: number;
  department_id: number;
  year: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  department?: {
    id: number;
    name: string;
    code: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseClaim {
  id: number;
  organization_id: number;
  claim_number: string;
  employee_id: number;
  expense_category_id: number;
  project_id?: number | null;
  claim_date: string;
  amount: number;
  currency: string;
  merchant?: string | null;
  payment_method: 'cash' | 'company_card' | 'personal_card';
  description: string;
  receipt_media_id?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  reimbursed_at?: string | null;
  payment_reference?: string | null;
  employee?: Employee;
  category?: ExpenseCategory;
  project?: {
    id: number;
    title: string;
    code: string;
  };
  receipt_media?: {
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  };
  approved_by_user?: {
    id: number;
    name: string;
    email: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseAnalyticsSummary {
  year: number;
  total_claims: number;
  total_amount: number;
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  reimbursed_count: number;
  reimbursed_amount: number;
  rejected_count: number;
  category_breakdown: Array<{
    category_id: number;
    name: string;
    code: string;
    spending_limit: number | null;
    total_count: number;
    total_amount: number;
  }>;
  monthly_breakdown: Array<{
    month: number;
    month_name: string;
    amount: number;
  }>;
}

export interface BudgetSummary {
  year: number;
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  utilization_percent: number;
}
