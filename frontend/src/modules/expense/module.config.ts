import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const expenseModuleConfig: ModuleConfig = {
  id: 'expense',
  name: 'Expense & Finance',
  order: 9,
  routes: [
    {
      path: '/expenses/claims',
      component: lazy(() => import('./pages/ExpenseClaimsPage')),
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
      name: 'Expense Claims',
      path: '/expenses/claims',
      icon: 'Receipt',
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
};
