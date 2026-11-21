import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { Notice } from '../types/notice';
import { Department, Branch } from '../../employee/types/employee';
import {
  Bell,
  Plus,
  Pin,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const NoticeAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAcksModalOpen, setIsAcksModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [targetType, setTargetType] = useState<'all' | 'department' | 'branch'>('all');
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [isPinned, setIsPinned] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Notices
  const { data: noticesData, isLoading } = useQuery<{ data: { data: Notice[] } }>({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data;
    },
  });

  // Fetch Departments for targeting
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments-select-notice'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data;
    },
  });

  // Fetch Branches for targeting
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-select-notice'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  // Fetch Acknowledgments for selected notice
  const { data: acksList = [], isLoading: isLoadingAcks } = useQuery<any[]>({
    queryKey: ['notice-acks', selectedNotice?.id],
    queryFn: async () => {
      if (!selectedNotice) return [];
      const res = await api.get(`/notices/${selectedNotice.id}/acknowledgments`);
      return res.data.data;
    },
    enabled: isAcksModalOpen && !!selectedNotice,
  });

  // Create / Update Mutation
  const saveNoticeMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (selectedNotice) {
        return await api.put(`/notices/${selectedNotice.id}`, payload);
      }
      return await api.post('/notices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['my-notices'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to save announcement');
    },
  });

  // Toggle Pin Mutation
  const togglePinMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.post(`/notices/${id}/pin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['my-notices'] });
    },
  });

  // Delete Notice Mutation
  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['my-notices'] });
    },
  });

  const openModal = (notice?: Notice) => {
    setFormError(null);
    if (notice) {
      setSelectedNotice(notice);
      setTitle(notice.title);
      setContent(notice.content);
      setPriority(notice.priority);
      setTargetType(notice.target_type);
      setSelectedTargetIds(notice.targets?.map((t: any) => t.target_id) || []);
      setStatus(notice.status);
      setIsPinned(notice.is_pinned);
      setRequiresAck(notice.requires_acknowledgment);
      setPublishedAt(notice.published_at ? notice.published_at.split('T')[0] : '');
      setExpiresAt(notice.expires_at ? notice.expires_at.split('T')[0] : '');
    } else {
      setSelectedNotice(null);
      setTitle('');
      setContent('');
      setPriority('normal');
      setTargetType('all');
      setSelectedTargetIds([]);
      setStatus('published');
      setIsPinned(false);
      setRequiresAck(false);
      setPublishedAt(new Date().toISOString().split('T')[0]);
      setExpiresAt('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedNotice(null);
    setFormError(null);
  };

  const viewAcknowledgments = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsAcksModalOpen(true);
  };

  const noticesList = noticesData?.data?.data || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 flex items-center gap-2">
            <Bell className="w-7 h-7 text-zinc-950" />
            Announcement Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Publish company memos, target specific departments or branches, and track employee read receipts.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-sm font-semibold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Notices Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">Loading announcements...</div>
        ) : noticesList.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Bell className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-semibold text-zinc-900">No announcements found</p>
            <p className="text-xs text-zinc-500 mt-1">Click "Create Announcement" to post your first notice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3.5">Announcement</th>
                  <th className="px-4 py-3.5">Audience</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Published Date</th>
                  <th className="px-4 py-3.5">Read Receipts</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {noticesList.map((notice) => (
                  <tr key={notice.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3 max-w-sm">
                      <div className="flex items-center gap-2">
                        {notice.is_pinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-500" />
                        )}
                        <span className="font-semibold text-zinc-950 truncate text-sm">{notice.title}</span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate mt-0.5">{notice.content}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs text-zinc-600 font-medium">
                      {notice.target_type === 'all'
                        ? 'Company-Wide'
                        : `${notice.target_type} (${notice.targets?.length || 0})`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          notice.priority === 'urgent'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : notice.priority === 'important'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {notice.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          notice.status === 'published'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : notice.status === 'draft'
                            ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {notice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 font-mono whitespace-nowrap">
                      {notice.published_at ? formatDate(notice.published_at) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {notice.requires_acknowledgment ? (
                        <button
                          onClick={() => viewAcknowledgments(notice)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg border border-zinc-200 transition shadow-xs"
                        >
                          <Users className="w-3.5 h-3.5 text-zinc-600" />
                          <span>{notice.acknowledgments_count || 0} Acknowledged</span>
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500 font-medium">Not required</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => togglePinMutation.mutate(notice.id)}
                        className={`p-1.5 rounded-lg transition ${
                          notice.is_pinned
                            ? 'text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100'
                            : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 border border-transparent'
                        }`}
                        title={notice.is_pinned ? 'Unpin Notice' : 'Pin Notice to Top'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(notice)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete announcement "${notice.title}"?`)) {
                            deleteNoticeMutation.mutate(notice.id);
                          }
                        }}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <Bell className="w-5 h-5 text-zinc-950" />
                {selectedNotice ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                saveNoticeMutation.mutate({
                  title,
                  content,
                  priority,
                  target_type: targetType,
                  target_ids: selectedTargetIds,
                  status,
                  is_pinned: isPinned,
                  requires_acknowledgment: requiresAck,
                  published_at: publishedAt || null,
                  expires_at: expiresAt || null,
                });
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Holiday Schedule Announcement"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Content *</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter announcement details..."
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Audience</label>
                  <select
                    value={targetType}
                    onChange={(e: any) => {
                      setTargetType(e.target.value);
                      setSelectedTargetIds([]);
                    }}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="all">Company-wide (All)</option>
                    <option value="department">Specific Departments</option>
                    <option value="branch">Specific Branches</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Target Multi-Select Checkboxes */}
              {targetType === 'department' && (
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700">Select Targeted Departments:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {departments.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTargetIds.includes(d.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargetIds([...selectedTargetIds, d.id]);
                            } else {
                              setSelectedTargetIds(selectedTargetIds.filter((id) => id !== d.id));
                            }
                          }}
                          className="rounded bg-white border-zinc-300 text-zinc-950 focus:ring-0"
                        />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetType === 'branch' && (
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700">Select Targeted Branches:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTargetIds.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargetIds([...selectedTargetIds, b.id]);
                            } else {
                              setSelectedTargetIds(selectedTargetIds.filter((id) => id !== b.id));
                            }
                          }}
                          className="rounded bg-white border-zinc-300 text-zinc-950 focus:ring-0"
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Publish Date</label>
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-xs focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 text-xs focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded bg-white border-zinc-300 text-zinc-950 focus:ring-0"
                  />
                  Pin Announcement to Top
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={requiresAck}
                    onChange={(e) => setRequiresAck(e.target.checked)}
                    className="rounded bg-white border-zinc-300 text-zinc-950 focus:ring-0"
                  />
                  Require Employee Acknowledgment
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-xs rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveNoticeMutation.isPending}
                  className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {saveNoticeMutation.isPending ? 'Saving...' : 'Save Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read Receipts Modal */}
      {isAcksModalOpen && selectedNotice && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Read Receipts ({acksList.length})
              </h3>
              <button
                onClick={() => setIsAcksModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Employees who acknowledged notice: <span className="text-zinc-950 font-semibold">{selectedNotice.title}</span>
            </p>

            {isLoadingAcks ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono">Loading read receipts...</div>
            ) : acksList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                No employees have acknowledged yet.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-200">
                {acksList.map((ack) => (
                  <div key={ack.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-zinc-950">
                        {ack.employee ? `${ack.employee.first_name} ${ack.employee.last_name}` : 'Unknown Employee'}
                      </div>
                      <div className="text-zinc-500 font-mono text-[11px]">{ack.employee?.employee_code} ({ack.employee?.email})</div>
                    </div>
                    <div className="text-zinc-500 font-mono text-right text-[11px]">
                      {formatDateTime(ack.acknowledged_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsAcksModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition"
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

export default NoticeAdminPage;
