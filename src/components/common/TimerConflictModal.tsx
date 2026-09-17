import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Play, X } from 'lucide-react';
import { formatSecondsToTimer } from '../../utils/calculations';

export const TimerConflictModal: React.FC = () => {
  const {
    pendingTimerConflict,
    cancelTimerConflict,
    startTimer,
    timerElapsedSeconds,
  } = useApp();

  if (!pendingTimerConflict) return null;

  const { currentTask, newTask } = pendingTimerConflict;

  const handleStopAndStart = () => {
    startTimer(newTask, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in zoom-in-95">
        <div className="flex items-center gap-3 text-amber-600 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Timer Conflict</h3>
            <p className="text-xs text-slate-500">Multiple simultaneous timers are restricted</p>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-4 mb-5">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            You currently have an active timer for{' '}
            <span className="font-semibold text-slate-900">"{currentTask.taskName}"</span> ({formatSecondsToTimer(timerElapsedSeconds)}). Stop the current timer before starting another task.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/70 mb-6 text-xs text-slate-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Target Task:</span>
            <span className="font-medium text-slate-800 truncate max-w-[240px]">{newTask.taskName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Task ID:</span>
            <span className="font-mono font-medium text-slate-800">{newTask.id}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={cancelTimerConflict}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStopAndStart}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Stop Current & Start New Task
          </button>
        </div>
      </div>
    </div>
  );
};
