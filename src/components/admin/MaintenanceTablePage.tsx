import React, { useState, useEffect } from 'react';
import { DepartmentManagementPage } from './DepartmentManagementPage';
import { TaskMaintenancePage } from './TaskMaintenancePage';
import { HolidayCalendarMaintenancePage } from './HolidayCalendarMaintenancePage';
import { MaintenanceSubTab } from '../layout/Sidebar';
import { useApp } from '../../context/AppContext';

interface MaintenanceTablePageProps {
  initialSubTab?: MaintenanceSubTab;
  onSubTabChange?: (subTab: MaintenanceSubTab) => void;
}

export const MaintenanceTablePage: React.FC<MaintenanceTablePageProps> = ({
  initialSubTab = 'tasks',
  onSubTabChange,
}) => {
  const { currentUser } = useApp();
  const role = currentUser.role;

  // Enforce access rules:
  // - Admin only has access to Department Maintenance Table (NO Holiday Calendar or Task Names)
  // - EEM Admin has access to Task Names, Department, and Holiday Calendar
  // - Dept Manager has access to Task Names only (NO Department or Holiday Calendar)
  const resolveSafeSubTab = (tab?: string): MaintenanceSubTab => {
    if (role === 'ADMIN') {
      return 'departments';
    }
    if (role === 'DEPT_MANAGER') {
      return 'tasks';
    }
    if (role === 'MANAGER') {
      if (tab === 'departments' || tab === 'holidays' || tab === 'tasks') {
        return tab;
      }
      return 'tasks';
    }
    return 'tasks';
  };

  const [currentSubTab, setCurrentSubTab] = useState<MaintenanceSubTab>(() => resolveSafeSubTab(initialSubTab));

  useEffect(() => {
    if (initialSubTab) {
      const safeTab = resolveSafeSubTab(initialSubTab);
      setCurrentSubTab(safeTab);
      if (safeTab !== initialSubTab && onSubTabChange) {
        onSubTabChange(safeTab);
      }
    }
  }, [initialSubTab, role]);

  return (
    <div id="maintenance-table-module" className="space-y-6">
      {/* Active Maintenance Sub-Page */}
      {currentSubTab === 'departments' && (role === 'ADMIN' || role === 'MANAGER') && (
        <DepartmentManagementPage />
      )}
      {currentSubTab === 'holidays' && role === 'MANAGER' && (
        <HolidayCalendarMaintenancePage />
      )}
      {currentSubTab === 'tasks' && (role === 'MANAGER' || role === 'DEPT_MANAGER') && (
        <TaskMaintenancePage />
      )}
    </div>
  );
};
