import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TimeSession } from '../../types';
import {
  X,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
} from 'lucide-react';

interface TimeCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: TimeSession | null;
  initialTaskId?: string;
  defaultType?: 'CORRECTION' | 'OT';
}

export const TimeCorrectionModal: React.FC<TimeCorrectionModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  initialTaskId,
  defaultType = 'CORRECTION',
}) => {
  const {
    tasks,
    currentUser,
    addManualTimeSession,
    updateTimeSession,
  } = useApp();

  const isEditMode = Boolean(sessionToEdit);

  // Form states matching user request modal
  const [requestType, setRequestType] = useState<'CORRECTION' | 'OT'>(defaultType);
  const [taskId, setTaskId] = useState('');
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expectedImpact, setExpectedImpact] = useState('');

  // Auto-calculated duration
  const calculation = useMemo(() => {
    if (!startTime || !endTime) {
      return { hours: 0, formatted: '0.00 hrs', valid: false, error: 'Start and End Time required' };
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
      return { hours: 0, formatted: '0.00 hrs', valid: false, error: 'Invalid time format' };
    }

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diffMinutes = endMinutes - startMinutes;

    if (diffMinutes <= 0) {
      return {
        hours: 0,
        formatted: '0.00 hrs',
        valid: false,
        error: 'End Time must be later than Start Time',
      };
    }

    const hoursDecimal = Number((diffMinutes / 60).toFixed(2));
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    const readable = m > 0 ? `${hoursDecimal} hrs (${h}h ${m}m)` : `${hoursDecimal} hrs (${h}h)`;

    return {
      hours: hoursDecimal,
      formatted: readable,
      valid: true,
      error: '',
    };
  }, [startTime, endTime]);

  // Initialize or reset form
  useEffect(() => {
    if (sessionToEdit) {
      setTaskId(sessionToEdit.taskId);
      const isOt = sessionToEdit.isOvertime || sessionToEdit.timeEntryType === 'OT';
      setRequestType(isOt ? 'OT' : 'CORRECTION');
      const sessionDate = sessionToEdit.startTime.split('T')[0] || new Date().toISOString().split('T')[0];
      setWorkDate(sessionDate);

      try {
        const sTime = new Date(sessionToEdit.startTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const eTime = new Date(sessionToEdit.endTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setStartTime(sTime || '09:00');
        setEndTime(eTime || '11:00');
      } catch {
        setStartTime('09:00');
        setEndTime('11:00');
      }

      setReason(sessionToEdit.manualReason || sessionToEdit.correctionType || '');
      setJustification(sessionToEdit.notes || '');
      setErrors({});
    } else {
      setRequestType(defaultType);
      if (initialTaskId) {
        setTaskId(initialTaskId);
      } else {
        setTaskId(tasks.length > 0 ? tasks[0].id : '');
      }
      setWorkDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('11:00');
      setReason('');
      setJustification('');
      setErrors({});
    }
  }, [sessionToEdit, isOpen, currentUser, tasks, initialTaskId, defaultType]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!taskId) {
      errs.taskId = 'Please select a related task.';
    }
    if (!workDate) {
      errs.workDate = 'Date is required.';
    }
    if (!startTime) {
      errs.startTime = 'Start Time is required.';
    }
    if (!endTime) {
      errs.endTime = 'End Time is required.';
    }
    if (!calculation.valid) {
      errs.endTime = calculation.error || 'End Time must be after Start Time.';
    }
    if (!reason.trim()) {
      errs.reason = 'Please provide a reason.';
    }
    if (!justification.trim()) {
      errs.justification = 'Please provide detailed justification.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startISO = new Date(`${workDate}T${startTime}:00`).toISOString();
    const endISO = new Date(`${workDate}T${endTime}:00`).toISOString();
    const isOt = requestType === 'OT';
    const entryType = isOt ? 'OT' : 'Regular';
    const cleanReason = reason.trim();
    const cleanJustification = justification.trim();
    const combinedNotes = cleanJustification
      ? `${cleanReason} - ${cleanJustification}`
      : cleanReason;

    const selectedTask = tasks.find(t => t.id === taskId);
    const targetUserId =
      currentUser.role === 'TASK_USER' || !selectedTask?.assignedUserId
        ? currentUser.id
        : selectedTask.assignedUserId;

    if (isEditMode && sessionToEdit) {
      const success = updateTimeSession(
        sessionToEdit.id,
        {
          taskId,
          userId: targetUserId,
          startTime: startISO,
          endTime: endISO,
          durationHours: calculation.hours,
          notes: combinedNotes,
          correctionType: cleanReason,
          timeEntryType: entryType,
          isOvertime: isOt,
        },
        cleanReason
      );
      if (success) onClose();
    } else {
      const success = addManualTimeSession({
        taskId,
        userId: targetUserId,
        startTime: startISO,
        endTime: endISO,
        durationHours: calculation.hours,
        notes: combinedNotes,
        reason: cleanReason,
        correctionType: cleanReason,
        timeEntryType: entryType,
        isOvertime: isOt,
      });
      if (success) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full text-slate-800 animate-in zoom-in-95 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isEditMode ? 'Edit Request' : 'Submit Request'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Request approval for time-related changes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Request Type * (Only Time Correction and OT) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Request Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Time Correction */}
              <button
                type="button"
                onClick={() => {
                  setRequestType('CORRECTION');
                  if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
                }}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  requestType === 'CORRECTION'
                    ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/40 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-900 leading-tight">
                      Time Correction
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">
                      Correct previously logged time entries
                    </span>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                    requestType === 'CORRECTION'
                      ? 'border-blue-600 bg-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {requestType === 'CORRECTION' && (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>

              {/* Option 2: Overtime Request */}
              <button
                type="button"
                onClick={() => {
                  setRequestType('OT');
                  if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
                }}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  requestType === 'OT'
                    ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/40 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-900 leading-tight">
                      Overtime Request
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">
                      Request approval for overtime work
                    </span>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                    requestType === 'OT'
                      ? 'border-blue-600 bg-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {requestType === 'OT' && (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Related Task * */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Related Task <span className="text-rose-500">*</span>
            </label>
            <select
              value={taskId}
              onChange={e => {
                setTaskId(e.target.value);
                if (errors.taskId) setErrors(prev => ({ ...prev, taskId: '' }));
              }}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                errors.taskId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800`}
            >
              <option value="">Select a task</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.taskName} ({t.status})
                </option>
              ))}
            </select>
            {errors.taskId && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.taskId}
              </p>
            )}
          </div>

          {/* Date * */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {requestType === 'OT' ? 'Overtime Date' : 'Correction Date'}{' '}
                <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={workDate}
              onChange={e => {
                setWorkDate(e.target.value);
                if (errors.workDate) setErrors(prev => ({ ...prev, workDate: '' }));
              }}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                errors.workDate ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800`}
            />
            {errors.workDate && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.workDate}
              </p>
            )}
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Time <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => {
                  setStartTime(e.target.value);
                  if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }));
                  if (errors.endTime) setErrors(prev => ({ ...prev, endTime: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                  errors.startTime ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800`}
              />
              {errors.startTime && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.startTime}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>End Time <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => {
                  setEndTime(e.target.value);
                  if (errors.endTime) setErrors(prev => ({ ...prev, endTime: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                  errors.endTime ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800`}
              />
              {errors.endTime && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Duration Indicator */}
          <div className="flex items-center justify-between text-xs px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Requested Duration:</span>
            <span
              className={`font-bold font-mono px-2 py-0.5 rounded-lg border ${
                calculation.valid
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200 text-[11px]'
              }`}
            >
              {calculation.valid ? calculation.formatted : calculation.error || '0.00 hrs'}
            </span>
          </div>
{/* Reason */}
<div>
  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
    Reason
  </label>
  <input
    type="text"
    value={reason}
    onChange={e => {
      setReason(e.target.value);
      if (errors.reason) setErrors(prev => ({ ...prev, reason: '' }));
    }}
    placeholder="Brief reason for this request"
    list="request-reasons-list"
    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
      errors.reason ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
    } focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 placeholder:text-slate-400`}
  />

  <datalist id="request-reasons-list">
    {requestType === 'OT' ? (
      <>
        <option value="Urgent Client Deliverable / Release" />
        <option value="Critical Bug Resolution / Escalation" />
        <option value="Unplanned Project Workload Spike" />
        <option value="System / Network Maintenance Window" />
        <option value="End of Sprint Task Completion" />
      </>
    ) : (
      <>
        <option value="Forgot to Start Timer" />
        <option value="Forgot to Stop Timer" />
        <option value="Incorrect Live Timer" />
        <option value="Offline / Interrupted Work" />
        <option value="Meeting / Call Outside Tracker" />
        <option value="System / Network Disruption" />
        <option value="General Correction" />
      </>
    )}
  </datalist>
</div>

{/* Detailed Justification */}
<div>
  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
    Detailed Justification
  </label>
  <textarea
    rows={3}
    value={justification}
    onChange={e => {
      setJustification(e.target.value);
      if (errors.justification) {
        setErrors(prev => ({ ...prev, justification: '' }));
      }
    }}
    placeholder="Provide detailed justification for this request..."
    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 placeholder:text-slate-400 resize-none"
  />
</div>

{/* Expected Impact */}
<div>
  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
    Expected Impact
  </label>
  <textarea
    rows={3}
    value={expectedImpact}
    onChange={e => setExpectedImpact(e.target.value)}
    placeholder="Describe the expected impact of this request..."
    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 placeholder:text-slate-400 resize-none"
  />
</div>
        
          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isEditMode ? 'Save Changes' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

