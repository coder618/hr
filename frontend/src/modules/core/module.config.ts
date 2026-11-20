import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const coreModuleConfig: ModuleConfig = {
  id: 'core',
  name: 'Core & Administration',
  order: 1,
  routes: [
    {
      path: '/dashboard',
      component: lazy(() => import('./pages/TenantDashboardPage')),
    },
    {
      path: '/settings',
      component: lazy(() => import('./pages/TenantSettingsPage')),
      role: 'admin',
    },
    {
      path: '/audit-logs',
      component: lazy(() => import('./pages/AuditLogsPage')),
      role: 'admin',
    },
    {
      path: '/system-health',
      component: lazy(() => import('./pages/SystemHealthPage')),
      role: 'admin',
    },
  ],
  navigation: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
      order: 1,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: 'Settings',
      role: 'admin',
      order: 999,
      children: [
        {
          name: 'Audit Logs',
          path: '/audit-logs',
          icon: 'FileText',
          role: 'admin',
        },
        {
          name: 'System Health',
          path: '/system-health',
          icon: 'Activity',
          role: 'admin',
        },
        {
          name: 'Organization Settings',
          path: '/settings',
          icon: 'Settings',
          role: 'admin',
        },
      ],
    },
  ],
};
