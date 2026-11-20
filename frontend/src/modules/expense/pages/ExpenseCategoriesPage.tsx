import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ExpenseCategory, DepartmentBudget, BudgetSummary } from '../types/expense';
import { Department } from '../../employee/types/employee';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  PieChart,
  Check,
  X,
  AlertCircle,
  Building,
} from 'lucide-react';

export const ExpenseCategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'budgets'>('categories');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catLimit, setCatLimit] = useState('');
  const [catRequiresReceipt, setCatRequiresReceipt] = useState(true);
  const [catIsActive, setCatIsActive] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // Budget Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetDeptId, setBudgetDeptId] = useState<number | ''>('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const res = await api.get('/expenses/categories');
      return res.data.data;
    },
  });

  const { data: budgets = [], isLoading: isLoadingBudgets } = useQuery<DepartmentBudget[]>({
    queryKey: ['department-budgets', selectedYear],
    queryFn: async () => {
      const res = await api.get(`/expenses/budgets?year=${selectedYear}`);
      return res.data.data;
    },
  });

  const { data: budgetSummary } = useQuery<BudgetSummary>({
    queryKey: ['department-budgets-summary', selectedYear],
    queryFn: async () => {
      const res = await api.get(`/expenses/budgets/summary?year=${selectedYear}`);
      return res.data.data;
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments-list-expense'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data;
    },
  });

  // Category Mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCategory) {
        return await api.put(`/expenses/categories/${editingCategory.id}`, payload);
      }
      return await api.post('/expenses/categories', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-select'] });
      closeCategoryModal();
    },
    onError: (err: any) => {
      setCatError(err.response?.data?.message || 'Failed to save expense category');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/expenses/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-select'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete category');
    },
  });

  // Budget Mutation
  const saveBudgetMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/expenses/budgets', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['department-budgets-summary'] });
      closeBudgetModal();
    },
    onError: (err: any) => {
      setBudgetError(err.response?.data?.message || 'Failed to save department budget');
    },
  });

  const openCategoryModal = (cat?: ExpenseCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatCode(cat.code);
      setCatDesc(cat.description || '');
      setCatLimit(cat.spending_limit ? String(cat.spending_limit) : '');
      setCatRequiresReceipt(cat.requires_receipt);
      setCatIsActive(cat.is_active);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatCode('');
      setCatDesc('');
      setCatLimit('');
      setCatRequiresReceipt(true);
      setCatIsActive(true);
    }
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCatError(null);
  };

  const openBudgetModal = (b?: DepartmentBudget) => {
    if (b) {
      setBudgetDeptId(b.department_id);
      setBudgetAmount(String(b.allocated_amount));
    } else {
      setBudgetDeptId('');
      setBudgetAmount('');
    }
    setBudgetError(null);
    setIsBudgetModalOpen(true);
  };

  const closeBudgetModal = () => {
    setIsBudgetModalOpen(false);
    setBudgetDeptId('');
    setBudgetAmount('');
    setBudgetError(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <PieChart className="w-7 h-7 text-black" />
            Categories & Department Budgets
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure expense policies, receipt rules, and annual department spend caps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'categories' ? (
            <button
              onClick={() => openCategoryModal()}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-lg text-sm font-medium transition shadow-lg shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Category
            </button>
          ) : (
            <button
              onClick={() => openBudgetModal()}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-600/30"
            >
              <Plus className="w-4 h-4" />
              Allocate Budget
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-300 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 flex items-center gap-2 transition ${
            activeTab === 'categories'
              ? 'text-black border-b-2 border-indigo-500 font-semibold'
              : 'text-zinc-500 hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          Expense Categories
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-3 flex items-center gap-2 transition ${
            activeTab === 'budgets'
              ? 'text-black border-b-2 border-indigo-500 font-semibold'
              : 'text-zinc-500 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          Department Budgets
        </button>
      </div>

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="bg-zinc-50 border border-zinc-300 rounded-xl overflow-hidden shadow-lg">
          {isLoadingCategories ? (
            <div className="p-12 text-center text-zinc-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <Tag className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
              <p className="text-base font-medium text-zinc-600">No categories found</p>
              <p className="text-xs text-zinc-500 mt-1">Create categories to allow employees to submit claims.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-600">
                <thead className="bg-white/60 text-xs uppercase text-zinc-500 border-b border-zinc-300">
                  <tr>
                    <th className="px-4 py-3.5">Code</th>
                    <th className="px-4 py-3.5">Name</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5">Spending Limit</th>
                    <th className="px-4 py-3.5">Receipt Required</th>
                    <th className="px-4 py-3.5">Claims Count</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-indigo-300">
                        {cat.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-950">{cat.name}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs max-w-sm truncate">
                        {cat.description || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        {cat.spending_limit ? `Tk ${Number(cat.spending_limit).toFixed(2)}` : 'No Limit'}
                      </td>
                      <td className="px-4 py-3">
                        {cat.requires_receipt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-900 font-medium">
                            <Check className="w-3.5 h-3.5" /> Required
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Optional</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{cat.claims_count || 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            cat.is_active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {cat.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => openCategoryModal(cat)}
                          className="p-1 text-zinc-500 hover:text-black transition"
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete category "${cat.name}"?`)) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                          className="p-1 text-zinc-500 hover:text-zinc-900 transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Budgets Tab Content */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Year Selector & Summary KPIs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Fiscal Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-zinc-300 text-zinc-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-medium"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    FY {y}
                  </option>
                ))}
              </select>
            </div>

            {budgetSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full sm:w-auto">
                <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-2.5 text-center">
                  <div className="text-xs text-zinc-500">Allocated</div>
                  <div className="text-sm font-bold text-zinc-950">
                    ${Number(budgetSummary.total_allocated).toLocaleString()}
                  </div>
                </div>
                <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-2.5 text-center">
                  <div className="text-xs text-zinc-500">Spent</div>
                  <div className="text-sm font-bold text-zinc-900">
                    ${Number(budgetSummary.total_spent).toLocaleString()}
                  </div>
                </div>
                <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-2.5 text-center">
                  <div className="text-xs text-zinc-500">Remaining</div>
                  <div className="text-sm font-bold text-zinc-900">
                    ${Number(budgetSummary.total_remaining).toLocaleString()}
                  </div>
                </div>
                <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-2.5 text-center">
                  <div className="text-xs text-zinc-500">Utilization</div>
                  <div className="text-sm font-bold text-black">
                    {budgetSummary.utilization_percent}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Department Budgets Table */}
          <div className="bg-zinc-50 border border-zinc-300 rounded-xl overflow-hidden shadow-lg">
            {isLoadingBudgets ? (
              <div className="p-12 text-center text-zinc-500">Loading budgets...</div>
            ) : budgets.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Building className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
                <p className="text-base font-medium text-zinc-600">No departmental budgets for FY {selectedYear}</p>
                <p className="text-xs text-zinc-500 mt-1">Allocate budget caps to departments to track expenditure.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-600">
                  <thead className="bg-white/60 text-xs uppercase text-zinc-500 border-b border-zinc-300">
                    <tr>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Allocated Budget</th>
                      <th className="px-4 py-3.5">Spent Amount</th>
                      <th className="px-4 py-3.5">Remaining Budget</th>
                      <th className="px-4 py-3.5">Utilization %</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {budgets.map((b) => {
                      const util = b.allocated_amount > 0 ? (b.spent_amount / b.allocated_amount) * 100 : 0;
                      return (
                        <tr key={b.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-zinc-950">{b.department?.name || 'Department'}</div>
                            <div className="text-xs text-zinc-500">{b.department?.code}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-950">
                            Tk {Number(b.allocated_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-900">
                            Tk {Number(b.spent_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-900">
                            Tk {Number(b.remaining_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 w-48">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    util > 90 ? 'bg-rose-500' : util > 70 ? 'bg-amber-500' : 'bg-zinc-950'
                                  }`}
                                  style={{ width: `${Math.min(util, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-zinc-600 font-medium w-10 text-right">
                                {util.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openBudgetModal(b)}
                              className="px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-50 rounded-lg transition border border-zinc-300 font-semibold shadow-xs"
                            >
                              Edit Budget
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-300 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-3">
              <h3 className="text-lg font-semibold text-zinc-950 flex items-center gap-2">
                <Tag className="w-5 h-5 text-black" />
                {editingCategory ? 'Edit Expense Category' : 'New Expense Category'}
              </h3>
              <button onClick={closeCategoryModal} className="text-zinc-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catError && (
              <div className="bg-black text-white hover:bg-zinc-800/10 border border-zinc-300 text-zinc-900 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCatError(null);
                saveCategoryMutation.mutate({
                  name: catName,
                  code: catCode,
                  description: catDesc,
                  spending_limit: catLimit ? parseFloat(catLimit) : null,
                  requires_receipt: catRequiresReceipt,
                  is_active: catIsActive,
                });
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Travel & Commute"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Code * (Unique Identifier)</label>
                <input
                  type="text"
                  required
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TRAVEL"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 font-mono text-xs focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Spending Limit (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={catLimit}
                  onChange={(e) => setCatLimit(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 font-mono text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Policy notes, what qualifies..."
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={catRequiresReceipt}
                    onChange={(e) => setCatRequiresReceipt(e.target.checked)}
                    className="rounded bg-white border-zinc-300 text-black focus:ring-0"
                  />
                  Requires Receipt Attachment
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={catIsActive}
                    onChange={(e) => setCatIsActive(e.target.checked)}
                    className="rounded bg-white border-zinc-300 text-black focus:ring-0"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-xs rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCategoryMutation.isPending}
                  className="px-4 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {saveCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-300 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-3">
              <h3 className="text-lg font-semibold text-zinc-950 flex items-center gap-2">
                <Building className="w-5 h-5 text-zinc-900" />
                Department Budget for FY {selectedYear}
              </h3>
              <button onClick={closeBudgetModal} className="text-zinc-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {budgetError && (
              <div className="bg-black text-white hover:bg-zinc-800/10 border border-zinc-300 text-zinc-900 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{budgetError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBudgetError(null);
                saveBudgetMutation.mutate({
                  department_id: budgetDeptId,
                  year: selectedYear,
                  allocated_amount: parseFloat(budgetAmount),
                });
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Department *</label>
                <select
                  required
                  value={budgetDeptId}
                  onChange={(e) => setBudgetDeptId(Number(e.target.value))}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Allocated Annual Amount (Tk) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="e.g. 25000.00"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 font-mono text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={closeBudgetModal}
                  className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-xs rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveBudgetMutation.isPending}
                  className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {saveBudgetMutation.isPending ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseCategoriesPage;
