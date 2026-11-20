import { useAuthStore } from '@/stores/authStore';

export function usePermission() {
  const user = useAuthStore((state) => state.user);

  const isSuperAdmin = !!user?.is_super_admin;

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  };

  const hasRole = (role?: string): boolean => {
    if (!role) return true;
    if (isSuperAdmin) return true;
    if (!user || !user.roles) return false;
    const allowed = role.split(/[,|]/).map((r) => r.trim().toLowerCase());
    return allowed.some((r) => user.roles?.map((ur) => ur.toLowerCase()).includes(r));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some((p) => hasPermission(p));
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (isSuperAdmin) return true;
    return roles.some((r) => hasRole(r));
  };

  const isEmployeeOnly = hasRole('employee') && !hasRole('admin') && !hasRole('hr') && !hasRole('manager') && !isSuperAdmin;

  return {
    isSuperAdmin,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,
    isEmployeeOnly,
  };
}
