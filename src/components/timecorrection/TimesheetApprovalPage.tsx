import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TimeSession } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  AlertCircle,
  User as UserIcon,
  Calendar,
  Building2,
  Search,
  FileText,
  ClockAlert,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface TimesheetApprovalPageProps {
  onViewTask?: (task: Task) => void;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const TimesheetApprovalPage: React.FC<TimesheetApprovalPageProps> = ({
  onViewTask,
}) => {
  const {
    timeSessions,
    users,
    tasks,
    departments,
    currentUser,
    approveTimeSession,
    rejectTimeSession,
  } = useApp();

  const isEEMAdmin = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';
  const isDeptManager = currentUser.role === 'DEPT_MANAGER';

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    const eem = departments.find(d => d.name === 'EEM');
    return eem ? eem.id : 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Review Modal state (the ONLY way to approve and reject is inside Review)
  const [reviewingSession, setReviewingSession] = useState<TimeSession | null>(null);
  const [managerNote, setManagerNote] = useState('');

  // Rejection modal
  const [rejectingSession, setRejectingSession] = useState<TimeSession | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Department name lookup for Dept Manager
  const userDept = departments.find(d => d.id === currentUser.departmentId);

  // All time correction and overtime requests in current scope
  const baseRequests = useMemo(() => {
    return timeSessions.filter(session => {
      // Must be a manual time correction or OT entry (strictly time correction & overtime only)
      if (!session.isManual && !session.correctionType && !session.manualReason && !session.isOvertime) {
        return false;
      }

      const requester = users.find(u => u.id === session.userId);
      // Strictly from TASK_USER or within manager's department
      if (requester && requester.role !== 'TASK_USER') return false;

      // Department scope enforcement
      if (isDeptManager) {
        if (requester?.departmentId !== currentUser.departmentId) return false;
      } else if (isEEMAdmin && selectedDeptId !== 'ALL') {
        if (requester?.departmentId !== selectedDeptId) return false;
      }

      return true;
    });
  }, [timeSessions, users, currentUser, isDeptManager, isEEMAdmin, selectedDeptId]);

  // KPI Metrics counts
  const metrics = useMemo(() => {
    const totalCount = baseRequests.length;
    const pendingCount = baseRequests.filter(s => s.approvalStatus === 'Pending').length;
    const approvedCount = baseRequests.filter(s => (s.approvalStatus || 'Approved') === 'Approved').length;
    const rejectedCount = baseRequests.filter(s => s.approvalStatus === 'Rejected').length;

    return {
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }, [baseRequests]);

  // Filtered requests based on status, date range, and search query
  const filteredRequests = useMemo(() => {
    return baseRequests.filter(session => {
      // Status filter
      const currentStatus = session.approvalStatus || 'Approved';
      if (statusFilter !== 'ALL' && currentStatus.toUpperCase() !== statusFilter) {
        return false;
      }

      // Date range filter
      const workDate = session.startTime.split('T')[0];
      if (startDate && workDate < startDate) return false;
      if (endDate && workDate > endDate) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const requester = users.find(u => u.id === session.userId);
        const task = tasks.find(t => t.id === session.taskId);
        const matchesUser =
          requester?.name.toLowerCase().includes(q) ||
          requester?.employeeId.toLowerCase().includes(q) ||
          requester?.title?.toLowerCase().includes(q);
        const matchesTask =
          task?.taskName.toLowerCase().includes(q) ||
          task?.project?.toLowerCase().includes(q) ||
          session.taskId.toLowerCase().includes(q);
        const matchesReason =
          session.manualReason?.toLowerCase().includes(q) ||
          session.correctionType?.toLowerCase().includes(q);
        const matchesNotes = session.notes?.toLowerCase().includes(q);

        if (!matchesUser && !matchesTask && !matchesReason && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [baseRequests, statusFilter, startDate, endDate, search, users, tasks]);

  // Approve action (executed from Review modal)
  const handleApprove = (sessionId: string, note?: string) => {
    approveTimeSession(sessionId, note);
    if (reviewingSession?.id === sessionId) {
      setReviewingSession(null);
      setManagerNote('');
    }
  };

  // Open Reject Modal (executed from Review modal)
  const handleOpenReject = (session: TimeSession) => {
    setRejectingSession(session);
    setRejectReason('');
    setRejectError('');
  };

  // Confirm Reject
  const handleConfirmReject = () => {
    if (!rejectingSession) return;
    if (!rejectReason.trim()) {
      setRejectError('Please enter a rejection reason.');
      return;
    }
    rejectTimeSession(rejectingSession.id, rejectReason.trim());
    if (reviewingSession?.id === rejectingSession.id) {
      setReviewingSession(null);
    }
    setRejectingSession(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Timesheet Approval</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {metrics.pendingCount} Pending
            </span>
            {isDeptManager && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {userDept?.name || 'Department'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review and approve employee time correction and overtime requests
          </p>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-slate-300 ${
            statusFilter === 'ALL'
              ? 'border-blue-500 ring-2 ring-blue-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block leading-none">
                {metrics.totalCount}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Total Requests</p>
            </div>
            <FileText className="w-5 h-5 text-blue-500 shrink-0" strokeWidth={1.75} />
          </div>
        </button>

        {/* Pending Review */}
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-amber-300 ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-amber-500 block leading-none">
                {metrics.pendingCount}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Pending Review</p>
            </div>
            <ClockAlert className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={1.75} />
          </div>
        </button>

        {/* Approved */}
        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-emerald-300 ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-emerald-600 block leading-none">
                {metrics.approvedCount}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Approved</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={1.75} />
          </div>
        </button>

        {/* Rejected */}
        <button
          type="button"
          onClick={() => setStatusFilter('REJECTED')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-rose-300 ${
            statusFilter === 'REJECTED'
              ? 'border-rose-500 ring-2 ring-rose-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-rose-500 block leading-none">
                {metrics.rejectedCount}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Rejected</p>
            </div>
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" strokeWidth={1.75} />
          </div>
        </button>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee, task, project, reason..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[11px] font-medium text-slate-500 hover:text-rose-600 underline cursor-pointer ml-1"
                >
                  Clear
                </button>
              )}
            </div>

            {isEEMAdmin && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {departments
                    .filter(dept => dept.name === "EEM")
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Requests Card List (Only way to approve/reject is via Review button) */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Requests Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no timesheet requests matching your current filter criteria.
            </p>
          </div>
        ) : (
          filteredRequests.map(session => {
            const requester = users.find(u => u.id === session.userId);
            const task = tasks.find(t => t.id === session.taskId);
            const requesterDept = departments.find(d => d.id === requester?.departmentId);
            const isOt = session.isOvertime || session.timeEntryType === 'OT';
            const status = session.approvalStatus || 'Approved';

            // Work session date & times
            const workDateObj = new Date(session.startTime);
            const formattedLongDate = workDateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            const startTimeDisplay = new Date(session.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const endTimeDisplay = new Date(session.endTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Submission date (M/D/YYYY)
            const submitDate = new Date(session.createdAt || session.startTime);
            const formattedSubmitDate = `${
              submitDate.getMonth() + 1
            }/${submitDate.getDate()}/${submitDate.getFullYear()}`;

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all p-5 shadow-xs relative"
              >
                {/* Card Top Row: Type Pill, Status Pill & Review Action */}
                <div className="flex items-center justify-between gap-3">
                  {/* Top-Left: Type Badge & Status Badge */}
                  <div className="flex items-center flex-wrap gap-2.5">
                    {/* Request Type */}
                    {isOt ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-800 border border-blue-200/60">
                        OVERTIME
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-800 border border-blue-200/60">
                        TIME CORRECTION
                      </span>
                    )}

                    {/* Status Badge */}
                    {status === 'Pending' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border border-amber-300 bg-amber-50 text-amber-700 uppercase">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>PENDING</span>
                      </span>
                    ) : status === 'Approved' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border border-emerald-300 bg-emerald-50 text-emerald-700 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>APPROVED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border border-rose-300 bg-rose-50 text-rose-700 uppercase">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>REJECTED</span>
                      </span>
                    )}
                  </div>

                  {/* Top-Right: Review action - the only way to inspect, approve, or reject */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingSession(session);
                        setManagerNote('');
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer py-1 px-1.5"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Review</span>
                    </button>
                  </div>
                </div>

                {/* Task Title (e.g. Scoping) */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {task?.taskName || session.notes || 'Time Tracking Request'}
                  </h3>
                  {/* Subtitle (Project / Opportunity) */}
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {task?.project || requesterDept?.name || 'General Project'}
                  </p>
                </div>

                {/* Submitter & Submission Date Row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {requester?.name || session.userId}{' '}
                      <span className="text-slate-400">
                        ({requester?.title || requesterDept?.name || 'EMPLOYEE'})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Submitted: {formattedSubmitDate}</span>
                  </div>
                </div>

                {/* Reason / Notes description */}
                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
                  {session.notes || session.manualReason || 'Complete the timesheet adjustment request for tracking and utilization.'}
                </p>

                {/* Bottom Highlight Banner (exact layout and styling from reference image) */}
                <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong className="font-semibold text-blue-950">
                        {isOt ? 'Overtime Date:' : 'Correction Date:'}
                      </strong>{' '}
                      {formattedLongDate}
                      <span className="text-blue-700 font-normal ml-1.5">
                        • {startTimeDisplay} - {endTimeDisplay}
                      </span>
                    </span>
                  </div>

                  <div className="font-mono font-bold text-blue-800 text-xs bg-white/90 px-2.5 py-0.5 rounded-lg border border-blue-200 shrink-0">
                    +{session.durationHours.toFixed(2)} hrs
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal (The ONLY place where Manager approves or rejects) */}
      {reviewingSession && (() => {
        const session = reviewingSession;
        const task = tasks.find(t => t.id === session.taskId);
        const requester = users.find(u => u.id === session.userId);
        const requesterDept = departments.find(d => d.id === requester?.departmentId);
        const isOt = session.isOvertime || session.timeEntryType === 'OT';
        const status = session.approvalStatus || 'Approved';

        const workDateObj = new Date(session.startTime);
        const formattedLongDate = workDateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const startTimeDisplay = new Date(session.startTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const endTimeDisplay = new Date(session.endTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const submitDate = new Date(session.createdAt || session.startTime);
        const formattedSubmitDate = `${
          submitDate.getMonth() + 1
        }/${submitDate.getDate()}/${submitDate.getFullYear()}`;
        const formattedSubmitTime = submitDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        // Current hours on task
        const previousTracked = timeSessions
          .filter(
            s =>
              s.userId === session.userId &&
              s.taskId === session.taskId &&
              s.id !== session.id &&
              (s.approvalStatus || 'Approved') === 'Approved'
          )
          .reduce((sum, s) => sum + (s.durationHours || 0), 0);
        const currentHours =
          previousTracked > 0
            ? previousTracked
            : task?.actualHours
            ? Math.max(0, task.actualHours - (status === 'Approved' ? session.durationHours : 0))
            : session.durationHours * 0.5;
        const requestedHours = session.durationHours || 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Review Timesheet Request
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400">
                      ID: {session.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingSession(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Type Bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-blue-50 text-blue-900 border-blue-200"
                  >
                    {isOt ? 'OVERTIME' : 'TIME CORRECTION'}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    {isOt
                      ? 'Overtime + Regular Working Day'
                      : 'Correction + Regular Working Day'}
                  </span>
                </div>

                <div>
                  {status === 'Approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-300 bg-emerald-50/70 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>APPROVED</span>
                    </span>
                  ) : status === 'Pending' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-amber-300 bg-amber-50/70 text-amber-600">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>PENDING</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-rose-300 bg-rose-50/70 text-rose-600">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>REJECTED</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Request Details Content */}
              <div className="space-y-4">
                {/* Task Information */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Request Details
                  </label>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="font-bold text-slate-900 text-sm">
                      {task?.taskName || session.notes || 'Time Tracking Request'}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {task?.project || requesterDept?.name || 'General Project'}
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed pt-1">
                      {session.notes ||
                        session.manualReason ||
                        task?.description ||
                        'Complete the timesheet adjustment request for tracking and utilization.'}
                    </div>
                    {task && onViewTask && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingSession(null);
                          onViewTask(task);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-2 cursor-pointer"
                      >
                        <span>View Linked Task</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Submitter & Submission Timings */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Submitted By
                    </span>
                    <p className="font-semibold text-slate-900 text-xs">
                      {requester?.name || session.userId}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {requester?.employeeId} • {requesterDept?.name || 'Department'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Submission Timestamp
                    </span>
                    <p className="font-semibold text-slate-900 text-xs">
                      {formattedSubmitDate}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formattedSubmitTime}
                    </p>
                  </div>
                </div>

                {/* Hours Comparison */}
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Current Hours
                    </span>
                    <span className="font-mono font-bold text-slate-700 text-xs">
                      {currentHours.toFixed(6)}h
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Requested Hours
                    </span>
                    <span className="font-mono font-bold text-blue-600 text-xs">
                      {requestedHours.toFixed(6)}h
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Net Adjustment
                    </span>
                    <span className="font-mono font-bold text-emerald-600 text-xs">
                      +{Number(requestedHours.toFixed(1))}h
                    </span>
                  </div>
                </div>

                {/* Work Time Range */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">
                      Date of Work
                    </span>
                    <span className="font-semibold text-slate-800">{formattedLongDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">
                      Logged Window
                    </span>
                    <span className="font-mono text-slate-700 font-medium">
                      {startTimeDisplay} - {endTimeDisplay}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">
                      Duration
                    </span>
                    <span className="font-bold text-slate-900">
                      {session.durationHours.toFixed(2)}h
                    </span>
                  </div>
                </div>

                {/* Rejection / Approval History */}
                {status === 'Rejected' && session.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                      Rejection Reason
                    </span>
                    <p className="text-xs text-rose-800 font-medium">
                      {session.rejectionReason}
                    </p>
                  </div>
                )}

                {status === 'Approved' && (
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                      Approval Status
                    </span>
                    <p className="text-xs text-emerald-800 font-medium">
                      {session.approvedBy
                        ? `Approved by ${
                            users.find(u => u.id === session.approvedBy)?.name ||
                            'Department Manager'
                          }`
                        : 'Approved'}
                    </p>
                  </div>
                )}

                {/* Pending: Manager Review Note */}
                {status === 'Pending' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reviewer Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={managerNote}
                      onChange={e => setManagerNote(e.target.value)}
                      placeholder="Add an optional note to record on approval..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Footer Actions (The only place where manager can Approve or Reject) */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingSession(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>

                {status === 'Pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReject(session)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(session.id, managerNote.trim())}
                      className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Request</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Reject Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingSession(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3 text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="font-semibold text-slate-700">Requester: </span>
                {users.find(u => u.id === rejectingSession.userId)?.name || rejectingSession.userId}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Type: </span>
                {rejectingSession.isOvertime || rejectingSession.timeEntryType === 'OT'
                  ? 'Overtime'
                  : 'Time Correction'}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Duration: </span>
                {rejectingSession.durationHours.toFixed(2)} hrs
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError('');
              }}
              placeholder="e.g. Overtime was not authorized in advance..."
              className={`w-full p-2.5 text-xs rounded-xl border ${
                rejectError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-rose-500`}
            />
            {rejectError && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {rejectError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingSession(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
