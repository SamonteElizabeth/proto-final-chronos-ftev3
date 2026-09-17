import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, TabType, MaintenanceSubTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/auth/LoginPage';
import { EmployeeDashboard } from './components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from './components/dashboard/ManagerDashboard';
import { TaskManagementPage } from './components/tasks/TaskManagementPage';
import { TimeTrackingPage } from './components/timetracking/TimeTrackingPage';
import { TimeCorrectionPage } from './components/timecorrection/TimeCorrectionPage';
import { TimesheetApprovalPage } from './components/timecorrection/TimesheetApprovalPage';
import { FteCapacityPage } from './components/fte/FteCapacityPage';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { MaintenanceTablePage } from './components/admin/MaintenanceTablePage';
import { TaskModal } from './components/tasks/TaskModal';
import { ViewTaskModal } from './components/tasks/ViewTaskModal';
import { ManualTimeModal } from './components/tasks/ManualTimeModal';
import { TimerConflictModal } from './components/common/TimerConflictModal';
import { WorkScheduleSettingsModal } from './components/common/WorkScheduleSettingsModal';
import { ToastNotification } from './components/common/ToastNotification';
import { Task } from './types';
import { LayoutDashboard, Users, Menu } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    currentUser.role === 'ADMIN' ? 'users' : 'dashboard'
  );
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<MaintenanceSubTab>('tasks');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Role-based tab guards
  useEffect(() => {
    if (
      currentUser.role === 'ADMIN' &&
      (activeTab === 'dashboard' ||
        activeTab === 'tasks' ||
        activeTab === 'timetracking' ||
        activeTab === 'timecorrection' ||
        activeTab === 'timesheetapproval' ||
        activeTab === 'fte')
    ) {
      setActiveTab('users');
    } else if (
      currentUser.role === 'TASK_USER' &&
      (activeTab === 'fte' || activeTab === 'timesheetapproval' || activeTab === 'maintenance')
    ) {
      setActiveTab('dashboard');
    }

    if (currentUser.role === 'ADMIN' && maintenanceSubTab !== 'departments') {
      setMaintenanceSubTab('departments');
    } else if (currentUser.role === 'DEPT_MANAGER' && maintenanceSubTab !== 'tasks') {
      setMaintenanceSubTab('tasks');
    }
  }, [currentUser.role, activeTab, maintenanceSubTab]);

  // Dashboard sub-view toggle (Personal Workspace vs Executive/Manager View)
  const [dashboardViewMode, setDashboardViewMode] = useState<'employee' | 'manager'>(
    currentUser.role === 'TASK_USER' ? 'employee' : 'manager'
  );

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
  const [isWorkScheduleOpen, setIsWorkScheduleOpen] = useState(false);

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenViewTask = (task: Task) => {
    setViewingTask(task);
    setIsViewModalOpen(true);
  };

  const handleSetActiveTab = (tab: TabType, subTab?: MaintenanceSubTab) => {
    if (
      currentUser.role === 'ADMIN' &&
      (tab === 'dashboard' ||
        tab === 'tasks' ||
        tab === 'timetracking' ||
        tab === 'timecorrection' ||
        tab === 'timesheetapproval' ||
        tab === 'fte')
    ) {
      setActiveTab('users');
      return;
    }
    if (
      currentUser.role === 'TASK_USER' &&
      (tab === 'fte' || tab === 'timesheetapproval' || tab === 'maintenance')
    ) {
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(tab);
    if (subTab) {
      setMaintenanceSubTab(subTab);
    }
  };

  // If user is not authenticated, display the login screen
  if (!isAuthenticated) {
    return (
      <>
        <ToastNotification />
        <LoginPage />
      </>
    );
  }

  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    tasks: 'Time & Activity Log',
    timetracking: 'Task Management',
    timecorrection: 'Timesheet',
    timesheetapproval: 'Timesheet Approval',
    fte: 'Time & Activity Utilization',
    users: 'User Management',
    maintenance:
      maintenanceSubTab === 'departments'
        ? 'Department Maintenance'
        : maintenanceSubTab === 'holidays'
        ? 'Holiday Calendar Maintenance'
        : 'Task Names Maintenance',
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      {/* Toast Notification Container */}
      <ToastNotification />

      {/* Timer Conflict Modal (BR-001) */}
      <TimerConflictModal />

      {/* Work Schedule Settings Modal (under User Account) */}
      <WorkScheduleSettingsModal
        isOpen={isWorkScheduleOpen}
        onClose={() => setIsWorkScheduleOpen(false)}
        targetUser={currentUser}
      />

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialTask={editingTask}
      />

      {/* View Task Details Modal */}
      <ViewTaskModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        task={viewingTask}
        onEdit={handleOpenEditTask}
      />

      {/* Manual Time Entry Modal (BR-010) */}
      <ManualTimeModal
        isOpen={isManualTimeOpen}
        onClose={() => setIsManualTimeOpen(false)}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        maintenanceSubTab={maintenanceSubTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Header with breadcrumb, quick actions, user account near Log Time */}
        <Header
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenNewTask={handleOpenNewTask}
          onOpenManualTime={() => setIsManualTimeOpen(true)}
          onOpenWorkSchedule={() => setIsWorkScheduleOpen(true)}
          activeTabTitle={tabTitles[activeTab] || activeTab}
        />

        {/* Dynamic Page Content (Full Screen) */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 w-full space-y-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && currentUser.role !== 'ADMIN' && (
            <div className="space-y-6">
              {/* If Manager or Dept Manager, offer view toggle between Employee View and Manager View */}
              {currentUser.role !== 'TASK_USER' && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">
                    Dashboard Perspective:
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setDashboardViewMode('manager')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        dashboardViewMode === 'manager'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Executive
                    </button>
                    <button
                      onClick={() => setDashboardViewMode('employee')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        dashboardViewMode === 'employee'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" /> My Personal Desk
                    </button>
                  </div>
                </div>
              )}

              {/* Render Selected Dashboard Perspective */}
              {dashboardViewMode === 'manager' && currentUser.role !== 'TASK_USER' ? (
                <ManagerDashboard onViewTask={handleOpenViewTask} />
              ) : (
                <EmployeeDashboard
                  onViewTask={handleOpenViewTask}
                />
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && currentUser.role !== 'ADMIN' && (
            <TaskManagementPage
              onOpenNewTask={handleOpenNewTask}
              onViewTask={handleOpenViewTask}
              onEditTask={handleOpenEditTask}
            />
          )}

          {/* Time Tracking / Task Execution Tab */}
          {activeTab === 'timetracking' && currentUser.role !== 'ADMIN' && (
            <TimeTrackingPage
              onEditTask={handleOpenEditTask}
              onViewTask={handleOpenViewTask}
            />
          )}

          {/* Time Correction Module */}
          {activeTab === 'timecorrection' && currentUser.role !== 'ADMIN' && (
            <TimeCorrectionPage
              onViewTask={handleOpenViewTask}
            />
          )}

          {/* Timesheet Approval Module (EEM Admin & Dept Manager) */}
          {activeTab === 'timesheetapproval' &&
            (currentUser.role === 'MANAGER' || currentUser.role === 'DEPT_MANAGER') && (
              <TimesheetApprovalPage onViewTask={handleOpenViewTask} />
            )}

          {/* FTE & Capacity Tab (Managers only) */}
          {activeTab === 'fte' && currentUser.role !== 'TASK_USER' && currentUser.role !== 'ADMIN' && <FteCapacityPage />}

          {/* User Management Tab (Admin) */}
          {activeTab === 'users' && <UserManagementPage />}

          {/* Maintenance Table Module (Admin & EEM Admin) */}
          {activeTab === 'maintenance' && (
            <MaintenanceTablePage
              key={maintenanceSubTab}
              initialSubTab={maintenanceSubTab}
              onSubTabChange={setMaintenanceSubTab}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
