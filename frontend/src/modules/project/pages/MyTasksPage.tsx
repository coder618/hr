import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task } from '../types/project';
import {
  Box,
  Clock,
  Calendar,
  X,
  FileText,
} from 'lucide-react';

export const MyTasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [loggingTaskId, setLoggingTaskId] = useState<number | null>(null);
  const [logHours, setLogHours] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logDesc, setLogDesc] = useState('');

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['my-assigned-tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks/my');
      return res.data.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const res = await api.patch(`/tasks/${taskId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    },
  });

  const logTimeMutation = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: number; payload: any }) => {
      const res = await api.post(`/tasks/${taskId}/time-logs`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      setLoggingTaskId(null);
      setLogHours('');
      setLogDesc('');
    },
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingTaskId || !logHours) return;

    logTimeMutation.mutate({
      taskId: loggingTaskId,
      payload: {
        hours_spent: Number(logHours),
        log_date: logDate,
        description: logDesc,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Box className="w-6 h-6 text-black" />
            My Assigned Tasks
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track and update progress on your assigned tasks and log daily work hours.
          </p>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500">Loading your tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-base font-semibold">No tasks currently assigned to you</p>
            <p className="text-sm">Enjoy your day or check in with your project lead.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
              <tr>
                <th className="px-6 py-4">Task & Project</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Hours (Logged / Est)</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-zinc-950">{t.title}</div>
                    <div className="text-xs text-black font-mono">
                      {t.project?.code} • {t.project?.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        t.priority === 'urgent'
                          ? 'bg-zinc-100 text-zinc-900'
                          : t.priority === 'high'
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {t.actual_hours}h / {t.estimated_hours}h
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {t.due_date ? (
                      <span className="flex items-center gap-1 text-zinc-800">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" /> {t.due_date}
                      </span>
                    ) : (
                      <span className="text-zinc-500 italic">No deadline</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={t.status}
                      onChange={(e) => updateStatusMutation.mutate({ taskId: t.id, status: e.target.value })}
                      className="text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setLoggingTaskId(t.id);
                        setLogHours('');
                        setLogDesc('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-black hover:bg-zinc-100 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" /> Log Time
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Time Modal */}
      {loggingTaskId && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-black" />
                Log Work Time
              </h3>
              <button onClick={() => setLoggingTaskId(null)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Hours Spent</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  placeholder="e.g. 3.5"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Work Description</label>
                <textarea
                  rows={2}
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                  placeholder="Summary of work completed..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setLoggingTaskId(null)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logTimeMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {logTimeMutation.isPending ? 'Logging...' : 'Save Time Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasksPage;
