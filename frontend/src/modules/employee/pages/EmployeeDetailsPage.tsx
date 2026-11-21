import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { Employee, EmployeeTask, EmployeeAttendanceRecord, EmployeeLeaveBalance } from '../types/employee';
import { MediaItem } from '../../media/types/media';
import { MediaPicker } from '@/components/media/MediaPicker';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  ShieldCheck,
  Briefcase,
  Clock,
  AlertCircle,
  Receipt,
  Palmtree,
  CheckSquare,
  MapPin,
  FolderKanban,
  Edit,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/dateUtils';

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const EmployeeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasRole, isSuperAdmin } = usePermission();
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const canManage = hasRole('admin,hr') || isSuperAdmin;

  const { data: employee, isLoading, isError } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const res = await api.get(`/employees/${id}`);
      return res.data.data;
    },
  });

  const attachDocMutation = useMutation({
    mutationFn: async (media: MediaItem) => {
      return api.post(`/employees/${id}/documents`, {
        media_id: media.id,
        collection_name: 'documents',
        document_title: media.title || media.file_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to attach document.');
    },
  });

  const detachDocMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      return api.delete(`/employees/${id}/documents/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to detach document.');
    },
  });

  // Verify access: Admin, HR, or Self Employee
  const isOwner = Boolean(
    employee && (user?.email === employee.email || (employee.user_id && user?.id === employee.user_id))
  );
  const canView = canManage || isOwner;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 max-w-lg mx-auto mt-8">
        <p className="font-semibold">Failed to load employee details</p>
        <Link to="/employees" className="mt-2 inline-block text-xs font-medium text-black underline">
          Back to employee directory
        </Link>
      </div>
    );
  }

  // Access check enforcement: only admin, hr, or self user
  if (!canView) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-600 shadow-sm max-w-lg mx-auto mt-8">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <h2 className="text-base font-semibold text-zinc-900">Access Restricted</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Only administrators, HR personnel, and this employee are authorized to view this profile.
        </p>
        <Link
          to="/employees"
          className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Return to Employee Directory
        </Link>
      </div>
    );
  }

  // Related collections
  const projects = employee.projects || [];
  const assignedTasks: EmployeeTask[] = employee.assigned_tasks || (employee as any).assignedTasks || [];
  const attendanceRecords: EmployeeAttendanceRecord[] = employee.attendance_records || (employee as any).attendanceRecords || [];
  const payslips = employee.payslips || [];
  const leaveBalances: EmployeeLeaveBalance[] = employee.leave_balances || (employee as any).leaveBalances || [];
  const documents = (employee.media || []).filter((m) => m.pivot?.collection === 'documents' || !m.pivot?.collection || m.pivot.collection === 'default');

  // Attendance summary metrics
  const latestAttendance = attendanceRecords.length > 0 ? attendanceRecords[0] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/employees"
            className="rounded-lg border border-zinc-300 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                {employee.full_name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                  employee.status === 'active'
                    ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                {employee.status}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              {employee.employee_code} • {employee.designation?.name || 'Staff Member'} • {employee.branch?.name || 'Main Branch'}
            </p>
          </div>
        </div>

        {/* Top Badges / Quick Status */}
        <div className="flex items-center gap-2">
          {latestAttendance && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-500">Last Status:</span>
              <span className="font-semibold text-zinc-950 capitalize">{latestAttendance.status}</span>
            </div>
          )}
          {canManage && (
            <>
              <Link
                to={`/employees/${employee.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-2xs transition-colors"
              >
                <Edit className="h-4 w-4 text-zinc-700" />
                <span>Edit Profile</span>
              </Link>
              <button
                onClick={() => setIsMediaPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Attach File</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Profile Card & Quick Info (Sticky on Desktop) */}
        <div className="space-y-6 lg:col-span-1 lg:sticky lg:top-6 self-start">
          {/* Profile Card */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-2xl font-bold text-black overflow-hidden shadow-xs border border-zinc-200">
                {employee.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={employee.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    {employee.first_name[0]}
                    {employee.last_name[0]}
                  </>
                )}
              </div>
              <h2 className="mt-3 text-lg font-bold text-zinc-950">
                {employee.full_name}
              </h2>
              <span className="text-xs text-zinc-500">{employee.designation?.name || 'Staff Member'}</span>
              <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 uppercase tracking-wide">
                {employee.employment_type.replace('_', ' ')}
              </span>

              <div className="mt-4 w-full space-y-2.5 border-t border-zinc-200 pt-4 text-left text-xs text-zinc-700">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                  <a href={`mailto:${employee.email}`} className="truncate hover:text-black font-medium">
                    {employee.email}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>{employee.phone || 'No phone number'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="truncate">
                    {employee.branch?.name} ({employee.department?.name || 'No Dept'})
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>Joined: {formatDate(employee.joining_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Account Card */}
          <div className="rounded-xl border border-zinc-300 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-900">
              <ShieldCheck className="h-4 w-4 text-black" /> Portal Account
            </h3>
            {employee.user ? (
              <div className="mt-3 space-y-1.5 text-xs text-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="font-semibold text-zinc-950">
                    {employee.user.is_active ? 'Active Account' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">User Email</span>
                  <span className="font-mono text-zinc-800 text-[11px] truncate max-w-[130px]" title={employee.user.email}>
                    {employee.user.email}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">
                No portal login account is currently linked to this employee profile.
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {employee.emergency_contact && (
            <div className="rounded-xl border border-zinc-300 bg-white p-5 shadow-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                Emergency Contact
              </h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-700">
                <p className="font-semibold text-zinc-950">
                  {employee.emergency_contact.name || '—'}
                </p>
                <p className="text-zinc-500">Relationship: {employee.emergency_contact.relationship || '—'}</p>
                <p className="text-zinc-500">Phone: {employee.emergency_contact.phone || '—'}</p>
              </div>
            </div>
          )}

          {/* Address Information */}
          {employee.address && (
            <div className="rounded-xl border border-zinc-300 bg-white p-5 shadow-xs">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-900">
                <MapPin className="h-4 w-4 text-zinc-500" /> Address
              </h3>
              <div className="mt-2 text-xs text-zinc-600 space-y-0.5">
                <p>{employee.address.street || '—'}</p>
                <p>
                  {[employee.address.city, employee.address.state, employee.address.postal_code].filter(Boolean).join(', ')}
                </p>
                {employee.address.country && <p className="font-medium text-zinc-950">{employee.address.country}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: All Information Stacked One After Another (3 cols) */}
        <div className="space-y-6 lg:col-span-3">
          {/* 1. EMPLOYMENT & ORGANIZATIONAL STRUCTURE */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <Briefcase className="h-4 w-4 text-black" /> Employment & Organizational Structure
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Branch</span>
                <p className="mt-1 font-semibold text-zinc-950">{employee.branch?.name || '—'}</p>
                <span className="text-[10px] text-zinc-400 font-mono">{employee.branch?.code}</span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Department</span>
                <p className="mt-1 font-semibold text-zinc-950">{employee.department?.name || '—'}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Designation</span>
                <p className="mt-1 font-semibold text-zinc-950">{employee.designation?.name || '—'}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Reporting Manager</span>
                <p className="mt-1 font-semibold text-zinc-950">
                  {employee.reporting_manager ? `${employee.reporting_manager.first_name} ${employee.reporting_manager.last_name}` : 'None'}
                </p>
                {employee.reporting_manager && (
                  <span className="text-[10px] text-zinc-400 font-mono">{employee.reporting_manager.employee_code}</span>
                )}
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Employment Type</span>
                <p className="mt-1 font-semibold text-zinc-950 capitalize">{employee.employment_type.replace('_', ' ')}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Joining Date</span>
                <p className="mt-1 font-semibold text-zinc-950 font-mono">{formatDate(employee.joining_date)}</p>
              </div>
            </div>
          </div>

          {/* 2. BANKING & PAYROLL DETAILS */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <CreditCard className="h-4 w-4 text-black" /> Banking & Compensation Details
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Bank Name</span>
                <p className="mt-1 font-semibold text-zinc-950">
                  {employee.bank_details?.bank_name || 'Not configured'}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Account Holder Name</span>
                <p className="mt-1 font-semibold text-zinc-950">
                  {employee.bank_details?.account_name || 'Not configured'}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Account Number / IBAN</span>
                <p className="mt-1 font-mono font-semibold text-zinc-950">
                  {employee.bank_details?.account_number || '••••••••'}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Routing / Branch Code</span>
                <p className="mt-1 font-mono font-semibold text-zinc-950">
                  {employee.bank_details?.routing_number || '—'}
                </p>
              </div>
              {employee.salary && (
                <>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <span className="text-zinc-500">Base Salary</span>
                    <p className="mt-1 font-bold text-zinc-950 text-sm">
                      {formatCurrency(employee.salary.base_salary)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <span className="text-zinc-500">Salary Structure</span>
                    <p className="mt-1 font-semibold text-zinc-950">
                      {employee.salary.structure?.name || 'Standard Structure'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. ASSIGNED PROJECTS & TASKS */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs space-y-6">
            {/* Projects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-black" />
                  <h3 className="text-sm font-semibold text-zinc-950">Assigned Projects</h3>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                  {projects.length} Active
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                  <FolderKanban className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
                  No projects currently assigned to this employee.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 overflow-hidden">
                  {projects.map((proj) => (
                    <div key={proj.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-50/50 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link to={`/projects/${proj.id}`} className="font-semibold text-sm text-zinc-950 hover:underline">
                            {proj.title}
                          </Link>
                          <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                            {proj.code}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Role:{' '}
                          <span className="font-medium text-zinc-800 capitalize">
                            {proj.pivot?.role || 'Team Member'}
                          </span>{' '}
                          • Priority: <span className="capitalize">{proj.priority}</span>
                          {proj.due_date && ` • Due: ${formatDate(proj.due_date)}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                          proj.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}>
                          {proj.status.replace('_', ' ')}
                        </span>
                        <Link
                          to={`/projects/${proj.id}`}
                          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Tasks */}
            <div className="pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-black" />
                  <h3 className="text-sm font-semibold text-zinc-950">Assigned Tasks</h3>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                  {assignedTasks.length} Tasks
                </span>
              </div>

              {assignedTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                  <CheckSquare className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
                  No active tasks currently assigned.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 overflow-hidden">
                  {assignedTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-black shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-zinc-950">{t.title}</p>
                          <span className="text-[11px] text-zinc-500">
                            {t.project ? `${t.project.title} (${t.project.code})` : 'General Task'}
                            {t.due_date && ` • Due: ${formatDate(t.due_date)}`}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 capitalize">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. ATTENDANCE STATUS & HISTORY */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-black" />
                <h3 className="text-sm font-semibold text-zinc-950">Attendance Status & Recent History</h3>
              </div>
              {latestAttendance && (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  latestAttendance.status === 'present'
                    ? 'bg-emerald-50 text-emerald-800'
                    : latestAttendance.status === 'late'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-zinc-100 text-zinc-800'
                }`}>
                  Current: {latestAttendance.status}
                </span>
              )}
            </div>

            {/* Attendance Overview metrics */}
            {latestAttendance && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Latest Logged Date</span>
                  <p className="mt-1 font-semibold text-zinc-950 font-mono">{formatDate(latestAttendance.date)}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Clock In</span>
                  <p className="mt-1 font-semibold text-zinc-950 font-mono">
                    {formatTime(latestAttendance.clock_in)}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Clock Out</span>
                  <p className="mt-1 font-semibold text-zinc-950 font-mono">
                    {formatTime(latestAttendance.clock_out)}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Work Hours</span>
                  <p className="mt-1 font-semibold text-zinc-950">
                    {latestAttendance.work_minutes ? `${(latestAttendance.work_minutes / 60).toFixed(1)} hrs` : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* History Table */}
            {attendanceRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                <Clock className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
                No attendance records logged for this employee yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Clock In</th>
                      <th className="px-3 py-2.5">Clock Out</th>
                      <th className="px-3 py-2.5">Work Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                    {attendanceRecords.slice(0, 10).map((att) => (
                      <tr key={att.id} className="hover:bg-zinc-50/50">
                        <td className="px-3 py-2.5 font-medium text-zinc-950">{formatDate(att.date)}</td>
                        <td className="px-3 py-2.5 font-sans">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            att.status === 'present'
                              ? 'bg-emerald-50 text-emerald-800'
                              : att.status === 'late'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-zinc-100 text-zinc-800'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{formatTime(att.clock_in)}</td>
                        <td className="px-3 py-2.5">{formatTime(att.clock_out)}</td>
                        <td className="px-3 py-2.5 font-sans">
                          {att.work_minutes ? `${(att.work_minutes / 60).toFixed(1)} hrs` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. RECENT PAYSLIPS */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-black" />
                <h3 className="text-sm font-semibold text-zinc-950">Recent Payslips</h3>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                {payslips.length} Records
              </span>
            </div>

            {payslips.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                <Receipt className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
                No payslips have been generated for this employee yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5">Payslip #</th>
                      <th className="px-3 py-2.5">Period</th>
                      <th className="px-3 py-2.5">Gross Pay</th>
                      <th className="px-3 py-2.5">Deductions</th>
                      <th className="px-3 py-2.5">Net Pay</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {payslips.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50">
                        <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-zinc-950">
                          {p.payslip_number}
                        </td>
                        <td className="px-3 py-2.5">
                          {new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-2.5">{formatCurrency(p.gross_pay)}</td>
                        <td className="px-3 py-2.5 text-red-600">{formatCurrency(p.total_deductions)}</td>
                        <td className="px-3 py-2.5 font-bold text-zinc-950">{formatCurrency(p.net_pay)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            p.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-zinc-100 text-zinc-800'
                          }`}>
                            {p.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. DOCUMENTS & VERIFICATION */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-black" />
                <h3 className="text-sm font-semibold text-zinc-950">Documents & Verification</h3>
              </div>
              {canManage && (
                <button
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Attach Document</span>
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                <FileText className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
                No documents attached yet. Click "Attach Document" to link files from the Media Library.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 font-semibold text-xs uppercase">
                        {doc.extension || <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-950">
                          {doc.file_name}
                        </p>
                        <span className="text-[11px] text-zinc-500 uppercase">
                          {doc.extension} • {(doc.file_size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/api/v1/media/${doc.uuid}/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        title="Preview"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a
                        href={`/api/v1/media/${doc.uuid}/download`}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {canManage && (
                        <button
                          onClick={() => detachDocMutation.mutate(doc.id)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                          title="Detach"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7. ANNUAL LEAVE QUOTA */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-black" />
              <h3 className="text-sm font-semibold text-zinc-950">Annual Leave Quota</h3>
            </div>

            {leaveBalances.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                <Palmtree className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
                No leave policy balances recorded for this employee.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {leaveBalances.map((lb) => {
                  const remaining = Math.max(0, lb.allocated_days - lb.used_days);
                  const usagePercent = lb.allocated_days > 0 ? (lb.used_days / lb.allocated_days) * 100 : 0;
                  return (
                    <div key={lb.id} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-950">{lb.leave_type?.name || 'Leave'}</span>
                        <span className="text-[11px] font-mono text-zinc-500">{remaining} days left</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-black h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, usagePercent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                        <span>Allocated: {lb.allocated_days}</span>
                        <span>Used: {lb.used_days}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(selected) => {
          const item = Array.isArray(selected) ? selected[0] : selected;
          if (item) attachDocMutation.mutate(item);
          setIsMediaPickerOpen(false);
        }}
        typeFilter="all"
        title="Attach Document to Employee"
      />
    </div>
  );
};

export default EmployeeDetailsPage;
