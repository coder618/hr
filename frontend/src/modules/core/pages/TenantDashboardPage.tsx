import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  CheckSquare,
  Fingerprint,
  Palmtree,
  Receipt,
  FileText,
  Bell,
  ArrowRight,
  Briefcase,
  TrendingUp,
  PieChart as PieIcon,
  FolderGit2,
  Building2,
  Clock3,
  ChevronRight,
  Sparkles,
  Shield,
  Activity,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { formatDate, formatTime } from '@/lib/dateUtils';

// Custom dark styled tooltip for Recharts
const CustomChartTooltip: React.FC<any> = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950 text-white border border-zinc-800 rounded-lg p-2.5 shadow-xl text-xs space-y-1 z-50">
        <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-zinc-400 capitalize">{item.name}:</span>
            </div>
            <span className="font-mono font-bold text-white">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TenantDashboardPage: React.FC = () => {
  const { user, organization } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'organization' | 'personal'>('organization');
  const [attendanceRange, setAttendanceRange] = useState<'7d' | '14d'>('14d');

  // Check if current user has executive/management roles
  const roles = user?.roles || [];
  const isPrivileged = roles.some((r: any) => {
    const roleName = typeof r === 'string' ? r : r?.name;
    return ['admin', 'super_admin', 'hr', 'manager'].includes(roleName);
  }) || user?.is_super_admin;

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard-stats', isPrivileged ? activeTab : 'personal'],
    queryFn: async () => {
      const endpoint = isPrivileged && activeTab === 'organization'
        ? '/dashboard/stats?view=admin'
        : '/dashboard/stats?view=personal';
      const res = await api.get(endpoint);
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-96 items-center justify-center space-y-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-zinc-900 border-t-transparent" />
        <p className="text-xs text-zinc-500 font-mono tracking-wide">Loading workspace intelligence...</p>
      </div>
    );
  }

  const isEmployeeView = dashData?.view_type === 'employee' || activeTab === 'personal';

  // ==========================================
  // VIEW RENDERER
  // ==========================================
  return (
    <div className="space-y-8 max-w-7xl pb-12">
      {/* Top Header & Role View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
              {organization?.name || 'Workspace'}
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 font-mono">
              {formatDate(new Date())}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            {isEmployeeView
              ? 'Your personal attendance, tasks, leave entitlement, and account metrics.'
              : `Workplace intelligence, headcount distribution, and real-time operations overview.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dual View Toggle for Admins/Managers */}
          {isPrivileged && (
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('organization')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'organization'
                    ? 'bg-white text-zinc-950 font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Organization</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'personal'
                    ? 'bg-white text-zinc-950 font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>My Account</span>
              </button>
            </div>
          )}

          {/* Quick Clock-in shortcut */}
          <Link
            to="/attendance/punch"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-xs"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Clock In / Punch</span>
          </Link>
        </div>
      </div>

      {/* RENDER VIEW: Personal View vs Executive Organization View */}
      {isEmployeeView ? (
        <EmployeeDashboardSection dashData={dashData} user={user} organization={organization} />
      ) : (
        <AdminDashboardSection
          dashData={dashData}
          user={user}
          organization={organization}
          attendanceRange={attendanceRange}
          setAttendanceRange={setAttendanceRange}
        />
      )}
    </div>
  );
};

// =========================================================================
// 1. ADMIN & EXECUTIVE WORKSPACE DASHBOARD (WITH RICH CHARTS)
// =========================================================================
interface AdminDashboardSectionProps {
  dashData: any;
  user: any;
  organization: any;
  attendanceRange: '7d' | '14d';
  setAttendanceRange: (val: '7d' | '14d') => void;
}

