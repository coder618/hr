import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const employeeModuleConfig: ModuleConfig = {
  id: 'employee',
  name: 'Employee Management',
  order: 3,
  routes: [
    {
      path: '/employees',
      component: lazy(() => import('./pages/EmployeeListPage')),
      role: 'admin,hr,manager',
    },
    {
      path: '/employees/:id',
      component: lazy(() => import('./pages/EmployeeDetailsPage')),
    },
    {
      path: '/organization-structure',
      component: lazy(() => import('./pages/OrganizationStructurePage')),
      role: 'admin,hr,manager',
    },
  ],
  navigation: [
    {
      name: 'Employees',
      path: '/employees',
      icon: 'Users',
      role: 'admin,hr,manager',
    },
    {
      name: 'Org Structure',
      path: '/organization-structure',
      icon: 'Building2',
      role: 'admin,hr,manager',
    },
  ],
};
