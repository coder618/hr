import { Employee } from '../../employee/types/employee';

export interface NoticeTarget {
  id: number;
  notice_id: number;
  target_type: 'department' | 'branch';
  target_id: number;
}

export interface NoticeAcknowledgment {
  id: number;
  organization_id: number;
  notice_id: number;
  employee_id: number;
  acknowledged_at: string;
  employee?: Employee;
}

export interface Notice {
  id: number;
  organization_id: number;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  target_type: 'all' | 'department' | 'branch';
  status: 'draft' | 'published' | 'archived';
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  published_at?: string | null;
  expires_at?: string | null;
  created_by?: number | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  targets?: NoticeTarget[];
  acknowledgments_count?: number;
  is_acknowledged?: boolean;
  created_at?: string;
  updated_at?: string;
}
