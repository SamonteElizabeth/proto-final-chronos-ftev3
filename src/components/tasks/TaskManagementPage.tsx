import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Edit,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronDown,
  CheckSquare,
  Square as SquareIcon,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  isTaskOverdue,
  getDaysOverdue,
  formatHours,
} from '../../utils/calculations';
import { exportToExcel } from '../../utils/exportUtils';
import { ConfirmModal } from '../common/ConfirmModal';
import { TimeCorrectionModal } from '../timecorrection/TimeCorrectionModal';

interface TaskManagementPageProps {
  onOpenNewTask: () => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

type SortField =
  | 'id'
  | 'taskName'
  | 'assignedUserId'
  | 'startDate'
  | 'endDate'
  | 'shiftHours'
  | 'plannedHours'
  | 'actualHours'
  | 'variance'
  | 'status';

export const TaskManagementPage: React.FC<TaskManagementPageProps> = ({
  onOpenNewTask,
  onViewTask,
  onEditTask,
}) => {
  const {
    tasks,
    users,
    departments,
    categoryConfig,
    updateTask,
    deleteTask,
    keepOnlySampleTasks,
    currentUser,
  } = useApp();

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Confirmation Modals State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskForRequest, setTaskForRequest] = useState<Task | null>(null);
  const [isCleanSampleOpen, setIsCleanSampleOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // All users in Time & Activity Log see their own tasks
  const accessibleTasks = useMemo(() => {
    return tasks.filter(t => t.assignedUserId === currentUser.id || t.createdBy === currentUser.id);
  }, [tasks, currentUser.id]);

  const filteredTasks = useMemo(() => {
    return accessibleTasks.filter(task => {
      if (selectedStatus && task.status !== selectedStatus) return false;
      if (onlyOverdue && !isTaskOverdue(task)) return false;

      if (search) {
        const query = search.toLowerCase();
        const matchesName = task.taskName.toLowerCase().includes(query);
        const matchesId = task.id.toLowerCase().includes(query);
        const matchesDesc = task.description.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDesc) return false;
      }
      return true;
    });
  }, [
    accessibleTasks,
    selectedStatus,
    onlyOverdue,
    search,
  ]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' || typeof valB === 'number') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [filteredTasks, sortField, sortDirection]);

  // Export handlers
  const handleExportExcel = () => {
    const exportData = sortedTasks.map(t => {
      const u = users.find(usr => usr.id === t.assignedUserId);
      const d = departments.find(dept => dept.id === t.departmentId);
      const shiftH = t.shiftHours || t.plannedHours || 0;
      return {
        'Task ID': t.id,
        'Task Name': t.taskName,
        'Task Type': t.taskType,
        'Priority': t.priority,
        'Assigned Employee': u?.name || t.assignedUserId,
        'Department': d?.name || t.departmentId,
        'Start Date': t.startDate,
        'End Date': t.endDate || 'N/A',
        'Target Hour': shiftH,
        'Actual (Hours)': t.actualHours,
        'Variance (Hours)': t.variance,
        'Variance (%)': `${t.variancePercent}%`,
        'Status': t.status,
        'Overdue': isTaskOverdue(t) ? 'YES' : 'NO',
        'Remarks': t.remarks,
      };
    });

    exportToExcel(
      {
        reportName: 'My Time & Activity Log',
        generatedDate: new Date().toLocaleString(),
        generatedBy: `${currentUser.name} (${currentUser.role})`,
        filtersApplied: {
          Scope: 'My Assigned Tasks',
          Status: selectedStatus || 'All',
          OverdueOnly: onlyOverdue ? 'Yes' : 'No',
        },
        summaryKpis: {
          'Total Tasks': sortedTasks.length,
          'Total Target Hours': `${sortedTasks.reduce((sum, t) => sum + (t.shiftHours || t.plannedHours || 0), 0)}h`,
          'Total Actual Hours': `${sortedTasks.reduce((sum, t) => sum + t.actualHours, 0).toFixed(1)}h`,
        },
      },
      exportData,
      'My_Time_Activity_Log_Export'
    );
  };

  return (
    <div className="space-y-5">
      {/* Delete Single Task Confirmation Modal */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        title={`Delete Task "${taskToDelete?.taskName || ''}"?`}
        message={`Are you sure you want to delete task ${taskToDelete?.id}? All recorded time tracking sessions for this task will also be removed.`}
        confirmLabel="Delete Task"
        variant="danger"
      />

      {/* Clean Sample Tasks Confirmation Modal */}
      <ConfirmModal
        isOpen={isCleanSampleOpen}
        onClose={() => setIsCleanSampleOpen(false)}
        onConfirm={() => {
          keepOnlySampleTasks(3);
          setIsCleanSampleOpen(false);
        }}
        title="Retain Exactly 3 Sample Tasks?"
        message="This will delete extra tasks and preserve 3 sample tasks in the system."
        confirmLabel="Keep 3 Tasks"
        variant="warning"
      />

      {/* Top Header & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Time & Activity Log
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tasks.length > 3 && (
            <button
              onClick={() => setIsCleanSampleOpen(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-xl border border-amber-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete extra sample tasks and leave 3 sample tasks"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Keep 3 Sample Tasks
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
          <button
            onClick={onOpenNewTask}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search my tasks..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
          >
            <option value="">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Quick Filter Pill for Overdue */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyOverdue(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                onlyOverdue
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Only Overdue Tasks
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-medium">
              Showing <strong>{sortedTasks.length}</strong> of {accessibleTasks.length} my task(s)
            </span>
          </div>

          <button
            onClick={() => {
              setSearch('');
              setSelectedStatus('');
              setOnlyOverdue(false);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Main Task Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 select-none">
              <tr>
                <th
                  onClick={() => handleSort('taskName')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1">
                    Task Name <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('startDate')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600 hidden lg:table-cell"
                >
                  <div className="flex items-center gap-1">
                    Start <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('endDate')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1">
                    End Date <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('shiftHours')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Target Hour <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('actualHours')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Actual <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('variance')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Variance <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                sortedTasks.map(task => {
                  const overdue = isTaskOverdue(task);
                  const days = getDaysOverdue(task);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onViewTask(task)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[260px] truncate">
                        {task.taskName}
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap hidden lg:table-cell">
                        {task.startDate}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {task.endDate ? (
                          <>
                            <span
                              className={`font-medium ${
                                overdue ? 'text-rose-600 font-bold' : 'text-slate-700'
                              }`}
                            >
                              {task.endDate}
                            </span>
                            {overdue && (
                              <span className="block text-[9px] font-bold text-rose-600 uppercase">
                                +{days}d Overdue
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Due Date</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-medium text-right font-mono">
                        {task.shiftHours || task.plannedHours || 0}h
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 text-right font-mono">
                        {task.actualHours}h
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono">
                        <span
                          className={`font-semibold ${
                            task.variance > 0
                              ? 'text-rose-600 font-bold'
                              : task.variance < 0
                              ? 'text-emerald-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {task.variance > 0 ? `+${task.variance}h` : `${task.variance}h`}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {task.variancePercent > 0
                            ? `+${task.variancePercent}%`
                            : `${task.variancePercent}%`}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : task.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3.5 text-right whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditTask(task)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Submit Request Modal (Time Correction) */}
      <TimeCorrectionModal
        isOpen={Boolean(taskForRequest)}
        onClose={() => setTaskForRequest(null)}
        initialTaskId={taskForRequest?.id}
      />
    </div>
  );
};
