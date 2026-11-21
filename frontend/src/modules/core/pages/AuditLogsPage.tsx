import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Calendar,
  X,
  Eye,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/dateUtils';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (eventFilter) params.event = eventFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventFilter, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCsv = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (eventFilter) params.event = eventFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/audit-logs/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to export audit logs.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-black" />
            Security & Audit Trail
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Immutable log of administrative operations, security events, and compliance changes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 shadow-xs hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition"
          >
            <Download className="w-4 h-4 text-zinc-900" />
            Export CSV
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 shadow-xs hover:bg-slate-700 text-zinc-600 rounded-lg transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-300 text-sm">
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, email..."
            className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-xs"
          />
        </form>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
        >
          <option value="">All Categories</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="employee">Employee</option>
          <option value="user">User</option>
          <option value="security">Security</option>
          <option value="tenant_settings">Settings</option>
        </select>

        <div className="relative">
          <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-800 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            title="Start Date"
          />
        </div>

        <div className="relative">
          <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-zinc-800 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            title="End Date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-50 border border-zinc-300 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-white/60 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action / Event</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-500 text-xs">
                    Loading security audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-500 text-xs">
                    No security events recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-zinc-950">{log.causer?.name || 'System / Automated'}</div>
                      <div className="text-xs text-zinc-500">{log.causer?.email || 'CLI / Cron'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200 font-mono capitalize">
                        {log.log_name || log.event || 'activity'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-800 max-w-md truncate">
                      {log.description}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 rounded border border-zinc-300 shadow-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-300 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-3">
              <h3 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-black" />
                Audit Event #{selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-500 hover:text-zinc-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500">Timestamp:</span>
                <span className="text-zinc-950 font-mono">{formatDateTime(selectedLog.created_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500">Actor:</span>
                <span className="text-zinc-950 font-medium">{selectedLog.causer?.name || 'System'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500">Action:</span>
                <span className="text-zinc-900 font-mono">{selectedLog.description}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-zinc-600 mb-1">Payload Properties:</div>
              <pre className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-zinc-900 font-mono text-xs overflow-x-auto max-h-56">
                {JSON.stringify(selectedLog.properties || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-black text-white hover:bg-zinc-800 rounded text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
