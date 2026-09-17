import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TimeSession } from '../../types';
import {
  ClockAlert,
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  ExternalLink,
  Clock,
  Check,
  X,
  FileText,
  Eye,
  XCircle,
  User,
  Building2,
} from 'lucide-react';
import { TimeCorrectionModal } from './TimeCorrectionModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface TimeCorrectionPageProps {
  onViewTask?: (task: Task) => void;
}

type RequestStatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

export const TimeCorrectionPage: React.FC<TimeCorrectionPageProps> = ({
  onViewTask,
}) => {
  const {
    tasks,
    users,
    departments,
    currentUser,
    timeSessions,
    approveTimeSession,
    rejectTimeSession,
    deleteTimeSession,
    showToast,
  } = useApp();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const [viewingSession, setViewingSession] = useState<TimeSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; duration: number } | null>(null);

  const isDeptManager = currentUser.role === 'DEPT_MANAGER';

  // Filters (Unified design for all users)
  const [search, setSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatusFilter>('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Open modal for new record
  const handleOpenNew = (defaultScenario?: string) => {
    setEditingSession(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing record
  const handleOpenEdit = (session: TimeSession) => {
    setEditingSession(session);
    setIsModalOpen(true);
  };

  // In the Timesheet module, display only the requests created by the currently logged-in user
  const accessibleSessions = useMemo(() => {
    return timeSessions.filter(s => s.userId === currentUser.id);
  }, [timeSessions, currentUser.id]);

  // Request Status counts (All, Pending, Approved, Rejected)
  const statusCounts = useMemo(() => {
    const base = accessibleSessions.filter(s => {
      // Time corrections only
      if (!s.isManual && !s.correctionType && !s.manualReason) {
        return false;
      }
      // Date filter
      const sessionDate = s.startTime.split('T')[0];
      if (customStartDate && sessionDate < customStartDate) return false;
      if (customEndDate && sessionDate > customEndDate) return false;
      return true;
    });

    return {
      All: base.length,
      Pending: base.filter(s => s.approvalStatus === 'Pending').length,
      Approved: base.filter(s => (s.approvalStatus || 'Approved') === 'Approved').length,
      Rejected: base.filter(s => s.approvalStatus === 'Rejected').length,
    };
  }, [accessibleSessions, customStartDate, customEndDate]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return accessibleSessions.filter(session => {
      // Time corrections only
      if (!session.isManual && !session.correctionType && !session.manualReason) {
        return false;
      }
      if (requestStatusFilter !== 'All') {
        const sessionStatus = session.approvalStatus || 'Approved';
        if (sessionStatus !== requestStatusFilter) {
          return false;
        }
      }
      const sessionDate = session.startTime.split('T')[0];
      if (customStartDate && sessionDate < customStartDate) {
        return false;
      }
      if (customEndDate && sessionDate > customEndDate) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const task = tasks.find(t => t.id === session.taskId);
        const user = users.find(u => u.id === session.userId);
        const matchesTask =
          (task?.taskName && task.taskName.toLowerCase().includes(q)) ||
          session.taskId.toLowerCase().includes(q);
        const matchesUser = user?.name && user.name.toLowerCase().includes(q);
        const matchesReason = session.manualReason && session.manualReason.toLowerCase().includes(q);
        const matchesNotes = session.notes && session.notes.toLowerCase().includes(q);
        const matchesType = session.correctionType && session.correctionType.toLowerCase().includes(q);
        if (!matchesTask && !matchesUser && !matchesReason && !matchesNotes && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [
    accessibleSessions,
    requestStatusFilter,
    customStartDate,
    customEndDate,
    search,
    tasks,
    users,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const totalCorrectedSessions = accessibleSessions.filter(s => s.isManual || s.correctionType || s.manualReason);
    const totalCorrectedHours = totalCorrectedSessions.reduce((sum, s) => sum + s.durationHours, 0);

    // Current filtered metrics
    const filteredHours = filteredSessions.reduce((sum, s) => sum + s.durationHours, 0);

    // FTE equivalent contribution (assuming 40h standard work week)
    const fteEquivalent = Number((filteredHours / 160).toFixed(2)); // monthly standard

    return {
      totalCorrectedHours: Number(totalCorrectedHours.toFixed(1)),
      totalCorrectedCount: totalCorrectedSessions.length,
      filteredHours: Number(filteredHours.toFixed(1)),
      filteredCount: filteredSessions.length,
      fteEquivalent,
    };
  }, [accessibleSessions, filteredSessions]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <ClockAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Timesheet</h1>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => handleOpenNew()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (Matching Dept Manager design for all users) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <button
          type="button"
          onClick={() => setRequestStatusFilter('All')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-slate-300 ${
            requestStatusFilter === 'All'
              ? 'border-blue-500 ring-2 ring-blue-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block leading-none">
                {statusCounts.All}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Total Requests</p>
            </div>
            <FileText className="w-5 h-5 text-blue-500 shrink-0" strokeWidth={1.75} />
          </div>
        </button>

        {/* Pending Review */}
        <button
          type="button"
          onClick={() => setRequestStatusFilter('Pending')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-amber-300 ${
            requestStatusFilter === 'Pending'
              ? 'border-amber-500 ring-2 ring-amber-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-amber-500 block leading-none">
                {statusCounts.Pending}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Pending Review</p>
            </div>
          </div>
        </button>

        {/* Approved */}
        <button
          type="button"
          onClick={() => setRequestStatusFilter('Approved')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-emerald-300 ${
            requestStatusFilter === 'Approved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-emerald-600 block leading-none">
                {statusCounts.Approved}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Approved</p>
            </div>
          </div>
        </button>

        {/* Rejected */}
        <button
          type="button"
          onClick={() => setRequestStatusFilter('Rejected')}
          className={`bg-white rounded-xl p-4 border text-left transition-all cursor-pointer shadow-2xs hover:border-rose-300 ${
            requestStatusFilter === 'Rejected'
              ? 'border-rose-500 ring-2 ring-rose-500/15'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl font-bold text-rose-500 block leading-none">
                {statusCounts.Rejected}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Rejected</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filter & Control Bar (Clean Dept Manager design for all users) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-800"
            />
          </div>

          {/* Custom Date Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date:
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400 font-medium">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-[11px] font-medium text-slate-500 hover:text-rose-600 underline cursor-pointer ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Time Corrections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Correction Requests
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
              {filteredSessions.length} {filteredSessions.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Total Hours in View: <strong className="text-slate-800">{stats.filteredHours}h</strong>
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
            <h4 className="text-sm font-semibold text-slate-800">
              No requests found
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your filters to see more requests.
            </p>
            <button
              onClick={() => handleOpenNew()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">REQUEST DETAILS</th>
                  <th className="px-6 py-3.5">TYPE</th>
                  <th className="px-6 py-3.5">STATUS</th>
                  <th className="px-6 py-3.5">HOURS</th>
                  <th className="px-6 py-3.5">SUBMITTED</th>
                  <th className="px-6 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map(session => {
                  const task = tasks.find(t => t.id === session.taskId);
                  const user = users.find(u => u.id === session.userId);
                  const dept = departments.find(d => d.id === user?.departmentId);
                  const isOvertime = session.isOvertime || session.timeEntryType === 'OT';
                  const status = session.approvalStatus || 'Approved';

                  // Calculate previous tracked hours for this user & task
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
                      ? Math.max(
                          0,
                          task.actualHours -
                            (status === 'Approved' ? session.durationHours : 0)
                        )
                      : session.durationHours * 0.575;
                  const requestedHours = session.durationHours || 0;

                  // Submission timestamps (M/D/YYYY and h:mm:ss A)
                  const submitDate = new Date(session.createdAt || session.startTime);
                  const formattedDate = `${
                    submitDate.getMonth() + 1
                  }/${submitDate.getDate()}/${submitDate.getFullYear()}`;
                  const formattedTime = submitDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* REQUEST DETAILS */}
                      <td className="px-6 py-4 align-top max-w-md">
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {task?.taskName || session.notes || 'Time Tracking Request'}
                        </div>
                        <div className="text-xs text-slate-500 font-normal mt-0.5">
                          {task?.project || dept?.name || 'General Project'}
                        </div>
                        {/* SUBMISSION TIMESTAMP */}
                        <div className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed line-clamp-2">
                          {session.notes ||
                            session.manualReason ||
                            task?.description ||
                            'Complete the timesheet adjustment request for tracking and utilization.'}
                        </div>
                      </td>

                      {/* TYPE */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            isOvertime
                              ? 'bg-amber-100/90 text-amber-900 border-amber-200'
                              : 'bg-blue-100/90 text-blue-900 border-blue-200'
                          }`}
                        >
                          {isOvertime ? 'OVERTIME' : 'REGULAR'}
                        </span>
                        <div className="text-xs text-slate-500 mt-1 font-normal">
                          {isOvertime
                            ? 'Overtime + Regular Working Day'
                            : 'Correction + Regular Working Day'}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        {status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-300 bg-emerald-50/50 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>APPROVED</span>
                          </span>
                        ) : status === 'Pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-amber-300 bg-amber-50/50 text-amber-600">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-rose-300 bg-rose-50/50 text-rose-600">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>REJECTED</span>
                          </span>
                        )}
                      </td>

                      {/* HOURS */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <div className="text-xs text-slate-700 font-normal">
                          Current: {currentHours.toFixed(6)}h
                        </div>
                        <div className="text-xs text-slate-700 font-normal mt-0.5">
                          Requested: {requestedHours.toFixed(6)}h
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          +{Number(requestedHours.toFixed(1))}h
                        </div>
                      </td>

                      {/* SUBMITTED */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <div className="text-xs text-slate-700">
                          {formattedDate}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formattedTime}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                        <button
                          onClick={() => setViewingSession(session)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Request Details"
                        >
                          <Eye className="w-4.5 h-4.5" />
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

      {/* Time Correction Modal */}
      <TimeCorrectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSession(null);
        }}
        sessionToEdit={editingSession}
      />

      {/* Confirm Deletion Modal with Reason */}
      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        onConfirm={reason => {
          if (sessionToDelete) {
            deleteTimeSession(
              sessionToDelete.id,
              typeof reason === 'string' && reason.trim() ? reason.trim() : 'Removed time correction entry'
            );
            setSessionToDelete(null);
          }
        }}
        title="Remove Time Log Entry"
        message={`Are you sure you want to remove this time entry (${sessionToDelete?.duration}h)? The task's actual hours will be automatically adjusted.`}
        confirmText="Remove Entry"
        requireReason={true}
        variant="danger"
      />

      {/* Timesheet Request Details Modal */}
      {viewingSession && (() => {
        const session = viewingSession;
        const task = tasks.find(t => t.id === session.taskId);
        const user = users.find(u => u.id === session.userId);
        const dept = departments.find(d => d.id === user?.departmentId);
        const isOvertime = session.isOvertime || session.timeEntryType === 'OT';
        const status = session.approvalStatus || 'Approved';

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
            ? Math.max(
                0,
                task.actualHours -
                  (status === 'Approved' ? session.durationHours : 0)
              )
            : session.durationHours * 0.575;
        const requestedHours = session.durationHours || 0;

        const submitDate = new Date(session.createdAt || session.startTime);
        const formattedSubmitted = `${
          submitDate.getMonth() + 1
        }/${submitDate.getDate()}/${submitDate.getFullYear()}, ${submitDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xl font-bold text-slate-900">
                  Request Details
                </h3>
                <button
                  type="button"
                  onClick={() => setViewingSession(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Top Peach Container */}
              <div className="rounded-2xl p-5 bg-[#FFF4EB] border border-[#FFE2D1] space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tracking-wide text-[#C2410C] uppercase">
                      {isOvertime ? 'OVERTIME' : 'TIME CORRECTION'}
                    </span>
                    {status === 'Approved' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>APPROVED</span>
                      </span>
                    ) : status === 'Pending' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>PENDING</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>REJECTED</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {isOvertime
                      ? 'Overtime + Regular Working Day'
                      : 'Time Correction + Regular Working Day'}
                  </p>
                </div>

                <div className="space-y-2 pt-1 border-t border-[#FFE2D1]/70">
                  {/* Task Name */}
                  <div className="flex items-center text-xs">
                    <span className="text-slate-600 font-medium w-28 shrink-0">
                      Task Name:
                    </span>
                    <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-medium text-xs">
                      {task?.taskName || session.notes || 'Create Backlog for all Bugs and Enhancement'}
                    </span>
                  </div>

                  {/* Work Schedule */}
                  <div className="flex items-center text-xs">
                    <span className="text-slate-600 font-medium w-28 shrink-0">
                      Work Schedule:
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium text-xs">
                      Regular Working Day
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Column Grid: Request Information & Time Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Request Information */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">
                    Request Information
                  </h4>
                  <p className="text-xs text-slate-600">
                    Submitted: {formattedSubmitted}
                  </p>
                </div>

                {/* Time Details */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">
                    Time Details
                  </h4>
                  <div className="text-xs flex items-center justify-between">
                    <span className="text-slate-600">Current Hours:</span>
                    <span className="text-slate-800">{currentHours.toFixed(6)}h</span>
                  </div>
                  <div className="text-xs flex items-center justify-between">
                    <span className="text-slate-600">Rendered Hours:</span>
                    <span className="text-blue-600">{(previousTracked || 0).toFixed(6)}h</span>
                  </div>
                  <div className="text-xs flex items-center justify-between">
                    <span className="text-slate-600">Additional:</span>
                    <span className="text-blue-600 font-medium">+{requestedHours.toFixed(1)}h</span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2">
                <h4 className="text-xs font-semibold text-slate-700">Reason</h4>
                <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50 text-xs text-slate-700 leading-relaxed">
                  {session.manualReason ||
                    session.notes ||
                    'Complete the backlog for the FPIP Park Access Management (PAM) enhancement requests to support the upcoming development activities.'}
                </div>
              </div>

              {/* Detailed Justification */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2">
                <h4 className="text-xs font-semibold text-slate-700">
                  Detailed Justification
                </h4>
                <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50 text-xs text-slate-700 leading-relaxed">
                  {session.justification ||
                    session.notes ||
                    session.manualReason ||
                    'Finalize and document all approved FPIP PAM enhancement requirements, user stories, and acceptance criteria to ensure the backlog is complete and ready for development.'}
                </div>
              </div>

              {/* Expected Impact */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2">
                <h4 className="text-xs font-semibold text-slate-700">
                  Expected Impact
                </h4>
                <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50 text-xs text-slate-700 leading-relaxed">
                  {session.expectedImpact ||
                    'A complete backlog that enables efficient development planning, reduces requirement gaps, and accelerates delivery timeline.'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
