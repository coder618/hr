import React, { useEffect, useState } from 'react';
import { Building, Users, Server, HardDrive, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export const PlatformDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/platform/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Platform Governance</h2>
          <p className="text-xs text-zinc-500 mt-1">High-level multi-tenant overview and system metrics</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Total Tenants</span>
            <div className="p-2.5 bg-zinc-100 text-zinc-950 rounded-lg border border-zinc-200">
              <Building className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-zinc-950 font-mono">{stats?.total_organizations ?? '—'}</div>
          <p className="text-xs text-zinc-500 mt-2">Active: {stats?.active_organizations ?? 0}</p>
        </div>

        <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Total Users</span>
            <div className="p-2.5 bg-zinc-100 text-zinc-950 rounded-lg border border-zinc-200">
              <Users className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-zinc-950 font-mono">{stats?.total_users ?? '—'}</div>
          <p className="text-xs text-zinc-500 mt-2">Across all organizations</p>
        </div>

        <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">cPanel Cron Heartbeat</span>
            <div className="p-2.5 bg-zinc-100 text-zinc-950 rounded-lg border border-zinc-200">
              <Server className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats?.cron_healthy ? (
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-zinc-950">
                <CheckCircle2 className="w-4 h-4 text-black" /> Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-zinc-950">
                <AlertTriangle className="w-4 h-4 text-zinc-700" /> Cron Delayed
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-2 truncate">
            Last beat: {stats?.last_heartbeat ? new Date(stats.last_heartbeat).toLocaleTimeString() : 'None recorded'}
          </p>
        </div>

        <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Hosting Engine</span>
            <div className="p-2.5 bg-zinc-100 text-zinc-950 rounded-lg border border-zinc-200">
              <HardDrive className="w-5 h-5 text-black" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-950 font-mono">PHP {stats?.php_version ?? '8.2+'}</div>
          <p className="text-xs text-zinc-500 mt-2">Shared cPanel Compatible</p>
        </div>
      </div>
    </div>
  );
};
export default PlatformDashboardPage;
