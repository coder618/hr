import { create } from 'zustand';
import { AuthState, Organization, User } from '@/types/auth';

export const useAuthStore = create<AuthState>((set, get) => {
  const storedToken = localStorage.getItem('auth_token');
  const storedUser = localStorage.getItem('auth_user');
  const storedOrg = localStorage.getItem('auth_org');
  const storedModules = localStorage.getItem('auth_modules');
  const storedImpersonator = localStorage.getItem('impersonator_token');

  return {
    token: storedToken,
    user: storedUser ? JSON.parse(storedUser) : null,
    organization: storedOrg ? JSON.parse(storedOrg) : null,
    enabledModules: storedModules ? JSON.parse(storedModules) : [],
    impersonatorToken: storedImpersonator,
    isAuthenticated: !!storedToken,
    isLoading: false,

    login: (token: string, user: User, organization: Organization | null, enabledModules: string[] = []) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      if (organization) {
        localStorage.setItem('auth_org', JSON.stringify(organization));
        localStorage.setItem('active_org_slug', organization.slug);
      } else {
        localStorage.removeItem('auth_org');
        localStorage.removeItem('active_org_slug');
      }
      localStorage.setItem('auth_modules', JSON.stringify(enabledModules));

      set({
        token,
        user,
        organization,
        enabledModules,
        isAuthenticated: true,
      });
    },

    logout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_org');
      localStorage.removeItem('active_org_slug');
      localStorage.removeItem('auth_modules');
      localStorage.removeItem('impersonator_token');

      set({
        token: null,
        user: null,
        organization: null,
        enabledModules: [],
        impersonatorToken: null,
        isAuthenticated: false,
      });
    },

    updateUser: (updated) => {
      const currentUser = get().user;
      if (!currentUser) return;
      const newUser = { ...currentUser, ...updated };
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      set({ user: newUser });
    },

    updateOrganization: (updated) => {
      const currentOrg = get().organization;
      if (!currentOrg) return;
      const newOrg = { ...currentOrg, ...updated };
      localStorage.setItem('auth_org', JSON.stringify(newOrg));
      set({ organization: newOrg });
    },

    setImpersonation: (impersonationToken: string, tenantUser: User, tenantOrg: Organization) => {
      const originalToken = get().token;
      if (originalToken) {
        localStorage.setItem('impersonator_token', originalToken);
      }
      localStorage.setItem('auth_token', impersonationToken);
      localStorage.setItem('auth_user', JSON.stringify(tenantUser));
      localStorage.setItem('auth_org', JSON.stringify(tenantOrg));
      localStorage.setItem('active_org_slug', tenantOrg.slug);

      set({
        token: impersonationToken,
        user: tenantUser,
        organization: tenantOrg,
        impersonatorToken: originalToken,
      });
    },

    stopImpersonation: () => {
      const originalToken = get().impersonatorToken;
      if (!originalToken) return;

      localStorage.removeItem('impersonator_token');
      localStorage.removeItem('auth_org');
      localStorage.removeItem('active_org_slug');
      localStorage.setItem('auth_token', originalToken);

      // Re-fetch me
      window.location.href = '/platform';
    },
  };
});
