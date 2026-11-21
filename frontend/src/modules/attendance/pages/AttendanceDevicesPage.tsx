import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/dateUtils';
import { AttendanceDevice } from '../types/attendance';
import { Branch } from '../../employee/types/employee';
import {
  Cpu,
  Plus,
  Trash2,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';

export const AttendanceDevicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Queries
  const { data: devices = [], isLoading } = useQuery<AttendanceDevice[]>({
    queryKey: ['attendance-devices'],
    queryFn: async () => {
      const res = await api.get('/attendance/devices');
      return res.data.data;
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  // Register Device Mutation
  const registerMutation = useMutation({
    mutationFn: async (payload: Partial<AttendanceDevice>) => {
      return api.post('/attendance/devices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-devices'] });
      setIsRegisterModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to register device.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/attendance/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-devices'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete device.');
    },
  });

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Biometric Hardware Devices
          </h1>
          <p className="text-sm text-zinc-500">
            Connect on-premise biometric fingerprint and facial recognition readers (ZKTeco, ADMS, Push API).
          </p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black"
        >
          <Plus className="h-4 w-4" /> Register Device
        </button>
      </div>

      {/* Integration Guide Box */}
      <div className="rounded-xl border border-zinc-300 bg-zinc-100/40 p-4 text-xs text-indigo-950">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-black shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-indigo-900">
              Biometric Push Protocol Setup
            </p>
            <p className="text-indigo-800/80">
              Configure your biometric device's Cloud Server / ADMS / Push settings with your server URL:
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="rounded bg-white px-2 py-1 shadow-sm">
                POST {window.location.origin}/api/v1/devices/attendance/push
              </span>
              <span className="text-zinc-500">|</span>
              <span>Header: X-Device-Key: [Your Device API Key]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
          Loading devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Cpu className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900">
            No biometric devices connected
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Register your office fingerprint or face scanner to automatically ingest daily punches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => {
            const hasRecentHeartbeat = device.last_heartbeat_at
              ? new Date().getTime() - new Date(device.last_heartbeat_at).getTime() < 3600000 // 1 hour
              : false;

            return (
              <div
                key={device.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-300 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-950">{device.name}</h3>
                      <span className="font-mono text-xs text-zinc-500">SN: {device.serial_number}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          hasRecentHeartbeat
                            ? 'bg-zinc-100 text-zinc-900  '
                            : 'bg-zinc-100 text-zinc-700  '
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            hasRecentHeartbeat ? 'bg-black text-white hover:bg-zinc-800' : 'bg-slate-400'
                          }`}
                        />
                        {hasRecentHeartbeat ? 'Online' : 'Offline'}
                      </span>

                      <button
                        onClick={() => {
                          if (confirm(`Remove device ${device.name}?`)) {
                            deleteMutation.mutate(device.id);
                          }
                        }}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Branch Site:</span>
                      <span className="font-medium text-zinc-900">
                        {device.branch?.name || 'All Branches'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Device Protocol:</span>
                      <span className="font-mono uppercase">{device.device_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Last Seen:</span>
                      <span>
                        {device.last_heartbeat_at
                          ? formatDateTime(device.last_heartbeat_at)
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Device API Key Box */}
                  <div className="mt-4 rounded-lg bg-zinc-50 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase text-zinc-500">
                        Secret API Key
                      </span>
                      <button
                        onClick={() => copyToClipboard(device.device_api_key)}
                        className="flex items-center gap-1 text-[11px] text-black hover:text-black"
                      >
                        {copiedKey === device.device_api_key ? (
                          <>
                            <Check className="h-3 w-3 text-zinc-900" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-1 font-mono text-xs text-zinc-900 truncate">
                      {device.device_api_key.slice(0, 8)}••••••••••••••••••••••••{device.device_api_key.slice(-4)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Register Biometric Device */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              Register Biometric Reader
            </h3>
            <p className="text-xs text-zinc-500">
              Provide hardware identifiers to generate a unique pre-shared API key.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                registerMutation.mutate({
                  name: formData.get('name') as string,
                  serial_number: formData.get('serial_number') as string,
                  branch_id: formData.get('branch_id')
                    ? parseInt(formData.get('branch_id') as string, 10)
                    : null,
                  device_type: formData.get('device_type') as any,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Device Name *
                </label>
                <input
                  name="name"
                  required
                  placeholder="HQ Entrance Face Scanner"
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Serial Number (SN) *
                </label>
                <input
                  name="serial_number"
                  required
                  placeholder="ZKTECO-SN-12345"
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Assigned Branch Site
                </label>
                <select
                  name="branch_id"
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Protocol Type
                </label>
                <select
                  name="device_type"
                  defaultValue="zkteco"
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                >
                  <option value="zkteco">ZKTeco Cloud Server / Push API</option>
                  <option value="adms">ADMS Standalone Device</option>
                  <option value="generic_api">Generic REST Webhook Push</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-black disabled:opacity-50"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDevicesPage;
