import React from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  ClockAlert,
  PieChart,
  Users,
  Building2,
  Calendar,
  Table,
  Square,
  ClipboardCheck,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';
import { formatSecondsToTimer } from '../../utils/calculations';

export type TabType =
  | 'dashboard'
  | 'tasks'
  | 'timetracking'
  | 'timecorrection'
  | 'timesheetapproval'
  | 'fte'
  | 'users'
  | 'maintenance';

export type MaintenanceSubTab = 'tasks' | 'departments' | 'holidays';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType, subTab?: MaintenanceSubTab) => void;
  maintenanceSubTab?: MaintenanceSubTab;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar = ({
  activeTab,
  setActiveTab,
  maintenanceSubTab = 'tasks',
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) => {
  const {
    currentUser,
    activeTimer,
    activeTimerTask,
    timerElapsedSeconds,
    stopTimer,
    timeSessions,
    users,
  } = useApp();

  const role = currentUser.role;

  // Collapsible Maintenance Sub-menu state
  const [isMaintenanceOpen, setIsMaintenanceOpen] = React.useState<boolean>(true);

  // Auto-expand maintenance when maintenance tab is active
  React.useEffect(() => {
    if (activeTab === 'maintenance') {
      setIsMaintenanceOpen(true);
    }
  }, [activeTab]);

  // Compute pending timesheet requests for current manager
  const pendingApprovalCount = React.useMemo(() => {
    if (role !== 'MANAGER' && role !== 'DEPT_MANAGER') {
      return 0;
    }
    return timeSessions.filter(s => {
      if (s.approvalStatus !== 'Pending') return false;
      if (!s.isManual && !s.correctionType && !s.manualReason) return false;
      const user = users.find(u => u.id === s.userId);
      if (!user || user.role !== 'TASK_USER') return false;
      if (role === 'DEPT_MANAGER') {
        return user.departmentId === currentUser.departmentId;
      }
      return true;
    }).length;
  }, [timeSessions, users, currentUser, role]);

  interface NavItem {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    allowedRoles: Role[];
    badge?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      allowedRoles: ['MANAGER', 'DEPT_MANAGER', 'TASK_USER'],
    },
    {
      id: 'tasks',
      label: 'Time & Activity Log',
      icon: <CheckSquare className="w-4 h-4" />,
      allowedRoles: ['MANAGER', 'DEPT_MANAGER', 'TASK_USER'],
    },
    {
      id: 'timetracking',
      label: 'Task Management',
      icon: <Clock className="w-4 h-4" />,
      allowedRoles: ['MANAGER', 'DEPT_MANAGER', 'TASK_USER'],
    },
    {
      id: 'timecorrection',
      label: 'Timesheet',
      icon: <ClockAlert className="w-4 h-4" />,
      allowedRoles: ['MANAGER', 'DEPT_MANAGER', 'TASK_USER'],
    },
    {
      id: 'timesheetapproval',
      label: 'Timesheet Approval',
      icon: <ClipboardCheck className="w-4 h-4" />,
      allowedRoles: ['MANAGER', 'DEPT_MANAGER'],
    },
    {
      id: 'fte',
      label: 'Time & Activity Utilization',
      icon: <PieChart className="w-4 h-4" />,
      allowedRoles: ['MANAGER', 'DEPT_MANAGER'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <Users className="w-4 h-4" />,
      allowedRoles: ['ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter(item => item.allowedRoles.includes(role));

  const handleNavClick = (tab: TabType, subTab?: MaintenanceSubTab) => {
    setActiveTab(tab, subTab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#1E293B] text-slate-200 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo & Title */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-700/60 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-base shadow-sm">
            C
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight uppercase tracking-tight">
              Chronos v3
            </h1>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1.5">
          {filteredNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-500 text-white font-semibold shadow-sm'
                    : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-blue-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Maintenance Section (Admin, EEM Admin & Dept Manager) */}
          {(role === 'ADMIN' || role === 'MANAGER' || role === 'DEPT_MANAGER') && (
            <div className="pt-2">
              {/* Parent Expandable Button */}
              <button
                type="button"
                id="nav-maintenance-parent"
                onClick={() => {
                  setIsMaintenanceOpen(prev => !prev);
                  if (activeTab !== 'maintenance') {
                    let targetSub: MaintenanceSubTab = 'tasks';
                    if (role === 'ADMIN') {
                      targetSub = 'departments';
                    } else if (role === 'DEPT_MANAGER') {
                      targetSub = 'tasks';
                    } else {
                      targetSub = maintenanceSubTab || 'tasks';
                    }
                    handleNavClick('maintenance', targetSub);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'maintenance'
                    ? 'bg-[#334155] text-white font-semibold'
                    : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare
                    className={`w-4 h-4 ${
                      activeTab === 'maintenance' ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>Maintenance</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isMaintenanceOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Collapsible Sub-modules */}
              {isMaintenanceOpen && (
                <div className="space-y-1 pt-1">
                  {/* Task Names (EEM Manager & Dept Manager only - Admin has NO access) */}
                  {role !== 'ADMIN' && (
                    <button
                      id="nav-subtab-tasks"
                      type="button"
                      onClick={() => handleNavClick('maintenance', 'tasks')}
                      className={`w-full flex items-center gap-3 pl-8 pr-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'maintenance' && maintenanceSubTab === 'tasks'
                          ? 'bg-blue-500 text-white font-semibold shadow-xs'
                          : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                      }`}
                    >
                      <ClipboardList
                        className={`w-4 h-4 ${
                          activeTab === 'maintenance' && maintenanceSubTab === 'tasks'
                            ? 'text-white'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>Task Names</span>
                    </button>
                  )}

                  {/* Department (Admin & EEM Manager - Dept Manager has NO access) */}
                  {(role === 'ADMIN' || role === 'MANAGER') && (
                    <button
                      id="nav-subtab-departments"
                      type="button"
                      onClick={() => handleNavClick('maintenance', 'departments')}
                      className={`w-full flex items-center gap-3 pl-8 pr-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'maintenance' && maintenanceSubTab === 'departments'
                          ? 'bg-blue-500 text-white font-semibold shadow-xs'
                          : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                      }`}
                    >
                      <Building2
                        className={`w-4 h-4 ${
                          activeTab === 'maintenance' && maintenanceSubTab === 'departments'
                            ? 'text-white'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>Department</span>
                    </button>
                  )}

                  {/* Holiday Calendar (EEM Manager ONLY - Admin & Dept Manager have NO access) */}
                  {role === 'MANAGER' && (
                    <button
                      id="nav-subtab-holidays"
                      type="button"
                      onClick={() => handleNavClick('maintenance', 'holidays')}
                      className={`w-full flex items-center gap-3 pl-8 pr-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTab === 'maintenance' && maintenanceSubTab === 'holidays'
                          ? 'bg-blue-500 text-white font-semibold shadow-xs'
                          : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                      }`}
                    >
                      <Calendar
                        className={`w-4 h-4 ${
                          activeTab === 'maintenance' && maintenanceSubTab === 'holidays'
                            ? 'text-white'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>Holiday Calendar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Active Timer Sidebar Card */}
        {role !== 'ADMIN' && activeTimer && activeTimerTask && (
          <div className="p-3.5 mx-4 mb-3 bg-slate-900/90 border border-blue-500/30 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Active Timer
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {formatSecondsToTimer(timerElapsedSeconds)}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium truncate mb-2.5">
              {activeTimerTask.taskName}
            </p>
            <button
              onClick={() => stopTimer()}
              className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" /> Stop Timer
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
