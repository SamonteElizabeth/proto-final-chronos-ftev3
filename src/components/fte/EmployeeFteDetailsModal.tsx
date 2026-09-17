import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Download,
  Layers,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { User as UserType, Task, TimeSession, WorkingSchedule, CapacityStatus } from '../../types';
import { exportToExcel } from '../../utils/exportUtils';
import { isOverCapacity, isAtCapacity, formatPeriodDate } from '../../utils/calculations';

export interface DailyTaskBreakdown {
  taskId: string;
  taskName: string;
  workType: string;
  hours: number;
  sessionCount: number;
  percentageOfDay: number;
  notes: string[];
}

export interface DayDistributionItem {
  date: string;
  hours: number;
  sessionCount: number;
  taskCount: number;
  tasks: DailyTaskBreakdown[];
  isWorkingDay: boolean;
}

export interface EmployeeMetricItem {
  user: UserType;
  schedule: WorkingSchedule;
  departmentName: string;
  workingDaysCount: number;
  holidayCount: number;
  availableHours: number;
  targetHours?: number;
  targetHoursPerDay?: number;
  remainingHours?: number;
  shiftHours: number;
  shiftHoursPerDay: number;
  breakHours: number;
  breakHoursPerDay: number;
  plannedHours: number;
  actualHours: number;
  capacityVariance: number;
  fte: number;
  status: CapacityStatus | string;
}

interface EmployeeFteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeMetric: EmployeeMetricItem | null;
  tasks: Task[];
  timeSessions: TimeSession[];
  dateRange: { startDate: string; endDate: string };
  periodLabel: string;
}

