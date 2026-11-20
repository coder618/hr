import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const projectModuleConfig: ModuleConfig = {
  id: 'project',
  name: 'Projects & Tasks',
  order: 8,
  routes: [
    {
      path: '/projects',
      component: lazy(() => import('./pages/ProjectsPage')),
      role: 'admin,hr,manager',
    },
    {
      path: '/projects/:id',
      component: lazy(() => import('./pages/ProjectDetailsPage')),
      role: 'admin,hr,manager',
    },
    {
      path: '/projects/my-tasks',
      component: lazy(() => import('./pages/MyTasksPage')),
    },
  ],
  navigation: [
    {
      name: 'Projects',
      path: '/projects',
      icon: 'FolderOpen',
      role: 'admin,hr,manager',
    },
    {
      name: 'My Tasks',
      path: '/projects/my-tasks',
      icon: 'Box',
    },
  ],
};
