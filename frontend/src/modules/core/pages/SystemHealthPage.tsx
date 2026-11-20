import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  HardDrive,
  Cpu,
  Clock,
  Server,
  Layers,
  Activity,
} from 'lucide-react';
import api from '@/lib/api';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data.data);
    } catch (err: any) {
      if (err.response?.data?.data) {
        setHealth(err.response.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const checks = health?.checks || {};
  const cronDetails = health?.cron_details || {};
  const queueDetails = health?.queue_details || {};
  const env = health?.environment || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-black" />
            System Health & Diagnostics
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            cPanel shared hosting environment status, cron heartbeats, and queue backlog.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Run Health Diagnostics</span>
        </button>
      </div>

      {/* Main Status Banner */}
      <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200">
            {health?.status === 'healthy' ? (
              <CheckCircle2 className="w-6 h-6 text-black" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-zinc-700" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-zinc-950 capitalize">
                Overall Status: {health?.status || (loading ? 'Checking...' : 'Degraded')}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-900 border border-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                {health?.status === 'healthy' ? 'OPTIMAL' : 'ATTENTION'}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              {health?.status === 'healthy'
                ? 'All core services (MySQL database, file storage, cache, and single-cron runner) are operational.'
                : 'One or more subsystem checks require administrative review.'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Subsystem Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-black" />
              Database Engine
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                checks.database
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                  : 'bg-black text-white border-black'
              }`}
            >
              {checks.database ? 'Operational' : 'Unavailable'}
            </span>
          </div>
          <div className="text-xs text-zinc-600">
            MySQL / MariaDB single connection pool with row-level tenant isolation.
          </div>
        </div>

        {/* Private Storage */}
        <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-black" />
              Private Storage
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                checks.storage
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                  : 'bg-black text-white border-black'
              }`}
            >
              {checks.storage ? 'Writable' : 'Error'}
            </span>
          </div>
          <div className="text-xs text-zinc-600">
            Authenticated private disk with zero symlink dependency (cPanel safe).
          </div>
        </div>

        {/* Cron Heartbeat */}
        <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-black" />
              Cron Runner Heartbeat
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                checks.cron
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                  : 'bg-zinc-200 text-zinc-900 border-zinc-300'
              }`}
            >
              {checks.cron ? 'Active' : 'Awaiting Heartbeat'}
            </span>
          </div>
          <div className="text-xs text-zinc-600">
            {cronDetails.last_heartbeat_at
              ? `Last pulse ${cronDetails.age_minutes}m ago (* * * * * artisan schedule:run)`
              : 'Add "* * * * * artisan schedule:run" in cPanel cron jobs.'}
          </div>
        </div>

        {/* Database Queue */}
        <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-black" />
              Background Queue
            </span>
            <span className="bg-zinc-100 text-zinc-900 border border-zinc-300 px-2 py-0.5 rounded text-xs font-mono font-medium">
              Database Driver
            </span>
          </div>
          <div className="text-xs text-zinc-600">
            Pending jobs: <span className="font-bold text-zinc-950 font-mono">{queueDetails.pending_jobs || 0}</span> | Failed: <span className="font-bold text-zinc-950 font-mono">{queueDetails.failed_jobs || 0}</span>
          </div>
        </div>

        {/* Shared Hosting Memory */}
        <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-black" />
              PHP Memory & Limits
            </span>
            <span className="bg-zinc-100 text-zinc-900 border border-zinc-300 px-2 py-0.5 rounded text-xs font-medium font-mono">
              {env.memory_limit || '128M'}
            </span>
          </div>
          <div className="text-xs text-zinc-600">
            Execution time limit: <span className="font-mono font-semibold text-zinc-950">{env.max_execution_time || '60s'}</span>
          </div>
        </div>

        {/* Server Runtime */}
        <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-black" />
              Runtime Environment
            </span>
            <span className="bg-zinc-100 text-zinc-900 border border-zinc-300 px-2 py-0.5 rounded text-xs font-medium font-mono">
              PHP {env.php_version || '8.2+'}
            </span>
          </div>
          <div className="text-xs text-zinc-600 font-mono">
            Laravel {env.laravel_version || '11.x'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPage;
