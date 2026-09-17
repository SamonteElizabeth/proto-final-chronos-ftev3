import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Clock, AlertCircle, ShieldAlert } from 'lucide-react';

interface ManualTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualTimeModal: React.FC<ManualTimeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tasks, users, currentUser, addManualTimeSession } = useApp();

  const [taskId, setTaskId] = useState('');
  const [userId, setUserId] = useState(currentUser.id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [durationHours, setDurationHours] = useState<number | ''>(2);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);

    if (newStart && newEnd) {
      const [sh, sm] = newStart.split(':').map(Number);
      const [eh, em] = newEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (endMin > startMin) {
        const diffHours = Number(((endMin - startMin) / 60).toFixed(2));
        setDurationHours(diffHours);
      }
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!taskId) {
      errs.taskId = 'Please select a task.';
    }
    if (!userId) {
      errs.userId = 'Please select an employee.';
    }
    if (!date) {
      errs.date = 'Date is required.';
    }
    if (!durationHours || durationHours <= 0) {
      errs.durationHours = 'Duration must be greater than 0.';
    }
    if (!reason.trim()) {
      errs.reason = 'A formal adjustment reason is mandatory (Rule BR-010).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startISO = new Date(`${date}T${startTime}:00`).toISOString();
    const endISO = new Date(`${date}T${endTime}:00`).toISOString();

    const success = addManualTimeSession({
      taskId,
      userId,
      startTime: startISO,
      endTime: endISO,
      durationHours: Number(durationHours),
      notes: notes.trim(),
      reason: reason.trim(),
    });

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Manual Time Adjustment</h3>
              <p className="text-xs text-slate-500">Log past effort or retroactively adjust task hours</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Task */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Task <span className="text-rose-500">*</span>
            </label>
            <select
              value={taskId}
              onChange={e => {
                setTaskId(e.target.value);
                if (errors.taskId) setErrors(prev => ({ ...prev, taskId: '' }));
              }}
              className={`w-full px-3 py-2 text-xs rounded-lg border ${
                errors.taskId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white`}
            >
              <option value="">Choose a task...</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.taskName}
                </option>
              ))}
            </select>
            {errors.taskId && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.taskId}
              </p>
            )}
          </div>

          {/* Employee Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Employee
            </label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
            >
              {users
                .filter(u => u.status === 'Active')
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Date and Time Pickers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => handleTimeChange(e.target.value, endTime)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => handleTimeChange(startTime, e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Calculated Duration (Hours) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              min="0.1"
              value={durationHours}
              onChange={e => {
                const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                setDurationHours(val);
                if (errors.durationHours) setErrors(prev => ({ ...prev, durationHours: '' }));
              }}
              className={`w-full px-3 py-2 text-xs rounded-lg border ${
                errors.durationHours ? 'border-rose-400' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800`}
            />
          </div>

          {/* Reason (MANDATORY RULE BR-010) */}
          <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/70 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Mandatory Compliance Reason (BR-010)</span>
            </div>
            <textarea
              rows={2}
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
              }}
              placeholder="Provide justification for manual adjustment (e.g. Offline site visit, forgotten timer stop)..."
              className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                errors.reason ? 'border-rose-400 bg-rose-50' : 'border-amber-200'
              } focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 bg-white resize-none`}
            />
            {errors.reason && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.reason}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activity Description (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Summary of work performed during this session..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Record Time Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
