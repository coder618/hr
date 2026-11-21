import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Project } from '../types/project';
import { Employee } from '../../employee/types/employee';
import {
  FolderOpen,
  Plus,
  Search,
  Calendar,
  X,
  FileText,
  User,
  Edit2,
  Trash2,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = usePermission();
  const canManage = hasRole('admin,hr,manager');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<Project['status']>('planning');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [managerId, setManagerId] = useState<number | ''>('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Queries
  const { data: projectsData, isLoading } = useQuery<{ data: Project[] }>({
    queryKey: ['projects-list', search, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/projects', { params });
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-list-project'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { per_page: 100 } });
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/projects', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/projects/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/projects/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const resetForm = () => {
    setEditingProject(null);
    setTitle('');
    setCode('');
    setDescription('');
    setClientName('');
    setStartDate('');
    setDueDate('');
    setBudget('');
    setStatus('planning');
    setPriority('medium');
    setManagerId('');
    setSelectedMembers([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setTitle(project.title);
    setCode(project.code);
    setDescription(project.description || '');
    setClientName(project.client_name || '');
    setStartDate(project.start_date || '');
    setDueDate(project.due_date || '');
    setBudget(project.budget ? String(project.budget) : '');
    setStatus(project.status || 'planning');
    setPriority(project.priority || 'medium');
    setManagerId(project.manager_id || '');
    setSelectedMembers(project.team_members?.map((m) => m.id) || []);
    setIsModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${project.title}" (${project.code})? This will permanently delete the project and all associated tasks and milestones.`
      )
    ) {
      deleteMutation.mutate(project.id);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      code,
      description,
      client_name: clientName,
      start_date: startDate || null,
      due_date: dueDate || null,
      budget: budget ? Number(budget) : 0,
      status,
      priority,
      manager_id: managerId ? Number(managerId) : null,
      member_ids: selectedMembers,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const projects = projectsData?.data || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-black" />
            Projects & Workspaces
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage company projects, milestones, task boards, and employee logged time.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 font-medium rounded-xl shadow-sm text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search projects by title, code, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-300 rounded-xl text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'in_progress', 'planning', 'completed', 'on_hold', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-black text-white hover:bg-zinc-800'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-300">
          <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-base font-semibold text-zinc-800">No projects found</p>
          <p className="text-sm text-zinc-500">
            {canManage
              ? 'Create your first project workspace using the button above.'
              : 'There are no active projects to display.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const totalTasks = p.tasks_count || 0;
            const completedTasks = p.completed_tasks_count || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-zinc-300 p-6 space-y-4 hover:border-black hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header Badge & Action Buttons */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono font-bold text-black">
                        {p.code}
                      </span>
                      <h3 className="font-bold text-lg text-zinc-950 group-hover:text-black transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                      {p.client_name && (
                        <p className="text-[11px] font-medium text-zinc-600 truncate">{p.client_name}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          p.status === 'in_progress' || p.status === 'active'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : p.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {p.status.replace('_', ' ')}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(p);
                            }}
                            title="Edit Project"
                            className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(p);
                            }}
                            title="Delete Project"
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 line-clamp-2">{p.description || 'No description provided.'}</p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Tasks Progress</span>
                      <span className="font-bold text-zinc-800">
                        {completedTasks}/{totalTasks} ({progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-black text-white hover:bg-zinc-800 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{p.manager ? `${p.manager.first_name} ${p.manager.last_name || ''}` : 'Unassigned'}</span>
                  </div>

                  {p.due_date && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Due {formatDate(p.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950 text-base">
                {editingProject ? `Edit Project: ${editingProject.code}` : 'Create New Project'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Website Redesign"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="PRJ-01"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Client / Department</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corp / Internal"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    min={startDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm capitalize"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Project Manager</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                >
                  <option value="">Select Project Manager</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">
                  Assign Team Members ({selectedMembers.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-zinc-50 border border-zinc-300 rounded-xl space-y-1">
                  {employees.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-1">No employees available</p>
                  ) : (
                    employees.map((emp) => {
                      const isSelected = selectedMembers.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 text-xs text-zinc-800 hover:bg-zinc-200/50 p-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedMembers(selectedMembers.filter((id) => id !== emp.id));
                              } else {
                                setSelectedMembers([...selectedMembers, emp.id]);
                              }
                            }}
                            className="rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                          />
                          <span className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-zinc-500">
                            ({emp.department?.name || emp.employee_code})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project scope and goals..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-300">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingProject
                    ? 'Save Changes'
                    : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
