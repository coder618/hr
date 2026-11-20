import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PayrollRun } from '../types/payroll';
import { Branch } from '../../employee/types/employee';
import {
  DollarSign,
  Plus,
  RefreshCw,
  CheckCircle,
  Download,
  CreditCard,
  Eye,
  X,
  FileText,
  AlertCircle,
  Users,
} from 'lucide-react';

export const PayrollRunsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [newRunYear, setNewRunYear] = useState(currentYear);
  const [newRunMonth, setNewRunMonth] = useState(currentMonth);
  const [newRunBranchId, setNewRunBranchId] = useState<number | ''>('');

  // Queries
  const { data: runsData, isLoading } = useQuery<{ data: PayrollRun[] }>({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const res = await api.get('/payroll/runs');
      return res.data;
    },
  });

  const { data: selectedRunDetail, isLoading: detailLoading } = useQuery<{ data: PayrollRun }>({
    queryKey: ['payroll-run-detail', selectedRunId],
    queryFn: async () => {
      const res = await api.get(`/payroll/runs/${selectedRunId}`);
      return res.data;
    },
    enabled: !!selectedRunId,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  // Mutations
  const createRunMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/payroll/runs', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      setIsNewRunModalOpen(false);
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/runs/${id}/calculate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      if (selectedRunId) {
        queryClient.invalidateQueries({ queryKey: ['payroll-run-detail', selectedRunId] });
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/runs/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      if (selectedRunId) {
        queryClient.invalidateQueries({ queryKey: ['payroll-run-detail', selectedRunId] });
      }
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/runs/${id}/mark-paid`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      if (selectedRunId) {
        queryClient.invalidateQueries({ queryKey: ['payroll-run-detail', selectedRunId] });
      }
    },
  });

  const handleDownloadPdf = async (payslipId: number, payslipNumber: string) => {
    try {
      const res = await api.get(`/payroll/payslips/${payslipId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${payslipNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert('Failed to download payslip PDF');
    }
  };

  const handleExportBankCsv = async (runId: number, batchNumber: string) => {
    try {
      const res = await api.get(`/payroll/runs/${runId}/export-bank-csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bank_Disbursement_${batchNumber}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert('Failed to export bank CSV');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRunMutation.mutate({
      year: Number(newRunYear),
      month: Number(newRunMonth),
      branch_id: newRunBranchId ? Number(newRunBranchId) : null,
    });
  };

  const runs = runsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-black" />
            Payroll Runs & Disbursements
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Generate monthly salary batches, preview chunked gross-to-net calculations, and export bank transfers.
          </p>
        </div>

        <button
          onClick={() => setIsNewRunModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          New Payroll Batch
        </button>
      </div>

      {/* Runs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500">Loading payroll runs...</div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <DollarSign className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-base font-semibold">No payroll batches generated yet</p>
            <p className="text-sm">Click the button above to generate this month's payroll run.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4">Batch Number</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-6 py-4 text-center">Employees</th>
                  <th className="px-6 py-4 text-right">Gross Pay</th>
                  <th className="px-6 py-4 text-right">Deductions</th>
                  <th className="px-6 py-4 text-right">Net Payable</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-bold text-zinc-950">{r.batch_number}</td>
                    <td className="px-6 py-4 font-medium">
                      {new Date(r.year, r.month - 1).toLocaleString('default', { month: 'short' })} {r.year}
                    </td>
                    <td className="px-6 py-4">{r.branch?.name || 'All Branches'}</td>
                    <td className="px-6 py-4 text-center font-semibold">{r.total_employees}</td>
                    <td className="px-6 py-4 text-right">{r.total_gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-zinc-900">
                      -{r.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-black">
                      {r.total_net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === 'draft' && (
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-semibold capitalize">
                          Draft
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-semibold capitalize">
                          Approved
                        </span>
                      )}
                      {r.status === 'paid' && (
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-semibold capitalize">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* View Run Payslips */}
                      <button
                        onClick={() => setSelectedRunId(r.id)}
                        className="p-1.5 text-black hover:bg-zinc-100 rounded-lg"
                        title="View Payslips"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Recalculate */}
                      {r.status === 'draft' && (
                        <button
                          onClick={() => recalculateMutation.mutate(r.id)}
                          disabled={recalculateMutation.isPending}
                          className="p-1.5 text-zinc-500 hover:bg-zinc-100 rounded-lg"
                          title="Recalculate Run"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Approve */}
                      {r.status === 'draft' && (
                        <button
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded-lg"
                          title="Approve Run"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Mark as Paid */}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => markPaidMutation.mutate(r.id)}
                          disabled={markPaidMutation.isPending}
                          className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded-lg"
                          title="Mark Paid"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}

                      {/* Export Bank Transfer CSV */}
                      <button
                        onClick={() => handleExportBankCsv(r.id, r.batch_number)}
                        className="p-1.5 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                        title="Export Bank Transfer CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslips Details Slide-over / Modal */}
      {selectedRunId && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-300">
              <div>
                <h3 className="font-bold text-lg text-zinc-950 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-black" />
                  Payroll Run: {selectedRunDetail?.data?.batch_number}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedRunDetail?.data?.total_employees} Payslips • Total Net: Tk{' '}
                  {selectedRunDetail?.data?.total_net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button onClick={() => setSelectedRunId(null)} className="text-zinc-500 hover:text-zinc-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="text-center p-8 text-zinc-500">Loading payslip records...</div>
              ) : (
                <table className="w-full text-left text-sm text-zinc-700">
                  <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Days (Work/Pres)</th>
                      <th className="px-4 py-3 text-right">Basic</th>
                      <th className="px-4 py-3 text-right">Gross</th>
                      <th className="px-4 py-3 text-right">Deductions</th>
                      <th className="px-4 py-3 text-right">Net Pay</th>
                      <th className="px-4 py-3 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {selectedRunDetail?.data?.payslips?.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-950">
                            {p.employee?.first_name} {p.employee?.last_name}
                          </div>
                          <div className="text-xs text-zinc-500">{p.employee?.employee_code}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {p.working_days} / {p.present_days}
                        </td>
                        <td className="px-4 py-3 text-right">{p.base_salary.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium">{p.gross_pay.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-zinc-900">-{p.total_deductions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-black">
                          {p.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDownloadPdf(p.id, p.payslip_number)}
                            className="inline-flex items-center gap-1 text-xs text-black hover:underline font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Payroll Batch Modal */}
      {isNewRunModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-black" />
                Generate Monthly Payroll Run
              </h3>
              <button onClick={() => setIsNewRunModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              {createRunMutation.isError && (
                <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Failed to create payroll run.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Year</label>
                  <select
                    value={newRunYear}
                    onChange={(e) => setNewRunYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Month</label>
                  <select
                    value={newRunMonth}
                    onChange={(e) => setNewRunMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Branch Scope</label>
                <select
                  value={newRunBranchId}
                  onChange={(e) => setNewRunBranchId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                >
                  <option value="">All Branches (Full Company)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewRunModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRunMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {createRunMutation.isPending ? 'Generating & Calculating...' : 'Generate Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollRunsPage;
