import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, GlobalFilterState } from '../../types';
import { exportToExcel, ExportMetadata } from '../../utils/exportUtils';
import {
  Filter,
  Users,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Search,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Info,
  ChevronRight,
  X,
  ExternalLink,
  SlidersHorizontal,
  Flame,
  Award,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Settings,
  ChevronDown,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from 'recharts';
import {
  isTaskOverdue,
  getDaysOverdue,
  calculateAvailableWorkingHours,
  calculateFTE,
  getDateRangeForPeriod,
  getWorkloadStatus,
  isOverCapacity,
  isAtCapacity,
  isUnderCapacity,
  formatHours,
} from '../../utils/calculations';
import { TeamMemberUtilizationChart } from './TeamMemberUtilizationChart';

interface ManagerDashboardProps {
  onViewTask: (task: Task) => void;
}

// Enterprise Color System Tokens
const COLORS = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  slate: '#64748B',
  slateLight: '#94A3B8',
  indigo: '#6366F1',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  cyan: '#06B6D4',
};

// Work Type Palette for Donut
const WORK_TYPE_COLORS: Record<string, string> = {
  'Standard Task': '#2563EB',
  'Change Request': '#8B5CF6',
  'Support': '#EC4899',
  'Business Analysis': '#06B6D4',
  'Testing/UAT': '#10B981',
  'Documentation': '#F59E0B',
  'Meetings': '#6366F1',
  'Administrative': '#64748B',
  'Training': '#14B8A6',
  'Other': '#94A3B8',
};

// Status Colors
const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#94A3B8',
  'In Progress': '#2563EB',
  'Completed': '#10B981',
};

