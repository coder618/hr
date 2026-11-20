import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const shiftModuleConfig: ModuleConfig = {
  id: 'shift',
  name: 'Shift & Roster Management',
  order: 4,
  routes: [
    {
      path: '/shifts',
      component: lazy(() => import('./pages/ShiftListPage')),
      role: 'admin,hr,manager',
    },
    {
      path: '/shifts/roster',
      component: lazy(() => import('./pages/ShiftRosterPage')),
      role: 'admin,hr,manager',
    },
  ],
  navigation: [
    {
      name: 'Shifts & Hours',
      path: '/shifts',
      icon: 'Clock',
      role: 'admin,hr,manager',
    },
    {
      name: 'Shift Rostering',
      path: '/shifts/roster',
      icon: 'Calendar',
      role: 'admin,hr,manager',
    },
  ],
};