export const EmployeeFteDetailsModal: React.FC<EmployeeFteDetailsModalProps> = ({
  isOpen,
  onClose,
  employeeMetric,
  tasks,
  timeSessions,
  dateRange,
  periodLabel,
}) => {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!isOpen || !employeeMetric) return null;

  const {
    user,
    schedule,
    departmentName,
    availableHours,
    actualHours,
    capacityVariance,
    fte,
    status,
    workingDaysCount,
  } = employeeMetric;

  // Normalized daily target hours (defaults to 9h standard working capacity)
  const dailyTargetHours =
    employeeMetric.targetHoursPerDay ||
    schedule.netWorkHoursPerDay ||
    (schedule.hoursPerDay && schedule.breakHours ? schedule.hoursPerDay - schedule.breakHours : 9) ||
    9;

  // Time sessions for this employee
  const employeeSessions = useMemo(() => {
    return timeSessions.filter(s => s.userId === user.id);
  }, [timeSessions, user.id]);

  // Daily logged hours breakdown for period with multi-task support per date
  const dailyDistribution: DayDistributionItem[] = useMemo(() => {
    const workingDays = schedule?.workingDays || [1, 2, 3, 4, 5];
    const workingDaysSet = new Set(workingDays);

    const [sY, sM, sD] = dateRange.startDate.split('T')[0].split('-').map(Number);
    const [eY, eM, eD] = dateRange.endDate.split('T')[0].split('-').map(Number);
    if (isNaN(sY) || isNaN(eY)) {
      return [];
    }
    const start = new Date(sY, sM - 1, sD || 1, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD || 1, 12, 0, 0);
    if (start > end) {
      return [];
    }

    // Map sessions to dates and tasks
    const sessionMap: Record<
      string,
      {
        hours: number;
        sessionCount: number;
        taskMap: Record<
          string,
          {
            taskId: string;
            taskName: string;
            workType: string;
            hours: number;
            sessionCount: number;
            notes: string[];
          }
        >;
      }
    > = {};

    employeeSessions.forEach(s => {
      const day = s.startTime.split('T')[0];
      if (day >= dateRange.startDate && day <= dateRange.endDate) {
        if (!sessionMap[day]) {
          sessionMap[day] = { hours: 0, sessionCount: 0, taskMap: {} };
        }
        sessionMap[day].hours += s.durationHours;
        sessionMap[day].sessionCount += 1;

        const task = tasks.find(t => t.id === s.taskId);
        const taskId = s.taskId || 'GEN-ACT';
        const taskName = task?.taskName || s.notes || 'General Task Activity';
        const workType = s.workType || task?.workType || task?.taskType || 'Operational';

        if (!sessionMap[day].taskMap[taskId]) {
          sessionMap[day].taskMap[taskId] = {
            taskId,
            taskName,
            workType,
            hours: 0,
            sessionCount: 0,
            notes: [],
          };
        }
        sessionMap[day].taskMap[taskId].hours += s.durationHours;
        sessionMap[day].taskMap[taskId].sessionCount += 1;
        if (s.notes && !sessionMap[day].taskMap[taskId].notes.includes(s.notes)) {
          sessionMap[day].taskMap[taskId].notes.push(s.notes);
        }
      }
    });

    const daysList: DayDistributionItem[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
      const curY = current.getFullYear();
      const curM = String(current.getMonth() + 1).padStart(2, '0');
      const curD = String(current.getDate()).padStart(2, '0');
      const dateKey = `${curY}-${curM}-${curD}`;
      const isWorkingDay = workingDaysSet.has(dayOfWeek);
      const sessionData = sessionMap[dateKey];

      // Include all scheduled working days in the period (5 days per standard work week),
      // plus any unscheduled weekend days if the user actually logged overtime/sessions on them
      if (isWorkingDay || (sessionData && sessionData.hours > 0)) {
        const totalDayHours = Number((sessionData?.hours || 0).toFixed(1));
        const rawTasks = sessionData ? Object.values(sessionData.taskMap) : [];
        const taskList: DailyTaskBreakdown[] = rawTasks
          .map(t => ({
            taskId: t.taskId,
            taskName: t.taskName,
            workType: t.workType,
            hours: Number(t.hours.toFixed(1)),
            sessionCount: t.sessionCount,
            percentageOfDay: totalDayHours > 0 ? Math.round((t.hours / totalDayHours) * 100) : 0,
            notes: t.notes,
          }))
          .sort((a, b) => b.hours - a.hours);

        daysList.push({
          date: dateKey,
          hours: totalDayHours,
          sessionCount: sessionData?.sessionCount || 0,
          taskCount: taskList.length,
          tasks: taskList,
          isWorkingDay,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return daysList;
  }, [employeeSessions, dateRange, schedule, tasks]);

  // Toggle date row expansion
  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleToggleAllDates = () => {
    const allExpanded = dailyDistribution.every(d => expandedDates[d.date]);
    if (allExpanded) {
      setExpandedDates({});
    } else {
      const all: Record<string, boolean> = {};
      dailyDistribution.forEach(d => {
        all[d.date] = true;
      });
      setExpandedDates(all);
    }
  };

  // Helper date formatter
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateWithDay = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Export daily work distribution
  const handleExportData = () => {
    const dailyExportData = dailyDistribution.map(day => {
      const target = day.isWorkingDay ? dailyTargetHours : 0;
      const taskSummary = day.tasks.map(t => `${t.taskId} (${t.hours}h)`).join('; ');
      return {
        'Date': day.date,
        'Day': formatDateWithDay(day.date),
        'Working Day': day.isWorkingDay ? 'Yes' : 'No (Weekend/Non-working)',
        'Tracked Hours': day.hours,
        'Target Hours': target,
        'Tasks Count': day.taskCount,
        'Tasks Executed': taskSummary || 'None',
      };
    });

    exportToExcel(
      {
        reportName: `${user.name} - Daily Work Distribution & Task Allocation`,
        generatedDate: new Date().toLocaleString(),
        generatedBy: `System Administrator`,
        filtersApplied: {
          Employee: user.name,
          Department: departmentName,
          Period: `${periodLabel} (${formatPeriodDate(dateRange.startDate)} to ${formatPeriodDate(dateRange.endDate)})`,
          'FTE Utilization': `${fte}% (${status})`,
        },
        summaryKpis: {
          'Available Working Hours': `${availableHours}h`,
          'Actual Hours': `${actualHours}h`,
          'Capacity Variance': `${capacityVariance > 0 ? `+${capacityVariance}` : capacityVariance}h`,
          'Utilization %': `${fte}%`,
          'Evaluated Days': dailyDistribution.length,
        },
      },
      dailyExportData,
      `${user.name.replace(/\s+/g, '_')}_Daily_Work_Distribution`
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs ${isFullScreen ? 'p-1 sm:p-2' : 'p-3 sm:p-5 lg:p-6'} overflow-y-auto animate-in fade-in duration-200`}>
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 ${
          isFullScreen
            ? 'w-[99vw] h-[98vh] max-w-none max-h-[98vh]'
            : 'w-full max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1720px] max-h-[94vh]'
        } flex flex-col overflow-hidden my-auto text-slate-800 transition-all duration-200`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 shrink-0">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                    isOverCapacity(status)
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : isAtCapacity(status)
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOverCapacity(status)
                        ? 'bg-rose-500'
                        : isAtCapacity(status)
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  {status} ({fte}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>{user.title}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">{departmentName}</span>
                <span className="text-slate-300">•</span>
                <span>{user.email}</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600 font-medium">{schedule.name} ({dailyTargetHours}h/day)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              title="Export Employee Dossier"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 text-xs font-medium px-3"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen View'}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 text-xs font-medium px-2.5"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Daily Work Distribution */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Daily Logged Work & Task Distribution</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      Multi-Task Enabled
                    </span>
                  </div>
                  <span className="text-slate-600 text-[11px] block mt-0.5">
                    Breakdown of tasks executed per date against daily target ({dailyTargetHours}h/day).
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={handleToggleAllDates}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    {dailyDistribution.every(d => expandedDates[d.date]) ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        Collapse All Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        Expand All Task Details
                      </>
                    )}
                  </button>
                  <div className="text-right font-mono font-bold text-base text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200/60 shadow-2xs">
                    {actualHours}h <span className="text-xs font-normal text-slate-500">total</span>
                  </div>
                </div>
              </div>

              {dailyDistribution.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600 text-sm">No activity recorded for this period</p>
                  <p className="text-xs text-slate-400 mt-0.5">Switch the evaluation period or start logging time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-3 font-semibold w-10 text-center"></th>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold text-right">Daily Tracked</th>
                        <th className="py-3 px-4 font-semibold text-right">Target Hour ({dailyTargetHours}h)</th>
                        <th className="py-3 px-4 font-semibold text-center">Tasks Executed</th>
                        <th className="py-3 px-4 font-semibold">Task Breakdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyDistribution.map(day => {
                        const target = day.isWorkingDay ? dailyTargetHours : 0;
                        const isExpanded = expandedDates[day.date];
                        const hasMultipleTasks = day.taskCount > 1;

                        const taskColors = [
                          { bg: 'bg-blue-600', text: 'text-blue-700', pill: 'bg-blue-50 text-blue-800 border-blue-200' },
                          { bg: 'bg-indigo-600', text: 'text-indigo-700', pill: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                          { bg: 'bg-purple-600', text: 'text-purple-700', pill: 'bg-purple-50 text-purple-800 border-purple-200' },
                          { bg: 'bg-emerald-600', text: 'text-emerald-700', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                          { bg: 'bg-amber-600', text: 'text-amber-700', pill: 'bg-amber-50 text-amber-800 border-amber-200' },
                        ];

                        return (
                          <React.Fragment key={day.date}>
                            <tr
                              onClick={() => day.taskCount > 0 && toggleDateExpansion(day.date)}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                day.taskCount > 0 ? 'cursor-pointer' : ''
                              } ${isExpanded ? 'bg-blue-50/20' : ''}`}
                            >
                              <td className="py-3 px-3 text-center text-slate-400">
                                {day.taskCount > 0 ? (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      toggleDateExpansion(day.date);
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                                    aria-label="Toggle task breakdown"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span>{formatDateWithDay(day.date)}</span>
                                  {!day.isWorkingDay && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                      Non-Working / OT
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                                {day.hours}h
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {day.isWorkingDay ? `${target}h` : '0h (Weekend)'}
                              </td>
  
                              <td className="py-3 px-4 text-center">
                                {day.taskCount === 0 ? (
                                  <span className="text-slate-400 font-mono">0</span>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-1 ${
                                      hasMultipleTasks
                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {hasMultipleTasks && <span>⚡</span>}
                                    {day.taskCount} {day.taskCount === 1 ? 'task' : 'tasks'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {day.tasks.length === 0 ? (
                                  <span className="text-slate-400 text-xs">No tasks logged</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {/* Task pills with duration & % */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {day.tasks.map((tsk, idx) => {
                                        const color = taskColors[idx % taskColors.length];
                                        return (
                                          <span
                                            key={tsk.taskId}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 ${color.pill}`}
                                            title={`${tsk.taskId} - ${tsk.taskName}: ${tsk.hours}h (${tsk.percentageOfDay}%)`}
                                          >
                                            <span className="font-bold">{tsk.taskId}</span>
                                            <span>•</span>
                                            <span className="font-mono font-semibold">{tsk.hours}h</span>
                                            <span className="text-[9px] opacity-75">({tsk.percentageOfDay}%)</span>
                                          </span>
                                        );
                                      })}
                                    </div>

                                    {/* Segmented allocation bar for multi-task days */}
                                    {hasMultipleTasks && (
                                      <div className="w-full bg-slate-100 rounded-full h-1.5 flex overflow-hidden border border-slate-200/50">
                                        {day.tasks.map((tsk, idx) => {
                                          const color = taskColors[idx % taskColors.length];
                                          return (
                                            <div
                                              key={tsk.taskId}
                                              style={{ width: `${tsk.percentageOfDay}%` }}
                                              className={`${color.bg} h-full transition-all`}
                                              title={`${tsk.taskId}: ${tsk.hours}h (${tsk.percentageOfDay}%)`}
                                            />
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* Detailed Accordion for Multi-Task Breakdown */}
                            {isExpanded && day.tasks.length > 0 && (
                              <tr className="bg-slate-50/70 border-b border-slate-200/80">
                                <td colSpan={6} className="p-4">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-blue-600" />
                                        <span className="font-bold text-slate-800">
                                          Detailed Task Execution Breakdown for {formatDateWithDay(day.date)}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-slate-500 font-mono">
                                        {day.hours}h logged across {day.taskCount} {day.taskCount === 1 ? 'task' : 'tasks'} ({day.sessionCount} session{day.sessionCount > 1 ? 's' : ''})
                                      </span>
                                    </div>

                                    {/* Task breakdown list */}
                                    <div className="grid grid-cols-1 gap-2">
                                      {day.tasks.map((tsk, idx) => {
                                        const color = taskColors[idx % taskColors.length];
                                        return (
                                          <div
                                            key={tsk.taskId}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-200/60 hover:bg-slate-100/60 transition-colors gap-2 text-xs"
                                          >
                                            <div className="flex items-start gap-2.5">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase mt-0.5 ${color.pill}`}>
                                                {tsk.taskId}
                                              </span>
                                              <div>
                                                <span className="font-semibold text-slate-900 block">
                                                  {tsk.taskName}
                                                </span>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                                  <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 text-[10px]">
                                                    {tsk.workType}
                                                  </span>
                                                  <span>•</span>
                                                  <span>{tsk.sessionCount} session{tsk.sessionCount > 1 ? 's' : ''}</span>
                                                  {tsk.notes.length > 0 && (
                                                    <>
                                                      <span>•</span>
                                                      <span className="italic text-slate-600 truncate max-w-[320px]" title={tsk.notes.join(' | ')}>
                                                        "{tsk.notes[0]}"
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                              <div className="text-right">
                                                <div className="font-mono font-bold text-slate-900">
                                                  {tsk.hours}h
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                  {tsk.percentageOfDay}% of daily total
                                                </div>
                                              </div>
                                              <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
                                                <div
                                                  style={{ width: `${tsk.percentageOfDay}%` }}
                                                  className={`h-full ${color.bg}`}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Employee Time & Activity Utilization for <strong className="text-slate-800">{user.name}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
