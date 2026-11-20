import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import { moduleRegistry } from '@/lib/moduleRegistry';
import { coreModuleConfig } from '@/modules/core/module.config';
import { mediaModuleConfig } from '@/modules/media/module.config';
import { employeeModuleConfig } from '@/modules/employee/module.config';
import { shiftModuleConfig } from '@/modules/shift/module.config';
import { attendanceModuleConfig } from '@/modules/attendance/module.config';
import { leaveModuleConfig } from '@/modules/leave/module.config';
import { payrollModuleConfig } from '@/modules/payroll/module.config';
import { projectModuleConfig } from '@/modules/project/module.config';
import { expenseModuleConfig } from '@/modules/expense/module.config';
import { noticeModuleConfig } from '@/modules/notice/module.config';

// Layouts
import { AuthLayout } from '@/layouts/AuthLayout';
import { PlatformLayout } from '@/layouts/PlatformLayout';
import { OrgDashboardLayout } from '@/layouts/OrgDashboardLayout';

// Core Pages (Lazy loaded for optimal bundle splitting)
const LoginPage = React.lazy(() => import('@/modules/core/pages/LoginPage'));
const WebInstallerPage = React.lazy(() => import('@/modules/core/pages/WebInstallerPage'));
const PlatformDashboardPage = React.lazy(() => import('@/modules/core/pages/PlatformDashboardPage'));
const PlatformOrganizationsPage = React.lazy(() => import('@/modules/core/pages/PlatformOrganizationsPage'));
const SystemHealthPage = React.lazy(() => import('@/modules/core/pages/SystemHealthPage'));
const AuditLogsPage = React.lazy(() => import('@/modules/core/pages/AuditLogsPage'));

// Register Modules
moduleRegistry.register(coreModuleConfig);
moduleRegistry.register(mediaModuleConfig);
moduleRegistry.register(employeeModuleConfig);
moduleRegistry.register(shiftModuleConfig);
moduleRegistry.register(attendanceModuleConfig);
moduleRegistry.register(leaveModuleConfig);
moduleRegistry.register(payrollModuleConfig);
moduleRegistry.register(projectModuleConfig);
moduleRegistry.register(expenseModuleConfig);
moduleRegistry.register(noticeModuleConfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export const App: React.FC = () => {
  const { isAuthenticated, user, enabledModules } = useAuthStore();
  const { hasRole, hasPermission } = usePermission();
  const isSuperAdmin = !!user?.is_super_admin;

  const dynamicRoutes = moduleRegistry.getEnabledRoutes(enabledModules, isSuperAdmin, hasRole, hasPermission);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen bg-white flex items-center justify-center text-zinc-500">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/install" element={<WebInstallerPage />} />
            </Route>

            {/* Platform Super Admin Routes */}
            <Route
              path="/platform"
              element={
                isAuthenticated && isSuperAdmin ? (
                  <PlatformLayout />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route index element={<PlatformDashboardPage />} />
              <Route path="organizations" element={<PlatformOrganizationsPage />} />
              <Route path="health" element={<SystemHealthPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* Tenant Organization Dashboard Routes */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <OrgDashboardLayout />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              {dynamicRoutes.map((route) => {
                const Component = route.component;
                return (
                  <Route
                    key={route.path}
                    path={route.path.startsWith('/') ? route.path.substring(1) : route.path}
                    element={<Component />}
                  />
                );
              })}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={isAuthenticated ? (isSuperAdmin ? '/platform' : '/dashboard') : '/login'} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
