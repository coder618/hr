import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { MediaPicker } from '@/components/media/MediaPicker';
import { MediaItem } from '@/modules/media/types/media';
import {
  OfficeExpense,
  OfficeExpenseCategory,
  MonthlyOfficeExpenseSummary,
} from '../types/expense';
import {
  Building2,
  Plus,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  Edit2,
  Trash2,
  Check,
  X,
  Tag,
  AlertCircle,
  Paperclip,
  ShieldAlert,
  Layers,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MonthlyOfficeExpensesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, isSuperAdmin } = usePermission();
  const isAuthorized = isSuperAdmin || hasRole('admin') || hasRole('hr');

  // Active view tab: 'expenses' | 'categories'
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');

  // Filter States
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OfficeExpense | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OfficeExpenseCategory | null>(null);

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Form State - Expense
  const [expTitle, setExpTitle] = useState('');
  const [expCategoryId, setExpCategoryId] = useState<number | ''>('');
  const [expMonth, setExpMonth] = useState<number>(currentMonth);
  const [expYear, setExpYear] = useState<number>(currentYear);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState<string>('');
  const [expCurrency, setExpCurrency] = useState<string>('BDT');
  const [expStatus, setExpStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');
  const [expPaymentMethod, setExpPaymentMethod] = useState<string>('bank_transfer');
  const [expPaymentDate, setExpPaymentDate] = useState<string>('');
  const [expVendor, setExpVendor] = useState<string>('');
  const [expReferenceNo, setExpReferenceNo] = useState<string>('');
  const [expNotes, setExpNotes] = useState<string>('');
  const [expenseFormError, setExpenseFormError] = useState<string | null>(null);

  // Form State - Category
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState<boolean>(true);
  const [catFormError, setCatFormError] = useState<string | null>(null);

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<OfficeExpenseCategory[]>({
    queryKey: ['office-expense-categories'],
    queryFn: async () => {
      const res = await api.get('/expenses/office-categories');
      return res.data.data;
    },
    enabled: isAuthorized,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<OfficeExpense[]>({
    queryKey: ['office-expenses-list', selectedYear, selectedMonth, categoryFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const params: Record<string, any> = { year: selectedYear };
      if (selectedMonth !== 'all') params.month = selectedMonth;
      if (categoryFilter !== 'all') params.office_expense_category_id = categoryFilter;
      if (statusFilter !== 'all') params.payment_status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/expenses/office-expenses', { params });
      return res.data.data;
    },
    enabled: isAuthorized,
  });

  const { data: summary } = useQuery<MonthlyOfficeExpenseSummary>({
    queryKey: ['office-expenses-summary', selectedYear, selectedMonth],
    queryFn: async () => {
      const params: Record<string, any> = { year: selectedYear };
      if (selectedMonth !== 'all') params.month = selectedMonth;
      const res = await api.get('/expenses/office-expenses/summary', { params });
      return res.data.data;
    },
    enabled: isAuthorized,
  });

  // Mutations
  const expenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingExpense) {
        return await api.put(`/expenses/office-expenses/${editingExpense.id}`, payload);
      }
      return await api.post('/expenses/office-expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['office-expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['office-expense-categories'] });
      handleCloseExpenseModal();
    },
    onError: (err: any) => {
      setExpenseFormError(err.response?.data?.message || 'Failed to save office expense.');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/expenses/office-expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['office-expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['office-expense-categories'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete office expense.');
    },
  });

  const quickMarkPaidMutation = useMutation({
    mutationFn: async ({ id, method }: { id: number; method: string }) => {
      return await api.put(`/expenses/office-expenses/${id}`, {
        payment_status: 'paid',
        payment_method: method,
        payment_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['office-expenses-summary'] });
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCategory) {
        return await api.put(`/expenses/office-categories/${editingCategory.id}`, payload);
      }
      return await api.post('/expenses/office-categories', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expense-categories'] });
      handleCloseCategoryModal();
    },
    onError: (err: any) => {
      setCatFormError(err.response?.data?.message || 'Failed to save category.');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/expenses/office-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expense-categories'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete category.');
    },
  });

  // Modal Handlers
  const handleOpenExpenseModal = (expense?: OfficeExpense) => {
    setExpenseFormError(null);
    if (expense) {
      setEditingExpense(expense);
      setExpTitle(expense.title);
      setExpCategoryId(expense.office_expense_category_id);
      setExpMonth(expense.expense_month);
      setExpYear(expense.expense_year);
      setExpDate(expense.expense_date);
      setExpAmount(expense.amount.toString());
      setExpCurrency(expense.currency || 'BDT');
      setExpStatus(expense.payment_status);
      setExpPaymentMethod(expense.payment_method || 'bank_transfer');
      setExpPaymentDate(expense.payment_date || '');
      setExpVendor(expense.vendor_name || '');
      setExpReferenceNo(expense.reference_no || '');
      setExpNotes(expense.notes || '');
      if (expense.receipt_media) {
        setSelectedMedia(expense.receipt_media as any);
      } else {
        setSelectedMedia(null);
      }
    } else {
      setEditingExpense(null);
      setExpTitle('');
      setExpCategoryId(categories[0]?.id || '');
      setExpMonth(selectedMonth === 'all' ? currentMonth : selectedMonth);
      setExpYear(selectedYear);
      setExpDate(new Date().toISOString().split('T')[0]);
      setExpAmount('');
      setExpCurrency('BDT');
      setExpStatus('pending');
      setExpPaymentMethod('bank_transfer');
      setExpPaymentDate('');
      setExpVendor('');
      setExpReferenceNo('');
      setExpNotes('');
      setSelectedMedia(null);
    }
    setIsExpenseModalOpen(true);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
    setExpenseFormError(null);
    setSelectedMedia(null);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) {
      setExpenseFormError('Please enter an expense title.');
      return;
    }
    if (!expCategoryId) {
      setExpenseFormError('Please select a category.');
      return;
    }
    const parsedAmount = parseFloat(expAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setExpenseFormError('Please enter a valid amount.');
      return;
    }

    const payload: any = {
      title: expTitle.trim(),
      office_expense_category_id: expCategoryId,
      expense_month: Number(expMonth),
      expense_year: Number(expYear),
      expense_date: expDate,
      amount: parsedAmount,
      currency: expCurrency,
      payment_status: expStatus,
      payment_method: expPaymentMethod || null,
      payment_date: expStatus === 'paid' ? (expPaymentDate || expDate) : null,
      vendor_name: expVendor.trim() || null,
      reference_no: expReferenceNo.trim() || null,
      notes: expNotes.trim() || null,
      receipt_media_id: selectedMedia ? selectedMedia.id : null,
    };

    expenseMutation.mutate(payload);
  };

  const handleOpenCategoryModal = (cat?: OfficeExpenseCategory) => {
    setCatFormError(null);
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatCode(cat.code);
      setCatDesc(cat.description || '');
      setCatIsActive(cat.is_active);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatCode('');
      setCatDesc('');
      setCatIsActive(true);
    }
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCatFormError(null);
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatFormError('Category name is required.');
      return;
    }
    if (!catCode.trim()) {
      setCatFormError('Category code is required.');
      return;
    }

    categoryMutation.mutate({
      name: catName.trim(),
      code: catCode.trim().toUpperCase(),
      description: catDesc.trim() || null,
      is_active: catIsActive,
    });
  };

  const handleExportCsv = async () => {
    try {
      const params: Record<string, any> = { year: selectedYear };
      if (selectedMonth !== 'all') params.month = selectedMonth;
      if (categoryFilter !== 'all') params.office_expense_category_id = categoryFilter;
      if (statusFilter !== 'all') params.payment_status = statusFilter;

      const response = await api.get('/expenses/office-expenses/export', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `office_expenses_${selectedYear}_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to export CSV.');
    }
  };

  // If user is not Tenant Admin or HR, render access denied
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Restricted Access</h2>
          <p className="text-sm text-red-700 max-w-md mx-auto">
            Monthly Office Expense information is strictly confidential. Only Organization Administrators and HR Personnel are authorized to access and modify this module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-zinc-900 text-white rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Monthly Office Expenses</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-700 rounded border border-zinc-300">
              Admin & HR Only
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Track and manage recurring monthly company overheads such as office rent, electricity bills, utilities, internet, refreshments, and maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm"
            title="Download CSV report"
          >
            <Download className="w-4 h-4 text-zinc-500" />
            Export CSV
          </button>

          <button
            onClick={() => handleOpenExpenseModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Record Office Expense
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Monthly Expenses
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            Expense Categories
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {categories.length}
            </span>
          </button>
        </div>

        {activeTab === 'categories' && (
          <button
            onClick={() => handleOpenCategoryModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors mb-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New Category
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {selectedMonth === 'all' ? `Total Expenses (${selectedYear})` : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`}
            </span>
            <span className="p-2 bg-zinc-100 text-zinc-800 rounded-lg">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">
            Tk {summary ? summary.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
            <span>{summary?.total_count || 0} recorded bill(s)</span>
            <span className="font-medium text-zinc-700">
              Avg: Tk {summary && summary.total_count ? (summary.total_amount / summary.total_count).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Paid Amount</span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            Tk {summary ? summary.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {summary && summary.total_amount > 0
              ? `${((summary.paid_amount / summary.total_amount) * 100).toFixed(0)}% Settled`
              : '0% Settled'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pending Bills</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            Tk {summary ? summary.pending_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 text-xs text-amber-600 font-medium">
            Action required to avoid service disconnection
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Overdue Bills</span>
            <span className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700">
            Tk {summary ? summary.overdue_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-medium">
            Overdue penalty risk
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {summary && summary.category_breakdown && summary.category_breakdown.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Category Spending Distribution
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              {summary.category_breakdown.length} Active Categories
            </span>
          </div>

          {/* Distribution multi-segment progress bar */}
          <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
            {summary.category_breakdown.map((cat, idx) => {
              const colors = [
                'bg-zinc-800',
                'bg-indigo-600',
                'bg-emerald-600',
                'bg-amber-500',
                'bg-sky-500',
                'bg-purple-600',
                'bg-rose-500',
                'bg-teal-600',
              ];
              const color = colors[idx % colors.length];
              return (
                <div
                  key={cat.category_id}
                  style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  className={`${color} h-full transition-all`}
                  title={`${cat.category_name}: Tk ${cat.total_amount.toLocaleString()} (${cat.percentage}%)`}
                />
              );
            })}
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {summary.category_breakdown.map((cat, idx) => {
              const dotColors = [
                'bg-zinc-800',
                'bg-indigo-600',
                'bg-emerald-600',
                'bg-amber-500',
                'bg-sky-500',
                'bg-purple-600',
                'bg-rose-500',
                'bg-teal-600',
              ];
              const dot = dotColors[idx % dotColors.length];
              return (
                <div
                  key={cat.category_id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-zinc-50 border border-zinc-200 text-zinc-700"
                >
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="font-medium">{cat.category_name}:</span>
                  <span className="font-semibold text-zinc-900">Tk {cat.total_amount.toLocaleString()}</span>
                  <span className="text-zinc-400">({cat.percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: EXPENSES LIST VIEW */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
            {/* Year & Month Picker Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-50 border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month pills */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setSelectedMonth('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedMonth === 'all'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Full Year
                </button>
                {SHORT_MONTHS.map((mName, idx) => {
                  const mNum = idx + 1;
                  return (
                    <button
                      key={mNum}
                      onClick={() => setSelectedMonth(mNum)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                        selectedMonth === mNum
                          ? 'bg-zinc-900 text-white font-semibold'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search expense title, vendor, bill ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Expense Title & Category</th>
                    <th className="px-4 py-3">Month / Billing Date</th>
                    <th className="px-4 py-3">Vendor / Biller</th>
                    <th className="px-4 py-3">Bill / Ref #</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {isLoadingExpenses ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                        Loading office expenses...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Building2 className="w-8 h-8 text-zinc-300 mb-2" />
                          <p className="text-sm font-semibold text-zinc-900">No office expenses found</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            No expense records match the selected month or filters.
                          </p>
                          <button
                            onClick={() => handleOpenExpenseModal()}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-md hover:bg-zinc-800"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Record First Bill
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => {
                      const isPaid = expense.payment_status === 'paid';
                      const isOverdue = expense.payment_status === 'overdue';

                      return (
                        <tr key={expense.id} className="hover:bg-zinc-50/75 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-zinc-900">{expense.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-700 rounded border border-zinc-200">
                                {expense.category?.name || 'Uncategorized'}
                              </span>
                              {expense.notes && (
                                <span className="text-[11px] text-zinc-400 truncate max-w-xs" title={expense.notes}>
                                  {expense.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-zinc-600">
                            <div className="font-medium text-zinc-900">
                              {MONTH_NAMES[expense.expense_month - 1]} {expense.expense_year}
                            </div>
                            <div className="text-[11px] text-zinc-400">{expense.expense_date}</div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-800">{expense.vendor_name || '—'}</div>
                          </td>

                          <td className="px-4 py-3 text-zinc-600 font-mono text-[11px]">
                            {expense.reference_no || '—'}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="font-bold text-zinc-900 text-sm">
                              Tk {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-zinc-400 uppercase">{expense.currency === 'USD' ? 'BDT' : (expense.currency || 'BDT')}</div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3" />
                                Paid
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                            {expense.payment_method && (
                              <div className="text-[10px] text-zinc-400 capitalize mt-0.5">
                                {expense.payment_method.replace('_', ' ')}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {expense.receipt_media ? (
                              <button
                                onClick={() => setPreviewReceiptUrl(expense.receipt_media?.file_path || null)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 underline"
                                title="View Bill/Receipt"
                              >
                                <Paperclip className="w-3 h-3" />
                                View
                              </button>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {!isPaid && (
                                <button
                                  onClick={() =>
                                    quickMarkPaidMutation.mutate({
                                      id: expense.id,
                                      method: expense.payment_method || 'bank_transfer',
                                    })
                                  }
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                  title="Quick mark as Paid"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenExpenseModal(expense)}
                                className="p-1 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete office expense '${expense.title}'?`)) {
                                    deleteExpenseMutation.mutate(expense.id);
                                  }
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Office Expense Categories</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Categories are used to classify and analyze recurring overheads (e.g. Utility Bills, Office Rent, Electricity, Internet).
              </p>
            </div>
            <button
              onClick={() => handleOpenCategoryModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Linked Expenses</th>
                  <th className="px-4 py-3 text-right">Total Recorded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {isLoadingCategories ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      No categories defined yet. Click "Add Category" above.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-900">{cat.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                          {cat.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-sm truncate">
                        {cat.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cat.is_active ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-100 text-zinc-500 rounded-full border border-zinc-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-zinc-700">
                        {cat.expenses_count || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-900">
                        Tk {cat.expenses_sum_amount ? Number(cat.expenses_sum_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenCategoryModal(cat)}
                            className="p-1 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete category '${cat.name}'?`)) {
                                deleteCategoryMutation.mutate(cat.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT OFFICE EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-zinc-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-zinc-900" />
                <h3 className="text-lg font-bold text-zinc-900">
                  {editingExpense ? 'Edit Office Expense' : 'Record Monthly Office Expense'}
                </h3>
              </div>
              <button
                onClick={handleCloseExpenseModal}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {expenseFormError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{expenseFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Rent - November 2026, DESCO Electricity Bill, Fiber Internet"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenCategoryModal()}
                      className="text-[11px] text-zinc-600 hover:text-zinc-900 underline"
                    >
                      + Add New Category
                    </button>
                  </div>
                  <select
                    value={expCategoryId}
                    onChange={(e) => setExpCategoryId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="" disabled>
                      Select an office category
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Amount (Tk) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-semibold"
                  />
                </div>
              </div>

              {/* Billing Period (Month & Year) & Expense Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Expense Month *
                  </label>
                  <select
                    value={expMonth}
                    onChange={(e) => setExpMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Expense Year *
                  </label>
                  <select
                    value={expYear}
                    onChange={(e) => setExpYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Bill / Due Date *
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Vendor & Bill Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Vendor / Biller Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Skyline Tower Landlord, DESCO, WASA, ISP Ltd"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Bill / Voucher / Meter Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-9923, METER-88219"
                    value={expReferenceNo}
                    onChange={(e) => setExpReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                  />
                </div>
              </div>

              {/* Payment Status & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'pending' | 'paid' | 'overdue';
                      setExpStatus(newStatus);
                      if (newStatus === 'paid' && !expPaymentDate) {
                        setExpPaymentDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_banking">Mobile Banking (bKash/Nagad)</option>
                    <option value="card">Company Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Payment Date (if paid)
                  </label>
                  <input
                    type="date"
                    value={expPaymentDate}
                    onChange={(e) => setExpPaymentDate(e.target.value)}
                    disabled={expStatus !== 'paid'}
                    className={`w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 ${
                      expStatus !== 'paid' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Receipt / Bill File Attachment */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Bill / Voucher Attachment
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-zinc-300 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {selectedMedia ? 'Change File' : 'Attach Bill Copy / Receipt'}
                  </button>
                  {selectedMedia && (
                    <div className="flex items-center gap-2 text-xs text-zinc-700 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
                      <span className="font-medium truncate max-w-xs">{selectedMedia.file_name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMedia(null)}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Notes / Particulars
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks, meter reading notes, or approval references..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={handleCloseExpenseModal}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                >
                  {expenseMutation.isPending ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-zinc-900" />
                <h3 className="text-lg font-bold text-zinc-900">
                  {editingCategory ? 'Edit Office Category' : 'New Office Expense Category'}
                </h3>
              </div>
              <button
                onClick={handleCloseCategoryModal}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {catFormError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{catFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Rent, Electricity Bill, Water Utility"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Category Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. RENT, ELEC, UTILITY, INTERNET"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of expenses covered under this category..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catIsActive"
                  checked={catIsActive}
                  onChange={(e) => setCatIsActive(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <label htmlFor="catIsActive" className="text-xs font-medium text-zinc-700 cursor-pointer">
                  Category is Active for office expense recording
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={handleCloseCategoryModal}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categoryMutation.isPending}
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                >
                  {categoryMutation.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PICKER FOR BILL / RECEIPT ATTACHMENT */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(selected) => {
          if (Array.isArray(selected)) {
            setSelectedMedia(selected[0] || null);
          } else {
            setSelectedMedia(selected);
          }
          setIsMediaPickerOpen(false);
        }}
        title="Select Bill Receipt or Invoice File"
      />

      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <span className="text-sm font-semibold text-zinc-900">Receipt / Bill Document</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 text-zinc-500 hover:text-zinc-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center bg-zinc-50 p-4 rounded-xl max-h-[70vh] overflow-auto">
              <img
                src={previewReceiptUrl}
                alt="Bill Receipt"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="text-center text-xs text-zinc-500">
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800"
                >
                  <Download className="w-4 h-4" />
                  Open Document in New Tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyOfficeExpensesPage;
