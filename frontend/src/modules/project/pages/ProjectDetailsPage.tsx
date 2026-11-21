import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Project, Task, ChecklistItem } from '../types/project';
import { Employee } from '../../employee/types/employee';
import {
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle2,
  X,
  User,
  CheckSquare,
  Edit2,
  Trash2,
} from 'lucide-react';

export const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = usePermission();
  const canManage = hasRole('admin,hr,manager');

  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'members'>('tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Edit Project Modal States
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editStatus, setEditStatus] = useState<Project['status']>('planning');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [editManagerId, setEditManagerId] = useState<number | ''>('');
  const [editSelectedMembers, setEditSelectedMembers] = useState<number[]>([]);

  // New Task Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskAssigneeId, setTaskAssigneeId] = useState<number | ''>('');
  const [taskMilestoneId, setTaskMilestoneId] = useState<number | ''>('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('');

  // New Milestone Modal States
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');

  // Time Log Form States (Inside Task Modal)
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Queries
  const { data: projectData, isLoading } = useQuery<{ data: Project }>({
    queryKey: ['project-detail', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-list-project-details'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { per_page: 100 } });
      return res.data.data;
    },
  });

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(`/projects/${id}/tasks`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      setIsTaskModalOpen(false);
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const res = await api.patch(`/tasks/${taskId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      if (selectedTask) {
        queryClient.invalidateQueries({ queryKey: ['task-detail', selectedTask.id] });
      }
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ taskId, checklist }: { taskId: number; checklist: ChecklistItem[] }) => {
      const res = await api.put(`/tasks/${taskId}/checklist`, { checklist });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      setSelectedTask(data.data);
    },
  });

  const createTimeLogMutation = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: number; payload: any }) => {
      const res = await api.post(`/tasks/${taskId}/time-logs`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      if (selectedTask) {
        // Refetch selected task
        api.get(`/tasks/${selectedTask.id}`).then((res) => setSelectedTask(res.data.data));
      }
      setLogHours('');
      setLogDesc('');
    },
  });

  // Milestone Mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(`/projects/${id}/milestones`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      setIsMilestoneModalOpen(false);
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ mId, status }: { mId: number; status: string }) => {
      const res = await api.put(`/projects/${id}/milestones/${mId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
    },
  });

  // Project Edit / Delete Mutations
  const updateProjectMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/projects/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setIsEditProjectModalOpen(false);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/projects/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      navigate('/projects');
    },
  });

  const handleOpenEditProject = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditCode(project.code);
    setEditDescription(project.description || '');
    setEditClientName(project.client_name || '');
    setEditStartDate(project.start_date || '');
    setEditDueDate(project.due_date || '');
    setEditBudget(project.budget ? String(project.budget) : '');
    setEditStatus(project.status || 'planning');
    setEditPriority(project.priority || 'medium');
    setEditManagerId(project.manager_id || '');
    setEditSelectedMembers(project.team_members?.map((m) => m.id) || []);
    setIsEditProjectModalOpen(true);
  };

  const handleDeleteProject = () => {
    if (!project) return;
    if (
      window.confirm(
        `Are you sure you want to delete "${project.title}" (${project.code})? This will permanently delete the project and all its associated tasks and milestones.`
      )
    ) {
      deleteProjectMutation.mutate();
    }
  };

  const handleEditProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectMutation.mutate({
      title: editTitle,
      code: editCode,
      description: editDescription,
      client_name: editClientName,
      start_date: editStartDate || null,
      due_date: editDueDate || null,
      budget: editBudget ? Number(editBudget) : 0,
      status: editStatus,
      priority: editPriority,
      manager_id: editManagerId ? Number(editManagerId) : null,
      member_ids: editSelectedMembers,
    });
  };

  const project = projectData?.data;

  if (isLoading || !project) {
    return <div className="p-12 text-center text-zinc-500">Loading project workspace...</div>;
  }

  const tasks = project.tasks || [];
  const milestones = project.milestones || [];
  const teamMembers = project.team_members || [];

  // Group tasks by status for Kanban
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', color: 'border-zinc-300' },
    { id: 'in_progress', title: 'In Progress', color: 'border-blue-400' },
    { id: 'in_review', title: 'In Review', color: 'border-amber-400' },
    { id: 'completed', title: 'Completed', color: 'border-emerald-400' },
  ];

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      assignee_id: taskAssigneeId ? Number(taskAssigneeId) : null,
      milestone_id: taskMilestoneId ? Number(taskMilestoneId) : null,
      due_date: taskDueDate || null,
      estimated_hours: taskEstimatedHours ? Number(taskEstimatedHours) : 0,
    });
  };

  const handleMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMilestoneMutation.mutate({
      title: milestoneTitle,
      description: milestoneDesc,
      due_date: milestoneDueDate || null,
    });
  };

  const toggleChecklistItem = (itemIndex: number) => {
    if (!selectedTask) return;
    const items = [...(selectedTask.checklist || [])];
    items[itemIndex].completed = !items[itemIndex].completed;
    updateChecklistMutation.mutate({ taskId: selectedTask.id, checklist: items });
  };

  const handleLogTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !logHours) return;

    createTimeLogMutation.mutate({
      taskId: selectedTask.id,
      payload: {
        hours_spent: Number(logHours),
        log_date: logDate,
        description: logDesc,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Project Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-300 space-y-4">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-black bg-zinc-100 px-2 py-0.5 rounded">
                {project.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  project.status === 'in_progress' || project.status === 'active'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : project.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : project.status === 'cancelled'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-950 mt-1">{project.title}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{project.description || 'No description provided.'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                <button
                  onClick={handleOpenEditProject}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Project
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={deleteProjectMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              </>
            )}

            {activeTab === 'tasks' && (
              <button
                onClick={() => {
                  setTaskTitle('');
                  setTaskDesc('');
                  setTaskAssigneeId('');
                  setTaskMilestoneId('');
                  setTaskDueDate('');
                  setTaskEstimatedHours('');
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            )}

            {activeTab === 'milestones' && (
              <button
                onClick={() => {
                  setMilestoneTitle('');
                  setMilestoneDesc('');
                  setMilestoneDueDate('');
                  setIsMilestoneModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Milestone
              </button>
            )}
          </div>
        </div>

        {/* Project Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-200">
          <div>
            <span className="text-[11px] font-semibold uppercase text-zinc-500">Project Manager</span>
            <div className="font-semibold text-zinc-900 text-sm">
              {project.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Unassigned'}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-zinc-500">Budget</span>
            <div className="font-semibold text-zinc-900 text-sm">
              Tk {project.budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-zinc-500">Timeline</span>
            <div className="font-semibold text-zinc-900 text-sm">
              {project.start_date ? formatDate(project.start_date) : 'N/A'} → {project.due_date ? formatDate(project.due_date) : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-zinc-500">Total Tasks</span>
            <div className="font-semibold text-black text-sm">
              {project.completed_tasks_count} / {project.tasks_count} completed
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-zinc-300 pb-2">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'tasks' ? 'bg-black text-white hover:bg-zinc-800 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          Task Board (Kanban)
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'milestones' ? 'bg-black text-white hover:bg-zinc-800 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          Milestones ({milestones.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'members' ? 'bg-black text-white hover:bg-zinc-800 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          Team Members ({teamMembers.length})
        </button>
      </div>

      {/* Tab 1: Tasks Kanban Board */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-zinc-50/70 p-4 rounded-2xl border border-zinc-300/80 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-300 mb-3">
                  <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-black text-white hover:bg-zinc-800" />
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-200/60 rounded-full text-xs font-semibold text-zinc-700">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-zinc-300 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-zinc-950 line-clamp-2">
                          {t.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                            t.priority === 'urgent'
                              ? 'bg-zinc-100 text-zinc-900'
                              : t.priority === 'high'
                              ? 'bg-zinc-100 text-zinc-900'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      {/* Hours & Checklist Progress */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {t.actual_hours}h / {t.estimated_hours}h
                          </span>
                        </div>

                        {t.checklist && t.checklist.length > 0 && (
                          <div className="flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
                            <span>
                              {t.checklist.filter((c) => c.completed).length}/{t.checklist.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Assignee Footer & Move Quick Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
                        <div className="flex items-center gap-1 text-zinc-700">
                          <User className="w-3 h-3 text-zinc-500" />
                          <span className="truncate max-w-24 font-medium">
                            {t.assignee ? t.assignee.first_name : 'Unassigned'}
                          </span>
                        </div>

                        {/* Move Status Dropdown */}
                        <select
                          onClick={(e) => e.stopPropagation()}
                          value={t.status}
                          onChange={(e) => updateTaskStatusMutation.mutate({ taskId: t.id, status: e.target.value })}
                          className="text-[11px] font-semibold bg-zinc-50 border border-zinc-300 rounded px-1.5 py-0.5"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="in_review">In Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Milestones List */}
      {activeTab === 'milestones' && (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 text-xs uppercase font-semibold text-zinc-500">
              <tr>
                <th className="px-6 py-4">Milestone</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {milestones.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-bold text-zinc-950">{m.title}</td>
                  <td className="px-6 py-4 text-xs">{m.description || 'No description'}</td>
                  <td className="px-6 py-4 font-medium">{m.due_date ? formatDate(m.due_date) : 'Flexible'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() =>
                        updateMilestoneMutation.mutate({
                          mId: m.id,
                          status: m.status === 'completed' ? 'pending' : 'completed',
                        })
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        m.status === 'completed'
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {m.status === 'completed' ? 'Completed' : 'Mark Done'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-zinc-500">Order #{m.order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Team Members */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {teamMembers.map((emp) => (
            <div
              key={emp.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-300 flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-100 text-black font-bold flex items-center justify-center text-sm">
                {emp.first_name[0]}
                {emp.last_name[0]}
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-950">
                  {emp.first_name} {emp.last_name}
                </h4>
                <p className="text-xs text-zinc-500">{emp.designation?.name || 'Team Member'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Details & Time Log Slide-over */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-300">
              <div>
                <span className="text-xs uppercase font-bold text-black">Task Details</span>
                <h3 className="font-bold text-lg text-zinc-950">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-zinc-500 hover:text-zinc-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Task Meta Stats */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-xl text-xs">
                <div>
                  <span className="text-zinc-500">Assignee:</span>
                  <div className="font-semibold text-zinc-900">
                    {selectedTask.assignee ? `${selectedTask.assignee.first_name} ${selectedTask.assignee.last_name}` : 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Time Spent:</span>
                  <div className="font-semibold text-black font-mono">
                    {selectedTask.actual_hours}h / {selectedTask.estimated_hours}h
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Due Date:</span>
                  <div className="font-semibold text-zinc-900">{selectedTask.due_date ? formatDate(selectedTask.due_date) : 'No due date'}</div>
                </div>
              </div>

              {/* Checklist Section */}
              {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-zinc-500">Checklist Items</h4>
                  <div className="space-y-1.5">
                    {selectedTask.checklist.map((item, idx) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleChecklistItem(idx)}
                          className="rounded text-black"
                        />
                        <span className={item.completed ? 'line-through text-zinc-500' : 'text-zinc-800 '}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Logging Form */}
              <div className="space-y-3 pt-4 border-t border-zinc-300">
                <h4 className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-black" /> Log Work Hours
                </h4>
                <form onSubmit={handleLogTimeSubmit} className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.25"
                      required
                      placeholder="Hours (e.g. 2.5)"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="What was done?"
                      value={logDesc}
                      onChange={(e) => setLogDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      disabled={createTimeLogMutation.isPending}
                      className="w-full py-2 bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl text-xs font-semibold"
                    >
                      Log Time
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950">Create Project Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task summary..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Milestone</label>
                  <select
                    value={taskMilestoneId}
                    onChange={(e) => setTaskMilestoneId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  >
                    <option value="">None</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Est. Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={taskEstimatedHours}
                    onChange={(e) => setTaskEstimatedHours(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {createTaskMutation.isPending ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Milestone Modal */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950">Create Project Milestone</h3>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMilestoneSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Beta Release 1.0"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={milestoneDueDate}
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Target deliverables..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMilestoneMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {createMilestoneMutation.isPending ? 'Saving...' : 'Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Project Modal */}
      {isEditProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950 text-base">
                Edit Project: {editCode}
              </h3>
              <button
                onClick={() => setIsEditProjectModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProjectSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
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
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    placeholder="PRJ-01"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Client / Department</label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  placeholder="e.g. Acme Corp / Internal"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    min={editStartDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Budget (Tk)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
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
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
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
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value ? Number(e.target.value) : '')}
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
                  Assign Team Members ({editSelectedMembers.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-zinc-50 border border-zinc-300 rounded-xl space-y-1">
                  {employees.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-1">No employees available</p>
                  ) : (
                    employees.map((emp) => {
                      const isSelected = editSelectedMembers.includes(emp.id);
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
                                setEditSelectedMembers(editSelectedMembers.filter((id) => id !== emp.id));
                              } else {
                                setEditSelectedMembers([...editSelectedMembers, emp.id]);
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Project scope and goals..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-300">
                <button
                  type="button"
                  onClick={() => setIsEditProjectModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProjectMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsPage;
