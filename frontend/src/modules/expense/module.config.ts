import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const expenseModuleConfig: ModuleConfig = {
  id: 'expense',
  name: 'Expense & Finance',
  order: 9,
  routes: [
    {
      path: '/expenses',
      component: lazy(() => import('./pages/ExpenseClaimsPage')),
    },
    {
      path: '/expenses/claims',
      component: lazy(() => import('./pages/ExpenseClaimsPage')),
    },
    {
      path: '/expenses/office-expenses',
      component: lazy(() => import('./pages/MonthlyOfficeExpensesPage')),
      role: 'admin,hr',
    },
    {
      path: '/expenses/categories',
      component: lazy(() => import('./pages/ExpenseCategoriesPage')),
      role: 'admin,hr,manager',
    },
    {
      path: '/expenses/analytics',
      component: lazy(() => import('./pages/ExpenseAnalyticsPage')),
      role: 'admin,hr,manager',
    },
  ],
  navigation: [
    {
      name: 'Expense Module',
      path: '/expenses',
      icon: 'Receipt',
      children: [
        {
          name: 'Expense Claims',
          path: '/expenses/claims',
          icon: 'Receipt',
        },
        {
          name: 'Monthly Office Expenses',
          path: '/expenses/office-expenses',
          icon: 'Building2',
          role: 'admin,hr',
        },
        {
          name: 'Budgets & Categories',
          path: '/expenses/categories',
          icon: 'Wallet',
          role: 'admin,hr,manager',
        },
        {
          name: 'Expense Analytics',
          path: '/expenses/analytics',
          icon: 'Activity',
          role: 'admin,hr,manager',
        },
      ],
    },
  ],
};
