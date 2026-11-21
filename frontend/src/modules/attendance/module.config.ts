import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const attendanceModuleConfig: ModuleConfig = {
  id: 'attendance',
  name: 'Attendance & Time Tracking',
  order: 5,
  routes: [
    {
      path: '/attendance/punch',
      component: lazy(() => import('./pages/AttendancePunchPage')),
    },
    {
      path: '/attendance/records',
      component: lazy(() => import('./pages/AttendanceRecordsPage')),
    },
    {
      path: '/attendance/devices',
      component: lazy(() => import('./pages/AttendanceDevicesPage')),
      role: 'admin,hr',
    },
    {
      path: '/attendance/holidays',
      component: lazy(() => import('./pages/AttendanceHolidaysPage')),
      role: 'admin',
    },
  ],
  navigation: [
    {
      name: 'Clock In / Punch',
      path: '/attendance/punch',
      icon: 'Fingerprint',
    },
    {
      name: 'Attendance Records',
      path: '/attendance/records',
      icon: 'FileText',
    },
    {
      name: 'Holiday Management',
      path: '/attendance/holidays',
      icon: 'Calendar',
      role: 'admin',
    },
  ],
};
