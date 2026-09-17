import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { exportToExcel, ExportMetadata } from '../../utils/exportUtils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import {
  isTaskOverdue,
  getDateRangeForPeriod,
} from '../../utils/calculations';

interface EmployeeDashboardProps {
  onViewTask?: (task: Task) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = () => {
  const {
    currentUser,
    departments,
    tasks,
    timeSessions,
    showToast,
  } = useApp();

  // Period & Date filters
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customStart, setCustomStart] = useState(() => getDateRangeForPeriod('month').startDate);
  const [customEnd, setCustomEnd] = useState(() => getDateRangeForPeriod('month').endDate);

  // Other filters
  const [selectedStatus, setSelectedStatus] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Filter tasks belonging to current employee
  const userTasks = useMemo(() => {
    return tasks.filter(t => t.assignedUserId === currentUser.id);
  }, [tasks, currentUser]);

  // Filter time sessions belonging to current employee
  const userSessions = useMemo(() => {
    return timeSessions.filter(s => s.userId === currentUser.id);
  }, [timeSessions, currentUser]);

  // Calculate active date range boundaries
  const dateRange = useMemo(() => {
    if (period === 'all') return null;
    if (period === 'custom') {
      return {
        startDate: customStart || new Date().toISOString().split('T')[0],
        endDate: customEnd || new Date().toISOString().split('T')[0],
      };
    }
    if (period === 'day') {
      return { startDate: selectedDate, endDate: selectedDate };
    }
    const ref = selectedDate ? new Date(selectedDate) : new Date();
    return getDateRangeForPeriod(period, ref);
  }, [period, selectedDate, customStart, customEnd]);

