import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LeaveBalance, LeaveType } from '../types/leave';
import { Employee } from '../../employee/types/employee';
import {
  Clock,
  Sliders,
  AlertCircle,
  Calendar,
  X,
} from 'lucide-react';

export const LeaveBalancesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Adjustment form states
  const [adjustEmpId, setAdjustEmpId] = useState<number | ''>('');
  const [adjustTypeId, setAdjustTypeId] = useState<number | ''>('');
  const [allocatedDays, setAllocatedDays] = useState<number | ''>('');
  const [carriedForward, setCarriedForward] = useState<number | ''>('');
  const [accruedDays, setAccruedDays] = useState<number | ''>('');

  // Queries
  const { data: balances = [], isLoading } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-all-balances', selectedYear],
    queryFn: async () => {
      const res = await api.get('/leave/balances', { params: { year: selectedYear } });
      return res.data.data;
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-list-simple'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { per_page: 100 } });
      return res.data.data;
    },
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await api.get('/leave/types');
      return res.data.data;
    },
  });

  // Adjust balance mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leave/balances/adjust', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-all-balances'] });
      setIsAdjustModalOpen(false);
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustEmpId || !adjustTypeId) return;

    adjustMutation.mutate({
      employee_id: Number(adjustEmpId),
      leave_type_id: Number(adjustTypeId),
      year: selectedYear,
      allocated_days: allocatedDays !== '' ? Number(allocatedDays) : undefined,
      carried_forward: carriedForward !== '' ? Number(carriedForward) : undefined,
      accrued_days: accruedDays !== '' ? Number(accruedDays) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Clock className="w-6 h-6 text-black" />
            Employee Leave Balances
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Overview of accrued, used, pending, and available leave entitlements per employee.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setAdjustEmpId('');
              setAdjustTypeId('');
              setAllocatedDays('');
              setCarriedForward('');
              setAccruedDays('');
              setIsAdjustModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-sm text-sm"
          >
            <Sliders className="w-4 h-4" />
            Adjust Balance
          </button>
        </div>
      </div>

      {/* Balances Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500">Loading balances...</div>
        ) : balances.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-base font-semibold">No leave balances found for {selectedYear}</p>
            <p className="text-sm">Run accruals or adjust balance using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Leave Type</th>
                  <th className="px-6 py-4 text-center">Allocated</th>
                  <th className="px-6 py-4 text-center">Accrued</th>
                  <th className="px-6 py-4 text-center">Used</th>
                  <th className="px-6 py-4 text-center">Pending</th>
                  <th className="px-6 py-4 text-center">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {balances.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-950">
                        {b.employee ? `${b.employee.first_name} ${b.employee.last_name}` : 'Unknown'}
                      </div>
                      <div className="text-xs text-zinc-500">{b.employee?.employee_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${b.leave_type?.color || '#3B82F6'}20`,
                          color: b.leave_type?.color || '#3B82F6',
                        }}
                      >
                        {b.leave_type?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{b.allocated_days}</td>
                    <td className="px-6 py-4 text-center text-black font-semibold">{b.accrued_days}</td>
                    <td className="px-6 py-4 text-center text-zinc-500">{b.used_days}</td>
                    <td className="px-6 py-4 text-center text-zinc-900">{b.pending_days}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full font-bold text-xs">
                        {b.available_days} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Balance Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-black" />
                Adjust Leave Balance
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              {adjustMutation.isError && (
                <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Failed to adjust balance.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Employee</label>
                <select
                  required
                  value={adjustEmpId}
                  onChange={(e) => setAdjustEmpId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Leave Type</label>
                <select
                  required
                  value={adjustTypeId}
                  onChange={(e) => setAdjustTypeId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Allocated</label>
                  <input
                    type="number"
                    step="0.5"
                    value={allocatedDays}
                    onChange={(e) => setAllocatedDays(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="14"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Carry Fwd</label>
                  <input
                    type="number"
                    step="0.5"
                    value={carriedForward}
                    onChange={(e) => setCarriedForward(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Accrued</label>
                  <input
                    type="number"
                    step="0.5"
                    value={accruedDays}
                    onChange={(e) => setAccruedDays(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="7"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalancesPage;
