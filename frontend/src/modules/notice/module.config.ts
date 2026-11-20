import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const noticeModuleConfig: ModuleConfig = {
  id: 'notice',
  name: 'Notice Board',
  order: 10,
  routes: [
    {
      path: '/notices',
      component: lazy(() => import('./pages/NoticeBoardPage')),
    },
    {
      path: '/notices/manage',
      component: lazy(() => import('./pages/NoticeAdminPage')),
      role: 'admin,hr,manager',
    },
  ],
  navigation: [
    {
      name: 'Notice Board',
      path: '/notices',
      icon: 'Bell',
    },
    {
      name: 'Manage Notices',
      path: '/notices/manage',
      icon: 'FileText',
      role: 'admin,hr,manager',
    },
  ],
};
