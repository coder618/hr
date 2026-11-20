import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { EmployeeSalary, SalaryStructure } from '../types/payroll';
import { Employee } from '../../employee/types/employee';
import {
  Users,
  Sliders,
  CreditCard,
  Building,
  X,
  FileText,
} from 'lucide-react';

export const EmployeeSalariesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [structureId, setStructureId] = useState<number | ''>('');
  const [baseSalary, setBaseSalary] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'cheque'>('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  // Queries
  const { data: salariesData, isLoading } = useQuery<{ data: EmployeeSalary[] }>({
    queryKey: ['employee-salaries'],
    queryFn: async () => {
      const res = await api.get('/payroll/employee-salaries');
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-list-payroll'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { per_page: 100 } });
      return res.data.data;
    },
  });

  const { data: structures = [] } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const res = await api.get('/payroll/structures');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/payroll/employee-salaries', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salaries'] });
      setIsModalOpen(false);
    },
  });

  const openAssignModal = (sal?: EmployeeSalary) => {
    if (sal) {
      setEmployeeId(sal.employee_id);
      setStructureId(sal.salary_structure_id || '');
      setBaseSalary(String(sal.base_salary));
      setPaymentMethod(sal.payment_method);
      setBankName(sal.bank_name || '');
      setAccountNumber(sal.bank_account_number || '');
      setRoutingNumber(sal.bank_routing_number || '');
    } else {
      setEmployeeId('');
      setStructureId('');
      setBaseSalary('');
      setPaymentMethod('bank_transfer');
      setBankName('');
      setAccountNumber('');
      setRoutingNumber('');
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !baseSalary) return;

    saveMutation.mutate({
      employee_id: Number(employeeId),
      salary_structure_id: structureId ? Number(structureId) : null,
      base_salary: Number(baseSalary),
      payment_method: paymentMethod,
      bank_name: bankName || null,
      bank_account_number: accountNumber || null,
      bank_routing_number: routingNumber || null,
    });
  };

  const salaries = salariesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-zinc-300/80">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Users className="w-6 h-6 text-black" />
            Employee Salary Assignments
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure employee compensation, salary structures, bank routing numbers, and payment preferences.
          </p>
        </div>

        <button
          onClick={() => openAssignModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-xs text-sm transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          Assign / Update Salary
        </button>
      </div>

      {/* Salaries Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-300/80 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500">Loading employee salaries...</div>
        ) : salaries.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-base font-semibold text-zinc-800">No salary profiles assigned</p>
            <p className="text-sm text-zinc-500 mt-1">Click the button above to assign an employee salary structure.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Assigned Structure</th>
                  <th className="px-6 py-4 text-right">Base Salary</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Bank Details</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {salaries.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-950">
                        {s.employee?.first_name} {s.employee?.last_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {s.employee?.employee_code} • {s.employee?.designation?.name || 'Staff'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 bg-zinc-100 text-black rounded-lg text-xs font-semibold border border-zinc-300">
                        {s.structure?.name || 'Default Basic'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-950">
                      Tk {s.base_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 capitalize font-medium">
                      <div className="flex items-center gap-1.5 text-zinc-800">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                        {s.payment_method.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {s.bank_name ? (
                        <div>
                          <div className="font-medium text-zinc-950">{s.bank_name}</div>
                          <div className="text-zinc-500 font-mono">Acc: {s.bank_account_number}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openAssignModal(s)}
                        className="text-xs font-semibold text-black hover:text-black transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Salary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-300 max-w-md w-full p-6 space-y-4 text-zinc-950 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-zinc-950 flex items-center gap-2">
                <Building className="w-5 h-5 text-black" />
                Assign Employee Salary
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Employee</label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Salary Structure</label>
                <select
                  value={structureId}
                  onChange={(e) => setStructureId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
                >
                  <option value="">Standard Basic Only</option>
                  {structures.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Base Monthly Salary (Tk)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-2.5 p-3.5 bg-zinc-50 rounded-xl border border-zinc-300">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Standard Chartered"
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Acc #"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-700 mb-1">Routing Number</label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="Routing #"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-black focus:ring-1 focus:ring-black transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Salary Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalariesPage;
