import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import {
  Menu,
  Plus,
  Timer,
  Clock,
  LogOut,
  ChevronDown,
  UserCheck,
  Shield,
  Layers,
  ArrowRightLeft,
  CalendarCheck,
  RotateCcw,
  Settings,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenNewTask: () => void;
  onOpenManualTime: () => void;
  onOpenWorkSchedule?: () => void;
  activeTabTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenNewTask,
  onOpenManualTime,
  onOpenWorkSchedule,
  activeTabTitle = 'Dashboard',
}) => {
  const {
    currentUser,
    departments,
    loginAsRole,
    logout,
    resetToDemoData,
  } = useApp();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userDepartment = departments.find(d => d.id === currentUser.departmentId);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & System Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-slate-800 text-xs sm:text-sm font-semibold capitalize">
            {activeTabTitle}
          </span>
        </div>
      </div>

      {/* Right Controls: User Account & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Account / Role Switcher Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-all cursor-pointer shadow-2xs"
            title="User Profile & Role Switcher"
          >
            <div
              className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                currentUser.role === 'ADMIN'
                  ? 'bg-rose-600'
                  : currentUser.role === 'MANAGER'
                  ? 'bg-blue-600'
                  : currentUser.role === 'DEPT_MANAGER'
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
            >
              {currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)}
            </div>
            <div className="hidden md:block text-left pr-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser.name}
                </p>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : currentUser.role === 'MANAGER'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : currentUser.role === 'DEPT_MANAGER'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {currentUser.role === 'DEPT_MANAGER'
                    ? 'DEPT MGR'
                    : currentUser.role === 'TASK_USER'
                    ? 'EMPLOYEE'
                    : currentUser.role === 'MANAGER'
                    ? 'EEM ADMIN'
                    : currentUser.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate max-w-[130px] mt-0.5">
                {currentUser.title || currentUser.role}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isDropdownOpen ? 'rotate-180 text-slate-700' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-2.5 z-50 text-xs animate-in zoom-in-95">
              {/* Profile Card Header */}
              <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-xl border border-slate-200/80 mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center shadow-sm ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-rose-600'
                        : currentUser.role === 'MANAGER'
                        ? 'bg-blue-600'
                        : currentUser.role === 'DEPT_MANAGER'
                        ? 'bg-amber-600'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {currentUser.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .substring(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-900 text-xs truncate">
                        {currentUser.name}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          currentUser.role === 'ADMIN'
                            ? 'bg-rose-100 text-rose-700'
                            : currentUser.role === 'MANAGER'
                            ? 'bg-blue-100 text-blue-700'
                            : currentUser.role === 'DEPT_MANAGER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {currentUser.role === 'DEPT_MANAGER'
                          ? 'DEPT MANAGER'
                          : currentUser.role === 'TASK_USER'
                          ? 'EMPLOYEE'
                          : currentUser.role === 'MANAGER'
                          ? 'EEM ADMIN'
                          : currentUser.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
                      {currentUser.title || userDepartment?.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick 1 User per Role Access Section */}
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3 h-3 text-blue-500" />
                  <span>Switch Role Persona</span>
                </span>
                <span className="text-[9px] text-slate-400 font-normal lowercase">1-click switch</span>
              </div>

              <div className="space-y-1 my-1">
                {/* Admin */}
                <button
                  type="button"
                  onClick={() => {
                    loginAsRole('ADMIN');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-rose-50 text-rose-900 font-semibold border border-rose-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">Sarah Chen</p>
                    <p className="text-[10px] text-slate-500">Admin-wide</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    ADMIN
                  </span>
                </button>

                {/* EEM Admin */}
                <button
                  type="button"
                  onClick={() => {
                    loginAsRole('MANAGER');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    currentUser.role === 'MANAGER'
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">David Miller</p>
                    <p className="text-[10px] text-slate-500">EEM Administration</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    EEM ADMIN
                  </span>
                </button>

                {/* Department Manager */}
                <button
                  type="button"
                  onClick={() => {
                    loginAsRole('DEPT_MANAGER');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    currentUser.role === 'DEPT_MANAGER'
                      ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">Alex Rodriguez</p>
                    <p className="text-[10px] text-slate-500">Department-level (TSD)</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    DEPT MGR
                  </span>
                </button>

                {/* Employee */}
                <button
                  type="button"
                  onClick={() => {
                    loginAsRole('TASK_USER');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    currentUser.role === 'TASK_USER'
                      ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">Emma Watson</p>
                    <p className="text-[10px] text-slate-500">Individual Workspace</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    EMPLOYEE
                  </span>
                </button>
              </div>

              {/* Utility actions: Work Schedule & Sign Out */}
              <div className="pt-2 mt-1.5 border-t border-slate-100 space-y-1">
                {onOpenWorkSchedule && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenWorkSchedule();
                    }}
                    className="w-full flex items-center gap-2 py-1.5 px-2.5 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Work Schedule & Settings</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    resetToDemoData();
                  }}
                  className="w-full flex items-center gap-2 py-1.5 px-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Sample Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

