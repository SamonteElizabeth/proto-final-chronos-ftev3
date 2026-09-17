import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, WorkingSchedule } from '../../types';
import { X, Clock, Calendar, Check } from 'lucide-react';

interface WorkScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

// Days of week representation: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
interface DayOption {
  dayIndex: number;
  label: string;
}

const LEFT_COLUMN_DAYS: DayOption[] = [
  { dayIndex: 1, label: 'Monday' },
  { dayIndex: 3, label: 'Wednesday' },
  { dayIndex: 5, label: 'Friday' },
  { dayIndex: 0, label: 'Sunday' },
];

const RIGHT_COLUMN_DAYS: DayOption[] = [
  { dayIndex: 2, label: 'Tuesday' },
  { dayIndex: 4, label: 'Thursday' },
  { dayIndex: 6, label: 'Saturday' },
];

// Helper to convert 24h string (e.g. "08:30" or "18:30") to 12h AM/PM string ("08:30 AM", "06:30 PM")
function formatTo12Hour(time24: string): string {
  if (!time24) return '08:30 AM';
  const parts = time24.split(':');
  let hour = parseInt(parts[0] || '8', 10);
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
}

// Helper to convert 12h string ("08:30 AM") to 24h string ("08:30")
function parseTo24Hour(time12: string): string {
  if (!time12) return '08:30';
  const clean = time12.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timeOnly = clean.replace(/AM|PM/g, '').trim();
  const [hStr, mStr] = timeOnly.split(':');
  let h = parseInt(hStr || '8', 10);
  const m = mStr || '00';

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return `${String(h).padStart(2, '0')}:${m}`;
}

// Calculate work duration in hours between 24h start and end times
function calculateDurationHours(start24: string, end24: string): number {
  try {
    const [sH, sM] = start24.split(':').map(Number);
    const [eH, eM] = end24.split(':').map(Number);
    let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // next day rollover
    const hours = diffMinutes / 60;
    return Math.round(hours * 10) / 10;
  } catch {
    return 10;
  }
}

