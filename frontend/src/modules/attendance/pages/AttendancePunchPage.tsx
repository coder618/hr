import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate, formatTime } from '@/lib/dateUtils';
import { TodayAttendanceResponse } from '../types/attendance';
import {
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  Coffee,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export const AttendancePunchPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Today's Attendance State
  const { data: todayData, isLoading, isError } = useQuery<TodayAttendanceResponse>({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await api.get('/attendance/today');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  // Acquire Geolocation
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsDetectingGps(false);
      },
      (err) => {
        setGpsError(err.message || 'Unable to retrieve your location.');
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  // Punch Mutation
  const punchMutation = useMutation({
    mutationFn: async (type: 'in' | 'out' | 'break_start' | 'break_end') => {
      return api.post('/attendance/punch', {
        punch_type: type,
        latitude: gpsLocation?.lat,
        longitude: gpsLocation?.lng,
        source: 'web',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      const verified = res.data.data?.is_geofence_verified;
      const distance = res.data.data?.distance_to_branch_meters;
      if (verified === false && distance !== null) {
        alert(`Punch recorded! Note: You are ${distance}m away from your office geofence.`);
      } else {
        alert('Attendance punch successfully recorded!');
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record punch.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Loading attendance status...
      </div>
    );
  }

  if (isError || !todayData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">Unable to load attendance terminal</p>
        <p className="text-xs text-red-600 mt-1">
          Ensure your user account is linked to an active employee profile in your organization.
        </p>
      </div>
    );
  }

  const { punches, record, employee } = todayData;
  const lastPunch = punches.length > 0 ? punches[punches.length - 1] : null;
  const isClockedIn = lastPunch?.punch_type === 'in' || lastPunch?.punch_type === 'break_end';
  const isOnBreak = lastPunch?.punch_type === 'break_start';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Self-Service Attendance Punch
        </h1>
        <p className="text-sm text-zinc-500">
          Clock in and out from web or mobile with automatic office geofence verification.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Card: Live Clock & Punch Action */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm text-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Current Live Time
            </span>
            <div className="mt-2 font-mono text-4xl font-extrabold text-zinc-950">
              {currentTime.toLocaleTimeString()}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {formatDate(currentTime)}
            </p>

            {/* Geofence Status Badge */}
            <div className="mt-5 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
              <div className="flex items-center justify-between">
                <span className="font-medium">Assigned Branch:</span>
                <span className="font-semibold text-zinc-950">
                  {employee.branch?.name || 'No Branch'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-zinc-300/60 pt-2">
                <span>GPS Location:</span>
                {gpsLocation ? (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-900">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                  </span>
                ) : isDetectingGps ? (
                  <span className="text-zinc-500 italic">Detecting coordinates...</span>
                ) : (
                  <button
                    onClick={detectLocation}
                    className="text-xs text-black underline"
                  >
                    Enable GPS
                  </button>
                )}
              </div>
              {gpsError && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-900">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{gpsError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-6 space-y-3">
            {!isClockedIn ? (
              <button
                disabled={punchMutation.isPending}
                onClick={() => punchMutation.mutate('in')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-black text-white hover:bg-zinc-800 py-3.5 text-base font-bold text-zinc-950 shadow-lg shadow-emerald-600/20 hover:bg-black disabled:opacity-50"
              >
                <Play className="h-5 w-5 fill-white" />
                {punchMutation.isPending ? 'Recording Punch...' : 'Clock In Now'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {!isOnBreak ? (
                  <button
                    disabled={punchMutation.isPending}
                    onClick={() => punchMutation.mutate('break_start')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 py-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                  >
                    <Coffee className="h-4 w-4 text-zinc-900" /> Start Break
                  </button>
                ) : (
                  <button
                    disabled={punchMutation.isPending}
                    onClick={() => punchMutation.mutate('break_end')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-300 bg-zinc-100 py-3 text-xs font-semibold text-black hover:bg-zinc-100"
                  >
                    <Coffee className="h-4 w-4" /> End Break
                  </button>
                )}

                <button
                  disabled={punchMutation.isPending}
                  onClick={() => punchMutation.mutate('out')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-black text-white hover:bg-zinc-800 py-3 text-xs font-bold text-zinc-950 shadow-lg shadow-rose-600/20 hover:bg-black disabled:opacity-50"
                >
                  <Square className="h-4 w-4 fill-white" /> Clock Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Today's Status & Punch Log Timeline */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="font-semibold text-zinc-950">Today's Summary</h3>
                <p className="text-xs text-zinc-500">{employee.name} ({employee.employee_code})</p>
              </div>
              {record && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    record.status === 'present'
                      ? 'bg-zinc-100 text-zinc-900  '
                      : record.status === 'late'
                      ? 'bg-zinc-100 text-zinc-900  '
                      : 'bg-zinc-100 text-zinc-800  '
                  }`}
                >
                  {record.status}
                </span>
              )}
            </div>

            {/* Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-zinc-50 p-2.5">
                <span className="text-zinc-500">First Clock In</span>
                <p className="mt-0.5 font-semibold text-zinc-950 font-mono">
                  {formatTime(record?.clock_in)}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2.5">
                <span className="text-zinc-500">Last Clock Out</span>
                <p className="mt-0.5 font-semibold text-zinc-950 font-mono">
                  {formatTime(record?.clock_out)}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2.5">
                <span className="text-zinc-500">Total Work</span>
                <p className="mt-0.5 font-semibold text-zinc-950">
                  {record ? `${(record.work_minutes / 60).toFixed(1)} hrs` : '0 hrs'}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2.5">
                <span className="text-zinc-500">Late Duration</span>
                <p className="mt-0.5 font-semibold text-zinc-950">
                  {record?.is_late ? `${record.late_minutes} mins` : 'On time'}
                </p>
              </div>
            </div>

            {/* Punch Logs Timeline */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-zinc-800">
                Punch Timeline ({punches.length})
              </h4>
              <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-zinc-200 rounded-lg border border-zinc-300 text-xs">
                {punches.length === 0 ? (
                  <p className="p-4 text-center text-zinc-500">No punches recorded today yet.</p>
                ) : (
                  punches.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            p.punch_type === 'in'
                              ? 'bg-zinc-100 text-zinc-900  '
                              : p.punch_type === 'out'
                              ? 'bg-zinc-100 text-zinc-900  '
                              : 'bg-zinc-100 text-zinc-900'
                          }`}
                        >
                          {p.punch_type}
                        </span>
                        <span className="font-mono text-zinc-800">
                          {formatTime(p.punch_time)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        {p.is_geofence_verified ? (
                          <span className="flex items-center gap-0.5 text-zinc-900" title="Geofence Verified">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-zinc-900" title="Outside Geofence">
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="capitalize">{p.source.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePunchPage;