  // Quick navigation for date (Previous / Next / Today)
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    if (period === 'day') {
      d.setDate(d.getDate() + days);
    } else if (period === 'week') {
      d.setDate(d.getDate() + (days * 7));
    } else if (period === 'month') {
      d.setMonth(d.getMonth() + (days > 0 ? 1 : -1));
    } else if (period === 'quarter') {
      d.setMonth(d.getMonth() + (days > 0 ? 3 : -3));
    } else if (period === 'year') {
      d.setFullYear(d.getFullYear() + (days > 0 ? 1 : -1));
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Filter tasks by date range and secondary filters
  const filteredTasks = useMemo(() => {
    return userTasks.filter(task => {
      // Date range filter
      if (dateRange) {
        if (task.startDate && task.endDate) {
          if (task.startDate > dateRange.endDate || task.endDate < dateRange.startDate) {
            return false;
          }
        } else if (task.startDate) {
          if (task.startDate > dateRange.endDate) {
            return false;
          }
        } else if (task.endDate) {
          if (task.endDate < dateRange.startDate || task.endDate > dateRange.endDate) {
            return false;
          }
        }
      }

      // Status filter
      if (selectedStatus && task.status !== selectedStatus) {
        return false;
      }

      // Overdue filter
      if (onlyOverdue && !isTaskOverdue(task)) {
        return false;
      }

      return true;
    });
  }, [userTasks, dateRange, selectedStatus, onlyOverdue]);

  // Filter time sessions by date range
  const filteredSessions = useMemo(() => {
    if (!dateRange) return userSessions;
    return userSessions.filter(s => {
      const sDate = s.startTime.split('T')[0];
      return sDate >= dateRange.startDate && sDate <= dateRange.endDate;
    });
  }, [userSessions, dateRange]);

  // KPI Calculations based on filtered tasks
  const totalTasks = filteredTasks.length;
  const activeTasks = filteredTasks.filter(t => t.status === 'In Progress').length;
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length;
  const overdueTasks = filteredTasks.filter(t => isTaskOverdue(t)).length;

  const totalPlannedHours = filteredTasks.reduce((sum, t) => sum + (t.shiftHours || t.plannedHours || 0), 0);
  const totalActualHours = filteredSessions.length > 0
    ? filteredSessions.reduce((sum, s) => sum + s.durationHours, 0)
    : filteredTasks.reduce((sum, t) => sum + t.actualHours, 0);

  // Time tracking chart breakdown according to selected period
  const chartBreakdown = useMemo(() => {
    if (period === 'week' || period === 'day') {
      const weekRange = getDateRangeForPeriod('week', new Date(selectedDate));
      const start = new Date(weekRange.startDate);
      const days: { label: string; dateStr: string; hours: number }[] = [];
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const sessionsForDay = userSessions.filter(
          s => s.startTime.split('T')[0] === dateStr
        );
        const hours = Number(
          sessionsForDay.reduce((sum, s) => sum + s.durationHours, 0).toFixed(1)
        );
        days.push({ label: dayNames[i], dateStr, hours });
      }
      return { items: days, total: days.reduce((sum, d) => sum + d.hours, 0) };
    }

    if (period === 'month') {
      const monthRange = getDateRangeForPeriod('month', new Date(selectedDate));
      const start = new Date(monthRange.startDate);
      const weeks: { label: string; dateStr: string; hours: number }[] = [];
      for (let w = 1; w <= 4; w++) {
        const wStart = new Date(start);
        wStart.setDate(start.getDate() + (w - 1) * 7);
        const wEnd = new Date(start);
        wEnd.setDate(Math.min(start.getDate() + w * 7 - 1, new Date(monthRange.endDate).getDate()));
        
        const wStartStr = wStart.toISOString().split('T')[0];
        const wEndStr = wEnd.toISOString().split('T')[0];

        const hours = Number(
          userSessions
            .filter(s => {
              const d = s.startTime.split('T')[0];
              return d >= wStartStr && d <= wEndStr;
            })
            .reduce((sum, s) => sum + s.durationHours, 0)
            .toFixed(1)
        );
        weeks.push({ label: `Wk ${w}`, dateStr: `${wStartStr}`, hours });
      }
      return { items: weeks, total: weeks.reduce((sum, w) => sum + w.hours, 0) };
    }

    // Default fallback (e.g. Recent 7 Days)
    const today = new Date();
    const days: { label: string; dateStr: string; hours: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hours = Number(
        userSessions
          .filter(s => s.startTime.split('T')[0] === dateStr)
          .reduce((sum, s) => sum + s.durationHours, 0)
          .toFixed(1)
      );
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), dateStr, hours });
    }
    return { items: days, total: days.reduce((sum, d) => sum + d.hours, 0) };
  }, [period, selectedDate, userSessions]);

  const maxChartHour = Math.max(8.5, ...chartBreakdown.items.map(d => d.hours));

  // Status Distribution counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'In Progress': 0,
      'Completed': 0,
      'Not Started': 0,
    };
    filteredTasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [filteredTasks]);

  // Reset all filters
  const handleResetFilters = () => {
    setPeriod('month');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setCustomStart(getDateRangeForPeriod('month').startDate);
    setCustomEnd(getDateRangeForPeriod('month').endDate);
    setSelectedStatus('');
    setOnlyOverdue(false);
  };

  const hasActiveFilters =
    period !== 'month' ||
    selectedStatus !== '' ||
    onlyOverdue ||
    selectedDate !== new Date().toISOString().split('T')[0];

  // Export personal dashboard data to Excel
  const handleExportExcel = () => {
    const userDept = departments.find(d => d.id === currentUser.departmentId);
    const metadata: ExportMetadata = {
      reportName: 'Personal Desk & Time Tracking Analytics Export',
      generatedDate: new Date().toLocaleString(),
      generatedBy: `${currentUser.name} (${currentUser.role})`,
      filtersApplied: {
        'Reporting Period': period.toUpperCase(),
        'Date Boundary': dateRange ? `${dateRange.startDate} to ${dateRange.endDate}` : 'All Time',
        'Department': userDept?.name || 'N/A',
        'Status Filter': selectedStatus || 'All Statuses',
        'Overdue Only': onlyOverdue ? 'Yes' : 'No',
      },
      summaryKpis: {
        'Total Assigned Tasks': totalTasks,
        'In Progress Tasks': activeTasks,
        'Completed Tasks': completedTasks,
        'Overdue Tasks': overdueTasks,
        'Planned Target Hours': `${totalPlannedHours} hrs`,
        'Actual Hours': `${totalActualHours.toFixed(1)} hrs`,
      },
    };

    const taskData = filteredTasks.map(t => {
      const shiftH = t.shiftHours || t.plannedHours || 0;
      const actualH = t.actualHours || 0;
      const overdue = isTaskOverdue(t);
      return {
        'Task ID': t.id,
        'Task Title': t.taskName,
        'Task Type': t.taskType || t.requestType || 'General',
        'Priority': t.priority,
        'Status': t.status,
        'Start Date': t.startDate || '—',
        'Due Date': t.endDate || '—',
        'Planned Target (h)': shiftH,
        'Actual Hours (h)': actualH,
        'Variance (h)': Number((shiftH - actualH).toFixed(1)),
        'Overdue': overdue ? 'YES' : 'NO',
        'Description': t.description || '',
      };
    });

    const sessionsData = filteredSessions.map(s => {
      const task = tasks.find(t => t.id === s.taskId);
      return {
        'Session ID': s.id,
        'Task ID': s.taskId,
        'Task Name': task?.taskName || 'N/A',
        'Date': s.startTime.split('T')[0],
        'Start Time': new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        'End Time': s.endTime ? new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress',
        'Duration (h)': s.durationHours,
        'Type': s.correctionType || 'Standard Timer',
        'Notes': s.notes || '',
      };
    });

    exportToExcel(
      metadata,
      [
        { sheetName: 'My Assigned Tasks', data: taskData },
        { sheetName: 'Logged Time Sessions', data: sessionsData },
      ],
      `${currentUser.name.replace(/\s+/g, '_')}_Personal_Analytics_Export`
    );

    showToast('success', 'Excel Export Ready', 'Personal analytics data downloaded successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white p-5 rounded-2xl text-slate-900 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">
          Welcome back, {currentUser.name}
        </h2>
        <button
          onClick={handleExportExcel}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto active:scale-95"
          title="Export personal analytics tasks and logged time to Excel"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Filter and Date Period Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          {/* Period Toggle Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs">
            {[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Weekly' },
              { id: 'month', label: 'Monthly' },
              { id: 'quarter', label: 'Quarterly' },
              { id: 'year', label: 'Yearly' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as typeof period)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Summary & Period Stepper */}
          <div className="flex items-center gap-2 text-xs">
            {period !== 'all' && period !== 'custom' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => handleShiftDate(-1)}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToToday}
                  className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => handleShiftDate(1)}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {dateRange && (
              <div className="text-slate-500 font-medium text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-blue-600 -mt-0.5" />
                <span>{dateRange.startDate}</span> to <span>{dateRange.endDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Secondary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          {/* Dynamic Context Date Input */}
          {period === 'day' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Day</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              />
            </div>
          )}

          {period === 'week' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Week of Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              />
            </div>
          )}

          {period === 'month' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Month Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              />
            </div>
          )}

          {period === 'custom' && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                />
              </div>
            </div>
          )}

          {(period === 'quarter' || period === 'year' || period === 'all') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reference Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                disabled={period === 'all'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 disabled:opacity-50"
              />
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Task Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Started">Not Started</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Overdue Quick Pill & Reset */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setOnlyOverdue(!onlyOverdue)}
              className={`flex-1 py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs ${
                onlyOverdue
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlyOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
              Overdue Only
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Task Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Task Status Distribution</h3>
              <span className="text-xs text-slate-500 font-medium">{totalTasks} tasks</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {Object.entries(statusCounts).map(([statusName, count]) => {
                const numericCount = Number(count);
                const pct = totalTasks > 0 ? Math.round((numericCount / totalTasks) * 100) : 0;
                const getBarColor = () => {
                  switch (statusName) {
                    case 'In Progress': return 'bg-blue-600';
                    case 'Completed': return 'bg-emerald-500';
                    case 'Not Started': return 'bg-slate-400';
                    default: return 'bg-indigo-500';
                  }
                };
                return (
                  <div key={statusName} className="space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium">{statusName}</span>
                      <span className="font-semibold text-slate-900">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 2: Planned vs Actual Hours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Target Hours vs Actual Hours</h3>
              <span className="text-xs text-slate-500 font-medium">Workload Progress</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-600">Actual Hours Logged</span>
                  <span className="font-bold text-blue-600">{totalActualHours.toFixed(1)}h</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-600">Target Hours</span>
                  <span className="font-bold text-slate-800">{totalPlannedHours}h</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between">
            <span>Overall Completion Rate:</span>
            <span className="font-bold text-blue-600">
              {totalPlannedHours > 0 ? Math.round((totalActualHours / totalPlannedHours) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Chart 3: Time Tracking Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Tracked Time Activity</h3>
              <span className="text-xs text-blue-600 font-semibold uppercase">{period} view</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Hours logged across period segments.</p>

            {/* Segment Bar Columns */}
            <div className="flex items-end justify-between gap-2 h-32 pt-4 px-1">
              {chartBreakdown.items.map(segment => {
                const heightPct = Math.min(100, Math.round((segment.hours / maxChartHour) * 100));
                const isTarget = segment.hours >= 7.5;
                return (
                  <div key={segment.dateStr || segment.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-700">{segment.hours > 0 ? `${segment.hours}h` : '0'}</span>
                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-20">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          segment.hours === 0
                            ? 'bg-slate-200'
                            : isTarget
                            ? 'bg-blue-600'
                            : 'bg-blue-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 truncate max-w-[36px]">{segment.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center mt-3 pt-2 border-t border-slate-100">
            Total for period:{' '}
            <strong className="text-slate-800">
              {chartBreakdown.total.toFixed(1)}h
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

