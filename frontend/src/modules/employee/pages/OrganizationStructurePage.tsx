import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { Branch, Department, Designation } from '../types/employee';
import { Building2, Plus, Edit2, Trash2, MapPin } from 'lucide-react';

export const OrganizationStructurePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = usePermission();
  const canManage = hasRole('admin,hr');

  const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'designations'>('branches');

  // Modal states
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);

  // Queries
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  const { data: departments = [], isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data;
    },
  });

  const { data: designations = [], isLoading: isLoadingDesigs } = useQuery<Designation[]>({
    queryKey: ['designations'],
    queryFn: async () => {
      const res = await api.get('/designations');
      return res.data.data;
    },
  });

  // Branch Mutations
  const branchMutation = useMutation({
    mutationFn: async (payload: Partial<Branch>) => {
      if (editingBranch) {
        return api.put(`/branches/${editingBranch.id}`, payload);
      }
      return api.post('/branches', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsBranchModalOpen(false);
      setEditingBranch(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save branch.');
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete branch.');
    },
  });

  // Department Mutations
  const deptMutation = useMutation({
    mutationFn: async (payload: Partial<Department>) => {
      if (editingDept) {
        return api.put(`/departments/${editingDept.id}`, payload);
      }
      return api.post('/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptModalOpen(false);
      setEditingDept(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save department.');
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete department.');
    },
  });

  // Designation Mutations
  const desigMutation = useMutation({
    mutationFn: async (payload: Partial<Designation>) => {
      if (editingDesig) {
        return api.put(`/designations/${editingDesig.id}`, payload);
      }
      return api.post('/designations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      setIsDesigModalOpen(false);
      setEditingDesig(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save designation.');
    },
  });

  const deleteDesigMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/designations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete designation.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Organization Structure
          </h1>
          <p className="text-sm text-zinc-500">
            Configure branches, geofenced clock-in radii, departments, and designations.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
          <button
            onClick={() => setActiveTab('branches')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'branches'
                ? 'bg-white text-black shadow-sm  '
                : 'text-zinc-700 hover:text-zinc-950  '
            }`}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'departments'
                ? 'bg-white text-black shadow-sm  '
                : 'text-zinc-700 hover:text-zinc-950  '
            }`}
          >
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('designations')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'designations'
                ? 'bg-white text-black shadow-sm  '
                : 'text-zinc-700 hover:text-zinc-950  '
            }`}
          >
            Designations ({designations.length})
          </button>
        </div>
      </div>

      {/* 1. Branches Tab */}
      {activeTab === 'branches' && (
        <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-950">Branches & Physical Sites</h2>
            {canManage && (
              <button
                onClick={() => {
                  setEditingBranch(null);
                  setIsBranchModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Branch
              </button>
            )}
          </div>

          {isLoadingBranches ? (
            <p className="text-sm text-zinc-500">Loading branches...</p>
          ) : branches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
              <Building2 className="mx-auto mb-2 h-10 w-10 text-zinc-500" />
              <p className="text-sm font-medium text-zinc-800">No branches added yet</p>
              <p className="text-xs text-zinc-500">Create your company's primary office or regional sites.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="relative rounded-xl border border-zinc-300 p-5 shadow-sm transition hover:border-zinc-300"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-950">{b.name}</span>
                        {b.is_head_office && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-900">
                            HQ
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-zinc-500">Code: {b.code}</span>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingBranch(b);
                            setIsBranchModalOpen(true);
                          }}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete branch ${b.name}?`)) {
                              deleteBranchMutation.mutate(b.id);
                            }
                          }}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-zinc-700">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{b.address || 'No address specified'}</span>
                    </div>
                    {b.latitude && b.longitude && (
                      <div className="text-[11px] text-zinc-500 font-mono">
                        GPS: {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)} (±{b.geofence_radius_meters}m)
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500">
                    <span>{b.departments_count ?? 0} Departments</span>
                    <span className="font-medium text-black">
                      {b.employees_count ?? 0} Employees
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Departments Tab */}
      {activeTab === 'departments' && (
        <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-950">Departments Hierarchy</h2>
            {canManage && (
              <button
                onClick={() => {
                  setEditingDept(null);
                  setIsDeptModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Department
              </button>
            )}
          </div>

          {isLoadingDepts ? (
            <p className="text-sm text-zinc-500">Loading departments...</p>
          ) : departments.length === 0 ? (
            <p className="text-sm text-zinc-500">No departments configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-700">
                <thead className="border-b border-zinc-300 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Parent Dept</th>
                    <th className="px-4 py-3">Assigned Employees</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-950">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{d.code || '—'}</td>
                      <td className="px-4 py-3">{d.branch?.name || 'All Branches'}</td>
                      <td className="px-4 py-3 text-zinc-500">{d.parent?.name || '—'}</td>
                      <td className="px-4 py-3">{d.employees_count ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingDept(d);
                                setIsDeptModalOpen(true);
                              }}
                              className="text-zinc-500 hover:text-zinc-700 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete department ${d.name}?`)) {
                                  deleteDeptMutation.mutate(d.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Designations Tab */}
      {activeTab === 'designations' && (
        <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-950">Designations & Job Titles</h2>
            {canManage && (
              <button
                onClick={() => {
                  setEditingDesig(null);
                  setIsDesigModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Designation
              </button>
            )}
          </div>

          {isLoadingDesigs ? (
            <p className="text-sm text-zinc-500">Loading designations...</p>
          ) : designations.length === 0 ? (
            <p className="text-sm text-zinc-500">No designations configured.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {designations.map((desig) => (
                <div
                  key={desig.id}
                  className="flex items-start justify-between rounded-xl border border-zinc-300 p-4 shadow-sm"
                >
                  <div>
                    <h3 className="font-semibold text-zinc-950">{desig.name}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2">{desig.description || 'No description'}</p>
                    <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">
                      {desig.employees_count ?? 0} Employees
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDesig(desig);
                          setIsDesigModalOpen(true);
                        }}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete designation ${desig.name}?`)) {
                            deleteDesigMutation.mutate(desig.id);
                          }
                        }}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Branch Create / Edit */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                branchMutation.mutate({
                  name: formData.get('name') as string,
                  code: formData.get('code') as string,
                  latitude: formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null,
                  longitude: formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null,
                  geofence_radius_meters: parseInt(formData.get('geofence_radius_meters') as string, 10) || 100,
                  address: formData.get('address') as string,
                  is_head_office: formData.get('is_head_office') === 'on',
                });
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Branch Name *
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={editingBranch?.name}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Branch Code *
                  </label>
                  <input
                    name="code"
                    required
                    defaultValue={editingBranch?.code}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">Address</label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingBranch?.address || ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">Latitude</label>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    defaultValue={editingBranch?.latitude || ''}
                    placeholder="23.8103"
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">Longitude</label>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    defaultValue={editingBranch?.longitude || ''}
                    placeholder="90.4125"
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Radius (m)
                  </label>
                  <input
                    name="geofence_radius_meters"
                    type="number"
                    defaultValue={editingBranch?.geofence_radius_meters || 100}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_head_office"
                  id="is_head_office"
                  defaultChecked={editingBranch?.is_head_office}
                  className="rounded text-black focus:ring-indigo-500"
                />
                <label htmlFor="is_head_office" className="text-xs text-zinc-800">
                  Head Office / Primary Site
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={branchMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-50"
                >
                  {branchMutation.isPending ? 'Saving...' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Department Create / Edit */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              {editingDept ? 'Edit Department' : 'Add New Department'}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                deptMutation.mutate({
                  name: formData.get('name') as string,
                  code: formData.get('code') as string,
                  branch_id: formData.get('branch_id') ? parseInt(formData.get('branch_id') as string, 10) : null,
                  parent_id: formData.get('parent_id') ? parseInt(formData.get('parent_id') as string, 10) : null,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Department Name *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editingDept?.name}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">Code</label>
                <input
                  name="code"
                  defaultValue={editingDept?.code || ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Branch (Optional)
                </label>
                <select
                  name="branch_id"
                  defaultValue={editingDept?.branch_id || ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
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
                  Parent Department (Optional)
                </label>
                <select
                  name="parent_id"
                  defaultValue={editingDept?.parent_id || ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                >
                  <option value="">None (Top Level)</option>
                  {departments
                    .filter((d) => !editingDept || d.id !== editingDept.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-50"
                >
                  {deptMutation.isPending ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Designation Create / Edit */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">
              {editingDesig ? 'Edit Designation' : 'Add New Designation'}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                desigMutation.mutate({
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Designation / Role Title *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editingDesig?.name}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingDesig?.description || ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDesigModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={desigMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-50"
                >
                  {desigMutation.isPending ? 'Saving...' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationStructurePage;
