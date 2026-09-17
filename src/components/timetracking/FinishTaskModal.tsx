import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import {
  X,
  CheckCircle2,
  Check,
  FileText,
  Timer,
  AlertCircle,
} from 'lucide-react';
import { formatSecondsToTimer } from '../../utils/calculations';

interface FinishTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  isTimerActiveForTask?: boolean;
  activeTimerElapsedSeconds?: number;
  onConfirmFinish: (taskId: string, remarks: string) => void;
}

export const FinishTaskModal: React.FC<FinishTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  isTimerActiveForTask = false,
  activeTimerElapsedSeconds = 0,
  onConfirmFinish,
}) => {
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      setRemarks(task.remarks || '');
    } else {
      setRemarks('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const baseSeconds = Math.round((task.actualHours || 0) * 3600);
  const totalDisplaySeconds = isTimerActiveForTask
    ? baseSeconds + activeTimerElapsedSeconds
    : baseSeconds;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmFinish(task.id, remarks.trim());
  };

  return (
    <div
      id="finish-task-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="finish-task-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 my-8"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Finish Task
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record completion remarks before marking as finished
              </p>
            </div>
          </div>
          <button
            id="close-finish-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

                {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs sm:text-sm">
            {/* Total Tracked Time */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                Total Tracked Time
              </span>

              <span className="font-bold text-emerald-700 font-mono text-sm">
                {formatSecondsToTimer(totalDisplaySeconds)}
              </span>
            </div>
            {/* Active Timer Notification Banner */}
            {isTimerActiveForTask && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-800 text-xs">
                <Timer className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-semibold">Active Timer Running</p>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    Stopping and logging current active timer session (+{formatSecondsToTimer(activeTimerElapsedSeconds)}) automatically upon task completion.
                  </p>
                </div>
              </div>
            )}

            {/* Remarks Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="task-completion-remarks"
                className="block text-xs font-bold text-slate-800 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Completion Remarks</span>
              </label>
              <textarea
                id="task-completion-remarks"
                rows={4}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Enter completion remarks, deliverable links, summary of accomplishments, or handover notes..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-y"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400" />
                These remarks will be saved to the task record and audit history.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              id="cancel-finish-task-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-finish-task-btn"
              type="submit"
              className="px-4.5 py-2 text-xs font-semibold rounded-xl transition-colors bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Complete Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
