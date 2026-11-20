import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Shift } from '../types/shift';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Moon,
  Sun,
  Star,
} from 'lucide-react';

export const ShiftListPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Queries
  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts');
      return res.data.data;
    },
  });

  // Shift Mutation (Create / Update)
  const shiftMutation = useMutation({
    mutationFn: async (payload: Partial<Shift>) => {
      if (editingShift) {
        return api.put(`/shifts/${editingShift.id}`, payload);
      }
      return api.post('/shifts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setIsModalOpen(false);
      setEditingShift(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save shift.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete shift.');
    },
  });

  // Set Default Mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.post(`/shifts/${id}/set-default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to set default shift.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Shifts & Working Hours
          </h1>
          <p className="text-sm text-zinc-500">
            Define work shifts, grace period tolerances, break rules, and overnight schedules.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingShift(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black"
        >
          <Plus className="h-4 w-4" /> Add Shift
        </button>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
          Loading shifts...
        </div>
      ) : shifts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900">No shifts configured</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Create your organization's primary working hours and shift patterns.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className={`relative flex flex-col justify-between rounded-xl border p-5 shadow-sm transition ${
                shift.is_default
                  ? 'border-indigo-300 bg-zinc-100/20  '
                  : 'border-zinc-300 bg-white  '
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-950">{shift.name}</h3>
                      {shift.is_default && (
                        <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-black">
                          <Star className="h-3 w-3 fill-indigo-600" /> Default
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-zinc-500">Code: {shift.code}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingShift(shift);
                        setIsModalOpen(true);
                      }}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!shift.is_default && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete shift ${shift.name}?`)) {
                            deleteMutation.mutate(shift.id);
                          }
                        }}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Timings */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                  {shift.is_overnight ? (
                    <div className="flex items-center gap-1.5 text-black font-semibold">
                      <Moon className="h-4 w-4" />
                      <span>
                        {shift.start_time || '—'} - {shift.end_time || '—'}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px]">
                        Overnight (+1 day)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-zinc-900 font-semibold">
                      <Sun className="h-4 w-4 text-zinc-900" />
                      <span>
                        {shift.start_time || '—'} - {shift.end_time || '—'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-700">
                  <div className="rounded bg-zinc-50 p-2">
                    <span className="text-[11px] text-zinc-500">Work Duration</span>
                    <p className="font-semibold text-zinc-900">
                      {(shift.total_work_minutes / 60).toFixed(1)} hrs
                    </p>
                  </div>
                  <div className="rounded bg-zinc-50 p-2">
                    <span className="text-[11px] text-zinc-500">Unpaid Break</span>
                    <p className="font-semibold text-zinc-900">{shift.break_minutes} mins</p>
                  </div>
                  <div className="rounded bg-zinc-50 p-2">
                    <span className="text-[11px] text-zinc-500">Late Grace Period</span>
                    <p className="font-semibold text-zinc-900">
                      ±{shift.grace_period_entry_minutes} mins
                    </p>
                  </div>
                  <div className="rounded bg-zinc-50 p-2">
                    <span className="text-[11px] text-zinc-500">Early Exit Grace</span>
                    <p className="font-semibold text-zinc-900">
                      ±{shift.grace_period_exit_minutes} mins
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs">
                <span className="text-zinc-500">
                  {shift.assignments_count ?? 0} active assignments
                </span>

                {!shift.is_default && (
                  <button
                    onClick={() => setDefaultMutation.mutate(shift.id)}
                    className="text-xs font-medium text-black hover:text-black"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              {editingShift ? 'Edit Shift' : 'Create New Shift'}
            </h3>
            <p className="text-xs text-zinc-500">Configure schedule parameters and grace tolerances.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                shiftMutation.mutate({
                  name: formData.get('name') as string,
                  code: formData.get('code') as string,
                  type: formData.get('type') as any,
                  start_time: formData.get('start_time') as string,
                  end_time: formData.get('end_time') as string,
                  total_work_minutes: parseInt(formData.get('total_work_minutes') as string, 10) || 480,
                  break_minutes: parseInt(formData.get('break_minutes') as string, 10) || 60,
                  grace_period_entry_minutes:
                    parseInt(formData.get('grace_period_entry_minutes') as string, 10) || 15,
                  grace_period_exit_minutes:
                    parseInt(formData.get('grace_period_exit_minutes') as string, 10) || 15,
                  is_default: formData.get('is_default') === 'on',
                });
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Shift Name *
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={editingShift?.name}
                    placeholder="Regular Morning Shift"
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Shift Code *
                  </label>
                  <input
                    name="code"
                    required
                    defaultValue={editingShift?.code}
                    placeholder="REG-01"
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Shift Type *
                </label>
                <select
                  name="type"
                  defaultValue={editingShift?.type || 'fixed'}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                >
                  <option value="fixed">Fixed Timings (Standard 9 to 5)</option>
                  <option value="flexible">Flexible (Total Hours Required)</option>
                  <option value="rotational">Rotational / Multi-shift Roster</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Start Time (Clock-in)
                  </label>
                  <input
                    name="start_time"
                    type="time"
                    defaultValue={editingShift?.start_time || '09:00'}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    End Time (Clock-out)
                  </label>
                  <input
                    name="end_time"
                    type="time"
                    defaultValue={editingShift?.end_time || '18:00'}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Expected Work Minutes
                  </label>
                  <input
                    name="total_work_minutes"
                    type="number"
                    defaultValue={editingShift?.total_work_minutes || 480}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Break Duration (mins)
                  </label>
                  <input
                    name="break_minutes"
                    type="number"
                    defaultValue={editingShift?.break_minutes || 60}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Entry Grace Period (mins)
                  </label>
                  <input
                    name="grace_period_entry_minutes"
                    type="number"
                    defaultValue={editingShift?.grace_period_entry_minutes || 15}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                  <span className="text-[10px] text-zinc-500">Late after this threshold</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Exit Grace Period (mins)
                  </label>
                  <input
                    name="grace_period_exit_minutes"
                    type="number"
                    defaultValue={editingShift?.grace_period_exit_minutes || 15}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                  <span className="text-[10px] text-zinc-500">Early leave before this</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="is_default"
                  id="is_default"
                  defaultChecked={editingShift?.is_default}
                  className="rounded text-black focus:ring-indigo-500"
                />
                <label htmlFor="is_default" className="text-xs text-zinc-800 font-medium">
                  Set as Organization Default Shift
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shiftMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-black disabled:opacity-50"
                >
                  {shiftMutation.isPending ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftListPage;
