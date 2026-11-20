import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LeaveRequest, Holiday } from '../types/leave';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  User,
} from 'lucide-react';

export const LeaveCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const { data: calendarData } = useQuery<{ leaves: LeaveRequest[]; holidays: Holiday[] }>({
    queryKey: ['leave-calendar', year, month],
    queryFn: async () => {
      const res = await api.get('/leave/calendar', { params: { year, month } });
      return res.data;
    },
  });

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  // Month days builder
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun

  const leaves = calendarData?.leaves || [];
  const holidays = calendarData?.holidays || [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-black" />
            Leave & Holiday Calendar
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Monthly schedule of approved employee absences and official public/company holidays.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 border border-zinc-300 rounded-xl hover:bg-zinc-50"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-700" />
          </button>
          <span className="font-bold text-zinc-950 min-w-32 text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 border border-zinc-300 rounded-xl hover:bg-zinc-50"
          >
            <ChevronRight className="w-5 h-5 text-zinc-700" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-300 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-zinc-300 bg-zinc-50 text-center text-xs font-semibold uppercase text-zinc-500 py-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-28 bg-zinc-50/40 p-2" />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

            // Check holidays on this day
            const dayHolidays = holidays.filter((h) => dateStr >= h.from_date && dateStr <= h.to_date);

            // Check approved leaves on this day
            const dayLeaves = leaves.filter((l) => dateStr >= l.from_date && dateStr <= l.to_date);

            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={dateStr}
                className={`min-h-28 p-2 transition-colors ${
                  isToday ? 'bg-zinc-100/30  font-semibold' : 'hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs rounded-full w-6 h-6 flex items-center justify-center ${
                      isToday ? 'bg-black text-white hover:bg-zinc-800 text-white' : 'text-zinc-800 '
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                <div className="space-y-1">
                  {/* Holidays */}
                  {dayHolidays.map((h) => (
                    <div
                      key={`h-${h.id}`}
                      className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded text-[11px] truncate flex items-center gap-1"
                      title={h.name}
                    >
                      <Palmtree className="w-3 h-3 shrink-0" />
                      <span className="truncate">{h.name}</span>
                    </div>
                  ))}

                  {/* Leaves */}
                  {dayLeaves.map((l) => (
                    <div
                      key={`l-${l.id}`}
                      className="px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1 font-medium"
                      style={{
                        backgroundColor: `${l.leave_type?.color || '#3B82F6'}20`,
                        color: l.leave_type?.color || '#3B82F6',
                      }}
                      title={`${l.employee?.first_name} ${l.employee?.last_name}: ${l.leave_type?.name}`}
                    >
                      <User className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">
                        {l.employee?.first_name} ({l.leave_type?.code || 'LV'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendarPage;
