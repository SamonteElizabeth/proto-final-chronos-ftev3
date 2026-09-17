import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Role,
  Department,
  Task,
  TimeSession,
  WorkingSchedule,
  Holiday,
  TaskCategoryConfig,
  WorkloadThresholds,
  AuditLog,
  ActiveTimer,
  TaskStatus,
  CorrectionApprovalStatus,
} from '../types';
import {
  initialUsers,
  initialDepartments,
  initialTasks,
  initialTimeSessions,
  initialWorkingSchedules,
  initialHolidays,
  initialCategoryConfig,
  initialWorkloadThresholds,
  initialAuditLogs,
} from '../data/initialData';
import { calculateTaskActualHours, calculateVariance } from '../utils/calculations';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  // Data
  users: User[];
  departments: Department[];
  tasks: Task[];
  timeSessions: TimeSession[];
  workingSchedules: WorkingSchedule[];
  holidays: Holiday[];
  categoryConfig: TaskCategoryConfig;
  workloadThresholds: WorkloadThresholds;
  auditLogs: AuditLog[];
  
  // Active User / Auth
  currentUser: User;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => { success: boolean; message?: string };
  loginAsRole: (role: Role) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  
  // Timer System
  activeTimer: ActiveTimer | null;
  timerElapsedSeconds: number;
  activeTimerTask: Task | null;
  pendingTimerConflict: { currentTask: Task; newTask: Task } | null;
  cancelTimerConflict: () => void;
  startTimer: (task: Task, forceStopCurrent?: boolean) => boolean;
  stopTimer: (notes?: string) => boolean;
  
  // Task Management
  createTask: (taskData: Omit<Task, 'id' | 'actualHours' | 'variance' | 'variancePercent' | 'createdAt' | 'updatedAt'>) => Task | null;
  createMaintenanceTask: (data: { taskName: string; departmentId?: string }) => Task | null;
  updateTask: (taskId: string, updates: Partial<Task>, reason?: string) => boolean;
  updateMaintenanceTask: (taskId: string, data: { taskName: string; departmentId?: string }) => boolean;
  deleteTask: (taskId: string, reason?: string) => boolean;
  deleteMultipleTasks: (taskIds: string[], reason?: string) => boolean;
  keepOnlySampleTasks: (count?: number) => void;
  
  // Time Sessions
  addManualTimeSession: (data: {
    taskId: string;
    userId: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    notes?: string;
    reason: string;
    correctionType?: string;
    isOvertime?: boolean;
    timeEntryType?: 'Regular' | 'OT';
    workType?: string;
    approvalStatus?: CorrectionApprovalStatus;
  }) => boolean;
  approveTimeSession: (sessionId: string, notes?: string) => boolean;
  rejectTimeSession: (sessionId: string, reason: string) => boolean;
  updateTimeSession: (
    sessionId: string,
    updates: {
      taskId?: string;
      userId?: string;
      startTime?: string;
      endTime?: string;
      durationHours?: number;
      notes?: string;
      manualReason?: string;
      correctionType?: string;
      isOvertime?: boolean;
      timeEntryType?: 'Regular' | 'OT';
      workType?: string;
    },
    reason: string
  ) => boolean;
  deleteTimeSession: (sessionId: string, reason: string) => boolean;
  
  // Admin Operations
  createUser: (userData: Omit<User, 'id' | 'createdAt'>) => boolean;
  updateUser: (userId: string, updates: Partial<User>) => boolean;
  deleteUser: (userId: string) => boolean;
  toggleUserStatus: (userId: string) => boolean;
  
  createDepartment: (deptData: Omit<Department, 'id'>) => boolean;
  updateDepartment: (deptId: string, updates: Partial<Department>) => boolean;
  deleteDepartment: (deptId: string) => boolean;
  addGroupToDepartment: (deptId: string, groupName: string) => boolean;
  removeGroupFromDepartment: (deptId: string, groupName: string) => boolean;
  
  createWorkingSchedule: (schedData: Omit<WorkingSchedule, 'id'>) => boolean;
  updateWorkingSchedule: (schedId: string, updates: Partial<WorkingSchedule>) => boolean;
  
  createHoliday: (holidayData: Omit<Holiday, 'id'>) => boolean;
  updateHoliday: (holidayId: string, holidayData: Partial<Omit<Holiday, 'id'>>) => boolean;
  deleteHoliday: (holidayId: string) => boolean;
  toggleHolidayStatus: (holidayId: string) => boolean;
  resetHolidaysToDefault: () => void;
  
  updateCategoryConfig: (newConfig: TaskCategoryConfig) => void;
  updateWorkloadThresholds: (newThresholds: WorkloadThresholds) => void;
  
  // Utilities
  resetToDemoData: () => void;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'fte_users_v6',
  DEPARTMENTS: 'fte_departments_v6',
  TASKS: 'fte_tasks_v6',
  TIME_SESSIONS: 'fte_time_sessions_v6',
  SCHEDULES: 'fte_schedules_v9',
  HOLIDAYS: 'fte_holidays_ph_v1',
  CATEGORIES: 'fte_categories_v6',
  THRESHOLDS: 'fte_thresholds_v7',
  AUDIT_LOGS: 'fte_audit_logs_v6',
  CURRENT_USER_ID: 'fte_current_user_id_v7',
  ACTIVE_TIMER: 'fte_active_timer_v6',
  IS_AUTHENTICATED: 'fte_is_authenticated_v6',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.error(`Error loading localStorage for key ${key}:`, err);
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving localStorage for key ${key}:`, err);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State Initialization with local storage fallback
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadStorage(STORAGE_KEYS.USERS, initialUsers);
    const titleUpdates: Record<string, string> = {
      'USR-002': 'EEM Administrator',
      'USR-003': 'TSD Department Manager',
      'USR-004': 'DISD Department Manager',
      'USR-005': 'EEM Department Manager',
      'USR-006': 'Senior SSIG Analyst',
      'USR-007': 'Junior SSIG Analyst',
      'USR-008': 'Senior TSD Full Stack Engineer',
      'USR-009': 'TSD Frontend UI/UX Specialist',
      'USR-010': 'DISD Support Specialist',
      'USR-011': 'EEM Talent Partner',
    };
    const userDefaultGroups: Record<string, string> = {
      'USR-001': 'Architecture & Design',
      'USR-002': 'Business Analysis',
      'USR-003': 'Software Engineering',
      'USR-004': 'Operations & Support',
      'USR-005': 'Resource Allocation',
      'USR-006': 'Business Analysis',
      'USR-007': 'Process Integration',
      'USR-008': 'Software Engineering',
      'USR-009': 'Quality Assurance',
      'USR-010': 'Incident Response',
      'USR-011': 'Talent Development',
    };
    return loaded.map((u: User) => {
      let updatedUser = u;
      if (titleUpdates[u.id] && (u.title.includes('Engineering') || u.title.includes('Client Support') || u.title.includes('HR') || u.title.includes('Business Analyst') || u.title.includes('Support Resolution') || u.title.includes('Senior Full Stack') || u.title.includes('Frontend UI/UX') || u.title.includes('Operations & Analytics') || u.title.includes('Director') || u.id === 'USR-002')) {
        updatedUser = { ...updatedUser, title: titleUpdates[u.id] };
      }
      if (!updatedUser.group && userDefaultGroups[u.id]) {
        updatedUser = { ...updatedUser, group: userDefaultGroups[u.id] };
      }
      return updatedUser;
    });
  });
  const [departments, setDepartments] = useState<Department[]>(() => {
    const loaded = loadStorage(STORAGE_KEYS.DEPARTMENTS, initialDepartments);
    const defaultGroupsByDept: Record<string, string[]> = {
      'DEP-001': ['Business Analysis', 'Architecture & Design', 'Process Integration'],
      'DEP-002': ['Software Engineering', 'API & Cloud Infrastructure', 'Quality Assurance'],
      'DEP-003': ['Operations & Support', 'Service Level Management', 'Incident Response'],
      'DEP-004': ['Resource Allocation', 'Talent Development', 'Compliance & Audit'],
    };
    const deptMap: Record<string, { name: string; code: string; desc: string }> = {
      'DEP-001': {
        name: 'SSIG',
        code: 'SSIG',
        desc: 'System Software Integration Group (SSIG) - architecture, process modeling, business analysis, and solution delivery.',
      },
      'DEP-002': {
        name: 'TSD',
        code: 'TSD',
        desc: 'Technology Services Division (TSD) - software development, API infrastructure, systems integration, and quality assurance.',
      },
      'DEP-003': {
        name: 'DISD',
        code: 'DISD',
        desc: 'Digital Information Systems Department (DISD) - system operations, client triage, SLA monitoring, and incident resolution.',
      },
      'DEP-004': {
        name: 'EEM',
        code: 'EEM',
        desc: 'Enterprise & Equipment Management (EEM) - talent development, operational resources, compliance, and onboarding.',
      },
    };
    return loaded.map((dept: Department) => {
      const groups = (dept.groups && dept.groups.length > 0)
        ? dept.groups
        : (defaultGroupsByDept[dept.id] || []);
      if (deptMap[dept.id]) {
        return {
          ...dept,
          name: deptMap[dept.id].name,
          code: deptMap[dept.id].code,
          description: deptMap[dept.id].desc,
          groups,
        };
      }
      return { ...dept, groups };
    });
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const loaded = loadStorage(STORAGE_KEYS.TASKS, initialTasks);
    return loaded.map((t: Task) => {
      if (t.shiftHours === 8 || t.plannedHours === 8) {
        const shiftHours = 8.5;
        const plannedHours = 8.5;
        const { variance, variancePercent } = calculateVariance(shiftHours, t.actualHours || 0);
        return {
          ...t,
          shiftHours,
          plannedHours,
          variance,
          variancePercent,
        };
      }
      return t;
    });
  });
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>(() => {
    const loaded = loadStorage(STORAGE_KEYS.TIME_SESSIONS, initialTimeSessions);
    const hasSampleCorrections = loaded.some(s => s.id === 'SES-CORR-101');
    if (!hasSampleCorrections) {
      const sampleCorrections = initialTimeSessions.filter(s => s.id.startsWith('SES-CORR-'));
      return [...sampleCorrections, ...loaded];
    }
    return loaded;
  });
  const [workingSchedules, setWorkingSchedules] = useState<WorkingSchedule[]>(() => {
    const loaded = loadStorage(STORAGE_KEYS.SCHEDULES, initialWorkingSchedules);
    return loaded.map((sched: WorkingSchedule) => {
      if (sched.id === 'SCH-001' || sched.isDefault || sched.hoursPerDay === 10) {
        return {
          ...sched,
          hoursPerDay: 10,
          netWorkHoursPerDay: 9,
          startTime: sched.startTime || '08:30',
          endTime: sched.endTime || '18:30',
          breakHours: 1,
          breakBreakdown: {
            lunchBreakMinutes: 60,
            lunchTimeRange: '12:00 PM - 01:00 PM',
            morningBreakMinutes: 0,
            afternoonBreakMinutes: 0,
          },
        };
      }
      return sched;
    });
  });
  const [holidays, setHolidays] = useState<Holiday[]>(() => loadStorage(STORAGE_KEYS.HOLIDAYS, initialHolidays));
  const [categoryConfig, setCategoryConfig] = useState<TaskCategoryConfig>(() => loadStorage(STORAGE_KEYS.CATEGORIES, initialCategoryConfig));
  const [workloadThresholds, setWorkloadThresholds] = useState<WorkloadThresholds>(() => loadStorage(STORAGE_KEYS.THRESHOLDS, initialWorkloadThresholds));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStorage(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs));
  
  // Current user selection (Default to Administrator Sarah Chen)
  const [currentUserId, setCurrentUserId] = useState<string>(() => loadStorage(STORAGE_KEYS.CURRENT_USER_ID, 'USR-001'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadStorage(STORAGE_KEYS.IS_AUTHENTICATED, true));
  
  // Active Timer State
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => loadStorage(STORAGE_KEYS.ACTIVE_TIMER, null));
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState<number>(0);
  const [pendingTimerConflict, setPendingTimerConflict] = useState<{ currentTask: Task; newTask: Task } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Save changes to localStorage
  useEffect(() => { saveStorage(STORAGE_KEYS.USERS, users); }, [users]);
  useEffect(() => { saveStorage(STORAGE_KEYS.DEPARTMENTS, departments); }, [departments]);
  useEffect(() => { saveStorage(STORAGE_KEYS.TASKS, tasks); }, [tasks]);
  useEffect(() => { saveStorage(STORAGE_KEYS.TIME_SESSIONS, timeSessions); }, [timeSessions]);
  useEffect(() => { saveStorage(STORAGE_KEYS.SCHEDULES, workingSchedules); }, [workingSchedules]);
  useEffect(() => { saveStorage(STORAGE_KEYS.HOLIDAYS, holidays); }, [holidays]);
  useEffect(() => { saveStorage(STORAGE_KEYS.CATEGORIES, categoryConfig); }, [categoryConfig]);
  useEffect(() => { saveStorage(STORAGE_KEYS.THRESHOLDS, workloadThresholds); }, [workloadThresholds]);
  useEffect(() => { saveStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogs); }, [auditLogs]);
  useEffect(() => { saveStorage(STORAGE_KEYS.CURRENT_USER_ID, currentUserId); }, [currentUserId]);
  useEffect(() => { saveStorage(STORAGE_KEYS.ACTIVE_TIMER, activeTimer); }, [activeTimer]);
  useEffect(() => { saveStorage(STORAGE_KEYS.IS_AUTHENTICATED, isAuthenticated); }, [isAuthenticated]);

  const currentUser = useMemo(() => {
    return users.find(u => u.id === currentUserId) || users[0] || initialUsers[0];
  }, [users, currentUserId]);

  const activeTimerTask = useMemo(() => {
    if (!activeTimer) return null;
    return tasks.find(t => t.id === activeTimer.taskId) || null;
  }, [activeTimer, tasks]);

  // Real-time Timer Ticking surviving browser refresh (BR-001, BR-004)
  useEffect(() => {
    if (!activeTimer) {
      setTimerElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const startMs = new Date(activeTimer.startTime).getTime();
      const nowMs = Date.now();
      const diffSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setTimerElapsedSeconds(diffSeconds);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Log Audit Trail Helper
  const addAuditLog = useCallback((
    action: string,
    module: AuditLog['module'],
    recordId: string,
    recordName: string,
    oldValue: string,
    newValue: string,
    reason?: string
  ) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      module,
      recordId,
      recordName,
      oldValue,
      newValue,
      reason,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  // Switch User
  const switchUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUserId(userId);
      setIsAuthenticated(true);
      showToast('info', 'Switched User Profile', `Now logged in as ${user.name} (${user.role})`);
    }
  }, [users, showToast]);

  // Login with Email and Password
  const login = useCallback((email: string, password?: string): { success: boolean; message?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (!user) {
      return { success: false, message: 'No account found with this corporate email address.' };
    }

    if (user.status === 'Inactive') {
      return { success: false, message: 'This user account is inactive. Please contact a system administrator.' };
    }

    // Password validation (allows matching user password or standard demo password)
    if (password && user.password && password !== user.password && password !== 'password123') {
      return { success: false, message: 'Incorrect password. Please verify your credentials or use the role quick-login.' };
    }

    setCurrentUserId(user.id);
    setIsAuthenticated(true);

    addAuditLog(
      'User Signed In',
      'Users',
      user.id,
      user.name,
      'Signed Out',
      `Signed In as ${user.role} (${user.email})`
    );

    showToast('success', 'Welcome Back', `Successfully signed in as ${user.name} (${user.role}).`);
    return { success: true };
  }, [users, addAuditLog, showToast]);

  // Quick Login as Specific Role (1 user per role)
  const loginAsRole = useCallback((role: Role): boolean => {
    // Pick canonical representative user for each role:
    // ADMIN: Sarah Chen (USR-001)
    // MANAGER: David Miller (USR-002)
    // DEPT_MANAGER: Alex Rodriguez (USR-003)
    // TASK_USER: Emma Watson (USR-006)
    let targetUser: User | undefined;
    if (role === 'ADMIN') {
      targetUser = users.find(u => u.id === 'USR-001') || users.find(u => u.role === 'ADMIN' && u.status === 'Active');
    } else if (role === 'MANAGER') {
      targetUser = users.find(u => u.id === 'USR-002') || users.find(u => u.role === 'MANAGER' && u.status === 'Active');
    } else if (role === 'DEPT_MANAGER') {
      targetUser = users.find(u => u.id === 'USR-003') || users.find(u => u.role === 'DEPT_MANAGER' && u.status === 'Active');
    } else {
      targetUser = users.find(u => u.id === 'USR-006') || users.find(u => u.role === 'TASK_USER' && u.status === 'Active');
    }

    if (!targetUser) {
      showToast('error', 'Login Failed', `No active user found for role ${role}`);
      return false;
    }

    setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);

    addAuditLog(
      'User Signed In (Quick Role Access)',
      'Users',
      targetUser.id,
      targetUser.name,
      'Signed Out',
      `Role: ${targetUser.role}`
    );

    const roleDisplay = targetUser.role === 'MANAGER' ? 'EEM Admin' : targetUser.role === 'DEPT_MANAGER' ? 'Dept Manager' : targetUser.role === 'TASK_USER' ? 'Employee' : 'Admin';
    showToast('success', `Signed In as ${roleDisplay}`, `Active session: ${targetUser.name} (${targetUser.title})`);
    return true;
  }, [users, addAuditLog, showToast]);

  // Re-sync Task Actual Hours when sessions change
  const syncTaskHours = useCallback((taskId: string, sessions: TimeSession[]) => {
    setTasks(prevTasks => {
      return prevTasks.map(t => {
        if (t.id !== taskId) return t;
        const actualHours = calculateTaskActualHours(taskId, sessions);
        const taskShiftHours = t.shiftHours || t.plannedHours || 8;
        const { variance, variancePercent } = calculateVariance(taskShiftHours, actualHours);
        return {
          ...t,
          actualHours,
          variance,
          variancePercent,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  }, []);

  // Stop Timer
  const stopTimer = useCallback((notes?: string): boolean => {
    if (!activeTimer) return false;

    const task = tasks.find(t => t.id === activeTimer.taskId);
    if (!task) {
      setActiveTimer(null);
      return false;
    }

    const endTime = new Date().toISOString();
    const startMs = new Date(activeTimer.startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const durationSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));
    // duration in decimal hours rounded to 2 decimals, minimum 0.01h for demo
    const durationHours = Number(Math.max(0.01, durationSeconds / 3600).toFixed(2));

    const newSession: TimeSession = {
      id: `SES-${Date.now().toString().slice(-6)}`,
      taskId: task.id,
      userId: activeTimer.userId,
      startTime: activeTimer.startTime,
      endTime,
      durationHours,
      durationSeconds,
      notes: notes || 'Tracked working time session',
      createdAt: endTime,
    };

    const updatedSessions = [newSession, ...timeSessions];
    setTimeSessions(updatedSessions);
    syncTaskHours(task.id, updatedSessions);

    addAuditLog(
      'Timer Stopped',
      'Time Tracking',
      newSession.id,
      task.taskName,
      `Timer Running (${task.id})`,
      `Logged +${durationHours}h (${durationSeconds}s). Session ID: ${newSession.id}`,
      notes
    );

    setActiveTimer(null);
    setTimerElapsedSeconds(0);
    showToast('success', 'Timer Stopped & Saved', `Logged ${durationHours}h for task "${task.taskName}".`);
    return true;
  }, [activeTimer, tasks, timeSessions, syncTaskHours, addAuditLog, showToast]);

  // Logout
  const logout = useCallback(() => {
    if (activeTimer) {
      // Promptly stop or keep timer
      stopTimer('Session ended via sign out');
    }
    setIsAuthenticated(false);
    showToast('info', 'Signed Out', 'You have been securely signed out of the system.');
  }, [activeTimer, stopTimer, showToast]);

  // Start Timer with Multi-Timer Rule (BR-001, BR-002, BR-003)
  const startTimer = useCallback((task: Task, forceStopCurrent: boolean = false): boolean => {
    // Validation Rules
    if (task.status === 'Completed') {
      showToast('error', 'Cannot Start Timer', 'Completed tasks cannot start a timer unless reopened (Rule BR-003).');
      return false;
    }

    // Check if user already has an active timer
    if (activeTimer) {
      if (activeTimer.taskId === task.id) {
        showToast('info', 'Timer Active', `Timer is already running for "${task.taskName}".`);
        return true;
      }

      if (!forceStopCurrent) {
        const currentRunningTask = tasks.find(t => t.id === activeTimer.taskId);
        if (currentRunningTask) {
          setPendingTimerConflict({
            currentTask: currentRunningTask,
            newTask: task,
          });
          return false;
        }
      } else {
        // Force stop current timer
        stopTimer('Stopped automatically to switch to new task');
      }
    }

    const now = new Date().toISOString();
    const newTimer: ActiveTimer = {
      taskId: task.id,
      userId: currentUser.id,
      startTime: now,
    };

    setActiveTimer(newTimer);
    setPendingTimerConflict(null);

    // Update task status to 'In Progress' if not already
    if (task.status !== 'In Progress') {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'In Progress', updatedAt: now } : t));
    }

    addAuditLog(
      'Timer Started',
      'Time Tracking',
      task.id,
      task.taskName,
      `Status: ${task.status}`,
      `Status: In Progress, Start Time: ${now}`
    );

    showToast('success', 'Timer Started', `Tracking time for "${task.taskName}"`);
    return true;
  }, [activeTimer, currentUser, tasks, stopTimer, addAuditLog, showToast]);

  const cancelTimerConflict = useCallback(() => {
    setPendingTimerConflict(null);
  }, []);

  // Create Task (with strict validation)
  const createTask = useCallback((taskData: Omit<Task, 'id' | 'actualHours' | 'variance' | 'variancePercent' | 'createdAt' | 'updatedAt'>): Task | null => {
    // 1. Task Name required
    if (!taskData.taskName?.trim()) {
      showToast('error', 'Validation Error', 'Task Name is required.');
      return null;
    }
    // 2. Assigned Employee required
    if (!taskData.assignedUserId) {
      showToast('error', 'Validation Error', 'Assigned Employee is required.');
      return null;
    }
    // 3. Start Date required
    if (!taskData.startDate) {
      showToast('error', 'Validation Error', 'Start Date is required.');
      return null;
    }
    // 4. If End Date is provided, End Date cannot be earlier than Start Date
    if (taskData.startDate && taskData.endDate && new Date(taskData.endDate) < new Date(taskData.startDate)) {
      showToast('error', 'Validation Error', 'End Date cannot be earlier than Start Date.');
      return null;
    }
    // 5. Shift Effort > 0
    const effShiftHours = taskData.shiftHours !== undefined ? Number(taskData.shiftHours) : (taskData.plannedHours !== undefined ? Number(taskData.plannedHours) : 8.5);
    if (effShiftHours <= 0) {
      showToast('error', 'Validation Error', 'Target Hours must be greater than zero hours.');
      return null;
    }

    const numericIds = tasks
      .map(t => parseInt(t.id.replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 101;
    const newId = `TSK-${nextNum}`;
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: newId,
      shiftHours: effShiftHours,
      plannedHours: effShiftHours,
      actualHours: 0,
      variance: -effShiftHours,
      variancePercent: -100,
      createdAt: now,
      updatedAt: now,
    };

    setTasks(prev => [newTask, ...prev]);

    addAuditLog(
      'Task Created',
      'Tasks',
      newTask.id,
      newTask.taskName,
      'None',
      `Assigned to ${users.find(u => u.id === newTask.assignedUserId)?.name || newTask.assignedUserId}, Target Hour: ${newTask.shiftHours}h`
    );

    showToast('success', 'Task Created', `Task "${newTask.taskName}" (${newTask.id}) created and saved successfully.`);
    return newTask;
  }, [tasks, users, addAuditLog, showToast]);

  // Create Task via Maintenance Table (Requires taskName; departmentId defaults automatically)
  const createMaintenanceTask = useCallback((data: { taskName: string; departmentId?: string }): Task | null => {
    if (!data.taskName?.trim()) {
      showToast('error', 'Validation Error', 'Task Name is required.');
      return null;
    }

    const effectiveDeptId =
      data.departmentId ||
      currentUser.departmentId ||
      (departments.length > 0 ? departments[0].id : 'DEP-001');

    // Determine assigned user (match active user in that department, or current user)
    const deptUser =
      users.find(u => u.departmentId === effectiveDeptId && u.status === 'Active') ||
      users.find(u => u.departmentId === effectiveDeptId) ||
      currentUser;

    const numericIds = tasks
      .map(t => parseInt(t.id.replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 101;
    const newId = `TSK-${nextNum}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const newTask: Task = {
      id: newId,
      taskName: data.taskName.trim(),
      description: '',
      project: 'Standard Operations',
      taskType: 'Administrative',
      requestType: 'Operational Work',
      priority: 'Medium',
      assignedUserId: deptUser.id,
      departmentId: effectiveDeptId,
      startDate: today,
      shiftHours: 9,
      plannedHours: 9,
      actualHours: 0,
      variance: -9,
      variancePercent: -100,
      status: 'In Progress',
      remarks: 'Created via Maintenance Table',
      createdBy: currentUser.name || 'EEM Admin',
      createdAt: now,
      updatedAt: now,
    };

    setTasks(prev => [newTask, ...prev]);

    addAuditLog(
      'Task Created (Maintenance)',
      'Maintenance Table',
      newTask.id,
      newTask.taskName,
      'None',
      `Department: ${departments.find(d => d.id === effectiveDeptId)?.name || effectiveDeptId}`
    );

    showToast('success', 'Task Added', `Task "${newTask.taskName}" (${newTask.id}) added successfully.`);
    return newTask;
  }, [tasks, users, departments, currentUser, addAuditLog, showToast]);

  // Update Task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>, reason?: string): boolean => {
    const existing = tasks.find(t => t.id === taskId);
    if (!existing) {
      showToast('error', 'Error', 'Task not found.');
      return false;
    }

    // Validation
    const effectiveStart = updates.startDate !== undefined ? updates.startDate : existing.startDate;
    const effectiveEnd = updates.endDate !== undefined ? updates.endDate : existing.endDate;
    if (effectiveStart && effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) {
      showToast('error', 'Validation Error', 'End Date cannot be earlier than Start Date.');
      return false;
    }

    const inputShiftHours = updates.shiftHours !== undefined ? updates.shiftHours : updates.plannedHours;
    if (inputShiftHours !== undefined && inputShiftHours <= 0) {
      showToast('error', 'Validation Error', 'Target Hours must be greater than zero.');
      return false;
    }

    // If task is completed while timer is running on it, stop timer
    if (activeTimer && activeTimer.taskId === taskId && updates.status === 'Completed') {
      stopTimer('Stopped because task status changed to Completed');
    }

    const now = new Date().toISOString();
    const shiftHoursVal = inputShiftHours !== undefined ? Number(inputShiftHours) : (existing.shiftHours || existing.plannedHours || 8.5);
    const actual = existing.actualHours;
    const { variance, variancePercent } = calculateVariance(shiftHoursVal, actual);

    let completedAt = existing.completedAt;
    if (updates.status === 'Completed' && existing.status !== 'Completed') {
      completedAt = now;
    } else if (updates.status && updates.status !== 'Completed') {
      completedAt = undefined;
    }

    const updatedTask: Task = {
      ...existing,
      ...updates,
      shiftHours: shiftHoursVal,
      plannedHours: shiftHoursVal,
      variance,
      variancePercent,
      completedAt,
      updatedAt: now,
    };

    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    addAuditLog(
      'Task Updated',
      'Tasks',
      taskId,
      updatedTask.taskName,
      `Status: ${existing.status}, Target Hour: ${existing.shiftHours || existing.plannedHours}h`,
      `Status: ${updatedTask.status}, Target Hour: ${updatedTask.shiftHours}h`,
      reason
    );

    showToast('success', 'Task Updated', `Task "${updatedTask.taskName}" updated.`);
    return true;
  }, [tasks, activeTimer, stopTimer, addAuditLog, showToast]);

  // Update Task via Maintenance Table (Updates taskName, and optionally departmentId)
  const updateMaintenanceTask = useCallback((taskId: string, data: { taskName: string; departmentId?: string }): boolean => {
    if (!data.taskName?.trim()) {
      showToast('error', 'Validation Error', 'Task Name is required.');
      return false;
    }

    const updates: Partial<Task> = {
      taskName: data.taskName.trim(),
    };
    if (data.departmentId) {
      updates.departmentId = data.departmentId;
    }

    const success = updateTask(taskId, updates, 'Updated via Maintenance Table');

    return success;
  }, [updateTask, showToast]);

  // Delete Task
  const deleteTask = useCallback((taskId: string, reason?: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    if (activeTimer && activeTimer.taskId === taskId) {
      setActiveTimer(null);
    }

    setTasks(prev => prev.filter(t => t.id !== taskId));
    // Also remove related time sessions
    const remainingSessions = timeSessions.filter(s => s.taskId !== taskId);
    setTimeSessions(remainingSessions);

    addAuditLog(
      'Task Deleted',
      'Tasks',
      taskId,
      task.taskName,
      `Task: ${task.taskName} (${task.status})`,
      'Deleted from system',
      reason || 'Deleted by user'
    );

    showToast('info', 'Task Deleted', `Task "${task.taskName}" removed.`);
    return true;
  }, [tasks, activeTimer, timeSessions, addAuditLog, showToast]);

  // Delete Multiple Tasks
  const deleteMultipleTasks = useCallback((taskIds: string[], reason?: string): boolean => {
    if (taskIds.length === 0) return false;
    const setIds = new Set(taskIds);

    if (activeTimer && setIds.has(activeTimer.taskId)) {
      setActiveTimer(null);
    }

    setTasks(prev => prev.filter(t => !setIds.has(t.id)));
    setTimeSessions(prev => prev.filter(s => !setIds.has(s.taskId)));

    addAuditLog(
      'Tasks Bulk Deleted',
      'Tasks',
      taskIds.join(', '),
      `${taskIds.length} tasks`,
      `${taskIds.length} tasks removed`,
      'Bulk Deleted',
      reason || 'Bulk deleted by user'
    );

    showToast('info', 'Tasks Deleted', `Successfully removed ${taskIds.length} task(s).`);
    return true;
  }, [activeTimer, addAuditLog, showToast]);

  // Clean Sample Data - Keep only at least 3 sample tasks
  const keepOnlySampleTasks = useCallback((count: number = 3) => {
    if (tasks.length <= count) {
      showToast('info', 'Task Count', `You currently have ${tasks.length} task(s).`);
      return;
    }

    // Keep the first `count` initial sample tasks, or first `count` tasks
    const initialIds = initialTasks.slice(0, count).map(t => t.id);
    let tasksToKeep = tasks.filter(t => initialIds.includes(t.id));
    if (tasksToKeep.length < count) {
      tasksToKeep = tasks.slice(0, count);
    }

    const keepIds = new Set(tasksToKeep.map(t => t.id));
    const removedCount = tasks.length - tasksToKeep.length;

    if (activeTimer && !keepIds.has(activeTimer.taskId)) {
      setActiveTimer(null);
    }

    setTasks(tasksToKeep);
    setTimeSessions(prev => prev.filter(s => keepIds.has(s.taskId)));

    addAuditLog(
      'Tasks Cleaned',
      'Tasks',
      'CLEAN-SAMPLE',
      'Sample Data Cleanup',
      `${tasks.length} tasks`,
      `Kept ${tasksToKeep.length} tasks, removed ${removedCount} tasks`,
      'User requested to clean sample tasks and keep 3'
    );

    showToast('success', 'Sample Data Cleaned', `Cleaned extra sample tasks. Retained ${tasksToKeep.length} sample tasks.`);
  }, [tasks, activeTimer, addAuditLog, showToast]);

  // Manual Time Session Addition (Role-based approval: EEM Admin & Dept Manager auto-approved, Task User requires Dept Manager approval)
  const addManualTimeSession = useCallback((data: {
    taskId: string;
    userId: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    notes?: string;
    reason: string;
    correctionType?: string;
    isOvertime?: boolean;
    timeEntryType?: 'Regular' | 'OT';
    workType?: string;
    approvalStatus?: CorrectionApprovalStatus;
  }): boolean => {
    if (!data.reason?.trim()) {
      showToast('error', 'Reason Required', 'Manual time adjustments require an explanatory reason (Rule BR-010).');
      return false;
    }

    if (data.durationHours <= 0) {
      showToast('error', 'Invalid Duration', 'Duration must be greater than zero.');
      return false;
    }

    const task = tasks.find(t => t.id === data.taskId);
    if (!task) {
      showToast('error', 'Error', 'Task not found.');
      return false;
    }

    const isOt = data.timeEntryType === 'OT' || Boolean(data.isOvertime);
    const entryType = data.timeEntryType || (isOt ? 'OT' : 'Regular');

    // Role-based approval rule:
    // EEM Admin (role === 'MANAGER' or 'ADMIN') and Dept Manager (role === 'DEPT_MANAGER') are automatically approved.
    // Task User (role === 'TASK_USER') submissions require Dept Manager approval (status = 'Pending').
    const isAutoApproved =
      data.approvalStatus === 'Approved' ||
      (!data.approvalStatus && (currentUser.role === 'MANAGER' || currentUser.role === 'DEPT_MANAGER' || currentUser.role === 'ADMIN'));

    const effectiveStatus: CorrectionApprovalStatus = isAutoApproved ? 'Approved' : 'Pending';
    const nowIso = new Date().toISOString();

    const newSession: TimeSession = {
      id: `SES-CORR-${Date.now().toString().slice(-5)}`,
      taskId: data.taskId,
      userId: data.userId,
      startTime: data.startTime,
      endTime: data.endTime,
      durationHours: Number(data.durationHours.toFixed(2)),
      durationSeconds: Math.round(data.durationHours * 3600),
      notes: data.notes,
      isManual: true,
      manualReason: data.reason,
      correctionType: data.correctionType || 'General Correction',
      isOvertime: isOt,
      timeEntryType: entryType,
      workType: data.workType || task.workType || 'General Work',
      approvalStatus: effectiveStatus,
      approvedBy: isAutoApproved ? currentUser.id : undefined,
      approvedAt: isAutoApproved ? nowIso : undefined,
      submittedByRole: currentUser.role,
      createdAt: nowIso,
    };

    const updatedSessions = [newSession, ...timeSessions];
    setTimeSessions(updatedSessions);
    // Re-sync task hours (only approved sessions count towards actual hours)
    syncTaskHours(data.taskId, updatedSessions);

    if (isAutoApproved) {
      const approverRoleLabel =
        currentUser.role === 'MANAGER'
          ? 'EEM Admin'
          : currentUser.role === 'DEPT_MANAGER'
          ? 'Dept Manager'
          : 'Admin';

      addAuditLog(
        'Time Correction Logged (Auto-Approved)',
        'Time Tracking',
        newSession.id,
        task.taskName,
        `Previous Actual: ${task.actualHours}h`,
        `Auto-Approved +${newSession.durationHours}h (${newSession.correctionType}) by ${currentUser.name} (${approverRoleLabel}). Total Actual: ${(task.actualHours + newSession.durationHours).toFixed(2)}h`,
        data.reason
      );

      showToast('success', 'Time Correction Recorded', `Logged and auto-approved ${newSession.durationHours}h for task "${task.taskName}".`);
    } else {
      addAuditLog(
        'Time Correction Submitted (Pending Dept Manager Approval)',
        'Time Tracking',
        newSession.id,
        task.taskName,
        `Current Actual: ${task.actualHours}h`,
        `Submitted +${newSession.durationHours}h (${newSession.correctionType}) by ${currentUser.name}. Status: Pending Dept Manager Approval.`,
        data.reason
      );

      showToast(
        'info',
        'Time Correction Request Submitted',
        `Request for +${newSession.durationHours}h submitted. Sent to Department Manager for approval.`
      );
    }

    return true;
  }, [currentUser, tasks, timeSessions, syncTaskHours, addAuditLog, showToast]);

  // Approve Time Correction Request (Dept Manager / Admin / EEM Admin)
  const approveTimeSession = useCallback((sessionId: string, notes?: string): boolean => {
    const session = timeSessions.find(s => s.id === sessionId);
    if (!session) {
      showToast('error', 'Error', 'Time session not found.');
      return false;
    }

    const task = tasks.find(t => t.id === session.taskId);
    const now = new Date().toISOString();

    const updatedSession: TimeSession = {
      ...session,
      approvalStatus: 'Approved',
      approvedBy: currentUser.id,
      approvedAt: now,
      notes: notes
        ? (session.notes ? `${session.notes} | Dept Mgr Note: ${notes}` : `Dept Mgr Note: ${notes}`)
        : session.notes,
      updatedAt: now,
    };

    const updatedSessions = timeSessions.map(s => (s.id === sessionId ? updatedSession : s));
    setTimeSessions(updatedSessions);
    syncTaskHours(session.taskId, updatedSessions);

    const approverRoleLabel =
      currentUser.role === 'DEPT_MANAGER'
        ? 'Dept Manager'
        : currentUser.role === 'MANAGER'
        ? 'EEM Admin'
        : 'Admin';

    addAuditLog(
      'Time Correction Approved',
      'Time Tracking',
      sessionId,
      task?.taskName || session.taskId,
      'Status: Pending Approval',
      `Approved +${session.durationHours}h by ${currentUser.name} (${approverRoleLabel}). Task hours synchronized.`,
      notes || 'Approved by manager'
    );

    showToast(
      'success',
      'Time Correction Approved',
      `Approved +${session.durationHours}h for task "${task?.taskName || session.taskId}". Actual hours updated.`
    );
    return true;
  }, [timeSessions, tasks, currentUser, syncTaskHours, addAuditLog, showToast]);

  // Reject Time Correction Request (Dept Manager / Admin / EEM Admin)
  const rejectTimeSession = useCallback((sessionId: string, reason: string): boolean => {
    if (!reason?.trim()) {
      showToast('error', 'Reason Required', 'Please provide a reason for rejecting this time correction request.');
      return false;
    }

    const session = timeSessions.find(s => s.id === sessionId);
    if (!session) {
      showToast('error', 'Error', 'Time session not found.');
      return false;
    }

    const task = tasks.find(t => t.id === session.taskId);
    const now = new Date().toISOString();

    const updatedSession: TimeSession = {
      ...session,
      approvalStatus: 'Rejected',
      approvedBy: currentUser.id,
      approvedAt: now,
      rejectionReason: reason.trim(),
      updatedAt: now,
    };

    const updatedSessions = timeSessions.map(s => (s.id === sessionId ? updatedSession : s));
    setTimeSessions(updatedSessions);
    syncTaskHours(session.taskId, updatedSessions);

    addAuditLog(
      'Time Correction Rejected',
      'Time Tracking',
      sessionId,
      task?.taskName || session.taskId,
      'Status: Pending Approval',
      `Rejected by ${currentUser.name}: "${reason.trim()}"`,
      reason
    );

    showToast(
      'info',
      'Time Correction Rejected',
      `Rejected time correction request (${session.durationHours}h). Task actual hours remain unchanged.`
    );
    return true;
  }, [timeSessions, tasks, currentUser, syncTaskHours, addAuditLog, showToast]);

  // Update / Correct Existing Time Session (BR-010: Requires reason)
  const updateTimeSession = useCallback((
    sessionId: string,
    updates: {
      taskId?: string;
      userId?: string;
      startTime?: string;
      endTime?: string;
      durationHours?: number;
      notes?: string;
      manualReason?: string;
      correctionType?: string;
      isOvertime?: boolean;
      timeEntryType?: 'Regular' | 'OT';
      workType?: string;
      approvalStatus?: CorrectionApprovalStatus;
    },
    reason: string
  ): boolean => {
    if (!reason?.trim()) {
      showToast('error', 'Reason Required', 'A reason is required to update a time entry.');
      return false;
    }

    const session = timeSessions.find(s => s.id === sessionId);
    if (!session) {
      showToast('error', 'Error', 'Time session not found.');
      return false;
    }

    const previousDuration = session.durationHours;
    const previousTaskId = session.taskId;
    const targetTaskId = updates.taskId || session.taskId;
    const task = tasks.find(t => t.id === targetTaskId);

    const newDurationHours = updates.durationHours !== undefined
      ? Number(updates.durationHours.toFixed(2))
      : session.durationHours;

    if (newDurationHours <= 0) {
      showToast('error', 'Invalid Duration', 'Duration must be greater than zero.');
      return false;
    }

    const updatedIsOvertime = updates.timeEntryType !== undefined
      ? updates.timeEntryType === 'OT'
      : (updates.isOvertime !== undefined ? updates.isOvertime : session.isOvertime);

    const updatedTimeEntryType = updates.timeEntryType !== undefined
      ? updates.timeEntryType
      : (session.timeEntryType || (updatedIsOvertime ? 'OT' : 'Regular'));

    // Role-based approval rule on updates:
    // If updated by Task User, it requires Dept Manager approval ('Pending').
    // If updated by EEM Admin or Dept Manager, it is automatically approved ('Approved').
    let newApprovalStatus: CorrectionApprovalStatus = updates.approvalStatus || session.approvalStatus || 'Approved';
    if (!updates.approvalStatus) {
      if (currentUser.role === 'TASK_USER') {
        newApprovalStatus = 'Pending';
      } else if (currentUser.role === 'MANAGER' || currentUser.role === 'DEPT_MANAGER' || currentUser.role === 'ADMIN') {
        newApprovalStatus = 'Approved';
      }
    }

    const updatedSession: TimeSession = {
      ...session,
      ...updates,
      approvalStatus: newApprovalStatus,
      approvedBy: newApprovalStatus === 'Approved' ? (session.approvedBy || currentUser.id) : undefined,
      approvedAt: newApprovalStatus === 'Approved' ? (session.approvedAt || new Date().toISOString()) : undefined,
      isOvertime: updatedIsOvertime,
      timeEntryType: updatedTimeEntryType,
      durationHours: newDurationHours,
      durationSeconds: Math.round(newDurationHours * 3600),
      isManual: true,
      manualReason: reason,
      updatedAt: new Date().toISOString(),
    };

    const updatedSessions = timeSessions.map(s => s.id === sessionId ? updatedSession : s);
    setTimeSessions(updatedSessions);

    // Sync hours for new task and previous task (if task changed)
    syncTaskHours(targetTaskId, updatedSessions);
    if (previousTaskId !== targetTaskId) {
      syncTaskHours(previousTaskId, updatedSessions);
    }

    addAuditLog(
      'Time Session Corrected',
      'Time Tracking',
      sessionId,
      task?.taskName || 'Time Session',
      `Duration: ${previousDuration}h`,
      `Updated Duration: ${newDurationHours}h, Reason: ${reason}`,
      reason
    );

    showToast('success', 'Time Entry Corrected', `Updated session to ${newDurationHours}h.`);
    return true;
  }, [timeSessions, tasks, syncTaskHours, addAuditLog, showToast]);

  // Delete Time Session (BR-010: Requires reason)
  const deleteTimeSession = useCallback((sessionId: string, reason: string): boolean => {
    if (!reason?.trim()) {
      showToast('error', 'Reason Required', 'A reason is required to remove a time log entry (Rule BR-010).');
      return false;
    }

    const session = timeSessions.find(s => s.id === sessionId);
    if (!session) return false;

    const task = tasks.find(t => t.id === session.taskId);
    const updatedSessions = timeSessions.filter(s => s.id !== sessionId);
    setTimeSessions(updatedSessions);

    if (session.taskId) {
      syncTaskHours(session.taskId, updatedSessions);
    }

    addAuditLog(
      'Time Adjusted (Session Removed)',
      'Time Tracking',
      sessionId,
      task?.taskName || 'Time Session',
      `Duration: ${session.durationHours}h`,
      'Session Removed',
      reason
    );

    showToast('info', 'Time Session Removed', `Removed time session of ${session.durationHours}h.`);
    return true;
  }, [timeSessions, tasks, syncTaskHours, addAuditLog, showToast]);

  // Admin User CRUD
  const createUser = useCallback((userData: Omit<User, 'id' | 'createdAt'>): boolean => {
    const newId = `USR-${(users.length + 1).toString().padStart(3, '0')}`;
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLog('User Created', 'Users', newId, newUser.name, 'None', `Role: ${newUser.role}, Dept: ${newUser.departmentId}`);
    showToast('success', 'User Created', `Created user account for ${newUser.name}.`);
    return true;
  }, [users, addAuditLog, showToast]);

  const updateUser = useCallback((userId: string, updates: Partial<User>): boolean => {
    const existing = users.find(u => u.id === userId);
    if (!existing) return false;

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    addAuditLog('User Updated', 'Users', userId, existing.name, `Role: ${existing.role}, Status: ${existing.status}`, `Role: ${updates.role || existing.role}, Status: ${updates.status || existing.status}`);
    showToast('success', 'User Updated', `Updated account for ${existing.name}.`);
    return true;
  }, [users, addAuditLog, showToast]);

  const toggleUserStatus = useCallback((userId: string): boolean => {
    const existing = users.find(u => u.id === userId);
    if (!existing) return false;
    const newStatus = existing.status === 'Active' ? 'Inactive' : 'Active';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    addAuditLog('User Status Changed', 'Users', userId, existing.name, existing.status, newStatus);
    showToast('info', 'Status Changed', `${existing.name} is now ${newStatus}.`);
    return true;
  }, [users, addAuditLog, showToast]);

  const deleteUser = useCallback((userId: string): boolean => {
    const existing = users.find(u => u.id === userId);
    if (!existing) return false;
    setUsers(prev => prev.filter(u => u.id !== userId));
    addAuditLog('User Deleted', 'Users', userId, existing.name, existing.email, 'Deleted');
    showToast('info', 'User Deleted', `User account for ${existing.name} removed.`);
    return true;
  }, [users, addAuditLog, showToast]);

  // Department CRUD
  const createDepartment = useCallback((deptData: Omit<Department, 'id'>): boolean => {
    const newId = `DEP-${(departments.length + 1).toString().padStart(3, '0')}`;
    const newDept: Department = { ...deptData, id: newId, groups: deptData.groups || [] };
    setDepartments(prev => [...prev, newDept]);
    addAuditLog('Department Created', 'Departments', newId, newDept.name, 'None', newDept.name);
    showToast('success', 'Department Created', `Department "${newDept.name}" created.`);
    return true;
  }, [departments, addAuditLog, showToast]);

  const updateDepartment = useCallback((deptId: string, updates: Partial<Department>): boolean => {
    const existing = departments.find(d => d.id === deptId);
    if (!existing) return false;
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, ...updates } : d));
    addAuditLog('Department Updated', 'Departments', deptId, existing.name, existing.name, updates.name || existing.name);
    showToast('success', 'Department Updated', `Department "${existing.name}" updated.`);
    return true;
  }, [departments, addAuditLog, showToast]);

  const deleteDepartment = useCallback((deptId: string): boolean => {
    const existing = departments.find(d => d.id === deptId);
    if (!existing) return false;
    setDepartments(prev => prev.filter(d => d.id !== deptId));
    addAuditLog('Department Deleted', 'Departments', deptId, existing.name, existing.name, 'Deleted');
    showToast('info', 'Department Deleted', `Department "${existing.name}" removed.`);
    return true;
  }, [departments, addAuditLog, showToast]);

  const addGroupToDepartment = useCallback((deptId: string, groupName: string): boolean => {
    const trimmed = groupName.trim();
    if (!trimmed) return false;
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return false;
    const currentGroups = dept.groups || [];
    if (currentGroups.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
      showToast('warning', 'Group Exists', `Group "${trimmed}" already exists in ${dept.name}.`);
      return false;
    }
    const updatedGroups = [...currentGroups, trimmed];
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, groups: updatedGroups } : d));
    addAuditLog('Group Added', 'Departments', deptId, dept.name, currentGroups.join(', ') || 'None', updatedGroups.join(', '));
    showToast('success', 'Group Added', `Added group "${trimmed}" to ${dept.name}.`);
    return true;
  }, [departments, addAuditLog, showToast]);

  const removeGroupFromDepartment = useCallback((deptId: string, groupName: string): boolean => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return false;
    const currentGroups = dept.groups || [];
    const updatedGroups = currentGroups.filter(g => g !== groupName);
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, groups: updatedGroups } : d));
    addAuditLog('Group Removed', 'Departments', deptId, dept.name, groupName, 'Removed');
    showToast('info', 'Group Removed', `Removed group "${groupName}" from ${dept.name}.`);
    return true;
  }, [departments, addAuditLog, showToast]);

  // Working Schedule CRUD
  const createWorkingSchedule = useCallback((schedData: Omit<WorkingSchedule, 'id'>): boolean => {
    const newId = `SCH-${(workingSchedules.length + 1).toString().padStart(3, '0')}`;
    const newSched: WorkingSchedule = { ...schedData, id: newId };
    setWorkingSchedules(prev => [...prev, newSched]);
    addAuditLog('Working Schedule Created', 'Schedules', newId, newSched.name, 'None', `${newSched.hoursPerDay}h/day`);
    showToast('success', 'Schedule Created', `Schedule "${newSched.name}" added.`);
    return true;
  }, [workingSchedules, addAuditLog, showToast]);

  const updateWorkingSchedule = useCallback((schedId: string, updates: Partial<WorkingSchedule>): boolean => {
    const existing = workingSchedules.find(s => s.id === schedId);
    if (!existing) return false;
    setWorkingSchedules(prev => prev.map(s => s.id === schedId ? { ...s, ...updates } : s));
    addAuditLog('Working Schedule Updated', 'Schedules', schedId, existing.name, `${existing.hoursPerDay}h/day`, `${updates.hoursPerDay || existing.hoursPerDay}h/day`);
    showToast('success', 'Schedule Updated', `Schedule "${existing.name}" updated.`);
    return true;
  }, [workingSchedules, addAuditLog, showToast]);

  // Holidays CRUD
  const createHoliday = useCallback((holidayData: Omit<Holiday, 'id'>): boolean => {
    const newId = `HOL-${Date.now().toString().slice(-4)}`;
    const newHol: Holiday = {
      ...holidayData,
      id: newId,
      status: holidayData.status || 'Active',
      recurring: holidayData.recurring || 'Annually',
    };
    setHolidays(prev => [...prev, newHol]);
    addAuditLog('Holiday Added', 'Schedules', newId, newHol.name, 'None', `${newHol.date} (${newHol.type})`);
    showToast('success', 'Holiday Added', `Holiday "${newHol.name}" on ${newHol.date} added.`);
    return true;
  }, [addAuditLog, showToast]);

  const updateHoliday = useCallback((holidayId: string, updates: Partial<Omit<Holiday, 'id'>>): boolean => {
    const hol = holidays.find(h => h.id === holidayId);
    if (!hol) return false;
    setHolidays(prev => prev.map(h => (h.id === holidayId ? { ...h, ...updates } : h)));
    addAuditLog('Holiday Updated', 'Schedules', holidayId, updates.name || hol.name, JSON.stringify(hol), JSON.stringify({ ...hol, ...updates }));
    showToast('success', 'Holiday Updated', `Holiday "${updates.name || hol.name}" updated successfully.`);
    return true;
  }, [holidays, addAuditLog, showToast]);

  const toggleHolidayStatus = useCallback((holidayId: string): boolean => {
    const hol = holidays.find(h => h.id === holidayId);
    if (!hol) return false;
    const newStatus: 'Active' | 'Inactive' = hol.status === 'Active' ? 'Inactive' : 'Active';
    setHolidays(prev => prev.map(h => (h.id === holidayId ? { ...h, status: newStatus } : h)));
    addAuditLog('Holiday Status Changed', 'Schedules', holidayId, hol.name, hol.status || 'Active', newStatus);
    showToast('info', 'Holiday Status Changed', `Holiday "${hol.name}" is now ${newStatus}.`);
    return true;
  }, [holidays, addAuditLog, showToast]);

  const deleteHoliday = useCallback((holidayId: string): boolean => {
    const hol = holidays.find(h => h.id === holidayId);
    if (!hol) return false;
    setHolidays(prev => prev.filter(h => h.id !== holidayId));
    addAuditLog('Holiday Removed', 'Schedules', holidayId, hol.name, hol.date, 'Removed');
    showToast('info', 'Holiday Removed', `Holiday "${hol.name}" removed.`);
    return true;
  }, [holidays, addAuditLog, showToast]);

  const resetHolidaysToDefault = useCallback(() => {
    setHolidays(initialHolidays);
    addAuditLog('Holidays Reset', 'Schedules', 'HOLIDAYS', 'Holiday Calendar', 'Modified Holidays', 'Fixed Philippine Holidays');
    showToast('success', 'Holidays Reset', 'Restored official fixed Philippine holidays.');
  }, [addAuditLog, showToast]);

  // Categories & Thresholds
  const updateCategoryConfig = useCallback((newConfig: TaskCategoryConfig) => {
    setCategoryConfig(newConfig);
    addAuditLog('Task Categories Updated', 'Categories', 'CONFIG', 'Category Config', 'Previous Settings', 'Updated Options');
    showToast('success', 'Categories Saved', 'Task categories and configuration updated.');
  }, [addAuditLog, showToast]);

  const updateWorkloadThresholds = useCallback((newThresholds: WorkloadThresholds) => {
    setWorkloadThresholds(newThresholds);
    addAuditLog('Thresholds Updated', 'System', 'THRESHOLDS', 'Capacity Thresholds', `Under: ${workloadThresholds.underCapacity}%, Over: ${workloadThresholds.overCapacity}%`, `Under: ${newThresholds.underCapacity}%, Over: ${newThresholds.overCapacity}%`);
    showToast('success', 'Workload Thresholds Saved', 'Capacity thresholds updated.');
  }, [workloadThresholds, addAuditLog, showToast]);

  // Reset to Demo Data
  const resetToDemoData = useCallback(() => {
    setUsers(initialUsers);
    setDepartments(initialDepartments);
    setTasks(initialTasks);
    setTimeSessions(initialTimeSessions);
    setWorkingSchedules(initialWorkingSchedules);
    setHolidays(initialHolidays);
    setCategoryConfig(initialCategoryConfig);
    setWorkloadThresholds(initialWorkloadThresholds);
    setAuditLogs(initialAuditLogs);
    setActiveTimer(null);
    setTimerElapsedSeconds(0);
    setCurrentUserId('USR-001');

    localStorage.clear();
    showToast('info', 'Demo Data Restored', 'System has been reset to default realistic demonstration state.');
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        users,
        departments,
        tasks,
        timeSessions,
        workingSchedules,
        holidays,
        categoryConfig,
        workloadThresholds,
        auditLogs,
        currentUser,
        isAuthenticated,
        login,
        loginAsRole,
        logout,
        switchUser,
        activeTimer,
        timerElapsedSeconds,
        activeTimerTask,
        pendingTimerConflict,
        cancelTimerConflict,
        startTimer,
        stopTimer,
        createTask,
        createMaintenanceTask,
        updateTask,
        updateMaintenanceTask,
        deleteTask,
        deleteMultipleTasks,
        keepOnlySampleTasks,
        addManualTimeSession,
        approveTimeSession,
        rejectTimeSession,
        updateTimeSession,
        deleteTimeSession,
        createUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        addGroupToDepartment,
        removeGroupFromDepartment,
        createWorkingSchedule,
        updateWorkingSchedule,
        createHoliday,
        updateHoliday,
        toggleHolidayStatus,
        deleteHoliday,
        resetHolidaysToDefault,
        updateCategoryConfig,
        updateWorkloadThresholds,
        resetToDemoData,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
