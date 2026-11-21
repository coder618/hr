import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/dateUtils';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Search,
  Building2,
  Repeat,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import { Branch } from '@/modules/employee/types/employee';

interface Holiday {
  id: number;
  name: string;
  from_date: string;
  to_date: string;
  total_days: number;
  is_recurring: boolean;
  branch_id?: number | null;
  branch?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export const AttendanceHolidaysPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasRole, isSuperAdmin } = usePermission();

  const isTenantOwner = hasRole('admin') || isSuperAdmin;

  // Selected filters
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    from_date: '',
    to_date: '',
    branch_id: '',
    is_recurring: false,
  });

  // Fetch Branches for scoping
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  // Fetch Attendance Holidays
  const {
    data: holidays = [],
    isLoading,
    isError,
  } = useQuery<Holiday[]>({
    queryKey: ['attendance-holidays', selectedYear, selectedBranch],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedBranch) params.branch_id = selectedBranch;
      const res = await api.get('/attendance/holidays', { params });
      return res.data.data;
    },
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      from_date: string;
      to_date: string;
      branch_id?: number | null;
      is_recurring: boolean;
    }) => {
      if (editingHoliday) {
        return api.put(`/attendance/holidays/${editingHoliday.id}`, payload);
      }
      return api.post('/attendance/holidays', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard-stats'] });
      setIsModalOpen(false);
      setEditingHoliday(null);
      setFormError(null);
      setToastMessage(editingHoliday ? 'Holiday updated successfully!' : 'Organization holiday added successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'Failed to save holiday.';
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/attendance/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard-stats'] });
      setToastMessage('Holiday removed from organization attendance schedule.');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete holiday.');
    },
  });

  const openAddModal = () => {
    setEditingHoliday(null);
    setFormData({
      name: '',
      from_date: `${selectedYear}-01-01`,
      to_date: `${selectedYear}-01-01`,
      branch_id: '',
      is_recurring: false,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      from_date: holiday.from_date,
      to_date: holiday.to_date,
      branch_id: holiday.branch_id ? String(holiday.branch_id) : '',
      is_recurring: !!holiday.is_recurring,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter a holiday title.');
      return;
    }
    if (!formData.from_date || !formData.to_date) {
      setFormError('Please select both start and end dates.');
      return;
    }
    if (new Date(formData.to_date) < new Date(formData.from_date)) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    saveMutation.mutate({
      name: formData.name.trim(),
      from_date: formData.from_date,
      to_date: formData.to_date,
      branch_id: formData.branch_id ? Number(formData.branch_id) : null,
      is_recurring: formData.is_recurring,
    });
  };

  // Filtered List
  const filteredHolidays = holidays.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.branch?.name.toLowerCase().includes(q);
  });

  // KPI Calculations
  const totalDaysOff = holidays.reduce((acc, h) => acc + (h.total_days || 1), 0);
  const recurringCount = holidays.filter((h) => h.is_recurring).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingHolidays = holidays
    .filter((h) => h.to_date >= todayStr)
    .sort((a, b) => a.from_date.localeCompare(b.from_date));
  const nextHoliday = upcomingHolidays[0] || null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-950">Organization Holiday Management</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isTenantOwner ? 'Tenant Owner Controls' : 'Attendance Calendar'}
            </span>
          </div>
          <p className="text-sm text-zinc-600 max-w-2xl">
            Configure statutory, religious, and company-wide holidays. These days are automatically marked as paid
            off-days in employee shift schedules, biometric attendance punches, and payroll calculations.
          </p>
        </div>

        {isTenantOwner && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-all whitespace-nowrap self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Organization Holiday</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Configured Holidays</p>
            <h3 className="text-2xl font-bold text-zinc-950 mt-1">{holidays.length}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">In year {selectedYear}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Off-Days</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalDaysOff} Days</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Exempt from attendance punches</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Next Upcoming</p>
            <h3 className="text-lg font-bold text-zinc-950 mt-1 truncate max-w-[170px]">
              {nextHoliday ? nextHoliday.name : 'None'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {nextHoliday ? formatDate(nextHoliday.from_date) : 'No upcoming holidays'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Annual Recurring</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{recurringCount}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Repeats every year</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Repeat className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search holiday name or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-zinc-50/50"
            />
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedYear === yr
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Branch Filter */}
          <div className="min-w-[160px]">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-zinc-50/50"
            >
              <option value="">All Branches (Company-wide)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isTenantOwner && (
          <span className="text-xs text-zinc-500 self-center">
            Signed in as <strong>{user?.name || 'Owner'}</strong> (Tenant Owner Admin)
          </span>
        )}
      </div>

      {/* Holidays List Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm">Loading organization holidays...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Failed to load holidays. Please try again.</p>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-950 mb-1">No Organization Holidays Found</h3>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? 'No holidays match your search criteria. Try modifying your filters.'
                : `No organization holidays configured for ${selectedYear}. Add national or company holidays to automate attendance.`}
            </p>
            {isTenantOwner && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Holiday</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Holiday Name</th>
                  <th className="px-6 py-3.5">Date Range</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Branch Scope</th>
                  <th className="px-6 py-3.5">Recurrence</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isTenantOwner && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredHolidays.map((holiday) => {
                  const isCurrent = holiday.from_date <= todayStr && holiday.to_date >= todayStr;
                  const isUpcoming = holiday.from_date > todayStr;

                  return (
                    <tr key={holiday.id} className="hover:bg-zinc-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-950 block">{holiday.name}</span>
                            <span className="text-xs text-zinc-500">ID: #{holiday.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-600 font-medium">
                        {holiday.from_date === holiday.to_date ? (
                          formatDate(holiday.from_date)
                        ) : (
                          <span>
                            {formatDate(holiday.from_date)} <span className="text-zinc-400">to</span> {formatDate(holiday.to_date)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {holiday.total_days} {holiday.total_days === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {holiday.branch ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                            {holiday.branch.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            All Branches (Global)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {holiday.is_recurring ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700">
                            <Repeat className="w-3.5 h-3.5" />
                            Annual
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">One-time</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            Active Today
                          </span>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            Upcoming
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                            Past
                          </span>
                        )}
                      </td>
                      {isTenantOwner && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(holiday)}
                              className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Holiday"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete "${holiday.name}"? This will affect attendance records.`
                                  )
                                ) {
                                  deleteMutation.mutate(holiday.id);
                                }
                              }}
                              className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-950">
                    {editingHoliday ? 'Edit Organization Holiday' : 'Add Organization Holiday'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Manage tenant calendar and employee attendance off-days
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Holiday Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Holiday Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day, Christmas Day, Annual Founder's Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.from_date}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        from_date: newFrom,
                        to_date: prev.to_date && prev.to_date < newFrom ? newFrom : prev.to_date,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.to_date}
                    min={formData.from_date}
                    onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Branch Scope */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Applicable Branch Scope
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Branches (Organization-wide)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Leave as "All Branches" unless this holiday only applies to a specific regional office.
                </p>
              </div>

              {/* Recurring Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 block">
                      Annual Recurring Holiday
                    </span>
                    <span className="text-xs text-zinc-500">
                      Automatically schedules this holiday every year for attendance and leave calculation.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingHoliday ? 'Save Changes' : 'Create Holiday'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHolidaysPage;
