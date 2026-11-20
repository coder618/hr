import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const mediaModuleConfig: ModuleConfig = {
  id: 'media',
  name: 'Document & Media Library',
  order: 2,
  routes: [
    {
      path: '/media',
      component: lazy(() => import('./pages/MediaLibraryPage')),
      role: 'admin,hr,manager',
    },
  ],
  navigation: [
    {
      name: 'Media Vault',
      path: '/media',
      icon: 'FolderOpen',
      role: 'admin,hr,manager',
    },
  ],
};