export const WorkScheduleSettingsModal: React.FC<WorkScheduleSettingsModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const {
    currentUser,
    workingSchedules,
    updateWorkingSchedule,
    createWorkingSchedule,
    updateUser,
    activeTimer,
    showToast,
  } = useApp();

  const user = targetUser || currentUser;

  // Find existing working schedule for user
  const userSchedule = useMemo(() => {
    return (
      workingSchedules.find(s => s.id === user.workingScheduleId) ||
      workingSchedules[0] || {
        id: 'SCH-001',
        name: 'Standard 8.5-Hour (Mon-Fri)',
        hoursPerDay: 10,
        workingDays: [1, 2, 3, 4, 5],
        startTime: '08:30',
        endTime: '18:30',
        breakHours: 0,
      }
    );
  }, [workingSchedules, user]);

  const [startTime24, setStartTime24] = useState('08:30');
  const [endTime24, setEndTime24] = useState('18:30');
  const [startTimeDisplay, setStartTimeDisplay] = useState('08:30 AM');
  const [endTimeDisplay, setEndTimeDisplay] = useState('06:30 PM');
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [isEditingEndTime, setIsEditingEndTime] = useState(false);

  // Rest days array (0 to 6). Working days = [0..6] minus restDays.
  // In the image, Saturday (6) and Sunday (0) are checked.
  const [restDays, setRestDays] = useState<number[]>([6, 0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if there are pending time requests or active timer
  const hasPendingRequests = Boolean(activeTimer && activeTimer.userId === user.id);

  useEffect(() => {
    if (isOpen) {
      const sTime = userSchedule.startTime || '08:30';
      const eTime = userSchedule.endTime || '18:30';
      setStartTime24(sTime);
      setEndTime24(eTime);
      setStartTimeDisplay(formatTo12Hour(sTime));
      setEndTimeDisplay(formatTo12Hour(eTime));

      // Derive rest days from working days
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      const currentWorkingDays = userSchedule.workingDays || [1, 2, 3, 4, 5];
      const currentRestDays = allDays.filter(d => !currentWorkingDays.includes(d));
      // Default to Saturday & Sunday if empty
      setRestDays(currentRestDays.length > 0 ? currentRestDays : [6, 0]);
      setErrorMsg(null);
      setIsEditingStartTime(false);
      setIsEditingEndTime(false);
    }
  }, [isOpen, userSchedule]);

  const durationHours = useMemo(() => {
    return calculateDurationHours(startTime24, endTime24);
  }, [startTime24, endTime24]);

  if (!isOpen) return null;

  const toggleRestDay = (dayIndex: number) => {
    setRestDays(prev => {
      let next: number[];
      if (prev.includes(dayIndex)) {
        next = prev.filter(d => d !== dayIndex);
      } else {
        if (prev.length >= 2) {
          // If already 2 selected, replace oldest or keep 2
          next = [...prev.slice(1), dayIndex];
        } else {
          next = [...prev, dayIndex];
        }
      }
      return next;
    });
    setErrorMsg(null);
  };

  const handleStartTimeChange = (val: string) => {
    setStartTimeDisplay(val);
    const converted24 = parseTo24Hour(val);
    setStartTime24(converted24);
  };

  const handleEndTimeChange = (val: string) => {
    setEndTimeDisplay(val);
    const converted24 = parseTo24Hour(val);
    setEndTime24(converted24);
  };

  const handleSave = () => {
    if (restDays.length < 1 || restDays.length > 2) {
      setErrorMsg('Please select 1 to 2 rest days.');
      return;
    }

    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const newWorkingDays = allDays.filter(d => !restDays.includes(d));

    // Update or create custom schedule for user
    const scheduleName = `Custom (${user.name}) ${durationHours}h`;
    
    if (userSchedule && userSchedule.id.startsWith('SCH-USR-')) {
      updateWorkingSchedule(userSchedule.id, {
        name: scheduleName,
        hoursPerDay: durationHours,
        netWorkHoursPerDay: durationHours >= 1 ? durationHours - 1 : durationHours,
        workingDays: newWorkingDays,
        startTime: startTime24,
        endTime: endTime24,
        breakHours: 1,
        breakBreakdown: {
          lunchBreakMinutes: 60,
          lunchTimeRange: '12:00 PM - 01:00 PM',
          morningBreakMinutes: 0,
          afternoonBreakMinutes: 0,
        },
      });
    } else {
      const newSchedId = `SCH-USR-${user.id}`;
      createWorkingSchedule({
        name: scheduleName,
        hoursPerDay: durationHours,
        netWorkHoursPerDay: durationHours >= 1 ? durationHours - 1 : durationHours,
        workingDays: newWorkingDays,
        startTime: startTime24,
        endTime: endTime24,
        breakHours: 1,
        breakBreakdown: {
          lunchBreakMinutes: 60,
          lunchTimeRange: '12:00 PM - 01:00 PM',
          morningBreakMinutes: 0,
          afternoonBreakMinutes: 0,
        },
      });
      updateUser(user.id, {
        workingScheduleId: newSchedId,
      });
    }

    showToast(
      'success',
      'Work Schedule Updated',
      `Work schedule set to ${startTimeDisplay} - ${endTimeDisplay} (${durationHours} hours shift with 1 hour total break).`
    );
    onClose();
  };

  const isRestDayChecked = (dayIndex: number) => restDays.includes(dayIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-[430px] w-full p-6 sm:p-7 relative animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Work Schedule Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner Message: Exact styling from screenshot */}
        <div className="mb-5 p-3 rounded-lg border border-red-200/90 bg-red-50/60 text-red-700 text-xs leading-relaxed">
          You cannot change your work schedule while there are pending time request.
        </div>

        <div className="space-y-4.5">
          {/* Start Time Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Start Time
            </label>
            <div className="relative">
              {isEditingStartTime ? (
                <input
                  type="time"
                  value={startTime24}
                  onChange={e => {
                    setStartTime24(e.target.value);
                    setStartTimeDisplay(formatTo12Hour(e.target.value));
                  }}
                  onBlur={() => setIsEditingStartTime(false)}
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={startTimeDisplay}
                  onClick={() => setIsEditingStartTime(true)}
                  onChange={e => handleStartTimeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  placeholder="08:30 AM"
                />
              )}
            </div>
          </div>

          {/* End Time Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              End Time
            </label>
            <div className="relative">
              {isEditingEndTime ? (
                <input
                  type="time"
                  value={endTime24}
                  onChange={e => {
                    setEndTime24(e.target.value);
                    setEndTimeDisplay(formatTo12Hour(e.target.value));
                  }}
                  onBlur={() => setIsEditingEndTime(false)}
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={endTimeDisplay}
                  onClick={() => setIsEditingEndTime(true)}
                  onChange={e => handleEndTimeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  placeholder="06:30 PM"
                />
              )}
            </div>
          </div>

          {/* Work Duration & Net Working Hours */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>Shift Duration</span>
              <span className="text-slate-900 font-mono font-bold">{durationHours} hours</span>
            </div>

            {/* Scheduled Breaks Section */}
            <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Scheduled Break:</span>
                <span className="font-bold text-slate-800 font-mono">1 hour total</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-1">
                <span>Net Working Time:</span>
                <span className="font-mono font-bold">
                  {Math.max(0, durationHours - 1).toFixed(1)} hours/day
                </span>
              </div>
            </div>
          </div>

          {/* Rest Days (1-2 required) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-slate-800">
                Rest Days <span className="font-normal text-slate-500">(1-2 required)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {restDays.length} / 2 selected
              </span>
            </div>

            {/* 2-Column Grid as shown in image */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Left Column: Monday, Wednesday, Friday, Sunday */}
              <div className="space-y-3">
                {LEFT_COLUMN_DAYS.map(day => {
                  const checked = isRestDayChecked(day.dayIndex);
                  return (
                    <label
                      key={day.dayIndex}
                      className="flex items-center gap-2.5 text-xs cursor-pointer select-none group"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRestDay(day.dayIndex)}
                        className="hidden"
                      />
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                          checked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={checked ? 'text-slate-800 font-medium' : 'text-slate-400 font-normal'}>
                        {day.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Right Column: Tuesday, Thursday, Saturday */}
              <div className="space-y-3">
                {RIGHT_COLUMN_DAYS.map(day => {
                  const checked = isRestDayChecked(day.dayIndex);
                  return (
                    <label
                      key={day.dayIndex}
                      className="flex items-center gap-2.5 text-xs cursor-pointer select-none group"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRestDay(day.dayIndex)}
                        className="hidden"
                      />
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                          checked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={checked ? 'text-slate-800 font-medium' : 'text-slate-400 font-normal'}>
                        {day.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 mt-2 font-medium">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
