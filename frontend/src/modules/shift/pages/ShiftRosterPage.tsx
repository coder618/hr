import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Shift, EmployeeRosterResponse } from '../types/shift';
import { Employee, Branch, Department } from '../../employee/types/employee';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

export const ShiftRosterPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Aux Queries
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-roster-list'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { per_page: 100 } });
      const items = res.data.data;
      if (items.length > 0 && selectedEmployeeId === null) {
        setSelectedEmployeeId(items[0].id);
      }
      return items;
    },
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts');
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

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data.data;
    },
  });

  // Calculate start & end of current selected month
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const startDate = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Employee Roster Query
  const { data: rosterData, isLoading: isLoadingRoster } = useQuery<EmployeeRosterResponse>({
    queryKey: ['employee-roster', selectedEmployeeId, startDate, endDate],
    queryFn: async () => {
      if (!selectedEmployeeId) return null as any;
      const res = await api.get(`/shifts/employee/${selectedEmployeeId}/schedule`, {
        params: { start_date: startDate, end_date: endDate },
      });
      return res.data.data;
    },
    enabled: !!selectedEmployeeId,
  });

  // Batch Assignment Mutation
  const batchAssignMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/shift-assignments/batch', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-roster'] });
      setIsAssignModalOpen(false);
      alert('Shift assignments applied successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to apply assignments.');
    },
  });

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [assignType, setAssignType] = useState<'employee' | 'department' | 'branch'>('employee');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Shift Rostering & Calendar
          </h1>
          <p className="text-sm text-zinc-500">
            Preview dynamic schedule resolutions across employee, department, and branch assignments.
          </p>
        </div>

        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-black"
        >
          <Plus className="h-4 w-4" /> Assign Shifts
        </button>
      </div>

      {/* Control Bar: Select Employee & Month */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-zinc-800">Employee:</label>
          <select
            value={selectedEmployeeId || ''}
            onChange={(e) => setSelectedEmployeeId(parseInt(e.target.value, 10))}
            className="rounded-lg border border-zinc-300 py-1.5 px-3 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.employee_code}) - {emp.department?.name || 'General'}
              </option>
            ))}
          </select>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center font-semibold text-xs text-zinc-900">
            {new Date(year, month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Roster Calendar Grid */}
      <div className="rounded-xl border border-zinc-300 bg-white p-5 shadow-sm">
        {isLoadingRoster ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
            Calculating schedule resolution...
          </div>
        ) : !rosterData || rosterData.roster.length === 0 ? (
          <p className="text-center text-xs text-zinc-500">No schedule generated.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {rosterData.roster.map((day) => {
              const shift = day.shift;
              const isWeekend = day.is_weekend;

              return (
                <div
                  key={day.date}
                  className={`flex flex-col justify-between rounded-lg border p-3 transition ${
                    isWeekend
                      ? 'border-zinc-200 bg-zinc-50/60  '
                      : 'border-zinc-300 bg-white  '
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">
                        {day.date.split('-')[2]}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-medium">{day.day_name.slice(0, 3)}</span>
                    </div>

                    <div className="mt-2.5">
                      {shift ? (
                        <div>
                          <div className="flex items-center gap-1">
                            {shift.is_overnight ? (
                              <Moon className="h-3 w-3 text-black" />
                            ) : (
                              <Sun className="h-3 w-3 text-zinc-900" />
                            )}
                            <span className="truncate text-xs font-semibold text-zinc-950">
                              {shift.shift_code}
                            </span>
                          </div>

                          <p className="mt-1 font-mono text-[11px] text-zinc-700">
                            {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                          </p>

                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                shift.assignment_source === 'employee'
                                  ? 'bg-zinc-100 text-zinc-900  '
                                  : shift.assignment_source === 'department'
                                  ? 'bg-zinc-100 text-zinc-900  '
                                  : 'bg-zinc-100 text-zinc-700  '
                              }`}
                            >
                              {shift.assignment_source.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic">Off / No Shift</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Batch Shift Assignment */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">Assign Shift Schedule</h3>
            <p className="text-xs text-zinc-500">
              Apply a shift to employees, departments, or entire branches for specific date windows.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const shiftId = parseInt(formData.get('shift_id') as string, 10);
                const startDateVal = formData.get('start_date') as string;
                const endDateVal = formData.get('end_date') as string;

                // Selected days of week
                const selectedDows: number[] = [];
                for (let i = 0; i <= 6; i++) {
                  if (formData.get(`dow_${i}`) === 'on') {
                    selectedDows.push(i);
                  }
                }

                // Targets
                const rawTargets = formData.getAll('targets').map((t) => parseInt(t as string, 10));

                batchAssignMutation.mutate({
                  shift_id: shiftId,
                  assignable_type: assignType,
                  assignable_ids: rawTargets,
                  days_of_week: selectedDows.length > 0 ? selectedDows : undefined,
                  start_date: startDateVal,
                  end_date: endDateVal || null,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Select Shift *
                </label>
                <select
                  name="shift_id"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.start_time} to {s.end_time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Scope */}
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Assignment Target Type
                </label>
                <div className="mt-1.5 flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="assign_type"
                      checked={assignType === 'employee'}
                      onChange={() => setAssignType('employee')}
                      className="text-black"
                    />
                    Individual Employees
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="assign_type"
                      checked={assignType === 'department'}
                      onChange={() => setAssignType('department')}
                      className="text-black"
                    />
                    Departments
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="assign_type"
                      checked={assignType === 'branch'}
                      onChange={() => setAssignType('branch')}
                      className="text-black"
                    />
                    Branches
                  </label>
                </div>
              </div>

              {/* Target Selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Select Target(s) *
                </label>
                <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-zinc-300 p-2.5">
                  {assignType === 'employee' &&
                    employees.map((emp) => (
                      <label key={emp.id} className="flex items-center gap-2 py-1 text-xs text-zinc-800">
                        <input type="checkbox" name="targets" value={emp.id} className="rounded text-black" />
                        <span>
                          {emp.full_name} ({emp.employee_code})
                        </span>
                      </label>
                    ))}

                  {assignType === 'department' &&
                    departments.map((dept) => (
                      <label key={dept.id} className="flex items-center gap-2 py-1 text-xs text-zinc-800">
                        <input type="checkbox" name="targets" value={dept.id} className="rounded text-black" />
                        <span>{dept.name}</span>
                      </label>
                    ))}

                  {assignType === 'branch' &&
                    branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 py-1 text-xs text-zinc-800">
                        <input type="checkbox" name="targets" value={b.id} className="rounded text-black" />
                        <span>{b.name} ({b.code})</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    Effective Start Date *
                  </label>
                  <input
                    name="start_date"
                    type="date"
                    required
                    defaultValue={startDate}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-800">
                    End Date (Optional)
                  </label>
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={endDate}
                    className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>
              </div>

              {/* Day of Week recurring filter */}
              <div>
                <label className="block text-xs font-medium text-zinc-800">
                  Recurring Days of Week (Leave blank for all days in date range)
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                    <label key={idx} className="flex items-center gap-1 rounded border border-zinc-300 px-2.5 py-1 text-zinc-800 cursor-pointer">
                      <input type="checkbox" name={`dow_${idx}`} className="rounded text-black" />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchAssignMutation.isPending}
                  className="rounded-lg bg-black text-white hover:bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-black disabled:opacity-50"
                >
                  {batchAssignMutation.isPending ? 'Assigning...' : 'Save Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRosterPage;
