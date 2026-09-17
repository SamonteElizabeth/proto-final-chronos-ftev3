import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import {
  Search,
  Plus,
  Play,
  Square,
  SquarePen,
  Calendar,
  AlertTriangle,
  LayoutGrid,
  List,
  Check,
  Clock,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { formatSecondsToTimer, isTaskOverdue } from '../../utils/calculations';
import { FinishTaskModal } from './FinishTaskModal';
import { TimeCorrectionModal } from '../timecorrection/TimeCorrectionModal';

interface TimeTrackingPageProps {
  onEditTask?: (task: Task) => void;
  onViewTask?: (task: Task) => void;
}

type StatusFilterTab = 'all' | 'assigned' | 'ongoing' | 'completed';

export const TimeTrackingPage: React.FC<TimeTrackingPageProps> = ({
  onEditTask,
  onViewTask,
}) => {
  const {
    tasks,
    users,
    currentUser,
    activeTimer,
    timerElapsedSeconds,
    startTimer,
    stopTimer,
    updateTask,
    showToast,
  } = useApp();

  // Search, Tab Filter & View Mode states
  const [search, setSearch] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<StatusFilterTab>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [taskToFinish, setTaskToFinish] = useState<Task | null>(null);
  const [taskForRequest, setTaskForRequest] = useState<Task | null>(null);

  // All users in Task Management see their own tasks
  const accessibleTasks = useMemo(() => {
    return tasks.filter(t => t.assignedUserId === currentUser.id || t.createdBy === currentUser.id);
  }, [tasks, currentUser.id]);

  // Status mapping helper
  const mapStatusToTab = (status: TaskStatus): StatusFilterTab => {
    switch (status) {
      case 'Not Started':
        return 'assigned';
      case 'In Progress':
        return 'ongoing';
      case 'Completed':
        return 'completed';
      default:
        return 'assigned';
    }
  };

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      assigned: 0,
      ongoing: 0,
      completed: 0,
    };

    accessibleTasks.forEach(t => {
      counts.all += 1;
      const tab = mapStatusToTab(t.status);
      counts[tab] = (counts[tab] || 0) + 1;
    });

    return counts;
  }, [accessibleTasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return accessibleTasks.filter(task => {
      // Filter by tab
      if (activeStatusTab !== 'all') {
        const tab = mapStatusToTab(task.status);
        if (tab !== activeStatusTab) return false;
      }

      // Filter by search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = task.taskName.toLowerCase().includes(q);
        const matchesId = task.id.toLowerCase().includes(q);
        const matchesDesc = task.description.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesDesc) return false;
      }

      return true;
    });
  }, [accessibleTasks, activeStatusTab, search]);

  // Handle Mark Finished (opens Remarks modal if not yet completed)
  const handleToggleFinished = (task: Task) => {
    if (task.status === 'Completed') {
      updateTask(task.id, { status: 'In Progress' });
      showToast('info', 'Task Reopened', `Task "${task.taskName}" set back to In Progress.`);
    } else {
      setTaskToFinish(task);
    }
  };

  const handleConfirmFinish = (taskId: string, remarks: string) => {
    if (!taskToFinish) return;

    if (activeTimer && activeTimer.taskId === taskId) {
      stopTimer(remarks ? `Task completed: ${remarks}` : 'Task marked as finished');
    }

    updateTask(taskId, {
      status: 'Completed',
      completedAt: new Date().toISOString(),
      remarks: remarks || taskToFinish.remarks || '',
    });

    showToast('success', 'Task Completed', `Task "${taskToFinish.taskName}" marked as finished.`);
    setTaskToFinish(null);
  };

  // Helper for priority pill & dot color
  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'Critical':
      case 'High':
        return {
          dotColor: 'bg-rose-500',
          textColor: 'text-rose-700',
          bgColor: 'bg-rose-50',
          label: priority.toUpperCase(),
          hasWarning: true,
        };
      case 'Medium':
        return {
          dotColor: 'bg-amber-400',
          textColor: 'text-amber-700',
          bgColor: 'bg-amber-50',
          label: 'MEDIUM',
          hasWarning: true,
        };
      case 'Low':
      default:
        return {
          dotColor: 'bg-emerald-400',
          textColor: 'text-emerald-700',
          bgColor: 'bg-emerald-50',
          label: 'LOW',
          hasWarning: false,
        };
    }
  };

  // Helper for status pill color & text
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Not Started':
        return {
          label: 'Not Started',
          className: 'bg-purple-100 text-purple-700',
        };
      case 'In Progress':
        return {
          label: 'In progress',
          className: 'bg-blue-100 text-blue-700',
        };
      case 'Completed':
        return {
          label: 'Completed',
          className: 'bg-emerald-100 text-emerald-700',
        };
      default: {
        const fallbackStatus = (status as string) || 'UNKNOWN';
        return {
          label: fallbackStatus.toUpperCase(),
          className: 'bg-slate-100 text-slate-700',
        };
      }
    }
  };

  // Format date helper (M/D/YYYY)
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const year = parts[0];
        return `${month}/${day}/${year}`;
      }
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Task Management
          </h2>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Search */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search my tasks by title, description, or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Center/Right Filter Tabs and View Switcher */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 text-xs">
            {(
              [
                { id: 'all', label: 'All', count: statusCounts.all },
                { id: 'assigned', label: 'Not Started', count: statusCounts.assigned },
                { id: 'ongoing', label: 'In progress', count: statusCounts.ongoing },
                { id: 'completed', label: 'Completed', count: statusCounts.completed },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeStatusTab === tab.id
                    ? 'bg-blue-100 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Grid vs List View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Cards Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No tasks found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query or status filter.
              </p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const isThisTimerActive = activeTimer?.taskId === task.id;
              const statusBadge = getStatusBadge(task.status);

              // Calculate live display seconds
              const baseSeconds = Math.round((task.actualHours || 0) * 3600);
              const displaySeconds = isThisTimerActive
                ? baseSeconds + timerElapsedSeconds
                : baseSeconds;

              const isOverdue = isTaskOverdue(task);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl border ${
                    isThisTimerActive
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200 shadow-xs hover:border-slate-300'
                  } p-5 flex flex-col justify-between transition-all`}
                >
                  <div>
                    {/* Top Row: Status Pill & Edit Action */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {/* Status Pill & Overdue Indicator */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Overdue</span>
                          </span>
                        )}
                      </div>

                      {/* Edit Icon */}
                      {onEditTask && (
                        <button
                          onClick={() => onEditTask(task)}
                          className="text-blue-600 hover:text-blue-700 p-0.5 rounded transition-colors"
                          title="Edit Task"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Task Title */}
                    <h3
                      onClick={() => onViewTask?.(task)}
                      className="text-base font-bold text-slate-900 tracking-tight hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {task.taskName}
                    </h3>

                    {/* Description or Dash */}
                    <p className="text-xs text-slate-500 mt-0.5 min-h-[18px] line-clamp-1">
                      {task.description ? task.description : '—'}
                    </p>

                    {/* Actual Time Display Box */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl py-4 px-3 text-center my-4">
                      <span className="text-xs text-slate-500 font-medium block mb-1">
                        Actual Time
                      </span>
                      <div
                        className={`text-2xl font-bold font-mono tracking-tight ${
                          isThisTimerActive
                            ? 'text-blue-600 animate-pulse'
                            : 'text-slate-900'
                        }`}
                      >
                        {formatSecondsToTimer(displaySeconds)}
                      </div>
                    </div>

                    {/* Date Metadata */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Start: {formatDisplayDate(task.startDate)} | Due:{' '}
                        {task.endDate ? formatDisplayDate(task.endDate) : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {task.status === 'Completed' ? (
                      /* Finished Task: No Start button, only Finished button */
                      <button
                        onClick={() => handleToggleFinished(task)}
                        className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-xs font-bold rounded-lg shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        title="Task is finished. Click to reopen if needed."
                      >
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                        <span>Finished</span>
                        <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-1">
                          Completed
                        </span>
                      </button>
                    ) : (
                      <>
                        {/* Start / Stop Task Button */}
                        {isThisTimerActive ? (
                          <button
                            onClick={() => stopTimer()}
                            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-white" /> Stop Task
                          </button>
                        ) : (
                          <button
                            onClick={() => startTimer(task)}
                            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" /> Start Task
                          </button>
                        )}

                        {/* Finished Button */}
                        <button
                          onClick={() => handleToggleFinished(task)}
                          className="py-2.5 px-4 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Finished
                        </button>
                      </>
                    )}
                  </div>

                  {/* Submit Request Pill Button matching user image */}
                  <div className="mt-2.5 flex items-center justify-start">
                    <button
                      type="button"
                      onClick={() => setTaskForRequest(task)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                      title="Submit a Change Request (CRF), Time Correction, or Extension for this task"
                    >
                      <FileText className="w-3 h-3 text-emerald-600 stroke-[2.2]" />
                      <span>Submit Request</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* List View Mode */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Task Name</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Actual Time</th>
                  <th className="py-3 px-4 font-semibold">Timeline</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No tasks found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const isThisTimerActive = activeTimer?.taskId === task.id;
                    const priorityInfo = getPriorityStyle(task.priority);
                    const statusBadge = getStatusBadge(task.status);
                    const baseSeconds = Math.round((task.actualHours || 0) * 3600);
                    const displaySeconds = isThisTimerActive
                      ? baseSeconds + timerElapsedSeconds
                      : baseSeconds;

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${priorityInfo.dotColor}`}
                            />
                            <span className="font-bold text-slate-700">
                              {priorityInfo.label}
                            </span>
                            {priorityInfo.hasWarning && (
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <button
                            onClick={() => onViewTask?.(task)}
                            className="hover:text-blue-600 text-left font-semibold"
                          >
                            {task.taskName}
                          </button>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {task.id} • {task.taskType}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span
                            className={
                              isThisTimerActive
                                ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 animate-pulse'
                                : 'text-slate-900'
                            }
                          >
                            {formatSecondsToTimer(displaySeconds)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {formatDisplayDate(task.startDate)}
                          {task.endDate ? ` - ${formatDisplayDate(task.endDate)}` : ''}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status === 'Completed' ? (
                              <button
                                onClick={() => handleToggleFinished(task)}
                                className="px-3 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300/80 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Task is finished. Click to reopen if needed."
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Finished
                              </button>
                            ) : (
                              <>
                                {isThisTimerActive ? (
                                  <button
                                    onClick={() => stopTimer()}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Square className="w-3 h-3 fill-white" /> Stop
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startTimer(task)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Play className="w-3 h-3 fill-white" /> Start
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleFinished(task)}
                                  className="px-2.5 py-1 rounded-lg font-medium text-xs flex items-center gap-1 transition-colors bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                                >
                                  <Check className="w-3 h-3" /> Finished
                                </button>
                              </>
                            )}

                            {/* Submit Request Button */}
                            <button
                              onClick={() => setTaskForRequest(task)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Submit Request (CRF, Time Correction, Extension)"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>Request</span>
                            </button>

                            {onEditTask && (
                              <button
                                onClick={() => onEditTask(task)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Task"
                              >
                                <SquarePen className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Finish Task Remarks Modal */}
      <FinishTaskModal
        isOpen={Boolean(taskToFinish)}
        onClose={() => setTaskToFinish(null)}
        task={taskToFinish}
        isTimerActiveForTask={activeTimer?.taskId === taskToFinish?.id}
        activeTimerElapsedSeconds={timerElapsedSeconds}
        onConfirmFinish={handleConfirmFinish}
      />

      {/* Submit Request Modal (Time Correction) */}
      <TimeCorrectionModal
        isOpen={Boolean(taskForRequest)}
        onClose={() => setTaskForRequest(null)}
        initialTaskId={taskForRequest?.id}
      />
    </div>
  );
};
