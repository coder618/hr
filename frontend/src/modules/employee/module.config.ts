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
      path: '/employees/create',
      component: lazy(() => import('./pages/AddEmployeePage')),
      role: 'admin,hr',
    },
    {
      path: '/employees/:id/edit',
      component: lazy(() => import('./pages/EditEmployeePage')),
      role: 'admin,hr',
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
      children: [
        {
          name: 'Add Employee',
          path: '/employees/create',
          icon: 'UserPlus',
          role: 'admin,hr',
        },
        {
          name: 'List employee',
          path: '/employees',
          icon: 'Users',
          role: 'admin,hr,manager',
        },
      ],
    },
    {
      name: 'Org Structure',
      path: '/organization-structure',
      icon: 'Building2',
      role: 'admin,hr,manager',
    },
  ],
};
