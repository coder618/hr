import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AttendanceRecord, AttendanceSummaryResponse } from '../types/attendance';
import { Branch, Department } from '../../employee/types/employee';
import { useAuthStore } from '@/stores/authStore';
import {
  Download,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export const AttendanceRecordsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.is_super_admin || true; // Can approve

  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // default last 14 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('');

  // Regularize Modal State
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Aux Queries
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments', branchFilter],
    queryFn: async () => {
      const res = await api.get('/departments', { params: { branch_id: branchFilter || undefined } });
      return res.data.data;
    },
  });

  // KPI Summary Query
  const { data: summary } = useQuery<AttendanceSummaryResponse>({
    queryKey: ['attendance-summary', startDate],
    queryFn: async () => {
      const month = startDate.slice(0, 7);
      const res = await api.get('/attendance/reports/summary', { params: { month } });
      return res.data.data;
    },
  });

  // Records Table Query
  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['attendance-records', page, startDate, endDate, statusFilter, branchFilter, deptFilter, regStatusFilter],
    queryFn: async () => {
      const res = await api.get('/attendance/records', {
        params: {
          page,
          per_page: 15,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: statusFilter || undefined,
          branch_id: branchFilter || undefined,
          department_id: deptFilter || undefined,
          regularization_status: regStatusFilter || undefined,
        },
      });
      return {
        items: res.data.data as AttendanceRecord[],
        meta: res.data.meta,
      };
    },
  });

  // Regularization Request Mutation
  const regularizeMutation = useMutation({
    mutationFn: async (payload: { record_id: number; clock_in: string; clock_out: string; reason: string }) => {
      return api.post('/attendance/regularize', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      setIsRegModalOpen(false);
      setSelectedRecord(null);
      alert('Regularization request submitted.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to submit regularization.');
    },
  });

  // Approve Regularization Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, clock_in, clock_out }: { id: number; clock_in?: string; clock_out?: string }) => {
      return api.post(`/attendance/records/${id}/approve-regularization`, { clock_in, clock_out });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      alert('Regularization approved.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to approve regularization.');
    },
  });

  // Reject Regularization Mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/attendance/records/${id}/reject-regularization`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    },
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await api.get('/attendance/reports/export/csv', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_records_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export attendance records. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const records = recordsData?.items || [];
  const meta = recordsData?.meta;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Daily Attendance Records
          </h1>
          <p className="text-sm text-zinc-500">
            Review employee working hours, clock-in/out timestamps, and approve regularization requests.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
            <span className="text-xs text-zinc-500">Present Rate</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">{summary.present}</span>
              <span className="text-xs text-zinc-500">/ {summary.total_record_days} shifts</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
            <span className="text-xs text-zinc-500">Late Arrivals</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">{summary.late}</span>
              <span className="text-xs text-zinc-500">instances</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
            <span className="text-xs text-zinc-500">Half Days</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-black">{summary.half_day}</span>
              <span className="text-xs text-zinc-500">shifts</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
            <span className="text-xs text-zinc-500">Total Work Hours</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-950">
                {summary.total_work_hours}
              </span>
              <span className="text-xs text-zinc-500">hrs</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm sm:grid-cols-2 md:grid-cols-6">
        <div>
          <label className="block text-[11px] font-medium text-zinc-500">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 py-1.5 px-2.5 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-500">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 py-1.5 px-2.5 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-500">Branch</label>
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 py-1.5 px-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-500">Department</label>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 py-1.5 px-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-500">Attendance Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 py-1.5 px-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-500">Regularization</label>
          <select
            value={regStatusFilter}
            onChange={(e) => {
              setRegStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 py-1.5 px-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All</option>
            <option value="pending">Pending Requests</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
            Loading attendance records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">
              No attendance records found
            </h3>
            <p className="mt-1 text-xs text-zinc-500">Try broadening your date filter or selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="border-b border-zinc-300 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Clock In</th>
                  <th className="px-4 py-3">Clock Out</th>
                  <th className="px-4 py-3">Work Hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Regularization</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {r.date}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-950">
                        {r.employee?.full_name}
                      </p>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {r.employee?.employee_code} • {r.employee?.department?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {r.is_late && (
                        <span className="ml-1.5 rounded bg-zinc-100 px-1 py-0.2 text-[9px] font-bold text-zinc-900">
                          +{r.late_minutes}m
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {(r.work_minutes / 60).toFixed(1)} hrs
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          r.status === 'present'
                            ? 'bg-zinc-100 text-zinc-900  '
                            : r.status === 'late'
                            ? 'bg-zinc-100 text-zinc-900  '
                            : r.status === 'half_day'
                            ? 'bg-zinc-100 text-black  '
                            : 'bg-zinc-100 text-zinc-900  '
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.regularization_status === 'pending' ? (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">
                          Pending Approval
                        </span>
                      ) : r.regularization_status === 'approved' ? (
                        <span className="text-[11px] text-zinc-900 font-medium">Approved</span>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.regularization_status === 'pending' && isAdminOrManager ? (
                          <>
                            <button
                              onClick={() => {
                                const inTime = prompt('Confirm Clock In (HH:mm):', '09:00');
                                const outTime = prompt('Confirm Clock Out (HH:mm):', '18:00');
                                if (inTime && outTime) {
                                  approveMutation.mutate({ id: r.id, clock_in: inTime, clock_out: outTime });
                                }
                              }}
                              className="rounded bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-900 hover:bg-zinc-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Reject regularization request?')) {
                                  rejectMutation.mutate(r.id);
                                }
                              }}
                              className="rounded bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-900 hover:bg-zinc-100"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRecord(r);
                              setIsRegModalOpen(true);
                            }}
                            className="rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
                          >
                            Regularize
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-300 px-4 py-3">
            <span className="text-xs text-zinc-500">
              Showing page {meta.current_page} of {meta.last_page} ({meta.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded border border-zinc-300 p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-zinc-300 p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Regularization Request */}
      {isRegModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              Request Attendance Regularization
            </h3>
            <p className="text-xs text-zinc-500">
              Date: <span className="font-semibold text-zinc-800">{selectedRecord.date}</span>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                regularizeMutation.mutate({
                  record_id: selectedRecord.id,
                  clock_in: formData.get('clock_in') as string,
                  clock_out: formData.get('clock_out') as string,
                  reason: formData.get('reason') as string,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Actual Clock In *
                  </label>
                  <input
                    name="clock_in"
                    type="time"
                    required
                    defaultValue="09:00"
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Actual Clock Out *
                  </label>
                  <input
                    name="clock_out"
                    type="time"
                    required
                    defaultValue="18:00"
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Reason for Adjustment *
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  required
                  placeholder="e.g. Biometric reader offline, client meeting on site, forgot to clock in..."
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regularizeMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-black disabled:opacity-50"
                >
                  {regularizeMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecordsPage;
