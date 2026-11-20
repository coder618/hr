import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Notice } from '../types/notice';
import {
  Bell,
  Search,
  Pin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Check,
  Building,
} from 'lucide-react';

export const NoticeBoardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['my-notices', search, priorityFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const res = await api.get('/notices/my', { params });
      return res.data.data;
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.post(`/notices/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notices'] });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 flex items-center gap-2">
            <Bell className="w-7 h-7 text-zinc-950" />
            Notice Board & Internal Announcements
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Stay informed with company announcements, policy updates, and team memos.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcement title or content..."
            className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-medium"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="important">Important</option>
          <option value="normal">Normal</option>
        </select>
      </div>

      {/* Notices Feed */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500 font-mono text-xs">Loading announcements...</div>
      ) : notices.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 bg-white rounded-xl border border-zinc-200 shadow-xs">
          <Bell className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <p className="text-base font-semibold text-zinc-900">No active announcements</p>
          <p className="text-xs text-zinc-500 mt-1">You are all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-xl border transition-all shadow-xs p-5 bg-white ${
                notice.is_pinned
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {notice.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <Pin className="w-3.5 h-3.5 fill-amber-500" /> Pinned
                    </span>
                  )}

                  {notice.priority === 'urgent' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                    </span>
                  ) : notice.priority === 'important' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Important
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200">
                      Normal
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
                    <Building className="w-3 h-3 text-zinc-400" />
                    {notice.target_type === 'all'
                      ? 'Company-Wide'
                      : notice.target_type === 'department'
                      ? 'Departmental'
                      : 'Branch Specific'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                  {notice.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {new Date(notice.published_at).toLocaleDateString()}
                    </span>
                  )}
                  {notice.creator && (
                    <span className="flex items-center gap-1 font-sans font-medium text-zinc-700">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {notice.creator.name}
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-base font-bold text-zinc-950 mb-1.5">{notice.title}</h2>
              <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line mb-4">
                {notice.content}
              </div>

              {notice.requires_acknowledgment && (
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Acknowledgment required by management
                  </span>

                  {notice.is_acknowledged ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                      <Check className="w-4 h-4" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => acknowledgeMutation.mutate(notice.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
                    >
                      {acknowledgeMutation.isPending ? 'Marking...' : 'I Acknowledge'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticeBoardPage;
