import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  LogOut,
  Activity,
  FileText,
  Users,
  Calendar,
  Clock,
  Fingerprint,
  Cpu,
  Briefcase,
  DollarSign,
  Banknote,
  Wallet,
  FolderOpen,
  Receipt,
  Bell,
  Box,
  Palmtree,
  CornerUpLeft,
  ChevronDown,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { moduleRegistry } from '@/lib/moduleRegistry';
import { usePermission } from '@/hooks/usePermission';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  Clock,
  Calendar,
  Fingerprint,
  Cpu,
  Briefcase,
  DollarSign,
  Banknote,
  Wallet,
  FolderOpen,
  Receipt,
  Bell,
  Box,
  Palmtree,
  Settings,
  Activity,
  FileText,
};

export const OrgDashboardLayout: React.FC = () => {
  const { user, organization, enabledModules, impersonatorToken, stopImpersonation, logout } = useAuthStore();
  const { hasPermission, hasRole, isSuperAdmin } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Dynamic navigation items from module registry
  const navItems = moduleRegistry.getEnabledNavigation(
    enabledModules,
    hasPermission,
    hasRole,
    isSuperAdmin
  );

  const allNavPaths = navItems.flatMap((n) => [
    n.path,
    ...(n.children ? n.children.map((c) => c.path) : []),
  ]);

  // Precise active check that resolves hierarchical routes without double-selecting
  const isNavActive = (itemPath: string) => {
    const currentPath = location.pathname;
    if (currentPath === itemPath) return true;
    if (currentPath.startsWith(itemPath + '/')) {
      const hasMoreSpecificMatch = allNavPaths.some(
        (otherPath) =>
          otherPath !== itemPath &&
          (currentPath === otherPath || currentPath.startsWith(otherPath + '/')) &&
          otherPath.length > itemPath.length
      );
      return !hasMoreSpecificMatch;
    }
    return false;
  };

  const isSubmenuOpen = (item: (typeof navItems)[number]) => {
    if (openSubmenus[item.name] !== undefined) {
      return openSubmenus[item.name];
    }
    return item.children?.some((child) => isNavActive(child.path)) ?? false;
  };

  const handleToggleSubmenu = (itemName: string) => {
    setOpenSubmenus((prev) => {
      const item = navItems.find((n) => n.name === itemName);
      const currentlyOpen =
        prev[itemName] !== undefined
          ? prev[itemName]
          : item?.children?.some((child) => isNavActive(child.path)) ?? false;
      return {
        ...prev,
        [itemName]: !currentlyOpen,
      };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col antialiased">
      {/* Impersonation Banner if super admin is viewing tenant */}
      {impersonatorToken && (
        <div className="bg-black text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs sticky top-0 z-50 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>
              IMPERSONATION ACTIVE: You are viewing <strong>{organization?.name}</strong> as <strong>{user?.name}</strong>.
            </span>
          </div>
          <button
            onClick={stopImpersonation}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-all cursor-pointer text-xs border border-zinc-700"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
            <span>Return to Platform</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Dynamic Sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col fixed inset-y-0 z-30" style={{ top: impersonatorToken ? '37px' : '0' }}>
          <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-200 bg-white">
            <div className="p-2 bg-black rounded-lg text-white">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm tracking-tight text-zinc-950 truncate">
                {organization?.name || 'OfficeHub'}
              </h1>
              <p className="text-[11px] text-zinc-500 font-medium truncate">Tenant Workspace</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isChildActive = Boolean(item.children?.some((child) => isNavActive(child.path)));
              const active = isNavActive(item.path);

              if (hasChildren) {
                const open = isSubmenuOpen(item);

                return (
                  <React.Fragment key={item.name}>
                    {item.name === 'Settings' && (
                      <div className="pt-2 my-2 border-t border-zinc-200" />
                    )}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSubmenu(item.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none ${
                          isChildActive
                            ? 'text-zinc-950 font-semibold bg-zinc-100'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0 text-current opacity-85" />
                          <span>{item.name}</span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                            open ? 'rotate-180 text-zinc-800' : ''
                          }`}
                        />
                      </button>

                      {open && (
                        <div className="pl-3.5 ml-3 my-1 space-y-1 border-l border-zinc-200">
                          {item.children!.map((child) => {
                            const ChildIcon = iconMap[child.icon] || FileText;
                            const childActive = isNavActive(child.path);

                            return (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  childActive
                                    ? 'bg-black text-white font-medium shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <ChildIcon className="w-4 h-4 shrink-0 text-current opacity-85" />
                                  <span>{child.name}</span>
                                </div>
                                {child.badge && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                      childActive
                                        ? 'bg-zinc-800 text-white border-zinc-700'
                                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                                    }`}
                                  >
                                    {child.badge}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-black text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 text-current opacity-85" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        active
                          ? 'bg-zinc-800 text-white border-zinc-700'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-200 bg-white">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50 rounded-lg mb-2 border border-zinc-200">
              <div className="w-8 h-8 rounded-full bg-black text-white font-bold flex items-center justify-center text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-zinc-950 truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg border border-transparent hover:border-zinc-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 ml-64 flex flex-col min-h-screen bg-zinc-50">
          <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 sticky top-0 z-20">
            <div className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-900">{organization?.name}</span>
              <span className="mx-2 text-zinc-300">/</span>
              <span>Operations Portal</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-100 text-zinc-900 border border-zinc-300">
                {user?.roles?.[0] ? user.roles[0].toUpperCase() : 'EMPLOYEE'}
              </span>
            </div>
          </header>

          <main className="flex-1 p-8 overflow-y-auto bg-zinc-50 text-zinc-950">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default OrgDashboardLayout;
