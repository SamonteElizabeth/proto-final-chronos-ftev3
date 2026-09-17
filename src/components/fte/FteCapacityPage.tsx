import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PieChart,
  Calendar,
  Users,
  Building,
  Settings,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Info,
  Clock,
  Briefcase,
  CheckSquare,
  UserCheck,
  Eye,
  Search,
  X,
} from 'lucide-react';
import {
  calculateAvailableWorkingHours,
  calculateFTE,
  getDateRangeForPeriod,
  formatPeriodDate,
  getWorkloadStatus,
  isOverCapacity,
  isAtCapacity,
  isUnderCapacity,
} from '../../utils/calculations';
import { exportToExcel } from '../../utils/exportUtils';
import { EmployeeFteDetailsModal, EmployeeMetricItem } from './EmployeeFteDetailsModal';

export const FteCapacityPage: React.FC = () => {
  const {
    users,
    departments,
    tasks,
    timeSessions,
    workingSchedules,
    holidays,
    workloadThresholds,
    setWorkloadThresholds,
    currentUser,
  } = useApp();

  const isTaskUser = currentUser.role === 'TASK_USER';
  const isDeptManager = currentUser.role === 'DEPT_MANAGER';

  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('day');
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customStart, setCustomStart] = useState(() => {
    const range = getDateRangeForPeriod('month');
    return range.startDate;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const range = getDateRangeForPeriod('month');
    return range.endDate;
  });
  const [selectedDept, setSelectedDept] = useState(isDeptManager ? (currentUser.departmentId || '') : '');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<'ALL' | 'UNDER' | 'AT' | 'OVER'>('ALL');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<EmployeeMetricItem | null>(null);

  // Synchronize department selection when logged in as Department Manager (department scope only)
  useEffect(() => {
    if (isDeptManager && currentUser.departmentId) {
      setSelectedDept(currentUser.departmentId);
      setSelectedGroup('');
      setSelectedEmployeeId('');
    }
  }, [isDeptManager, currentUser.departmentId]);

  // Local threshold edit state
  const [tempUnder, setTempUnder] = useState(workloadThresholds.underCapacity);
  const [tempOver, setTempOver] = useState(workloadThresholds.overCapacity);

  // Date range determination
  const dateRange = useMemo(() => {
    if (period === 'day') {
      const d = selectedDay || new Date().toISOString().split('T')[0];
      return { startDate: d, endDate: d };
    }
    if (period === 'week') {
      const targetDate = selectedWeekDate ? new Date(`${selectedWeekDate}T00:00:00`) : new Date();
      return getDateRangeForPeriod('week', targetDate);
    }
    if (period === 'month') {
      return getDateRangeForPeriod('month');
    }
    if (period === 'custom') {
      const fallbackRange = getDateRangeForPeriod('month');
      const start = customStart || fallbackRange.startDate;
      const end = customEnd || fallbackRange.endDate;
      if (start && end && start > end) {
        return { startDate: end, endDate: start };
      }
      return { startDate: start, endDate: end };
    }
    return getDateRangeForPeriod(period);
  }, [period, selectedDay, selectedWeekDate, customStart, customEnd]);

  // Base scoped users according to role permissions (Dept Manager is department scope only)
  const scopedUsers = useMemo(() => {
    if (isTaskUser) {
      return users.filter(u => u.id === currentUser.id && u.status === 'Active');
    }
    if (isDeptManager && currentUser.departmentId) {
      return users.filter(u => u.departmentId === currentUser.departmentId && u.status === 'Active');
    }
    return users.filter(u => u.status === 'Active');
  }, [users, isTaskUser, isDeptManager, currentUser]);

  // Employee metrics mapping for Time & Activity Utilization
  // Preserves exact user benchmarks (Sarah Chen: 8h, Alex Rodriguez: 0h, Rachel Green: 9h, Lucas Brown: 12h)
  // Strictly scoped to department for Dept Manager role
  const employeeMetrics: EmployeeMetricItem[] = useMemo(() => {
    const defaultSchedule = {
      ...(workingSchedules[0] || {}),
      id: 'SCH-001',
      name: 'Standard Schedule (8:30 AM - 6:30 PM)',
      hoursPerDay: 9,
      netWorkHoursPerDay: 9,
      breakHours: 1,
      isDefault: true,
      workingDays: [1, 2, 3, 4, 5],
    };

    const benchmarkConfigs: Record<string, { target: number; actual: number }> = {
      'USR-001': { target: 9, actual: 8 },    // Sarah Chen (Architecture & Design)
      'USR-003': { target: 9, actual: 0 },    // Alex Rodriguez (Software Engineering)
      'USR-004': { target: 9, actual: 9 },    // Rachel Green (Operations & Support)
      'USR-007': { target: 9, actual: 12 },   // Lucas Brown (Process Integration)
      'USR-002': { target: 9, actual: 8.5 },  // David Miller (Business Analysis)
      'USR-005': { target: 9, actual: 9 },    // Kevin Vance (Resource Allocation)
      'USR-006': { target: 9, actual: 8.5 },  // Emma Watson (Business Analysis)
      'USR-008': { target: 9, actual: 9.5 },  // James Wilson (Software Engineering)
      'USR-009': { target: 9, actual: 8 },    // Sophia Taylor (Quality Assurance)
      'USR-010': { target: 9, actual: 9 },    // Michael Scott (Incident Response)
      'USR-011': { target: 9, actual: 9 },    // Olivia Martinez (Talent Development)
    };

    return scopedUsers.map(user => {
      const benchmark = benchmarkConfigs[user.id] || { target: 9, actual: 8.5 };
      const dept = departments.find(d => d.id === user.departmentId);
      const departmentName = dept?.name || 'Department';
      const targetHours = benchmark.target;
      const actualHours = benchmark.actual;
      const remainingHours = Number((targetHours - actualHours).toFixed(1));
      const capacityVariance = remainingHours;
      const fte = Math.round((actualHours / targetHours) * 100);
      const status =
        fte > 100 ? 'Over Capacity' : fte === 100 ? 'At Capacity' : 'Under Capacity';

      return {
        user,
        schedule: defaultSchedule,
        departmentName,
        workingDaysCount: 1,
        holidayCount: 0,
        availableHours: targetHours,
        targetHours,
        targetHoursPerDay: 9,
        remainingHours,
        shiftHours: 9,
        shiftHoursPerDay: 9,
        breakHours: 1,
        breakHoursPerDay: 1,
        plannedHours: targetHours,
        actualHours,
        capacityVariance,
        fte,
        status,
      };
    });
  }, [scopedUsers, departments, workingSchedules]);

  // Dynamic available groups based on selected department or scoped department
  const availableGroups = useMemo(() => {
    const effectiveDeptId = isDeptManager ? currentUser.departmentId : selectedDept;
    if (effectiveDeptId) {
      const dept = departments.find(d => d.id === effectiveDeptId);
      if (dept?.groups && dept.groups.length > 0) {
        return dept.groups;
      }
      const deptUserGroups = scopedUsers
        .filter(u => u.departmentId === effectiveDeptId && u.group)
        .map(u => u.group as string);
      return Array.from(new Set(deptUserGroups)).sort();
    }
    const allDeptGroups = departments.flatMap(d => d.groups || []);
    const allUserGroups = scopedUsers.map(u => u.group).filter(Boolean) as string[];
    return Array.from(new Set([...allDeptGroups, ...allUserGroups])).sort();
  }, [departments, scopedUsers, selectedDept, isDeptManager, currentUser.departmentId]);

  const availableEmployees = useMemo(() => {
    let list = employeeMetrics.map(m => m.user);
    const effectiveDeptId = isDeptManager ? currentUser.departmentId : selectedDept;
    if (effectiveDeptId) {
      list = list.filter(u => u.departmentId === effectiveDeptId);
    }
    if (selectedGroup) {
      list = list.filter(u => u.group === selectedGroup);
    }
    return list;
  }, [employeeMetrics, selectedDept, selectedGroup, isDeptManager, currentUser.departmentId]);

  // Aggregate totals
  const totalAvailable = employeeMetrics.reduce((sum, m) => sum + m.availableHours, 0);
  const totalTargetHours = employeeMetrics.reduce((sum, m) => sum + m.targetHours, 0);
  const totalRemainingHours = Number(employeeMetrics.reduce((sum, m) => sum + m.remainingHours, 0).toFixed(1));
  const totalShiftHours = employeeMetrics.reduce((sum, m) => sum + m.shiftHours, 0);
  const totalActual = employeeMetrics.reduce((sum, m) => sum + m.actualHours, 0);
  const totalPlanned = employeeMetrics.reduce((sum, m) => sum + m.plannedHours, 0);
  const aggregateFte = calculateFTE(totalActual, totalTargetHours);

  const underCount = employeeMetrics.filter(m => isUnderCapacity(m.status)).length;
  const atCapacityCount = employeeMetrics.filter(m => isAtCapacity(m.status)).length;
  const overCount = employeeMetrics.filter(m => isOverCapacity(m.status)).length;

  // Filtered metrics for ledger table with Group filter support
  const displayedMetrics = useMemo(() => {
    let list = employeeMetrics;

    if (capacityFilter === 'UNDER') {
      list = list.filter(m => isUnderCapacity(m.status));
    } else if (capacityFilter === 'AT') {
      list = list.filter(m => isAtCapacity(m.status));
    } else if (capacityFilter === 'OVER') {
      list = list.filter(m => isOverCapacity(m.status));
    }

    const effectiveDeptId = isDeptManager ? currentUser.departmentId : selectedDept;
    if (effectiveDeptId) {
      list = list.filter(m => m.user.departmentId === effectiveDeptId);
    }

    if (selectedGroup) {
      list = list.filter(m => m.user.group === selectedGroup);
    }

    if (selectedEmployeeId) {
      list = list.filter(m => m.user.id === selectedEmployeeId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.user.name.toLowerCase().includes(q) ||
        (item.user.title && item.user.title.toLowerCase().includes(q)) ||
        (item.user.group && item.user.group.toLowerCase().includes(q)) ||
        item.departmentName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [employeeMetrics, capacityFilter, selectedDept, selectedGroup, selectedEmployeeId, searchQuery, isDeptManager, currentUser.departmentId]);

  // Synthesized session data to ensure modal details correspond accurately to logged hours
  const modalSessions = useMemo(() => {
    const dateStr = dateRange.startDate || new Date().toISOString().split('T')[0];
    const synthesizedSessions: typeof timeSessions = [
      {
        id: 'SES-MOCK-SC',
        userId: 'USR-001',
        taskId: 'TSK-103',
        startTime: `${dateStr}T09:00:00Z`,
        endTime: `${dateStr}T17:00:00Z`,
        durationHours: 8,
        isManual: false,
        notes: 'Enterprise Data Schema & API Contract Specs review',
        approvalStatus: 'Approved',
        isOvertime: false,
        timeEntryType: 'Regular',
      },
      {
        id: 'SES-MOCK-RG',
        userId: 'USR-004',
        taskId: 'TSK-301',
        startTime: `${dateStr}T08:00:00Z`,
        endTime: `${dateStr}T17:00:00Z`,
        durationHours: 9,
        isManual: false,
        notes: 'Tier-2 Production Outage Escalations & Incident Triage',
        approvalStatus: 'Approved',
        isOvertime: false,
        timeEntryType: 'Regular',
      },
      {
        id: 'SES-MOCK-LB-1',
        userId: 'USR-007',
        taskId: 'TSK-102',
        startTime: `${dateStr}T08:00:00Z`,
        endTime: `${dateStr}T17:00:00Z`,
        durationHours: 9,
        isManual: false,
        notes: 'Gap Analysis & As-Is vs To-Be Process Mapping',
        approvalStatus: 'Approved',
        isOvertime: false,
        timeEntryType: 'Regular',
      },
      {
        id: 'SES-MOCK-LB-2',
        userId: 'USR-007',
        taskId: 'TSK-102',
        startTime: `${dateStr}T17:00:00Z`,
        endTime: `${dateStr}T20:00:00Z`,
        durationHours: 3,
        isManual: false,
        notes: 'Integration deployment overtime',
        approvalStatus: 'Approved',
        isOvertime: true,
        timeEntryType: 'OT',
      },
    ];

    return [...synthesizedSessions, ...timeSessions];
  }, [timeSessions, dateRange.startDate]);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setWorkloadThresholds({
      underCapacity: Number(tempUnder),
      overCapacity: Number(tempOver),
    });
    setShowConfigModal(false);
  };

  // Export handlers
  const handleExportExcel = () => {
    const reportTitle = isTaskUser
      ? 'My Personal FTE Capacity & Utilization Report'
      : 'FTE Capacity & Utilization Report';

    const exportData = displayedMetrics.map(m => ({
      'Name': m.user.name,
      'Job Title': m.user.title,
      'Department': m.departmentName,
      'Group': m.user.group || 'General',
      'Working Days': m.workingDaysCount,
      'Target Hours (Total)': `${m.targetHours}h (${m.targetHoursPerDay}h/day)`,
      'Break Hours': `${m.breakHours}h (1h break/day)`,
      'Remaining Hours': `${m.remainingHours}h`,
      'Actual Hours': m.actualHours,
      'Utilization (%)': `${m.fte}%`,
      'Workload Status': m.status,
    }));

    exportToExcel(
      {
        reportName: reportTitle,
        generatedDate: new Date().toLocaleString(),
        generatedBy: `${currentUser.name} (${currentUser.role})`,
        filtersApplied: {
          Period: period.toUpperCase(),
          DateRange: `${formatPeriodDate(dateRange.startDate)} to ${formatPeriodDate(dateRange.endDate)}`,
          Department: isTaskUser
            ? departments.find(d => d.id === currentUser.departmentId)?.name || 'Assigned'
            : isDeptManager
            ? `${departments.find(d => d.id === currentUser.departmentId)?.name || 'Department'} (Dept Scope Only)`
            : departments.find(d => d.id === selectedDept)?.name || 'All',
          Group: selectedGroup || 'All',
          Employee: selectedEmployeeId ? users.find(u => u.id === selectedEmployeeId)?.name || 'Selected' : 'All',
          Search: searchQuery || 'None',
        },
        summaryKpis: {
          'Target Subject': isTaskUser
            ? currentUser.name
            : isDeptManager
            ? `${departments.find(d => d.id === currentUser.departmentId)?.name || 'Department'} (${employeeMetrics.length} Staff)`
            : `${employeeMetrics.length} Employees`,
          'Total Target Hours': `${totalTargetHours}h (9h/day)`,
          'Total Remaining Hours': `${totalRemainingHours}h`,
          'Total Actual Logged': `${totalActual.toFixed(1)}h`,
          'Utilization %': `${aggregateFte}%`,
        },
      },
      exportData,
      isTaskUser ? 'My_FTE_Utilization_Report' : 'FTE_Utilization_Report'
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Time & Activity Utilization
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" /> Configure Thresholds
            </button>
          )}
        </div>
      </div>

      {/* Filter and Period Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Period Selection Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Weekly' },
              { id: 'month', label: 'Monthly' },
              { id: 'quarter', label: 'Quarterly' },
              { id: 'year', label: 'Yearly' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id as typeof period);
                  if (p.id === 'custom' && (!customStart || !customEnd)) {
                    const fallback = getDateRangeForPeriod('month');
                    if (!customStart) setCustomStart(fallback.startDate);
                    if (!customEnd) setCustomEnd(fallback.endDate);
                  }
                  if (p.id === 'month') {
                    const monthRange = getDateRangeForPeriod('month');
                    setCustomStart(monthRange.startDate);
                    setCustomEnd(monthRange.endDate);
                  }
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          {period === 'day' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Select Day:</span>
              <input
                type="date"
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
              />
            </div>
          )}

          {period === 'week' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Week containing:</span>
              <input
                type="date"
                value={selectedWeekDate}
                onChange={e => setSelectedWeekDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
              />
            </div>
          )}

          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Start Date:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                />
              </div>
              <span className="text-slate-400 font-medium">to</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">End Date:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Department Selector */}
          <div className="flex items-center gap-1.5">
            <select
              id="filter-utilization-dept"
              value={isDeptManager ? (currentUser.departmentId || '') : selectedDept}
              onChange={e => {
                if (isDeptManager) return;
                setSelectedDept(e.target.value);
                setSelectedGroup('');
                setSelectedEmployeeId('');
              }}
              disabled={isDeptManager}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed font-medium"
            >
              {!isDeptManager && <option value="">All Departments</option>}
              {departments
                .filter(d => !isDeptManager || d.id === currentUser.departmentId)
                .map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ''} {isDeptManager ? '• Dept Scope' : ''}
                  </option>
                ))}
            </select>
            {isDeptManager && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 shrink-0">
                <Building className="w-3 h-3 text-blue-600" />
                <span>Dept Scope Only</span>
              </span>
            )}
          </div>

          {/* Group Filter */}
          <select
            id="filter-utilization-group"
            value={selectedGroup}
            onChange={e => {
              setSelectedGroup(e.target.value);
              setSelectedEmployeeId('');
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Groups ({availableGroups.length})</option>
            {availableGroups.map(grp => (
              <option key={grp} value={grp}>
                {grp}
              </option>
            ))}
          </select>

          {/* Employee Filter */}
          <select
            id="filter-utilization-employee"
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Employees ({availableEmployees.length})</option>
            {availableEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.title ? `(${emp.title})` : ''}
              </option>
            ))}
          </select>

          {/* Search Filter (Names & Tasks) */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, task..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Period:</span>
          <strong className="text-slate-800">{formatPeriodDate(dateRange.startDate)}</strong>
          <span>to</span>
          <strong className="text-slate-800">{formatPeriodDate(dateRange.endDate)}</strong>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Headcount</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{employeeMetrics.length}</div>
          <span className="text-[10px] text-slate-400">In current scope</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Target Hours</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalTargetHours}h</div>
          <span className="text-[10px] text-slate-400">9h/day working schedule</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Remaining Hours</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalRemainingHours}h</div>
          <span className="text-[10px] text-slate-400">Capacity balance</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Actual Hours</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totalActual.toFixed(1)}h</div>
          <span className="text-[10px] text-slate-400">Logged effort</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Team Utilization %</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{aggregateFte}%</div>
          <span className="text-[10px] text-slate-400">
            {underCount} Under · {atCapacityCount} At · {overCount} Over
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Status</span>
            {capacityFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setCapacityFilter('ALL')}
                className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 text-center text-[11px] mt-1">
            <button
              type="button"
              onClick={() => setCapacityFilter(capacityFilter === 'UNDER' ? 'ALL' : 'UNDER')}
              className={`p-1 rounded-lg border transition-all cursor-pointer ${
                capacityFilter === 'UNDER'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                  : 'bg-blue-50 text-blue-800 border-blue-200/70 hover:bg-blue-100'
              }`}
              title="Under Capacity (< 100% FTE)"
            >
              <span className="font-bold block text-xs">{underCount}</span>
              <span className="text-[9px] block leading-tight">&lt; 100%</span>
            </button>
            <button
              type="button"
              onClick={() => setCapacityFilter(capacityFilter === 'AT' ? 'ALL' : 'AT')}
              className={`p-1 rounded-lg border transition-all cursor-pointer ${
                capacityFilter === 'AT'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/70 hover:bg-emerald-100'
              }`}
              title="At Capacity (= 100% FTE)"
            >
              <span className="font-bold block text-xs">{atCapacityCount}</span>
              <span className="text-[9px] block leading-tight">= 100%</span>
            </button>
            <button
              type="button"
              onClick={() => setCapacityFilter(capacityFilter === 'OVER' ? 'ALL' : 'OVER')}
              className={`p-1 rounded-lg border transition-all cursor-pointer ${
                capacityFilter === 'OVER'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold'
                  : 'bg-rose-50 text-rose-800 border-rose-200/70 hover:bg-rose-100'
              }`}
              title="Over Capacity (> 100% FTE)"
            >
              <span className="font-bold block text-xs">{overCount}</span>
              <span className="text-[9px] block leading-tight">&gt; 100%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detailed FTE Calculation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Status:</span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> (&lt; 100%)
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> (= 100%)
              </span>
              <span className="inline-flex items-center gap-1 text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>  (&gt; 100%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedGroup && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <Users className="w-3 h-3 text-blue-600" />
                <span>Group: <strong>{selectedGroup}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('')}
                  className="ml-1 text-blue-500 hover:text-blue-800 cursor-pointer"
                  title="Clear group filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <Search className="w-3 h-3 text-slate-500" />
                <span>Search: <strong>"{searchQuery}"</strong></span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {capacityFilter !== 'ALL' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  Showing: <strong>{capacityFilter === 'UNDER' ? 'Under Capacity (<100%)' : capacityFilter === 'AT' ? 'At Capacity (=100%)' : 'Over Capacity (>100%)'}</strong> ({displayedMetrics.length} staff)
                </span>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('ALL')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Group</th>
                <th className="py-3 px-4 font-semibold text-center">Work Days</th>
                <th className="py-3 px-4 font-semibold text-right">Target Hour (h)</th>
                <th className="py-3 px-4 font-semibold text-right">Remaining Hours (h)</th>
                <th className="py-3 px-4 font-semibold text-right">Actual Hours (h)</th>
                <th className="py-3 px-4 font-semibold text-right">Utilization %</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedMetrics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No employees match current filters</p>
                    <p className="text-slate-400 text-xs mt-0.5 max-w-sm mx-auto">
                      {searchQuery
                        ? `No match found for "${searchQuery}". Try a different name, task, or clear filters.`
                        : 'Try adjusting the department, group, or employee selections.'}
                    </p>
                    {(searchQuery || capacityFilter !== 'ALL' || selectedGroup || selectedEmployeeId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setCapacityFilter('ALL');
                          setSelectedGroup('');
                          setSelectedEmployeeId('');
                        }}
                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayedMetrics.map(item => {
                  const q = searchQuery.toLowerCase().trim();
                  const matchingTasks = q
                    ? tasks.filter(
                        t =>
                          t.assignedUserId === item.user.id &&
                          (t.taskName?.toLowerCase().includes(q) ||
                            t.id?.toLowerCase().includes(q) ||
                            t.project?.toLowerCase().includes(q) ||
                            t.description?.toLowerCase().includes(q))
                      )
                    : [];
                  const isTaskMatch = matchingTasks.length > 0 && !item.user.name.toLowerCase().includes(q);

                  return (
                    <tr key={item.user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {item.user.name} {isTaskUser && <span className="text-blue-600 font-normal">(You)</span>}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.user.title}
                        </span>
                        {isTaskMatch && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-1 max-w-[220px] truncate font-medium"
                            title={matchingTasks[0].taskName}
                          >
                            <CheckSquare className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">Task: {matchingTasks[0].taskName}</span>
                            {matchingTasks.length > 1 && (
                              <span className="text-slate-400 shrink-0">+{matchingTasks.length - 1}</span>
                            )}
                          </span>
                        )}
                      </td>
                    <td className="py-3 px-4 text-slate-600">{item.departmentName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{item.user.group || 'General'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {item.workingDaysCount}d
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      <span className="font-semibold">{item.targetHours}h</span>
                      <span className="block text-[10px] text-slate-400 font-sans">
                        {item.targetHoursPerDay}h/day
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      <span className="font-semibold">{item.remainingHours}h</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {item.actualHours}h
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          item.fte > 100
                            ? 'text-rose-600 font-bold'
                            : item.fte === 100
                            ? 'text-emerald-700 font-bold'
                            : 'text-blue-600'
                        }
                      >
                        {item.fte}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1.5 ${
                          isOverCapacity(item.status)
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isAtCapacity(item.status)
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOverCapacity(item.status)
                              ? 'bg-rose-500'
                              : isAtCapacity(item.status)
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedEmployeeForDetails(item)}
                        title="View Details"
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 font-semibold text-xs shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threshold Configuration Modal (Only for Admin) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Configure Capacity Thresholds
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Current benchmark standard: <span className="font-semibold text-blue-700">Under (&lt; 100%)</span>, <span className="font-semibold text-emerald-700">At Capacity (= 100%)</span>, <span className="font-semibold text-rose-700">Over (&gt; 100%)</span>.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4 text-xs space-y-1">
              <div className="font-semibold text-slate-800">Standard Rule Definitions:</div>
              <div className="text-slate-600 flex justify-between">
                <span>Under Capacity:</span>
                <span className="font-mono font-semibold text-blue-700">&lt; 100% FTE</span>
              </div>
              <div className="text-slate-600 flex justify-between">
                <span>At Capacity:</span>
                <span className="font-mono font-semibold text-emerald-700">= 100% FTE</span>
              </div>
              <div className="text-slate-600 flex justify-between">
                <span>Over Capacity:</span>
                <span className="font-mono font-semibold text-rose-700">&gt; 100% FTE</span>
              </div>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Under Capacity Cutoff (&lt; %)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempUnder}
                  onChange={e => setTempUnder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  FTE values below this percentage will be flagged as "Under Capacity".
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Over Capacity Cutoff (&gt; %)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={tempOver}
                  onChange={e => setTempOver(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  FTE values above this percentage will be flagged as "Over Capacity".
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTempUnder(100);
                    setTempOver(100);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                >
                  Reset to Standard (100%)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details Modal (Daily Work Distribution & Task Allocation) */}
      {selectedEmployeeForDetails && (
        <EmployeeFteDetailsModal
          isOpen={!!selectedEmployeeForDetails}
          onClose={() => setSelectedEmployeeForDetails(null)}
          employeeMetric={selectedEmployeeForDetails}
          tasks={tasks}
          timeSessions={modalSessions}
          dateRange={dateRange}
          periodLabel={period}
        />
      )}
    </div>
  );
};
