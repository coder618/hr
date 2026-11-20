export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  is_super_admin: boolean;
  organization_id?: number | null;
  roles?: string[];
  permissions?: string[];
}

export interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  domain?: string | null;
  settings?: Record<string, any>;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  organization: Organization | null;
  enabledModules: string[];
  impersonatorToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, organization: Organization | null, enabledModules?: string[]) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateOrganization: (org: Partial<Organization>) => void;
  setImpersonation: (impersonationToken: string, tenantUser: User, tenantOrg: Organization) => void;
  stopImpersonation: () => void;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  } | null;
  errors?: Record<string, string[] | string> | null;
}