const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  dashData,
  attendanceRange,
  setAttendanceRange,
}) => {
  const stats = dashData?.stats || {};
  const charts = dashData?.charts || {};
  const modules = dashData?.enabled_modules || [];
  const recentActivity = dashData?.recent_activity || {};
  const notices = dashData?.notices || [];

  // Filter attendance trend based on range selector
  const rawAttendanceTrend = charts?.attendance_trend || [];
  const attendanceTrendData = attendanceRange === '7d'
    ? rawAttendanceTrend.slice(-7)
    : rawAttendanceTrend;

  const departmentData = charts?.department_distribution || [];
  const employmentTypeData = charts?.employment_type_distribution || [];
  const expensesByCategoryData = charts?.expenses_by_category || [];
  const expensesByStatusData = charts?.expenses_by_status || [];
  const leavesByTypeData = charts?.leaves_by_type || [];
  const tasksByStatusData = charts?.tasks_by_status || [];
  const tasksByPriorityData = charts?.tasks_by_priority || [];

  return (
    <div className="space-y-8">
      {/* SECTION 1: 6 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Attendance Rate */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Today's Attendance</span>
              <div className="p-1.5 bg-zinc-100 rounded-md text-zinc-900">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {stats?.attendance_rate ?? 0}%
            </div>
            <p className="text-[11px] text-zinc-600 mt-1 font-medium">
              {stats?.present_today_count ?? 0} present today
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Presence rate</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
        </div>

        {/* Card 2: Active Headcount */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Staff</span>
              <div className="p-1.5 bg-zinc-100 rounded-md text-zinc-900">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {stats?.active_staff ?? 0}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1 font-medium">
              Across {stats?.branches_count ?? 1} branch(es)
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
            <span>{stats?.departments_count ?? 0} departments</span>
            <Link to="/employees" className="text-zinc-900 font-semibold hover:underline">
              View
            </Link>
          </div>
        </div>

        {/* Card 3: On Leave Today */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">On Leave Today</span>
              <div className="p-1.5 bg-zinc-100 rounded-md text-zinc-900">
                <Palmtree className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {stats?.on_leave_today ?? 0}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1 font-medium">
              Approved scheduled leave
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Absence quota</span>
            <Link to="/leave/calendar" className="text-zinc-900 font-semibold hover:underline">
              Calendar
            </Link>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending Actions</span>
              <div className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {stats?.pending_approvals ?? 0}
            </div>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">
              {stats?.pending_leaves ?? 0} leaves, {stats?.pending_expenses ?? 0} claims
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Awaiting review</span>
            <Link to="/leave/requests" className="text-zinc-900 font-semibold hover:underline">
              Resolve
            </Link>
          </div>
        </div>

        {/* Card 5: Monthly Expenses */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Monthly Expenses</span>
              <div className="p-1.5 bg-zinc-100 rounded-md text-zinc-900">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono truncate">
              Tk {stats?.monthly_expenses_sum?.toLocaleString() ?? 0}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1 font-medium">
              Approved & reimbursed
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Current month</span>
            <Link to="/expenses/claims" className="text-zinc-900 font-semibold hover:underline">
              Claims
            </Link>
          </div>
        </div>

        {/* Card 6: Active Projects & Tasks */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project Tasks</span>
              <div className="p-1.5 bg-zinc-100 rounded-md text-zinc-900">
                <FolderGit2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {stats?.active_tasks_count ?? 0}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1 font-medium">
              {stats?.task_completion_rate ?? 0}% completed rate
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
            <span>{stats?.active_projects_count ?? 0} active projects</span>
            <Link to="/projects" className="text-zinc-900 font-semibold hover:underline">
              Board
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 2: ROW OF MAJOR CHARTS (Attendance Trend + Department Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: 14-Day Attendance & Workforce Presence Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Workforce Attendance & Presence Trend</h3>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Daily volume of Present, Late arrivals, Approved Leaves, and Unaccounted absences.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-[11px]">
              <button
                type="button"
                onClick={() => setAttendanceRange('7d')}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  attendanceRange === '7d' ? 'bg-white text-black font-bold shadow-xs' : 'text-zinc-600'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setAttendanceRange('14d')}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  attendanceRange === '14d' ? 'bg-white text-black font-bold shadow-xs' : 'text-zinc-600'
                }`}
              >
                14 Days
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present On-Time"
                  stroke="#18181b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#presentGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="late"
                  name="Late In"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#lateGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="on_leave"
                  name="On Leave"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fill="#93c5fd"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-4 gap-2 text-center text-[11px]">
            <div>
              <span className="text-zinc-500">Avg Presence</span>
              <p className="font-bold font-mono text-zinc-950 mt-0.5">
                {Math.round(
                  attendanceTrendData.reduce((acc: number, c: any) => acc + (c.rate || 0), 0) /
                    Math.max(attendanceTrendData.length, 1)
                )}%
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Total Punches</span>
              <p className="font-bold font-mono text-zinc-950 mt-0.5">
                {attendanceTrendData.reduce((acc: number, c: any) => acc + (c.present || 0) + (c.late || 0), 0)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Late Occurrences</span>
              <p className="font-bold font-mono text-amber-600 mt-0.5">
                {attendanceTrendData.reduce((acc: number, c: any) => acc + (c.late || 0), 0)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Leaves Granted</span>
              <p className="font-bold font-mono text-blue-600 mt-0.5">
                {attendanceTrendData.reduce((acc: number, c: any) => acc + (c.on_leave || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* CHART 2: Department Headcount Distribution (1 Col Donut) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Department Distribution</h3>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700">
                {departmentData.length} Depts
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">Staff allocation by business department.</p>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {departmentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip unit=" staff" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold font-mono text-zinc-950">
                  {stats?.active_staff ?? 0}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Total Staff</span>
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {departmentData.map((dept: any) => (
              <div key={dept.name} className="flex items-center justify-between text-xs py-1 border-b border-zinc-50">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                  <span className="text-zinc-800 truncate font-medium">{dept.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-zinc-950">{dept.count}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">({dept.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: 3-COLUMN SECONDARY CHARTS (Expenses, Tasks, Leaves) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CHART 3: Expense Claims by Category */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Spend by Category</h3>
              </div>
              <Link to="/expenses/claims" className="text-[11px] font-semibold text-black hover:underline flex items-center gap-0.5">
                Claims <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Reimbursed and approved spending across categories.</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByCategoryData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 10, fill: '#3f3f46' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip unit=" Tk" />} />
                  <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                    {expensesByCategoryData.map((entry: any, index: number) => (
                      <Cell key={`bar-${index}`} fill={entry.color || '#18181b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Status Distribution:</span>
            <div className="flex items-center gap-2 font-mono">
              {expensesByStatusData.slice(0, 3).map((st: any) => (
                <span key={st.name} className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                  {st.count} {st.name.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 4: Task Status & Health Breakdown */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Project & Task Health</h3>
              </div>
              <Link to="/projects" className="text-[11px] font-semibold text-black hover:underline flex items-center gap-0.5">
                Projects <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Distribution of work items across delivery pipeline.</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip unit=" tasks" />} />
                  <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                    {tasksByStatusData.map((entry: any, index: number) => (
                      <Cell key={`task-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Urgent & High Items:</span>
            <div className="flex items-center gap-2 font-mono">
              {tasksByPriorityData.slice(0, 2).map((tp: any) => (
                <span key={tp.priority} className="flex items-center gap-1 text-[10px] font-bold text-zinc-900">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tp.color }} />
                  {tp.count} {tp.priority}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 5: Leave Types & Time-off Utilization */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Leave Type Utilization</h3>
              </div>
              <Link to="/leave/balances" className="text-[11px] font-semibold text-black hover:underline flex items-center gap-0.5">
                Balances <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Total days approved per leave classification.</p>

            {leavesByTypeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                No leave taken yet this period.
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leavesByTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip unit=" days" />} />
                    <Bar dataKey="days" name="Days Taken" radius={[4, 4, 0, 0]}>
                      {leavesByTypeData.map((entry: any, index: number) => (
                        <Cell key={`leave-cell-${index}`} fill={entry.color || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Pending Review:</span>
            <span className="font-mono font-bold text-amber-600">
              {stats?.pending_leaves ?? 0} request(s)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4: EMPLOYMENT DEMOGRAPHICS & REAL-TIME ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 6: Employment Type Breakdown */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Workforce Model</h3>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700">
                {stats?.active_staff ?? 0} Staff
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Headcount split across employment classifications.</p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employmentTypeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 10, fill: '#3f3f46' }} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip unit=" staff" />} />
                  <Bar dataKey="count" name="Staff" radius={[0, 4, 4, 0]}>
                    {employmentTypeData.map((entry: any, index: number) => (
                      <Cell key={`emp-type-${index}`} fill={entry.color || '#18181b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Classifications:</span>
            <div className="flex items-center gap-2 font-mono">
              {employmentTypeData.map((et: any) => (
                <span key={et.type} className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: et.color }} />
                  {et.count} {et.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Attendance Activity Today */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-bold text-zinc-950">Today's Check-in Log</h3>
            </div>
            <Link to="/attendance/records" className="text-xs font-semibold text-black hover:underline flex items-center gap-0.5">
              All Records <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!recentActivity?.attendance || recentActivity.attendance.length === 0) ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                No check-in punches recorded for today yet.
              </div>
            ) : (
              recentActivity.attendance.map((rec: any, idx: number) => (
                <div key={idx} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[11px]">
                      {rec.employee_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-950">{rec.employee_name}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">{rec.employee_code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {rec.is_late && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                          LATE
                        </span>
                      )}
                      <span className="font-mono font-bold text-zinc-900">
                        {formatTime(rec.clock_in)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {rec.clock_out ? `Out: ${formatTime(rec.clock_out)}` : 'Currently inside'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Company Announcements & Notice Broadcasts */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Notice Board & Updates</h3>
              </div>
              <Link to="/notices" className="text-xs font-semibold text-black hover:underline flex items-center gap-0.5">
                Board <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {notices.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                No active notices published.
              </div>
            ) : (
              <div className="space-y-3">
                {notices.map((n: any) => (
                  <div key={n.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-950 line-clamp-1">{n.title}</span>
                      {n.priority === 'urgent' || n.priority === 'important' ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-zinc-900 text-white rounded">
                          {n.priority}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-zinc-600 line-clamp-2">{n.content}</p>
                    <div className="pt-1 text-[10px] text-zinc-400 font-mono">
                      {formatDate(n.published_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Modules Footer */}
          <div className="mt-4 pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span className="font-semibold text-zinc-800">Enabled Modules ({modules.length})</span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Isolated Tenant
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modules.map((mod: string) => (
                <span
                  key={mod}
                  className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[10px] font-mono capitalize border border-zinc-200"
                >
                  {mod.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. PERSONAL EMPLOYEE & USER DASHBOARD (WITH RICH PERSONAL CHARTS)
// =========================================================================
interface EmployeeDashboardSectionProps {
  dashData: any;
  user: any;
  organization: any;
}

const EmployeeDashboardSection: React.FC<EmployeeDashboardSectionProps> = ({
  dashData,
  user,
  organization,
}) => {
  const employee = dashData?.employee;
  const attendance = dashData?.attendance || {};
  const leave = dashData?.leave || {};
  const tasks = dashData?.tasks || {};
  const expenses = dashData?.expenses || {};
  const charts = dashData?.charts || {};
  const notices = dashData?.notices || [];
  const holidays = dashData?.holidays || [];

  const isClockedIn = attendance?.status === 'clocked_in';
  const isClockedOut = attendance?.status === 'clocked_out';

  const personalAttendanceTrend = charts?.personal_attendance_trend || [];
  const leaveBreakdown = leave?.breakdown || [];
  const tasksByStatus = charts?.tasks_by_status || [];
  const tasksByPriority = charts?.tasks_by_priority || [];

  return (
    <div className="space-y-8">
      {/* Personalized Profile Identity Banner */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-sm">
            {(employee?.name || user?.name || 'U').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-950">
                {employee?.name || user?.name}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold">
                {employee?.employee_code || 'STAFF'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {employee?.designation || 'Staff Member'} • {employee?.department || 'Operations'} • {organization?.name || 'Workspace'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
          <span>Official:</span>
          <span className="font-semibold text-zinc-900">{employee?.email || user?.email}</span>
        </div>
      </div>

      {/* 4 Personalized Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Status */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Today's Attendance</span>
              <div className="p-2 bg-zinc-100 rounded-lg text-zinc-900 border border-zinc-200">
                <Fingerprint className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isClockedIn ? 'bg-emerald-500 animate-pulse' : isClockedOut ? 'bg-zinc-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-xl font-bold text-zinc-950">
                {isClockedIn ? 'Clocked In' : isClockedOut ? 'Clocked Out' : 'Not Clocked In'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5 font-mono">
              {attendance?.punch_in_time ? `Punched in at ${formatTime(attendance.punch_in_time)}` : 'No punch recorded yet today'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 truncate">{attendance?.shift?.name || 'General Shift'}</span>
            <Link to="/attendance/punch" className="font-semibold text-black hover:underline flex items-center gap-0.5">
              Punch <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Leave Balance */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Available Leaves</span>
              <div className="p-2 bg-zinc-100 rounded-lg text-zinc-900 border border-zinc-200">
                <Palmtree className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {leave?.available_days ?? 0} <span className="text-sm font-sans font-medium text-zinc-500">Days</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">
              {leave?.pending_requests_count > 0
                ? `${leave.pending_requests_count} request(s) awaiting review`
                : 'Quota available for use'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Annual & Casual quota</span>
            <Link to="/leave/requests" className="font-semibold text-black hover:underline flex items-center gap-0.5">
              Apply <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Active Assigned Tasks */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">My Assigned Tasks</span>
              <div className="p-2 bg-zinc-100 rounded-lg text-zinc-900 border border-zinc-200">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {tasks?.active_count ?? 0} <span className="text-sm font-sans font-medium text-zinc-500">Active</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">
              {tasks?.completed_this_month ?? 0} finished this month
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Action items</span>
            <Link to="/projects/my-tasks" className="font-semibold text-black hover:underline flex items-center gap-0.5">
              My Tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Expense Claims */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">My Expense Claims</span>
              <div className="p-2 bg-zinc-100 rounded-lg text-zinc-900 border border-zinc-200">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 font-mono">
              {expenses?.pending_count ?? 0} <span className="text-sm font-sans font-medium text-zinc-500">Pending</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5 font-mono">
              Tk {expenses?.reimbursed_total?.toLocaleString() ?? 0} reimbursed
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Reimbursement</span>
            <Link to="/expenses/claims" className="font-semibold text-black hover:underline flex items-center gap-0.5">
              Submit <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 1: Personal Working Hours Trend + Leave Quota Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART: 14-Day Working Hours Log */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Daily Work Hours & Punctuality (Last 14 Days)</h3>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Logged work hours vs standard 8-hour target.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-semibold">
                {attendance?.punctuality_rate ?? 100}% Punctual
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={personalAttendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} domain={[0, 12]} />
                <Tooltip content={<CustomChartTooltip unit=" hours" />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }}
                />
                <Bar dataKey="work_hours" name="Work Hours" fill="#18181b" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="target_hours" name="Target (8h)" stroke="#a1a1aa" strokeDasharray="4 4" dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-zinc-500 text-[11px]">Month Present Days</span>
              <p className="font-bold font-mono text-zinc-950 mt-0.5">{attendance?.present_days_this_month ?? 0} Days</p>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px]">Total Hours Logged</span>
              <p className="font-bold font-mono text-zinc-950 mt-0.5">{attendance?.total_work_hours ?? 0} hrs</p>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px]">Shift Timing</span>
              <p className="font-bold font-mono text-zinc-950 mt-0.5">
                {attendance?.shift?.start_time} - {attendance?.shift?.end_time}
              </p>
            </div>
          </div>
        </div>

        {/* CHART: Leave Entitlements Breakdown */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-bold text-zinc-950">Leave Balances</h3>
              </div>
              <Link to="/leave/requests" className="text-xs font-semibold text-black hover:underline">
                History
              </Link>
            </div>
            <p className="text-[11px] text-zinc-500 mb-4">Remaining vs utilized quota for the current year.</p>

            <div className="space-y-3.5">
              {leaveBreakdown.map((item: any) => {
                const total = Number(item.total) || 1;
                const available = Number(item.available) || 0;
                const used = Number(item.used) || 0;
                const pct = Math.min(Math.round((available / total) * 100), 100);

                return (
                  <div key={item.name} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-mono text-zinc-600 text-[11px]">
                        <strong>{available}</strong> / {total} days
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.color || '#18181b' }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                      <span>{used} days used</span>
                      <span>{pct}% left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Pending Leave Requests:</span>
            <span className="font-mono font-bold text-zinc-900">{leave?.pending_requests_count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: Tasks Status & Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Assigned Tasks Pipeline */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-bold text-zinc-950">Assigned Tasks by Status</h3>
            </div>
            <Link to="/projects/my-tasks" className="text-xs font-semibold text-black hover:underline flex items-center gap-0.5">
              Task Board <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip unit=" tasks" />} />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {tasksByStatus.map((entry: any, index: number) => (
                    <Cell key={`p-task-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Urgent items in queue:</span>
            <div className="flex items-center gap-2">
              {tasksByPriority.slice(0, 2).map((tp: any) => (
                <span key={tp.priority} className="text-[11px] font-mono font-bold text-zinc-900">
                  {tp.count} {tp.priority}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Self-Service Shortcuts */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-bold text-zinc-950">Self-Service Shortcuts</h3>
            </div>
            <p className="text-[11px] text-zinc-500 mb-4">Fast navigation to essential employee workplace actions.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <Link
                to="/attendance/punch"
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-black hover:shadow-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors mb-1.5">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-900">Clock In / Out</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Punch log</span>
              </Link>

              <Link
                to="/leave/requests"
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-black hover:shadow-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors mb-1.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-900">Request Leave</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Apply quota</span>
              </Link>

              <Link
                to="/payroll/my-payslips"
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-black hover:shadow-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors mb-1.5">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-900">My Payslips</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Salary PDF</span>
              </Link>

              <Link
                to="/projects/my-tasks"
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-black hover:shadow-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors mb-1.5">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-900">My Tasks</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Kanban board</span>
              </Link>

              <Link
                to="/expenses/claims"
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-black hover:shadow-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors mb-1.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-900">Claim Expense</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Reimbursements</span>
              </Link>

              <Link
                to="/notices"
                className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-black hover:shadow-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors mb-1.5">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-900">Notice Board</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Announcements</span>
              </Link>
            </div>
          </div>

          {/* Profile mini-card */}
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Designation:</span>
            <span className="font-semibold text-zinc-900 font-mono">
              {employee?.designation || 'Staff Member'} ({employee?.employee_code || 'EMP'})
            </span>
          </div>
        </div>
      </div>

      {/* ROW 3: Announcements & Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Announcements */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-bold text-zinc-950">Company Notices</h3>
            </div>
            <Link to="/notices" className="text-xs font-semibold text-black hover:underline">
              View All
            </Link>
          </div>

          {notices.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
              No published company notices at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((n: any) => (
                <div key={n.id} className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-950 line-clamp-1">{n.title}</span>
                    {n.priority === 'urgent' || n.priority === 'important' ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-zinc-950 text-white rounded">
                        {n.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-zinc-600 line-clamp-2">{n.content}</p>
                  <div className="pt-1 text-[10px] text-zinc-400 font-mono">
                    {formatDate(n.published_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-bold text-zinc-950">Upcoming Holidays & Off Days</h3>
            </div>
            <Link to="/leave/calendar" className="text-xs font-semibold text-black hover:underline">
              Calendar
            </Link>
          </div>

          {holidays.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
              No upcoming official holidays registered.
            </div>
          ) : (
            <div className="space-y-3">
              {holidays.map((h: any) => (
                <div key={h.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-zinc-950">{h.name}</p>
                    <span className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {formatDate(h.start_date)} {h.end_date && h.end_date !== h.start_date ? `to ${formatDate(h.end_date)}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                    Official Holiday
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDashboardPage;
