import {
  Task,
  TimeSession,
  WorkingSchedule,
  Holiday,
  User,
  WorkloadThresholds,
  CapacityStatus,
} from '../types/index';

/**
 * Checks if a task is overdue:
 * Current Date > End Date AND Status is NOT Completed
 * If no End Date is set, task is not overdue.
 */
export function isTaskOverdue(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.status === 'Completed' || !task.endDate) {
    return false;
  }
  const end = new Date(task.endDate);
  // Set to end of the day in local time for fair comparison
  end.setHours(23, 59, 59, 999);
  return referenceDate.getTime() > end.getTime();
}

/**
 * Calculates days overdue for a task
 */
export function getDaysOverdue(task: Task, referenceDate: Date = new Date()): number {
  if (!isTaskOverdue(task, referenceDate) || !task.endDate) return 0;
  const end = new Date(task.endDate);
  end.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const diffTime = ref.getTime() - end.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Sums all time session durations for a specific task.
 * Note: Only approved sessions (or standard timer sessions without Pending/Rejected status) count.
 */
export function calculateTaskActualHours(taskId: string, sessions: TimeSession[]): number {
  const taskSessions = sessions.filter(
    s => s.taskId === taskId && s.approvalStatus !== 'Pending' && s.approvalStatus !== 'Rejected'
  );
  const totalHours = taskSessions.reduce((sum, s) => sum + s.durationHours, 0);
  return Number(totalHours.toFixed(2));
}

/**
 * Calculates variance and variance percentage against Shift Hours
 */
export function calculateVariance(shiftHours: number, actualHours: number) {
  const variance = Number((actualHours - shiftHours).toFixed(2));
  let variancePercent = 0;
  if (shiftHours > 0) {
    variancePercent = Number((((actualHours - shiftHours) / shiftHours) * 100).toFixed(1));
  }
  return { variance, variancePercent };
}

/**
 * Formats decimal hours into a clean string (e.g. "1h 30m" or "4.5h")
 */
export function formatHours(hours: number): string {
  if (hours === 0 || isNaN(hours)) return '0h 00m';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 60) {
    return `${wholeHours + 1}h 00m`;
  }
  return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Formats total seconds into HH:MM:SS stopwatch string
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculates available working hours for a given date range, schedule, and holidays list.
 * Excludes non-working days (e.g., Saturday/Sunday) and official configured holidays.
 */
export function calculateAvailableWorkingHours(
  startDateStr?: string,
  endDateStr?: string,
  schedule?: WorkingSchedule,
  holidays: Holiday[] = []
): {
  availableHours: number;
  shiftHours: number;
  breakHours: number;
  workingDaysCount: number;
  holidayCount: number;
} {
  const shiftHoursPerDay = schedule?.hoursPerDay || 10;
  const breakHoursPerDay = schedule?.breakHours !== undefined ? schedule.breakHours : 1.0;
  let netHoursPerDay = 9;
  if (schedule?.netWorkHoursPerDay !== undefined && schedule.netWorkHoursPerDay !== 8.5) {
    netHoursPerDay = schedule.netWorkHoursPerDay;
  } else if (schedule?.hoursPerDay && schedule?.breakHours !== undefined) {
    netHoursPerDay = Math.max(1, schedule.hoursPerDay - schedule.breakHours);
  } else {
    netHoursPerDay = 9;
  }

  if (!startDateStr) {
    return {
      availableHours: netHoursPerDay,
      shiftHours: shiftHoursPerDay,
      breakHours: breakHoursPerDay,
      workingDaysCount: 1,
      holidayCount: 0,
    };
  }

  // If no endDate provided, calculate for 1 working day on startDate
  const effectiveEnd = endDateStr || startDateStr;

  const [sY, sM, sD] = startDateStr.split('T')[0].split('-').map(Number);
  const [eY, eM, eD] = effectiveEnd.split('T')[0].split('-').map(Number);

  if (isNaN(sY) || isNaN(eY)) {
    return {
      availableHours: netHoursPerDay,
      shiftHours: shiftHoursPerDay,
      breakHours: breakHoursPerDay,
      workingDaysCount: 1,
      holidayCount: 0,
    };
  }

  // Anchor to noon local time to completely prevent UTC/local day shifting and daylight saving jumps
  const start = new Date(sY, sM - 1, sD || 1, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD || 1, 12, 0, 0);

  if (start > end) {
    return {
      availableHours: 0,
      shiftHours: 0,
      breakHours: 0,
      workingDaysCount: 0,
      holidayCount: 0,
    };
  }

  // Build active holiday lookup: exact date (YYYY-MM-DD) and annual recurring (MM-DD)
  const exactHolidayDates = new Set<string>();
  const recurringHolidayMmDd = new Set<string>();

  for (const h of holidays) {
    // Only exclude when holiday status is Active (default)
    if (h.status === 'Inactive') continue;
    if (!h.date) continue;

    const parts = h.date.split('T')[0].split('-');
    if (parts.length >= 3) {
      const exactKey = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      exactHolidayDates.add(exactKey);

      // Check recurring rule: defaults to Annually for standard holidays
      const isRecurring =
        h.recurring === 'Annually' ||
        h.recurring === true ||
        h.recurring === 'Yes' ||
        h.recurring === undefined; // default is recurring annually if omitted

      if (isRecurring) {
        recurringHolidayMmDd.add(`${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
      }
    }
  }

  // 5-day workweek: Monday to Friday (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri). Saturday (6) & Sunday (0) are off.
  const workingDays = schedule?.workingDays?.length ? schedule.workingDays : [1, 2, 3, 4, 5];

  let workingDaysCount = 0;
  let holidayCount = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const mmDdKey = `${m}-${d}`;

    // Check if day falls within the 5-day workweek schedule (Mon - Fri)
    const isScheduledWorkingDay = workingDays.includes(dayOfWeek);

    if (isScheduledWorkingDay) {
      // Exclude day if it matches an active exact or recurring holiday
      const isHoliday = exactHolidayDates.has(dateKey) || recurringHolidayMmDd.has(mmDdKey);
      if (isHoliday) {
        holidayCount++;
      } else {
        workingDaysCount++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const shiftHours = Number((workingDaysCount * shiftHoursPerDay).toFixed(1));
  const totalBreakHours = Number((workingDaysCount * breakHoursPerDay).toFixed(1));
  const availableHours = Number((workingDaysCount * netHoursPerDay).toFixed(1));

  return {
    availableHours,
    shiftHours,
    breakHours: totalBreakHours,
    workingDaysCount,
    holidayCount,
  };
}

/**
 * Calculates FTE Utilization %
 * Formula: (Actual Tracked Hours / Available Working Hours) * 100
 */
export function calculateFTE(actualHours: number, availableHours: number): number {
  if (availableHours <= 0) return 0;
  const fte = (actualHours / availableHours) * 100;
  return Number(fte.toFixed(2));
}

/**
 * Evaluates employee workload status against FTE thresholds:
 * Status          FTE
 * Under Capacity  < 100%
 * At Capacity     = 100%
 * Over Capacity   > 100%
 */
export function getWorkloadStatus(
  utilizationPercent: number,
  thresholds: WorkloadThresholds = { underCapacity: 100, overCapacity: 100 }
): CapacityStatus {
  const underCutoff = thresholds?.underCapacity ?? 100;
  const overCutoff = thresholds?.overCapacity ?? 100;

  // When standard 100% benchmarks apply:
  if (underCutoff === 100 && overCutoff === 100) {
    if (utilizationPercent < 99.95) {
      return 'Under Capacity';
    } else if (utilizationPercent <= 100.05) {
      return 'At Capacity';
    } else {
      return 'Over Capacity';
    }
  }

  // If custom administrator threshold overrides are active:
  if (utilizationPercent < underCutoff) {
    return 'Under Capacity';
  } else if (utilizationPercent > overCutoff) {
    return 'Over Capacity';
  } else {
    return 'At Capacity';
  }
}

export function isOverCapacity(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('over');
}

export function isAtCapacity(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('at') || s.includes('near');
}

export function isUnderCapacity(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('under');
}

/**
 * Calculates Completion Rate based on formula:
 * Completion Rate = Completed Tasks / Total Tasks * 100
 */
export function calculateCompletionRate(completedTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Number(((completedTasks / totalTasks) * 100).toFixed(1));
}

/**
 * Calculates date range boundaries for preset periods
 */
export function getDateRangeForPeriod(
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
  referenceDate: Date | string = new Date(),
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  let ref: Date;
  if (typeof referenceDate === 'string') {
    if (referenceDate.length === 7) {
      // YYYY-MM format
      const [y, m] = referenceDate.split('-').map(Number);
      ref = new Date(y, m - 1, 1, 12, 0, 0);
    } else {
      const [y, m, d] = referenceDate.split('T')[0].split('-').map(Number);
      ref = new Date(y, m - 1, d || 1, 12, 0, 0);
    }
  } else {
    ref = new Date(referenceDate);
  }

  if (isNaN(ref.getTime())) {
    ref = new Date();
  }

  if (period === 'day') {
    const y = ref.getFullYear();
    const m = String(ref.getMonth() + 1).padStart(2, '0');
    const d = String(ref.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${d}`;
    return { startDate: dStr, endDate: dStr };
  }

  if (period === 'week') {
    // Current week Monday to Sunday
    const day = ref.getDay();
    const diff = ref.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(ref.getFullYear(), ref.getMonth(), diff, 12, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);
    const mY = monday.getFullYear();
    const mM = String(monday.getMonth() + 1).padStart(2, '0');
    const mD = String(monday.getDate()).padStart(2, '0');
    const sY = sunday.getFullYear();
    const sM = String(sunday.getMonth() + 1).padStart(2, '0');
    const sD = String(sunday.getDate()).padStart(2, '0');
    return {
      startDate: `${mY}-${mM}-${mD}`,
      endDate: `${sY}-${sM}-${sD}`,
    };
  }

  if (period === 'month') {
    // Full calendar month from 1st day to last day of the selected month
    const year = ref.getFullYear();
    const month = ref.getMonth(); // 0-indexed (0=Jan, ..., 11=Dec)
    const mStr = String(month + 1).padStart(2, '0');
    const lastDayNum = new Date(year, month + 1, 0).getDate();
    const lastDayStr = String(lastDayNum).padStart(2, '0');
    return {
      startDate: `${year}-${mStr}-01`,
      endDate: `${year}-${mStr}-${lastDayStr}`,
    };
  }

  if (period === 'quarter') {
    const year = ref.getFullYear();
    const currentMonth = ref.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const lastDay = new Date(year, quarterStartMonth + 3, 0).getDate();
    const startMStr = String(quarterStartMonth + 1).padStart(2, '0');
    const endMStr = String(quarterStartMonth + 3).padStart(2, '0');
    const lastDayStr = String(lastDay).padStart(2, '0');
    return {
      startDate: `${year}-${startMStr}-01`,
      endDate: `${year}-${endMStr}-${lastDayStr}`,
    };
  }

  if (period === 'year') {
    const year = ref.getFullYear();
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, '0');
  const d = String(ref.getDate()).padStart(2, '0');
  const defaultDate = `${y}-${m}-${d}`;

  return {
    startDate: customStart || defaultDate,
    endDate: customEnd || defaultDate,
  };
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into readable text with month name (e.g. "Aug 1, 2026")
 */
export function formatPeriodDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    return dateStr;
  } catch {
    return dateStr || '—';
  }
}
