import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskStatus } from '../../types';
import {
  X,
  Clock,
  AlertTriangle,
  Edit,
} from 'lucide-react';
import {
  isTaskOverdue,
  getDaysOverdue,
} from '../../utils/calculations';

interface ViewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
}

export const ViewTaskModal: React.FC<ViewTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onEdit,
}) => {
  const {
    timeSessions,
    updateTask,
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const taskSessions = timeSessions.filter(s => s.taskId === task.id);
  const overdue = isTaskOverdue(task);
  const daysOverdue = getDaysOverdue(task);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Not Started':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                {task.id}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getStatusBadge(
                  task.status
                )}`}
              >
                {task.status}
              </span>
              {overdue && (
                <span className="text-xs bg-rose-500 text-white px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue ({daysOverdue}d)
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              {task.taskName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Edit Task"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {/* Time Sessions History & Detailed Timestamps */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Time Sessions & Timestamps ({taskSessions.length})
              </span>
              <span className="text-slate-500 font-normal">
                Total Actual: <strong className="text-slate-800 font-mono">{task.actualHours}h</strong>
              </span>
            </h4>

            {taskSessions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs bg-slate-50/50">
                No time sessions recorded yet for this task.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Start Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">End Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Duration</th>
                      <th className="py-2.5 px-3 font-semibold">Logged Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taskSessions.map(ses => {
                      const startTimeFormatted = formatTimeOnly(ses.startTime);
                      const endTimeFormatted = formatTimeOnly(ses.endTime);
                      const dateStr = ses.startTime.split('T')[0];

                      return (
                        <tr key={ses.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{dateStr}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">
                            {startTimeFormatted}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">
                            {endTimeFormatted}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 font-mono text-right">
                            {ses.durationHours}h
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                            {formatDateTime(ses.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">
                            {ses.isManual && (
                              <span className="mr-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">
                                Manual
                              </span>
                            )}
                            {ses.notes || ses.manualReason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
