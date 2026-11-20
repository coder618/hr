import { Employee } from '../../employee/types/employee';

export interface ProjectMember {
  id: number;
  organization_id: number;
  project_id: number;
  employee_id: number;
  role: string;
  employee?: Employee;
}

export interface ProjectMilestone {
  id: number;
  organization_id: number;
  project_id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: 'pending' | 'completed';
  order: number;
  tasks_count?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskTimeLog {
  id: number;
  organization_id: number;
  task_id: number;
  employee_id: number;
  employee?: Employee;
  log_date: string;
  hours_spent: number;
  description?: string | null;
  is_billable: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  organization_id: number;
  project_id: number;
  project?: Project;
  milestone_id?: number | null;
  milestone?: ProjectMilestone | null;
  assignee_id?: number | null;
  assignee?: Employee | null;
  creator_id?: number | null;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'in_review' | 'completed';
  due_date?: string | null;
  estimated_hours: number;
  actual_hours: number;
  checklist?: ChecklistItem[] | null;
  order: number;
  time_logs?: TaskTimeLog[];
  created_at: string;
}

export interface Project {
  id: number;
  organization_id: number;
  title: string;
  code: string;
  description?: string | null;
  client_name?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  budget: number;
  status: 'planning' | 'in_progress' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  manager_id?: number | null;
  manager?: Employee | null;
  team_members?: Employee[];
  milestones?: ProjectMilestone[];
  tasks?: Task[];
  tasks_count?: number;
  completed_tasks_count?: number;
  created_at: string;
}
