import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const payrollModuleConfig: ModuleConfig = {
  id: 'payroll',
  name: 'Payroll & Compensation',
  order: 7,
  routes: [
    {
      path: '/payroll/runs',
      component: lazy(() => import('./pages/PayrollRunsPage')),
      role: 'admin,hr',
    },
    {
      path: '/payroll/structures',
      component: lazy(() => import('./pages/SalaryStructuresPage')),
      role: 'admin,hr',
    },
    {
      path: '/payroll/employee-salaries',
      component: lazy(() => import('./pages/EmployeeSalariesPage')),
      role: 'admin,hr',
    },
    {
      path: '/payroll/my-payslips',
      component: lazy(() => import('./pages/MyPayslipsPage')),
    },
  ],
  navigation: [
    {
      name: 'Payroll Runs',
      path: '/payroll/runs',
      icon: 'Banknote',
      role: 'admin,hr',
    },
    {
      name: 'Salary Structures',
      path: '/payroll/structures',
      icon: 'Briefcase',
      role: 'admin,hr',
    },
    {
      name: 'Employee Salaries',
      path: '/payroll/employee-salaries',
      icon: 'Users',
      role: 'admin,hr',
    },
    {
      name: 'My Payslips',
      path: '/payroll/my-payslips',
      icon: 'Receipt',
    },
  ],
};
