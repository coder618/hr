import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Payslip } from '../types/payroll';
import {
  Receipt,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';

export const MyPayslipsPage: React.FC = () => {
  const { data: payslips = [], isLoading } = useQuery<Payslip[]>({
    queryKey: ['my-payslips'],
    queryFn: async () => {
      const res = await api.get('/payroll/payslips/my');
      return res.data.data;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-black" />
            My Salary Payslips
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Access and download your official monthly payslips and compensation breakdowns.
          </p>
        </div>
      </div>

      {/* Payslips Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500">Loading your payslips...</div>
      ) : payslips.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-300">
          <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-base font-semibold text-zinc-800">No payslips issued yet</p>
          <p className="text-sm text-zinc-500">Your monthly salary payslips will appear here once processed by HR.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payslips.map((slip) => (
            <div
              key={slip.id}
              className="bg-white rounded-2xl shadow-sm border border-zinc-300 p-6 space-y-4 hover:border-zinc-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-black flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(slip.year, slip.month - 1).toLocaleString('default', { month: 'long' })} {slip.year}
                  </div>
                  <h3 className="font-bold text-base text-zinc-950 mt-0.5">
                    {slip.payslip_number}
                  </h3>
                </div>

                {slip.payment_status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-semibold">
                    <CheckCircle className="w-3 h-3" /> Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-semibold">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 rounded-xl text-xs">
                <div>
                  <span className="text-zinc-500">Gross Earnings:</span>
                  <div className="font-semibold text-zinc-800">
                    Tk {slip.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Deductions:</span>
                  <div className="font-semibold text-zinc-900">
                    -Tk {slip.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Net Pay Amount */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Net Salary</span>
                  <div className="text-xl font-bold text-black">
                    Tk {slip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadPdf(slip.id, slip.payslip_number)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPayslipsPage;
