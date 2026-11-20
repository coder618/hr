import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface CanProps {
  permission?: string;
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, role, fallback = null, children }) => {
  const { hasPermission, hasRole } = usePermission();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
