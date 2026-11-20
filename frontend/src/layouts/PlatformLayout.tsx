import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Building,
  Activity,
  FileText,
  LogOut,
  Server,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export const PlatformLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Platform Overview', path: '/platform', icon: Activity },
    { name: 'Organizations', path: '/platform/organizations', icon: Building },
    { name: 'System Health', path: '/platform/health', icon: Server },
    { name: 'Audit Logs', path: '/platform/audit-logs', icon: FileText },
  ];

  const allNavPaths = navItems.map((n) => n.path);

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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex antialiased">
      {/* Platform Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col fixed inset-y-0 z-30">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-200 bg-white">
          <div className="p-2 bg-black rounded-lg text-white">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-zinc-950">Super Admin</h1>
            <p className="text-[11px] text-zinc-500 font-mono">Platform Governance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-black text-white font-medium shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-current opacity-85" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 bg-white">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50 rounded-lg mb-2 border border-zinc-200">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
              {user?.name?.charAt(0) || 'S'}
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

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-zinc-50">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-900">OfficeHub Platform</span>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-500">Root Governance</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-100 text-zinc-900 border border-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
              Platform Active
            </span>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto bg-zinc-50 text-zinc-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