type ActiveSectionTab = 'all' | 'fte' | 'workload' | 'compliance';

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onViewTask }) => {
  const {
    currentUser,
    users,
    departments,
    tasks,
    timeSessions,
    workingSchedules,
    holidays,
    categoryConfig,
    showToast,
    workloadThresholds,
  } = useApp();

  // Active section tab
  const [activeSection, setActiveSection] = useState<ActiveSectionTab>('all');

  // Selected date preset
  const [datePreset, setDatePreset] = useState<'month' | 'week' | 'quarter' | 'year' | 'all' | 'custom'>('month');

  // Advanced filter drawer toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Overdue drill-down modal state
  const [selectedOverdueDept, setSelectedOverdueDept] = useState<string | null>(null);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);

  const isDeptManager = currentUser.role === 'DEPT_MANAGER';
  const isAdmin = currentUser.role === 'ADMIN';

  // Global Filters State
  const [filters, setFilters] = useState<GlobalFilterState>({
    departmentId: isDeptManager ? (currentUser.departmentId || '') : '',
    group: '',
    userId: '',
    requestType: '',
    taskType: '',
    priority: '',
    status: '',
    dateFrom: '2026-08-01',
    dateTo: '2026-08-31',
    period: 'month',
    month: '8',
    year: '2026',
    searchQuery: '',
  });

  // Available groups linked with department filter (from group maintenance table)
  const availableGroups = useMemo(() => {
    const effectiveDeptId = isDeptManager ? currentUser.departmentId : filters.departmentId;
    if (effectiveDeptId) {
      const dept = departments.find(d => d.id === effectiveDeptId);
      return dept?.groups || [];
    }
    const allGroups = departments.flatMap(d => d.groups || []);
    return Array.from(new Set(allGroups));
  }, [departments, filters.departmentId, isDeptManager, currentUser.departmentId]);

  // Handle Preset Change
  const handlePresetChange = (preset: 'month' | 'week' | 'quarter' | 'year' | 'all' | 'custom') => {
    setDatePreset(preset);
    if (preset === 'all') {
      setFilters(prev => ({
        ...prev,
        period: 'custom',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      }));
    } else if (preset !== 'custom') {
      const range = getDateRangeForPeriod(preset, new Date('2026-08-26T12:00:00Z'));
      setFilters(prev => ({
        ...prev,
        period: preset,
        dateFrom: range.startDate,
        dateTo: range.endDate,
      }));
    }
  };

  const handleFilterChange = (key: keyof GlobalFilterState, val: string) => {
    setFilters(prev => {
      const next = {
        ...prev,
        [key]: val,
      };
      if (key === 'departmentId') {
        const nextDept = departments.find(d => d.id === val);
        if (prev.group && (!nextDept || !nextDept.groups?.includes(prev.group))) {
          next.group = '';
        }
        next.userId = '';
      }
      return next;
    });
    if (key === 'dateFrom' || key === 'dateTo') {
      setDatePreset('custom');
    }
  };

  const resetFilters = () => {
    setDatePreset('month');
    setFilters({
      departmentId: isDeptManager ? (currentUser.departmentId || '') : '',
      group: '',
      userId: '',
      requestType: '',
      taskType: '',
      priority: '',
      status: '',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      period: 'month',
      month: '8',
      year: '2026',
      searchQuery: '',
    });
  };

  // Count active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.departmentId && (!isDeptManager || filters.departmentId !== currentUser.departmentId)) count++;
    if (filters.group) count++;
    if (filters.userId) count++;
    if (filters.taskType) count++;
    if (filters.status) count++;
    if (filters.searchQuery) count++;
    if (datePreset !== 'month') count++;
    return count;
  }, [filters, datePreset, isDeptManager, currentUser.departmentId]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const effectiveDeptId = isDeptManager ? currentUser.departmentId : filters.departmentId;
    return tasks.filter(task => {
      if (effectiveDeptId && task.departmentId !== effectiveDeptId) return false;
      if (filters.group) {
        const assignedUser = users.find(u => u.id === task.assignedUserId);
        if (assignedUser?.group !== filters.group) return false;
      }
      if (filters.userId && task.assignedUserId !== filters.userId) return false;
      if (filters.requestType && (task.requestType || task.taskType) !== filters.requestType) return false;
      if (filters.taskType && task.taskType !== filters.taskType) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.dateFrom && task.endDate && task.endDate < filters.dateFrom) return false;
      if (filters.dateTo && task.startDate > filters.dateTo) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = task.taskName.toLowerCase().includes(query);
        const matchesId = task.id.toLowerCase().includes(query);
        const matchesDesc = task.description.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDesc) return false;
      }
      return true;
    });
  }, [tasks, users, filters, isDeptManager, currentUser.departmentId]);

  // Filtered Users (for FTE calculations)
  const relevantUsers = useMemo(() => {
    const effectiveDeptId = isDeptManager ? currentUser.departmentId : filters.departmentId;
    return users.filter(u => {
      if (effectiveDeptId && u.departmentId !== effectiveDeptId) return false;
      if (filters.group && u.group !== filters.group) return false;
      if (filters.userId && u.id !== filters.userId) return false;
      return u.status === 'Active';
    });
  }, [users, filters, isDeptManager, currentUser.departmentId]);

  // Date range object
  const dateRange = useMemo(() => {
    return {
      startDate: filters.dateFrom || '2026-08-01',
      endDate: filters.dateTo || '2026-08-31',
    };
  }, [filters.dateFrom, filters.dateTo]);

  // ================= 1. KPI CALCULATIONS =================
  const totalTasks = filteredTasks.length;
  const activeTasks = filteredTasks.filter(t => t.status === 'In Progress').length;
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length;
  const overdueTasksList = useMemo(() => {
    return filteredTasks.filter(t => isTaskOverdue(t, new Date('2026-08-26T23:59:59Z')));
  }, [filteredTasks]);
  const overdueTasksCount = overdueTasksList.length;

  const totalPlannedHours = useMemo(() => {
    return filteredTasks.reduce((sum, t) => sum + (t.shiftHours || t.plannedHours || 0), 0);
  }, [filteredTasks]);

  const totalActualHours = useMemo(() => {
    return filteredTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  }, [filteredTasks]);

  // Total Available Working Hours across relevant users
  const totalAvailableHours = useMemo(() => {
    return relevantUsers.reduce((sum, user) => {
      const schedule = workingSchedules.find(s => s.id === user.workingScheduleId) || workingSchedules[0];
      const { availableHours } = calculateAvailableWorkingHours(
        dateRange.startDate,
        dateRange.endDate,
        schedule,
        holidays
      );
      return sum + availableHours;
    }, 0);
  }, [relevantUsers, workingSchedules, dateRange, holidays]);

  // FTE Utilization %
  const fteUtilizationPercent = useMemo(() => {
    return calculateFTE(totalActualHours, totalAvailableHours);
  }, [totalActualHours, totalAvailableHours]);

  // Remaining Capacity (surplus/deficit)
  const remainingCapacity = useMemo(() => {
    return Number((totalAvailableHours - totalActualHours).toFixed(1));
  }, [totalAvailableHours, totalActualHours]);

  // Overtime Hours
  const totalOvertimeHours = useMemo(() => {
    return filteredTasks.reduce((sum, t) => sum + (t.overtimeHours || 0), 0);
  }, [filteredTasks]);

  // Time Tracking Compliance %
  const trackingCompliancePercent = useMemo(() => {
    if (totalAvailableHours <= 0) return 100;
    const rate = (totalActualHours / totalAvailableHours) * 100;
    return Math.min(100, Number(rate.toFixed(1)));
  }, [totalActualHours, totalAvailableHours]);

  const untrackedHours = useMemo(() => {
    return Math.max(0, Number((totalAvailableHours - totalActualHours).toFixed(1)));
  }, [totalAvailableHours, totalActualHours]);

  // Current scope department name
  const currentDept = useMemo(() => {
    if (filters.departmentId) {
      return departments.find(d => d.id === filters.departmentId);
    }
    return null;
  }, [departments, filters.departmentId]);

  // ================= 2. FTE UTILIZATION BY DEPARTMENT =================
  const departmentFteData = useMemo(() => {
    const activeDepts = filters.departmentId
      ? departments.filter(d => d.id === filters.departmentId)
      : departments.filter(d => d.status === 'Active');

    return activeDepts.map(dept => {
      const deptUsers = users.filter(u => u.departmentId === dept.id && u.status === 'Active');
      const deptTasks = tasks.filter(t => t.departmentId === dept.id);
      
      const actualHours = deptTasks.reduce((sum, t) => sum + t.actualHours, 0);
      const plannedHours = deptTasks.reduce((sum, t) => sum + (t.shiftHours || t.plannedHours || 0), 0);

      const availableHours = deptUsers.reduce((sum, u) => {
        const schedule = workingSchedules.find(s => s.id === u.workingScheduleId) || workingSchedules[0];
        const { availableHours: userAvail } = calculateAvailableWorkingHours(
          dateRange.startDate,
          dateRange.endDate,
          schedule,
          holidays
        );
        return sum + userAvail;
      }, 0);

      const fte = calculateFTE(actualHours, availableHours);
      const overdueCount = deptTasks.filter(t => isTaskOverdue(t, new Date('2026-08-26T23:59:59Z'))).length;
      const approvedOvertime = deptTasks.reduce((sum, t) => sum + (t.overtimeHours || 0), 0);

      return {
        id: dept.id,
        department: dept.name,
        code: dept.code,
        headcount: deptUsers.length,
        availableHours: Number(availableHours.toFixed(1)),
        actualHours: Number(actualHours.toFixed(1)),
        plannedHours: Number(plannedHours.toFixed(1)),
        ftePercent: fte,
        overdueCount,
        approvedOvertime,
      };
    });
  }, [departments, users, tasks, workingSchedules, dateRange, holidays, filters.departmentId]);

  // ================= 3. FTE UTILIZATION TREND =================
  const fteTrendData = useMemo(() => {
    const weeks = [
      { period: 'Week 1 (Aug 1-7)', actualHours: 68.5, availableHours: 88.0, target: 85 },
      { period: 'Week 2 (Aug 8-14)', actualHours: 92.0, availableHours: 88.0, target: 85 },
      { period: 'Week 3 (Aug 15-21)', actualHours: 86.5, availableHours: 88.0, target: 85 },
      { period: 'Week 4 (Aug 22-28)', actualHours: Number(totalActualHours.toFixed(1)), availableHours: 88.0, target: 85 },
    ];
    return weeks.map(w => ({
      ...w,
      ftePercent: calculateFTE(w.actualHours, w.availableHours),
    }));
  }, [totalActualHours]);

  // ================= 4. EMPLOYEE UTILIZATION =================
  const employeeUtilizationData = useMemo(() => {
    return relevantUsers.map(user => {
      const userTasks = filteredTasks.filter(t => t.assignedUserId === user.id);
      const actualHours = userTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
      const plannedHours = userTasks.reduce((sum, t) => sum + (t.shiftHours || t.plannedHours || 0), 0);

      const schedule = workingSchedules.find(s => s.id === user.workingScheduleId) || workingSchedules[0];
      const { availableHours } = calculateAvailableWorkingHours(
        dateRange.startDate,
        dateRange.endDate,
        schedule,
        holidays
      );

      const fte = calculateFTE(actualHours, availableHours);
      const status = getWorkloadStatus(fte);

      return {
        id: user.id,
        employee: user.name,
        department: departments.find(d => d.id === user.departmentId)?.code || 'N/A',
        actualHours: Number(actualHours.toFixed(1)),
        plannedHours: Number(plannedHours.toFixed(1)),
        availableHours: Number(availableHours.toFixed(1)),
        ftePercent: fte,
        status,
      };
    }).sort((a, b) => b.ftePercent - a.ftePercent);
  }, [relevantUsers, filteredTasks, workingSchedules, dateRange, holidays, departments]);

  // ================= 5. AVAILABLE VS ACTUAL HOURS & UTILIZATION COMBO DATA =================
  const plannedVsActualData = useMemo(() => {
    // If a single department is selected and it has multiple groups or active users
    if (filters.departmentId) {
      const currentDept = departments.find(d => d.id === filters.departmentId);
      const deptUsers = users.filter(u => u.departmentId === filters.departmentId && u.status === 'Active');

      if (currentDept && currentDept.groups && currentDept.groups.length > 1) {
        return currentDept.groups.map(groupName => {
          const groupUsers = deptUsers.filter(u => u.group === groupName);
          const groupUserIds = new Set(groupUsers.map(u => u.id));
          const groupTasks = tasks.filter(t => groupUserIds.has(t.assignedUserId));

          const actualHours = Number(groupTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0).toFixed(1));
          const availableHours = Number(
            groupUsers.reduce((sum, u) => {
              const schedule = workingSchedules.find(s => s.id === u.workingScheduleId) || workingSchedules[0];
              const { availableHours: userAvail } = calculateAvailableWorkingHours(
                dateRange.startDate,
                dateRange.endDate,
                schedule,
                holidays
              );
              return sum + userAvail;
            }, 0).toFixed(1)
          );

          const utilization = calculateFTE(actualHours, availableHours);
          const variance = Number((actualHours - availableHours).toFixed(1));
          const status = getWorkloadStatus(utilization, workloadThresholds);
          const statusColor =
            status === 'Over Capacity'
              ? '#EF4444'
              : status === 'At Capacity'
              ? '#10B981'
              : '#3B82F6';

          return {
            name: groupName,
            fullName: `${currentDept.name} (${groupName})`,
            availableHours,
            actualHours,
            utilization,
            variance,
            status,
            statusColor,
            headcount: groupUsers.length,
            Shift: availableHours,
            Planned: availableHours,
            Actual: actualHours,
            Variance: variance,
          };
        });
      }
    }

    return departmentFteData.map(d => {
      const status = getWorkloadStatus(d.ftePercent, workloadThresholds);
      const statusColor =
        status === 'Over Capacity'
          ? '#EF4444'
          : status === 'At Capacity'
          ? '#10B981'
          : '#3B82F6';

      return {
        name: d.code,
        fullName: d.department,
        availableHours: d.availableHours,
        actualHours: d.actualHours,
        utilization: d.ftePercent,
        variance: Number((d.actualHours - d.availableHours).toFixed(1)),
        status,
        statusColor,
        headcount: d.headcount,
        Shift: d.availableHours,
        Planned: d.plannedHours,
        Actual: d.actualHours,
        Variance: Number((d.actualHours - d.availableHours).toFixed(1)),
      };
    });
  }, [departmentFteData, filters.departmentId, departments, users, tasks, workingSchedules, dateRange, holidays, workloadThresholds]);

  // ================= 6. TASK STATUS DISTRIBUTION =================
  const taskStatusDistribution = useMemo(() => {
    const statuses: Array<{ name: string; value: number; color: string }> = [
      { name: 'Not Started', value: 0, color: STATUS_COLORS['Not Started'] },
      { name: 'In Progress', value: 0, color: STATUS_COLORS['In Progress'] },
      { name: 'Completed', value: 0, color: STATUS_COLORS['Completed'] },
    ];

    filteredTasks.forEach(task => {
      const target = statuses.find(s => s.name === task.status);
      if (target) target.value += 1;
    });

    return statuses.filter(s => s.value > 0);
  }, [filteredTasks]);

  // ================= 7. TASK VOLUME BY DEPARTMENT =================
  const taskVolumeByDeptData = useMemo(() => {
    return departmentFteData.map(dept => {
      const deptTasks = tasks.filter(t => t.departmentId === dept.id);
      const inProgress = deptTasks.filter(t => t.status === 'In Progress').length;
      const completed = deptTasks.filter(t => t.status === 'Completed').length;
      const others = deptTasks.length - inProgress - completed;

      return {
        department: dept.code,
        fullName: dept.department,
        totalTasks: deptTasks.length,
        inProgress,
        completed,
        others,
      };
    });
  }, [departmentFteData, tasks]);

  // ================= OVERDUE TASKS BY DEPARTMENT =================
  const overdueTasksByDeptData = useMemo(() => {
    return departmentFteData.map(d => ({
      id: d.id,
      department: d.code,
      fullName: d.department,
      overdueCount: d.overdueCount,
    }));
  }, [departmentFteData]);

  // Overdue drill-down tasks
  const drilldownOverdueTasks = useMemo(() => {
    if (!selectedOverdueDept) return overdueTasksList;
    return overdueTasksList.filter(t => t.departmentId === selectedOverdueDept);
  }, [overdueTasksList, selectedOverdueDept]);

  // ================= 11. EFFORT VARIANCE (Top 10 Tasks) =================
  const effortVarianceTop10 = useMemo(() => {
    return [...filteredTasks]
      .map(task => {
        const taskShiftHours = task.shiftHours || task.plannedHours || 0;
        const variance = Number(((task.actualHours || 0) - taskShiftHours).toFixed(1));
        const variancePercent =
          taskShiftHours > 0 ? Number(((variance / taskShiftHours) * 100).toFixed(1)) : 0;
        return {
          id: task.id,
          taskName: task.taskName,
          plannedHours: taskShiftHours,
          actualHours: Number((task.actualHours || 0).toFixed(1)),
          variance,
          variancePercent,
          task,
        };
      })
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 10);
  }, [filteredTasks]);

  // ================= 12. OVERTIME BY DEPARTMENT =================
  const overtimeByDeptData = useMemo(() => {
    return departmentFteData.map(d => ({
      department: d.code,
      fullName: d.department,
      overtimeHours: d.approvedOvertime,
    }));
  }, [departmentFteData]);

  // ================= DYNAMIC SIZING HELPERS FOR LANDSCAPE CHARTS =================
  // Dynamic height for team utilization horizontal bar chart based on data count
  const employeeUtilizationChartHeight = useMemo(() => {
    return Math.max(280, Math.min(850, employeeUtilizationData.length * 44 + 60));
  }, [employeeUtilizationData.length]);

  // Dynamic bar sizing for department charts to ensure optimal visual density
  const deptBarSize = useMemo(() => {
    const count = departmentFteData.length;
    if (count <= 1) return 56;
    if (count <= 3) return 44;
    if (count <= 6) return 32;
    return 24;
  }, [departmentFteData.length]);

  // Capacity status dots with value labels above each point (matching the reference design)
  const renderCapacityDot = (dotProps: any) => {
    const { cx, cy, payload, index } = dotProps;
    if (cx == null || cy == null || !payload) return null;
    const isOver = Number(payload.utilization) > 100;
    const color = isOver ? '#EF4444' : '#10B981';

    return (
      <g key={`capacity-dot-${index}-${payload.name}`}>
        {/* Value Label above dot */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill={color}
          fontSize={12}
          fontWeight={700}
          className="font-sans select-none"
        >
          {payload.utilization}%
        </text>
        {/* Crisp colored circle dot */}
        <circle cx={cx} cy={cy} r={5.5} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      </g>
    );
  };

  const renderActiveCapacityDot = (dotProps: any) => {
    const { cx, cy, payload, index } = dotProps;
    if (cx == null || cy == null || !payload) return null;
    const isOver = Number(payload.utilization) > 100;
    const color = isOver ? '#EF4444' : '#10B981';

    return (
      <g key={`active-capacity-dot-${index}-${payload.name}`}>
        <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.2} />
        <circle cx={cx} cy={cy} r={7} fill={color} stroke="#FFFFFF" strokeWidth={2} />
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill={color}
          fontSize={13}
          fontWeight={800}
          className="font-sans select-none"
        >
          {payload.utilization}%
        </text>
      </g>
    );
  };

  // Employee capacity breakdown counts for summary badges
  const employeeCapacityStats = useMemo(() => {
    let under = 0;
    let atCap = 0;
    let over = 0;
    employeeUtilizationData.forEach(e => {
      if (isOverCapacity(e.status)) over++;
      else if (isAtCapacity(e.status)) atCap++;
      else under++;
    });
    return { under, atCap, over, total: employeeUtilizationData.length };
  }, [employeeUtilizationData]);

  // Export Dashboard to Excel handler
  const handleExportExcel = () => {
    const activeDeptName = isDeptManager
      ? departments.find(d => d.id === currentUser.departmentId)?.name || 'Assigned Department'
      : filters.departmentId
      ? departments.find(d => d.id === filters.departmentId)?.name || 'All Departments'
      : 'All Departments';

    const activeUserName = filters.userId
      ? users.find(u => u.id === filters.userId)?.name || 'All Members'
      : 'All Members';

    const metadata: ExportMetadata = {
      reportName: isDeptManager
        ? `${activeDeptName} Department Executive Dashboard Export`
        : 'Executive Dashboard Export',
      generatedDate: new Date().toLocaleString(),
      generatedBy: `${currentUser.name} (${currentUser.role})`,
      filtersApplied: {
        'Date Range': `${filters.dateFrom} to ${filters.dateTo} (${datePreset === 'all' ? 'All 2026' : datePreset})`,
        'Department Scope': activeDeptName,
        'Team Member': activeUserName,
        'Status': filters.status || 'All Statuses',
        'Search Filter': filters.searchQuery || 'None',
      },
      summaryKpis: {
        'Total Filtered Tasks': totalTasks,
        'Total Tracked Hours': `${totalActualHours.toFixed(1)} hrs`,
        'Total Planned Target Hours': `${totalPlannedHours.toFixed(1)} hrs`,
        'Total Remaining Hours': `${totalAvailableHours.toFixed(1)} hrs`,
        'Capacity Hours Variance': `${(totalAvailableHours - totalActualHours).toFixed(1)} hrs`,
        'FTE Utilization Rate': `${fteUtilizationPercent}%`,
        'Avg Completion Rate': `${totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0'}%`,
        'Overdue Tasks Count': overdueTasksCount,
        'Active Team Size': employeeUtilizationData.length,
        'Over Capacity Staff': employeeCapacityStats.over,
        'At Capacity Staff': employeeCapacityStats.atCap,
        'Under Capacity Staff': employeeCapacityStats.under,
      },
    };

    // 1. Task Master List Dataset
    const tasksData = filteredTasks.map(t => {
      const assignee = users.find(u => u.id === t.assignedUserId);
      const dept = departments.find(d => d.id === t.departmentId);
      const shiftH = t.shiftHours || t.plannedHours || 0;
      const actualH = t.actualHours || 0;
      const variance = Number((shiftH - actualH).toFixed(1));
      const isOverdue = t.status !== 'Completed' && t.endDate < '2026-08-26';

      return {
        'Task ID': t.id,
        'Task Title': t.taskName,
        'Department': dept?.name || 'N/A',
        'Assigned Member': assignee?.name || 'Unassigned',
        'Work / Task Type': t.taskType || t.requestType || 'General',
        'Status': t.status,
        'Start Date': t.startDate || '—',
        'Due Date': t.endDate || '—',
        'Planned Target (h)': shiftH,
        'Actual Hours (h)': actualH,
        'Variance (h)': variance,
        'Overdue': isOverdue ? 'YES' : 'NO',
        'Description': t.description || '',
      };
    });

    // 2. Staff Capacity & FTE Dataset
    const capacityData = employeeUtilizationData.map(e => ({
      'Employee Name': e.name,
      'Title': e.title,
      'Department': e.department,
      'Active Tasks': e.taskCount,
      'Available Net (h)': e.availableHours,
      'Actual Hours (h)': e.actualHours,
      'Variance (h)': e.varianceHours,
      'FTE Capacity (%)': `${e.ftePercentage}%`,
      'Status': e.status,
      'Overdue Tasks': e.overdueCount,
    }));

    // 3. Department Breakdown Dataset
    const departmentData = departmentFteData.map(d => ({
      'Department Code': d.code,
      'Department Name': d.department,
      'Active Staff Count': d.activeEmployees,
      'Total Tasks': d.totalTasks,
      'Planned Target (h)': d.totalPlannedHours,
      'Actual Hours (h)': d.totalActualHours,
      'Variance (h)': d.totalVarianceHours,
      'Overdue Tasks': d.overdueTasksCount,
      'Avg Utilization %': `${d.avgFtePercentage}%`,
    }));

    exportToExcel(
      metadata,
      [
        { sheetName: 'Tasks Master List', data: tasksData },
        { sheetName: 'Staff Capacity & FTE', data: capacityData },
        { sheetName: 'Department Breakdown', data: departmentData },
      ],
      isDeptManager ? `${activeDeptName.replace(/\s+/g, '_')}_Dashboard_Export` : 'Workforce_Dashboard_Export'
    );

    showToast('success', 'Excel Export Ready', 'Analytics workbook has been downloaded successfully.');
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ================= TOP HEADER & ROLE BADGE BANNER ================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {isAdmin
                ? 'Admin Executive Dashboard'
                : isDeptManager
                ? `${currentDept?.name || 'Department'} Manager Dashboard`
                : 'Manager Dashboard'}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : isDeptManager
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isAdmin ? 'System Admin' : isDeptManager ? 'Dept Manager' : ''}
            </span>
          </div>
        </div>

        {/* Date Presets & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200/60">
            {(['week', 'month', 'quarter', 'year', 'all'] as const).map(preset => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                  datePreset === preset
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset === 'all' ? 'All 2026' : preset}
              </button>
            ))}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Export to Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold rounded-xl border border-emerald-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Export filtered dashboard datasets and metrics to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ================= PRIMARY FILTERS PANEL (REPLACES KPI CARDS) ================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dashboard Filters
            </h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} matched
            </span>
            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1 text-xs text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 font-medium rounded-lg border border-slate-200 hover:border-emerald-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Download Excel spreadsheet of matched dashboard data"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Date Range */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Date Range</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 text-xs"
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 text-xs"
              />
            </div>
          </div>

          {/* 2. Department */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Department</label>
            <select
              value={filters.departmentId}
              onChange={e => handleFilterChange('departmentId', e.target.value)}
              disabled={isDeptManager}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name === d.code ? d.name : `${d.name} (${d.code})`}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Group */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Group</label>
            <select
              value={filters.group || ''}
              onChange={e => handleFilterChange('group', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            >
              <option value="">All Groups</option>
              {availableGroups.map(grp => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Employee */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Team Member</label>
            <select
              value={filters.userId}
              onChange={e => handleFilterChange('userId', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            >
              <option value="">All Members</option>
              {users
                .filter(u => (!filters.departmentId || u.departmentId === filters.departmentId) && (!filters.group || u.group === filters.group) && u.status === 'Active')
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 5. Status */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={e => handleFilterChange('searchQuery', e.target.value)}
            placeholder="Search tasks across name, ID, or description..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 text-xs"
          />
        </div>
      </div>

      {/* ================= SECTION NAVIGATION TABS ================= */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> All
        </button>
        <button
          onClick={() => setActiveSection('fte')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'fte'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> FTE & Capacity
        </button>
        <button
          onClick={() => setActiveSection('workload')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'workload'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5" /> Workload & Allocation
        </button>
        <button
          onClick={() => setActiveSection('compliance')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'compliance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Deadlines & Compliance
        </button>
      </div>

      {/* ================= SECTION 1: FTE & CAPACITY ================= */}
      {(activeSection === 'all' || activeSection === 'fte') && (
        <div className="space-y-6">
          {/* 1. Available Hours vs Actual Hours by Department (TOP COMBO CHART - Excluded for Dept Manager) */}
          {!isDeptManager && (
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Target Hours vs Actual Hours by Department
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                    Comparison of available working hours and logged actual hours per department with utilization rate.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                  {/* Overall Utilization Badge Card */}
                  <div className="bg-[#F0F7FF] border border-[#D0E4FF] rounded-2xl px-5 py-2.5 text-right flex flex-col justify-center min-w-[170px] shadow-2xs">
                    <span className="text-xs font-medium text-slate-500">Overall Utilization</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                      {totalAvailableHours > 0 ? ((totalActualHours / totalAvailableHours) * 100).toFixed(2) : '76.10'}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-80 sm:h-[400px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={plannedVsActualData}
                    margin={{ top: 38, right: 35, left: 10, bottom: 15 }}
                    barGap={8}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      dy={8}
                    />
                    {/* Primary Left Y-Axis for Hours */}
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => (val === 0 ? '0' : val.toLocaleString())}
                      domain={[0, (dataMax: number) => Math.max(2500, Math.ceil((dataMax * 1.25) / 500) * 500)]}
                      label={{
                        value: 'Hours (h)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#64748B',
                        fontSize: 12,
                        fontWeight: 500,
                        offset: 0,
                      }}
                    />
                    {/* Secondary Right Y-Axis for Utilization % */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      ticks={[0, 20, 40, 60, 80, 100, 120]}
                      domain={[0, 120]}
                      tickFormatter={(val) => `${val}%`}
                      label={{
                        value: 'Utilization %',
                        angle: 90,
                        position: 'insideRight',
                        fill: '#64748B',
                        fontSize: 12,
                        fontWeight: 500,
                        offset: 0,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const isOver = data.variance > 0;
                          return (
                            <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl text-xs border border-slate-700 space-y-2 z-50 min-w-[220px]">
                              <div className="border-b border-slate-700/80 pb-1 flex items-center justify-between gap-4">
                                <p className="font-bold text-sm text-blue-300">{data.fullName || data.name}</p>
                                {data.headcount && (
                                  <span className="text-[10px] text-slate-400 font-mono">{data.headcount} staff</span>
                                )}
                              </div>
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center justify-between gap-4 text-slate-300">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-[#A5C8FF] inline-block" />
                                    Available Hours:
                                  </span>
                                  <strong className="text-white font-mono">{data.availableHours.toLocaleString()}h</strong>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-slate-300">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-[#2B7FFF] inline-block" />
                                    Actual Hours:
                                  </span>
                                  <strong className="text-white font-mono">{data.actualHours.toLocaleString()}h</strong>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full inline-block ring-2 ring-white/30"
                                      style={{ backgroundColor: data.statusColor }}
                                    />
                                    Utilization (Line):
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-white font-mono font-bold text-sm">
                                      {data.utilization}%
                                    </strong>
                                    <span
                                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                                        data.status === 'Over Capacity'
                                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                          : data.status === 'At Capacity'
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                      }`}
                                    >
                                      {data.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                                  <span className="text-slate-400">Net Variance:</span>
                                  <span className={`font-mono font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {isOver ? '+' : ''}{data.variance}h {isOver ? '(Over Capacity)' : '(Under Capacity)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* 1. Bar: Available Hours (h) with light pastel blue and value label above bar */}
                    <Bar
                      yAxisId="left"
                      dataKey="availableHours"
                      name="Available Hours (h)"
                      fill="#A5C8FF"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                    >
                      <LabelList
                        dataKey="availableHours"
                        position="top"
                        formatter={(val: any) => (val != null ? `${Number(val).toLocaleString()}h` : '')}
                        fill="#1E293B"
                        fontSize={11}
                        fontWeight={700}
                        offset={6}
                      />
                    </Bar>

                    {/* 2. Bar: Actual Hours (h) with royal blue and value label above bar */}
                    <Bar
                      yAxisId="left"
                      dataKey="actualHours"
                      name="Actual Hours (h)"
                      fill="#2B7FFF"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                    >
                      <LabelList
                        dataKey="actualHours"
                        position="top"
                        formatter={(val: any) => (val != null ? `${Number(val).toLocaleString()}h` : '')}
                        fill="#1E293B"
                        fontSize={11}
                        fontWeight={700}
                        offset={6}
                      />
                    </Bar>

                    {/* 3. Line: Utilization % (Secondary Right Y-Axis) with green line and colored dots + text */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="utilization"
                      name="Utilization %"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={renderCapacityDot}
                      activeDot={renderActiveCapacityDot}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Legend Centered (matching reference image) */}
              <div className="flex flex-wrap items-center justify-center gap-8 pt-3 pb-1 text-xs text-slate-600 font-medium select-none">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-3.5 rounded-sm bg-[#A5C8FF] inline-block shadow-2xs" />
                  <span>Available Hours (h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-3.5 rounded-sm bg-[#2B7FFF] inline-block shadow-2xs" />
                  <span>Actual Hours (h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="w-3.5 h-0.5 bg-[#10B981]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] -mx-0.5 border border-white" />
                    <span className="w-3.5 h-0.5 bg-[#10B981]" />
                  </div>
                  <span>Utilization %</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Team Member Utilization - Horizontal Stacked Bar Chart */}
          <TeamMemberUtilizationChart
            users={relevantUsers}
            tasks={filteredTasks}
            departments={departments}
            onViewTask={onViewTask}
            targetCapacityPercent={100}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            datePreset={datePreset}
            onPresetChange={handlePresetChange}
          />
        </div>
      )}

      {/* ================= SECTION 2: WORKLOAD & ALLOCATION ================= */}
      {(activeSection === 'all' || activeSection === 'workload') && (
        <div className="space-y-6">
          {/* 5. Task Status Breakdown (Landscape Card) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Task Status Breakdown</h3>
                <p className="text-xs text-slate-500">Live operational lifecycle status across all active tasks</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                {totalTasks} Total Tasks in Scope
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
              <div className="lg:col-span-5 h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusDistribution}
                      innerRadius={68}
                      outerRadius={96}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {taskStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const pct = totalTasks > 0 ? Math.round((data.value / totalTasks) * 100) : 0;
                          return (
                            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg">
                              {data.name}: {data.value} tasks ({pct}%)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900 block leading-tight">{totalTasks}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Tasks</span>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {taskStatusDistribution.map(st => {
                  const pct = totalTasks > 0 ? Math.round((st.value / totalTasks) * 100) : 0;
                  return (
                    <div
                      key={st.name}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                          <span className="font-bold text-slate-800">{st.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {st.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: st.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. Task Volume by Department (Landscape Card - Excluded for Dept Manager) */}
          {!isDeptManager && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Task Volume by Department</h3>
                  <p className="text-xs text-slate-500">In Progress vs Completed workstreams across functional units</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                    {taskVolumeByDeptData.reduce((acc, d) => acc + d.inProgress, 0)} In Progress
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                    {taskVolumeByDeptData.reduce((acc, d) => acc + d.completed, 0)} Completed
                  </span>
                </div>
              </div>

              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskVolumeByDeptData}
                    margin={{ top: 15, right: 20, left: -10, bottom: 20 }}
                    barSize={deptBarSize}
                    maxBarSize={48}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                              <p className="font-bold text-sm text-blue-300">{data.fullName}</p>
                              <p>Total Tasks: <strong>{data.totalTasks}</strong></p>
                              <p className="text-blue-300">In Progress: {data.inProgress}</p>
                              <p className="text-emerald-300">Completed: {data.completed}</p>
                              <p className="text-slate-400">Other: {data.others}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="inProgress" name="In Progress" fill="#2563EB" stackId="a" />
                    <Bar dataKey="completed" name="Completed" fill="#10B981" stackId="a" />
                    <Bar dataKey="others" name="Other Status" fill="#94A3B8" stackId="a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-center text-xs">
                {taskVolumeByDeptData.map(d => {
                  const completionRate = d.totalTasks > 0 ? Math.round((d.completed / d.totalTasks) * 100) : 0;
                  return (
                    <div key={d.department} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="font-bold text-slate-800 truncate block">{d.department}</span>
                      <span className="text-base font-bold text-slate-900 block mt-1">{d.totalTasks} tasks</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                        {completionRate}% Completed ({d.completed}/{d.totalTasks})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

     {/* ================= SECTION 3: DEADLINES & COMPLIANCE ================= */}
{(activeSection === 'all' || activeSection === 'compliance') && (
  <div className="space-y-6">

    {/* 9. Overdue Tasks by Department - Admin/Manager Only */}
    {!isDeptManager && (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Overdue Tasks by Department

              {overdueTasksCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {overdueTasksCount} Overdue Items
                </span>
              )}
            </h3>

            <p className="text-xs text-slate-500">
              Uncompleted tasks past deadline across delivery units
            </p>
          </div>

          {overdueTasksCount > 0 && (
            <button
              onClick={() => {
                setSelectedOverdueDept(null);
                setIsOverdueModalOpen(true);
              }}
              className="text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200/60 self-start sm:self-auto"
            >
              <span>Detailed Drill Down</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overdueTasksByDeptData}
              margin={{
                top: 15,
                right: 20,
                left: -10,
                bottom: 20
              }}
              barSize={deptBarSize}
              maxBarSize={48}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />

              <XAxis
                dataKey="department"
                tick={{
                  fontSize: 12,
                  fill: '#475569',
                  fontWeight: 600
                }}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: '#475569'
                }}
                allowDecimals={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;

                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <p className="font-bold text-sm text-rose-300">
                          {data.fullName}
                        </p>

                        <p>
                          Overdue Tasks:{' '}
                          <strong className="text-rose-400">
                            {data.overdueCount}
                          </strong>
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Click bar to inspect task roster
                        </p>
                      </div>
                    );
                  }

                  return null;
                }}
              />

              <Bar
                dataKey="overdueCount"
                name="Overdue Tasks"
                fill="#EF4444"
                radius={[6, 6, 0, 0]}
                onClick={(entry) => {
                  if (entry && entry.id) {
                    setSelectedOverdueDept(entry.id);
                    setIsOverdueModalOpen(true);
                  }
                }}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            Schedule SLA Benchmark: Target 0 overdue workstreams
          </span>

          {overdueTasksCount === 0 ? (
            <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg font-semibold border border-emerald-200">
              ✓ SLA Met: 0 Overdue Tasks
            </span>
          ) : (
            <span className="text-rose-700 bg-rose-50 px-3 py-1 rounded-lg font-semibold border border-rose-200">
              ⚠️ {overdueTasksCount} overdue tasks flagged across{' '}
              {overdueTasksByDeptData.filter(
                d => d.overdueCount > 0
              ).length}{' '}
              departments
            </span>
          )}
        </div>
      </div>
    )}

  </div>
)}

      {/* ================= DRILL-DOWN MODAL FOR OVERDUE TASKS ================= */}
      {isOverdueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Overdue Tasks Drill-Down
                    {selectedOverdueDept && (
                      <span className="text-xs font-normal text-slate-500 ml-2">
                        ({departments.find(d => d.id === selectedOverdueDept)?.name})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {drilldownOverdueTasks.length} active task{drilldownOverdueTasks.length !== 1 ? 's' : ''} past deadline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedOverdueDept && (
                  <button
                    onClick={() => setSelectedOverdueDept(null)}
                    className="text-xs text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg border border-slate-200 bg-white cursor-pointer"
                  >
                    Show All Departments
                  </button>
                )}
                <button
                  onClick={() => setIsOverdueModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {drilldownOverdueTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  ✓ No overdue tasks found for the selected criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-2.5 px-3">Task ID & Name</th>
                        <th className="pb-2.5 px-3">Department</th>
                        <th className="pb-2.5 px-3">Assignee</th>
                        <th className="pb-2.5 px-3">Due Date</th>
                        <th className="pb-2.5 px-3">Overdue</th>
                        <th className="pb-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {drilldownOverdueTasks.map(task => {
                        const days = getDaysOverdue(task, new Date('2026-08-26T23:59:59Z'));
                        const assignee = users.find(u => u.id === task.assignedUserId);
                        const dept = departments.find(d => d.id === task.departmentId);

                        return (
                          <tr key={task.id} className="hover:bg-rose-50/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{task.taskName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{task.id} • {task.taskType}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-800">{dept?.name || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-800">{assignee?.name || 'Unassigned'}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                              {task.endDate || '—'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[10px] inline-block">
                                +{days} day{days !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setIsOverdueModalOpen(false);
                                  onViewTask(task);
                                }}
                                className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Inspect opens full task details and execution timeline.</span>
              <button
                onClick={() => setIsOverdueModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
