import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const leaveModuleConfig: ModuleConfig = {
  id: 'leave',
  name: 'Leave & Holidays',
  order: 6,
  routes: [
    {
      path: '/leave',
      component: lazy(() => import('./pages/LeaveRequestsPage')),
    },
    {
      path: '/leave/requests',
      component: lazy(() => import('./pages/LeaveRequestsPage')),
    },
    {
      path: '/leave/balances',
      component: lazy(() => import('./pages/LeaveBalancesPage')),
    },
    {
      path: '/leave/calendar',
      component: lazy(() => import('./pages/LeaveCalendarPage')),
    },
    {
      path: '/leave/settings',
      component: lazy(() => import('./pages/LeaveSettingsPage')),
      role: 'admin,hr',
    },
  ],
  navigation: [
    {
      name: 'Leave Module',
      path: '/leave',
      icon: 'Palmtree',
      children: [
        {
          name: 'Leave Requests',
          path: '/leave/requests',
          icon: 'Calendar',
        },
        {
          name: 'Leave Balances',
          path: '/leave/balances',
          icon: 'Clock',
        },
        {
          name: 'Leave Calendar',
          path: '/leave/calendar',
          icon: 'Calendar',
        },
        {
          name: 'Leave Policies',
          path: '/leave/settings',
          icon: 'Palmtree',
          role: 'admin,hr',
        },
      ],
    },
  ],
};
