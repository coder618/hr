import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LeaveRequest, LeaveType, LeaveBalance } from '../types/leave';
import {
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Send,
  Ban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const LeaveRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form states
  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<'morning' | 'afternoon'>('morning');
  const [reason, setReason] = useState('');
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Queries
  const { data: requestsData, isLoading } = useQuery<{ data: LeaveRequest[]; current_page: number; last_page: number; total: number }>({
    queryKey: ['leave-requests', statusFilter, page],
    queryFn: async () => {
      const params: any = { page };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/leave/requests', { params });
      return res.data;
    },
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await api.get('/leave/types');
      return res.data.data;
    },
  });

  const { data: myBalances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-my-balances'],
    queryFn: async () => {
      const res = await api.get('/leave/balances/my');
      return res.data.data;
    },
  });

  // Calculate working days dynamically when dates change
  useEffect(() => {
    if (!fromDate || !toDate) {
      setCalculatedDays(null);
      setCalculationError(null);
      return;
    }

    const calc = async () => {
      setIsCalculating(true);
      setCalculationError(null);
      try {
        const res = await api.post('/leave/calculate-days', {
          from_date: fromDate,
          to_date: toDate,
          is_half_day: isHalfDay,
        });
        setCalculatedDays(res.data.working_days);
      } catch (err: any) {
        setCalculatedDays(null);
        setCalculationError(err.response?.data?.message || 'Failed to calculate working days');
      } finally {
        setIsCalculating(false);
      }
    };

    const timer = setTimeout(calc, 250);
    return () => clearTimeout(timer);
  }, [fromDate, toDate, isHalfDay]);

  // Mutations
  const applyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leave/requests', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-balances'] });
      setIsApplyModalOpen(false);
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/leave/requests/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-balances'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await api.post(`/leave/requests/${id}/reject`, { rejection_reason: reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-balances'] });
      setRejectingRequestId(null);
      setRejectionReason('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/leave/requests/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-my-balances'] });
    },
  });

  const resetForm = () => {
    setLeaveTypeId('');
    setFromDate('');
    setToDate('');
    setIsHalfDay(false);
    setHalfDaySession('morning');
    setReason('');
    setCalculatedDays(null);
    setCalculationError(null);
  };

  const selectedBalance = myBalances.find((b) => b.leave_type_id === Number(leaveTypeId));

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !fromDate || !toDate || !reason) return;

    applyMutation.mutate({
      leave_type_id: Number(leaveTypeId),
      from_date: fromDate,
      to_date: toDate,
      is_half_day: isHalfDay,
      half_day_session: isHalfDay ? halfDaySession : null,
      reason,
    });
  };

  const requests = requestsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-black" />
            Leave Applications & Approvals
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Apply for time off, review working-day calculations excluding weekends & holidays, and action approvals.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsApplyModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-sm transition-all focus:ring-2"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-zinc-300 pb-2 overflow-x-auto">
        {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              statusFilter === tab
                ? 'bg-black text-white hover:bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-700  hover:bg-zinc-100 '
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500">Loading leave requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-base font-semibold">No leave applications found</p>
            <p className="text-sm">Submit your first application using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Leave Type</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Days</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-950">
                        {r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Unknown'}
                      </div>
                      <div className="text-xs text-zinc-500">{r.employee?.employee_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${r.leave_type?.color || '#3B82F6'}20`,
                          color: r.leave_type?.color || '#3B82F6',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: r.leave_type?.color || '#3B82F6' }}
                        />
                        {r.leave_type?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-950 font-medium">
                        {r.from_date} {r.from_date !== r.to_date && `→ ${r.to_date}`}
                      </div>
                      {r.is_half_day && (
                        <div className="text-xs text-zinc-900 font-medium capitalize">
                          Half Day ({r.half_day_session})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-950">
                      {r.total_days} {r.total_days === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {r.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-medium"
                          title={r.rejection_reason || ''}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                      {r.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full text-xs font-medium">
                          <Ban className="w-3.5 h-3.5" /> Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(r.id)}
                            disabled={approveMutation.isPending}
                            className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejectingRequestId(r.id)}
                            className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelMutation.mutate(r.id)}
                            disabled={cancelMutation.isPending}
                            className="p-1.5 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Cancel Request"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {requestsData && requestsData.last_page > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-zinc-300">
            <span className="text-xs text-zinc-500">
              Showing page {requestsData.current_page} of {requestsData.last_page} ({requestsData.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 border border-zinc-300 rounded-lg disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= requestsData.last_page}
                onClick={() => setPage(page + 1)}
                className="p-2 border border-zinc-300 rounded-lg disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apply For Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950 flex items-center gap-2">
                <Send className="w-4 h-4 text-black" />
                Apply for Leave
              </h3>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              {applyMutation.isError && (
                <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl text-zinc-900 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{(applyMutation.error as any)?.response?.data?.message || 'Failed to submit leave request.'}</span>
                </div>
              )}

              {/* Leave Type Select */}
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Leave Category</label>
                <select
                  required
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:ring-2"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type === 'paid' ? 'Paid' : 'Unpaid'}) - {t.annual_entitlement} days/yr
                    </option>
                  ))}
                </select>

                {/* Available Balance Preview */}
                {selectedBalance && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 p-2 rounded-lg">
                    <span>Available Balance:</span>
                    <span className="font-semibold text-black">
                      {selectedBalance.available_days} days
                    </span>
                  </div>
                )}
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Half Day Option */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-300">
                <label className="text-sm font-medium text-zinc-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHalfDay}
                    onChange={(e) => setIsHalfDay(e.target.checked)}
                    className="rounded text-black focus:ring-indigo-500"
                  />
                  Half Day Application
                </label>
                {isHalfDay && (
                  <div className="flex gap-2">
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="session"
                        value="morning"
                        checked={halfDaySession === 'morning'}
                        onChange={() => setHalfDaySession('morning')}
                      />
                      Morning
                    </label>
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="session"
                        value="afternoon"
                        checked={halfDaySession === 'afternoon'}
                        onChange={() => setHalfDaySession('afternoon')}
                      />
                      Afternoon
                    </label>
                  </div>
                )}
              </div>

              {/* Working Days Calculated Live Alert */}
              {isCalculating ? (
                <div className="text-xs text-zinc-500 italic">Calculating working days (excluding weekends & holidays)...</div>
              ) : calculationError ? (
                <div className="text-xs text-zinc-900">{calculationError}</div>
              ) : calculatedDays !== null ? (
                <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl flex items-center justify-between text-sm">
                  <span className="text-indigo-900 font-medium">Net Working Days:</span>
                  <span className="font-bold text-black text-base">
                    {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              ) : null}

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for your manager / HR..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:ring-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending || (calculatedDays !== null && calculatedDays <= 0)}
                  className="px-5 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm disabled:opacity-50"
                >
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-zinc-950 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-zinc-900" />
              Reject Leave Application
            </h3>
            <p className="text-xs text-zinc-500">
              Please enter the reason for rejecting this leave request. The employee will be notified and reserved days restored.
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Rejection justification..."
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectingRequestId, reason: rejectionReason })}
                className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestsPage;
