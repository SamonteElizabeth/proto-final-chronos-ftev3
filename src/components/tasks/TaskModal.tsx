import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority } from '../../types';
import {
  X,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  initialTask?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  initialTask,
}) => {
  const activeTaskToEdit = taskToEdit || initialTask;
  const {
    departments,
    categoryConfig,
    createTask,
    updateTask,
    currentUser,
  } = useApp();

  const [taskName, setTaskName] = useState('');
  const [assignedUserId, setAssignedUserId] = useState(currentUser.id);
  const [departmentId, setDepartmentId] = useState(currentUser.departmentId || 'DEP-001');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [taskType, setTaskType] = useState('Analysis');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftHours, setShiftHours] = useState<number>(8.5);
  const [remarks, setRemarks] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTaskToEdit) {
      setTaskName(activeTaskToEdit.taskName);
      setAssignedUserId(activeTaskToEdit.assignedUserId || currentUser.id);
      setDepartmentId(activeTaskToEdit.departmentId || currentUser.departmentId || 'DEP-001');
      setPriority(activeTaskToEdit.priority || 'Medium');
      setTaskType(activeTaskToEdit.taskType || 'Analysis');
      setStartDate(activeTaskToEdit.startDate);
      setEndDate(activeTaskToEdit.endDate || '');
      setShiftHours(activeTaskToEdit.shiftHours || activeTaskToEdit.plannedHours || 8.5);
      setRemarks(activeTaskToEdit.remarks || '');
      setErrors({});
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTaskName('');
      setAssignedUserId(currentUser.id);
      setDepartmentId(currentUser.departmentId || departments[0]?.id || 'DEP-001');
      setPriority('Medium');
      setTaskType(categoryConfig.taskTypes[0] || 'Analysis');
      setStartDate(today);
      setEndDate('');
      setShiftHours(8.5);
      setRemarks('');
      setErrors({});
    }
  }, [activeTaskToEdit, isOpen, currentUser, departments, categoryConfig]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!taskName.trim()) {
      errs.taskName = 'Task Name is required.';
    }
    if (!startDate) {
      errs.startDate = 'Start Date is required.';
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = 'Due Date cannot be earlier than Start Date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const trimmedName = taskName.trim();
    const trimmedRemarks = remarks.trim();
    const cleanEndDate = endDate.trim() || undefined;

    if (activeTaskToEdit) {
      const success = updateTask(
        activeTaskToEdit.id,
        {
          taskName: trimmedName,
          assignedUserId,
          departmentId,
          priority,
          taskType,
          status: activeTaskToEdit.status,
          startDate,
          endDate: cleanEndDate,
          shiftHours: Number(shiftHours || 8.5),
          plannedHours: Number(shiftHours || 8.5),
          remarks: trimmedRemarks,
        }
      );
      if (success) onClose();
    } else {
      const created = createTask({
        taskName: trimmedName,
        description: '',
        project: categoryConfig.projects[0] || 'General Project',
        taskType,
        priority: priority || 'Medium',
        status: 'Not Started',
        remarks: trimmedRemarks,
        assignedUserId: assignedUserId || currentUser.id,
        departmentId: departmentId || currentUser.departmentId || 'DEP-001',
        startDate,
        endDate: cleanEndDate,
        shiftHours: Number(shiftHours || 8.5),
        plannedHours: Number(shiftHours || 8.5),
        createdBy: currentUser.id,
      });
      if (created) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-8 animate-in zoom-in-95 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeTaskToEdit ? 'Edit Task' : 'Create Task'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTaskToEdit
                ? 'Update task details and dates'
                : 'Fill in task details to schedule your work'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Name * */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Task Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="task-name-suggestions"
                value={taskName}
                onChange={e => {
                  setTaskName(e.target.value);
                  if (errors.taskName) setErrors(prev => ({ ...prev, taskName: '' }));
                }}
                placeholder="Enter task name..."
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                  errors.taskName
                    ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400'
                    : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400`}
                autoFocus
              />
              <datalist id="task-name-suggestions">
                {categoryConfig.taskTypes.map((suggestion, idx) => (
                  <option key={idx} value={suggestion} />
                ))}
              </datalist>
            </div>
            {errors.taskName && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.taskName}
              </p>
            )}
          </div>

          {/* Start Date * & Due Date (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                  errors.startDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white`}
              />
              {errors.startDate && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
                  <span className="text-[11px] font-normal text-slate-400 ml-1">(Optional)</span>
                </label>
                {endDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEndDate('');
                      if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                  errors.endDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white`}
              />
              {errors.endDate && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Remarks (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Remarks
              <span className="text-[11px] font-normal text-slate-400 ml-1">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Enter remarks or notes..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Modal Footer with Cancel and Create */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {activeTaskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
