import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ExpenseAnalyticsSummary } from '../types/expense';
import {
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
  FileText,
  BarChart2,
  Calendar,
} from 'lucide-react';

export const ExpenseAnalyticsPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: analytics, isLoading } = useQuery<ExpenseAnalyticsSummary>({
    queryKey: ['expense-analytics', selectedYear],
    queryFn: async () => {
      const res = await api.get(`/expenses/claims/analytics?year=${selectedYear}`);
      return res.data.data;
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-black" />
            Expense Analytics & Spend Insights
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time financial breakdown of claims, reimbursements, and category distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
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
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-zinc-500">Loading spend analytics...</div>
      ) : !analytics ? (
        <div className="p-12 text-center text-zinc-500">No analytics data available.</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                <span>Total Claims Submitted</span>
                <FileText className="w-4 h-4 text-zinc-950" />
              </div>
              <div className="text-2xl font-bold text-zinc-950 mt-2">
                Tk {Number(analytics.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {analytics.total_claims} claims across all statuses
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                <span>Pending Approval</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                Tk {Number(analytics.pending_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {analytics.pending_count} claims awaiting manager review
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                <span>Approved (Committed)</span>
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                Tk {Number(analytics.approved_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {analytics.approved_count} claims verified & approved
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
                <span>Reimbursed & Disbursed</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                Tk {Number(analytics.reimbursed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {analytics.reimbursed_count} payouts completed
              </div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-zinc-950" />
                Category Spend Distribution
              </h3>

              {analytics.category_breakdown.length === 0 ? (
                <p className="text-xs text-zinc-500">No category claims recorded this year.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.category_breakdown.map((cat) => {
                    const pct =
                      analytics.total_amount > 0
                        ? (cat.total_amount / analytics.total_amount) * 100
                        : 0;
                    return (
                      <div key={cat.category_id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-900">
                            {cat.name} ({cat.code})
                          </span>
                          <span className="font-semibold text-zinc-900 font-mono">
                            Tk {Number(cat.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-zinc-950 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-zinc-950" />
                Monthly Approved Spending
              </h3>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {analytics.monthly_breakdown.map((m) => (
                  <div
                    key={m.month}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs font-medium text-zinc-500">{m.month_name}</div>
                    <div className="text-sm font-bold text-zinc-950 mt-1">
                      Tk {Number(m.amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseAnalyticsPage;
