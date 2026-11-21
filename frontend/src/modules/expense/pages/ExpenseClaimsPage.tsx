import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { ExpenseClaim, ExpenseCategory } from '../types/expense';
import { Employee } from '../../employee/types/employee';
import { Project } from '../../project/types/project';
import {
  Receipt,
  Plus,
  Search,
  Download,
  CheckCircle,
  XCircle,
  DollarSign,
  AlertCircle,
  X,
  Calendar,
  CreditCard,
  Building,
} from 'lucide-react';

export const ExpenseClaimsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isReimburseModalOpen, setIsReimburseModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  // Submit Claim Form state
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'company_card' | 'personal_card'>('personal_card');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reject / Reimburse Form state
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Fetch Claims
  const { data: claimsData, isLoading } = useQuery<{ data: { data: ExpenseClaim[] } }>({
    queryKey: ['expense-claims', search, statusFilter, categoryFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.expense_category_id = categoryFilter;
      const res = await api.get('/expenses/claims', { params });
      return res.data;
    },
  });

  // Fetch Categories for dropdown
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories-select'],
    queryFn: async () => {
      const res = await api.get('/expenses/categories?is_active=1');
      return res.data.data;
    },
  });

  // Fetch Employees for dropdown
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-list-expense'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data.data;
    },
  });

  // Fetch Projects for dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects-list-expense'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data.data;
    },
  });

  // Submit Claim Mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/expenses/claims', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      queryClient.invalidateQueries({ queryKey: ['expense-analytics'] });
      setIsSubmitModalOpen(false);
      resetSubmitForm();
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit claim');
    },
  });

  // Approve Claim Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.post(`/expenses/claims/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      queryClient.invalidateQueries({ queryKey: ['expense-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['department-budgets'] });
    },
  });

  // Reject Claim Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return await api.post(`/expenses/claims/${id}/reject`, { rejection_reason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      queryClient.invalidateQueries({ queryKey: ['expense-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['department-budgets'] });
      setIsRejectModalOpen(false);
      setSelectedClaim(null);
      setRejectionReason('');
    },
  });

  // Reimburse Claim Mutation
  const reimburseMutation = useMutation({
    mutationFn: async ({ id, ref }: { id: number; ref: string }) => {
      return await api.post(`/expenses/claims/${id}/reimburse`, { payment_reference: ref });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      queryClient.invalidateQueries({ queryKey: ['expense-analytics'] });
      setIsReimburseModalOpen(false);
      setSelectedClaim(null);
      setPaymentReference('');
    },
  });

  const resetSubmitForm = () => {
    setEmployeeId('');
    setCategoryId('');
    setProjectId('');
    setClaimDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setCurrency('BDT');
    setMerchant('');
    setPaymentMethod('personal_card');
    setDescription('');
    setSubmitError(null);
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/expenses/claims/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expense_claims_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to export expense claims CSV.');
    }
  };

  const claimsList = claimsData?.data?.data || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-zinc-950" />
            Expense Claims & Reimbursements
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Submit, approve, track receipts, and manage business expense reimbursements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 shadow-xs rounded-lg text-sm font-semibold transition"
          >
            <Download className="w-4 h-4 text-zinc-700" />
            Export CSV
          </button>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-sm font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Submit Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claim #, merchant, note..."
            className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="reimbursed">Reimbursed</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-medium"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">Loading expense claims...</div>
        ) : claimsList.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Receipt className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-semibold text-zinc-900">No expense claims found</p>
            <p className="text-xs text-zinc-500 mt-1">Submit your first expense claim using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3.5">Claim #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Merchant & Note</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {claimsList.map((claim) => (
                  <tr key={claim.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-zinc-950 text-xs">
                      {claim.claim_number}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 font-mono text-xs whitespace-nowrap">
                      {formatDate(claim.claim_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-950 text-xs">
                        {claim.employee ? `${claim.employee.first_name} ${claim.employee.last_name}` : 'Unknown'}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">{claim.employee?.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {claim.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {claim.merchant && (
                        <div className="text-xs font-bold text-zinc-950">{claim.merchant}</div>
                      )}
                      <div className="text-xs text-zinc-500 truncate" title={claim.description}>
                        {claim.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-zinc-950">
                      Tk {Number(claim.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 capitalize text-xs text-zinc-600 font-medium whitespace-nowrap">
                      {claim.payment_method.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          claim.status === 'approved'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : claim.status === 'reimbursed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : claim.status === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                      {claim.status === 'pending' && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => approveMutation.mutate(claim.id)}
                            disabled={approveMutation.isPending}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Approve Claim"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setIsRejectModalOpen(true);
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Reject Claim"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {claim.status === 'approved' && (
                        <button
                          onClick={() => {
                            setSelectedClaim(claim);
                            setIsReimburseModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg shadow-xs transition"
                        >
                          Reimburse
                        </button>
                      )}
                      {claim.status === 'reimbursed' && claim.payment_reference && (
                        <span className="text-[11px] text-zinc-500 font-mono" title="Payment Reference">
                          Ref: {claim.payment_reference}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Claim Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-zinc-950" />
                Submit New Expense Claim
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitError(null);
                submitClaimMutation.mutate({
                  employee_id: employeeId,
                  expense_category_id: categoryId,
                  project_id: projectId || null,
                  claim_date: claimDate,
                  amount: parseFloat(amount),
                  currency,
                  merchant: merchant || null,
                  payment_method: paymentMethod,
                  description,
                });
              }}
              className="space-y-4 text-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Employee *</label>
                  <select
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
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
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Expense Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Claim Date *</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      required
                      value={claimDate}
                      onChange={(e) => setClaimDate(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-900 text-xs focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Amount *</label>
                  <div className="relative">
                    <span className="text-xs font-bold text-zinc-500 absolute left-3 top-2.5">Tk</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-900 text-xs font-mono focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-xs font-mono focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Merchant / Vendor</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Uber, Delta, AWS, Staples"
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Payment Method *</label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    >
                      <option value="personal_card">Personal Card (Reimbursable)</option>
                      <option value="company_card">Company Card</option>
                      <option value="cash">Cash Out of Pocket</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Associated Project (Optional)</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="">No Project (General Overhead)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description / Business Purpose *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the business purpose of this expenditure..."
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitClaimMutation.isPending}
                  className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {submitClaimMutation.isPending ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Reject Expense Claim {selectedClaim.claim_number}
            </h3>
            <p className="text-xs text-zinc-500">
              Provide a clear reason for rejecting this claim for{' '}
              <span className="text-zinc-950 font-semibold">
                {selectedClaim.employee?.first_name} {selectedClaim.employee?.last_name}
              </span>
              .
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing valid tax invoice or unapproved expense..."
              className="w-full bg-white border border-zinc-300 rounded-lg p-3 text-zinc-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({ id: selectedClaim.id, reason: rejectionReason })
                }
                className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reimburse Modal */}
      {isReimburseModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Reimburse Expense Claim {selectedClaim.claim_number}
            </h3>
            <p className="text-xs text-zinc-500">
              Confirm payment of{' '}
              <span className="text-zinc-950 font-bold font-mono">
                Tk {Number(selectedClaim.amount).toFixed(2)}
              </span>{' '}
              to{' '}
              <span className="text-zinc-950 font-semibold">
                {selectedClaim.employee?.first_name} {selectedClaim.employee?.last_name}
              </span>
              .
            </p>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Payment Reference / Bank Transfer ID
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. WIRE-884920 or CHQ-1002"
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-xs font-mono focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsReimburseModalOpen(false)}
                className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reimburseMutation.isPending}
                onClick={() =>
                  reimburseMutation.mutate({ id: selectedClaim.id, ref: paymentReference })
                }
                className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
              >
                {reimburseMutation.isPending ? 'Processing...' : 'Mark Reimbursed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseClaimsPage;
