import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { Employee, Branch, Department } from '../types/employee';
import { EmployeeForm } from '../components/EmployeeForm';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  X,
} from 'lucide-react';

const formatJoinDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (match) {
    const [, year, month, day, hours = '00', minutes = '00'] = match;
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

export const EmployeeListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = usePermission();

  const canManage = hasRole('admin,hr');
  const canExport = hasRole('admin,hr,manager');

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Auxiliary data queries
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments', branchFilter],
    queryFn: async () => {
      const res = await api.get('/departments', { params: { branch_id: branchFilter || undefined } });
      return res.data.data;
    },
  });

  // Main Employees Query
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['employees', page, search, branchFilter, deptFilter, statusFilter, typeFilter],
    queryFn: async () => {
      const res = await api.get('/employees', {
        params: {
          page,
          per_page: 15,
          search: search || undefined,
          branch_id: branchFilter || undefined,
          department_id: deptFilter || undefined,
          status: statusFilter || undefined,
          employment_type: typeFilter || undefined,
        },
      });
      return {
        items: res.data.data as Employee[],
        meta: res.data.meta,
      };
    },
  });

  // CSV Import Mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/employees/import/csv', formData);
    },
    onSuccess: (res) => {
      setImportSummary(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'CSV Import failed.');
    },
  });

  // Direct CSV Export download handler
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await api.get('/employees/export/csv', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export employees list. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const employees = employeeData?.items || [];
  const meta = employeeData?.meta;

  if (!canManage && !canExport) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-600 shadow-sm max-w-lg mx-auto mt-8">
        <Users className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
        <h2 className="text-base font-semibold text-zinc-900">Access Restricted</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Organization staff directory is restricted to administrators and managers.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Employee Directory
          </h1>
          <p className="text-sm text-zinc-500">
            {canManage
              ? 'Manage organization staff, contracts, departments, and linked portal accounts.'
              : 'Browse directory of colleagues, departments, and organization contacts.'}
          </p>
        </div>

        {/* Action Buttons */}
        {(canExport || canManage) && (
          <div className="flex items-center gap-3">
            {canExport && (
              <button
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
              </button>
            )}
            {canManage && (
              <>
                <button
                  onClick={() => {
                    setImportSummary(null);
                    setImportFile(null);
                    setIsImportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
                >
                  <Upload className="h-4 w-4" /> Import CSV
                </button>
                <Link
                  to="/employees/create"
                  className="flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Employee
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm sm:grid-cols-2 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, code, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-zinc-300 py-1.5 pl-9 pr-3 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          />
        </div>

        <div>
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-zinc-300 py-1.5 px-3 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-zinc-300 py-1.5 px-3 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-zinc-300 py-1.5 px-3 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
            <option value="resigned">Resigned</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-zinc-300 py-1.5 px-3 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            <option value="">All Employment Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">No employees found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Try adjusting filters or click "Add Employee" to create a new profile.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="border-b border-zinc-300 bg-zinc-50 text-[11px] uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Branch & Dept</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Employment Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joining Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-black overflow-hidden shrink-0">
                          {emp.avatar_url ? (
                            <img
                              src={emp.avatar_url}
                              alt={emp.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              {emp.first_name[0]}
                              {emp.last_name[0]}
                            </>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-950">{emp.full_name}</p>
                          <span className="font-mono text-[11px] text-zinc-500">{emp.employee_code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-950">{emp.branch?.name}</p>
                      <span className="text-[11px] text-zinc-500">{emp.department?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">{emp.designation?.name || '—'}</td>
                    <td className="px-4 py-3 capitalize">{emp.employment_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${emp.status === 'active'
                          ? 'bg-zinc-100 text-zinc-900  '
                          : 'bg-zinc-100 text-zinc-900  '
                          }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-600">
                      {formatJoinDate(emp.joining_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="rounded bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-slate-200"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-300 px-4 py-3">
            <span className="text-xs text-zinc-500">
              Showing page {meta.current_page} of {meta.last_page} ({meta.total} employees)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded border border-zinc-300 p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-zinc-300 p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">Add New Employee</h3>
                <p className="text-xs text-zinc-500">Fill in personal details, upload photo and documents.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <EmployeeForm
              isModal={true}
              onSuccess={() => setIsAddModalOpen(false)}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">Import Employees via CSV</h3>
            <p className="text-xs text-zinc-500">
              Bulk onboard employees. Required columns:{' '}
              <span className="font-mono">employee_code, first_name, last_name, email, branch_code</span>.
            </p>

            {importSummary ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-zinc-100 p-4 text-xs text-emerald-800">
                  <p className="font-semibold">Import Complete!</p>
                  <p className="mt-1">
                    Imported: {importSummary.imported} • Updated: {importSummary.updated} • Skipped:{' '}
                    {importSummary.skipped}
                  </p>
                </div>
                {importSummary.errors && importSummary.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-zinc-100 p-3 text-[11px] text-amber-800">
                    <p className="font-semibold">Notices / Skipped items:</p>
                    <ul className="mt-1 list-disc pl-4">
                      {importSummary.errors.map((e: string, idx: number) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-black"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center">
                  <FileSpreadsheet className="mx-auto mb-2 h-10 w-10 text-zinc-500" />
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-xs text-zinc-500"
                  />
                  {importFile && (
                    <p className="mt-2 text-xs font-semibold text-zinc-800">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!importFile || importMutation.isPending}
                    onClick={() => {
                      if (importFile) importMutation.mutate(importFile);
                    }}
                    className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-black disabled:opacity-50"
                  >
                    {importMutation.isPending ? 'Importing...' : 'Upload & Process'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeListPage;
