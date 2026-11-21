import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { LeaveType, Holiday } from '../types/leave';
import { Branch } from '../../employee/types/employee';
import {
  Palmtree,
  Plus,
  Trash2,
  Calendar,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const LeaveSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'types' | 'holidays'>('types');

  // Leave Type Modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeColor, setTypeColor] = useState('#3B82F6');
  const [typeKind, setTypeKind] = useState<'paid' | 'unpaid'>('paid');
  const [annualEntitlement, setAnnualEntitlement] = useState('14');
  const [accrualFrequency, setAccrualFrequency] = useState<'monthly' | 'annual_lump_sum'>('monthly');
  const [genderRestriction, setGenderRestriction] = useState<'any' | 'male' | 'female'>('any');
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState('');

  // Holiday Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayFrom, setHolidayFrom] = useState('');
  const [holidayTo, setHolidayTo] = useState('');
  const [holidayBranchId, setHolidayBranchId] = useState<number | ''>('');

  // Queries
  const { data: leaveTypes = [], isLoading: typesLoading } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await api.get('/leave/types');
      return res.data.data;
    },
  });

  const { data: holidays = [], isLoading: holidaysLoading } = useQuery<Holiday[]>({
    queryKey: ['leave-holidays'],
    queryFn: async () => {
      const res = await api.get('/leave/holidays');
      return res.data.data;
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  // Mutations
  const saveTypeMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingType) {
        const res = await api.put(`/leave/types/${editingType.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/leave/types', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      setIsTypeModalOpen(false);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/leave/types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
  });

  const saveHolidayMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leave/holidays', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-holidays'] });
      setIsHolidayModalOpen(false);
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/leave/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-holidays'] });
    },
  });

  const openTypeModal = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setTypeName(type.name);
      setTypeCode(type.code);
      setTypeColor(type.color);
      setTypeKind(type.type);
      setAnnualEntitlement(String(type.annual_entitlement));
      setAccrualFrequency(type.accrual_frequency);
      setGenderRestriction(type.gender_restriction);
      setRequiresAttachment(type.requires_attachment);
      setRequiresApproval(type.requires_approval);
      setMaxConsecutiveDays(type.max_consecutive_days ? String(type.max_consecutive_days) : '');
    } else {
      setEditingType(null);
      setTypeName('');
      setTypeCode('');
      setTypeColor('#3B82F6');
      setTypeKind('paid');
      setAnnualEntitlement('14');
      setAccrualFrequency('monthly');
      setGenderRestriction('any');
      setRequiresAttachment(false);
      setRequiresApproval(true);
      setMaxConsecutiveDays('');
    }
    setIsTypeModalOpen(true);
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTypeMutation.mutate({
      name: typeName,
      code: typeCode,
      color: typeColor,
      type: typeKind,
      annual_entitlement: Number(annualEntitlement),
      accrual_frequency: accrualFrequency,
      gender_restriction: genderRestriction,
      requires_attachment: requiresAttachment,
      requires_approval: requiresApproval,
      max_consecutive_days: maxConsecutiveDays ? Number(maxConsecutiveDays) : null,
    });
  };

  const handleHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveHolidayMutation.mutate({
      name: holidayName,
      from_date: holidayFrom,
      to_date: holidayTo,
      branch_id: holidayBranchId ? Number(holidayBranchId) : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Palmtree className="w-6 h-6 text-black" />
            Leave Policies & Holiday Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure leave entitlements, accrual rules, gender criteria, and company-wide public holidays.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'types' ? (
            <button
              onClick={() => openTypeModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Leave Type
            </button>
          ) : (
            <button
              onClick={() => {
                setHolidayName('');
                setHolidayFrom('');
                setHolidayTo('');
                setHolidayBranchId('');
                setIsHolidayModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-zinc-300 pb-2">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'types'
              ? 'bg-black text-white hover:bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-700  hover:bg-zinc-100'
          }`}
        >
          Leave Types & Policies
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'holidays'
              ? 'bg-black text-white hover:bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-700  hover:bg-zinc-100'
          }`}
        >
          Public & Company Holidays
        </button>
      </div>

      {/* Leave Types Tab */}
      {activeTab === 'types' && (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
          {typesLoading ? (
            <div className="p-12 text-center text-zinc-500">Loading leave types...</div>
          ) : leaveTypes.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-base font-semibold">No leave types configured</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4">Name / Code</th>
                  <th className="px-6 py-4">Entitlement</th>
                  <th className="px-6 py-4">Accrual Frequency</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {leaveTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="font-semibold text-zinc-950">{t.name}</span>
                        <span className="text-xs text-zinc-500">({t.code})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{t.annual_entitlement} days / year</td>
                    <td className="px-6 py-4 capitalize">{t.accrual_frequency.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium uppercase bg-zinc-100">
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">{t.gender_restriction}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openTypeModal(t)}
                        className="text-xs font-medium text-black hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTypeMutation.mutate(t.id)}
                        className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
          {holidaysLoading ? (
            <div className="p-12 text-center text-zinc-500">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <Calendar className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-base font-semibold">No holidays scheduled</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4">Holiday Name</th>
                  <th className="px-6 py-4">Branch Scope</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-semibold text-zinc-950">{h.name}</td>
                    <td className="px-6 py-4">{h.branch?.name || 'All Branches (Company-wide)'}</td>
                    <td className="px-6 py-4">
                      {formatDate(h.from_date)} {h.from_date !== h.to_date && `→ ${formatDate(h.to_date)}`}
                    </td>
                    <td className="px-6 py-4 font-medium">{h.total_days} {h.total_days === 1 ? 'day' : 'days'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteHolidayMutation.mutate(h.id)}
                        className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Leave Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950">
                {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTypeSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    placeholder="e.g. Annual Leave"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AL"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Color</label>
                  <input
                    type="color"
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="w-full h-10 p-1 bg-zinc-50 border border-zinc-300 rounded-xl cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Paid / Unpaid</label>
                  <select
                    value={typeKind}
                    onChange={(e) => setTypeKind(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Annual Days</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={annualEntitlement}
                    onChange={(e) => setAnnualEntitlement(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Accrual Frequency</label>
                  <select
                    value={accrualFrequency}
                    onChange={(e) => setAccrualFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    <option value="monthly">Monthly Accrual</option>
                    <option value="annual_lump_sum">Annual Lump Sum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Gender Restriction</label>
                  <select
                    value={genderRestriction}
                    onChange={(e) => setGenderRestriction(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    <option value="any">Any Gender</option>
                    <option value="female">Female Only (e.g. Maternity)</option>
                    <option value="male">Male Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="text-xs font-medium flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresAttachment}
                    onChange={(e) => setRequiresAttachment(e.target.checked)}
                    className="rounded text-black"
                  />
                  Requires Attachment
                </label>
                <label className="text-xs font-medium flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="rounded text-black"
                  />
                  Requires Approval
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTypeMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {saveTypeMutation.isPending ? 'Saving...' : 'Save Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950">Add Public / Company Holiday</h3>
              <button onClick={() => setIsHolidayModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="space-y-3">
              {saveHolidayMutation.isError && (
                <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Failed to save holiday.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g. Independence Day"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Branch Scope</label>
                <select
                  value={holidayBranchId}
                  onChange={(e) => setHolidayBranchId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                >
                  <option value="">All Branches (Organization-wide)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={holidayFrom}
                    onChange={(e) => setHolidayFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={holidayTo}
                    min={holidayFrom}
                    onChange={(e) => setHolidayTo(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveHolidayMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {saveHolidayMutation.isPending ? 'Saving...' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveSettingsPage;
