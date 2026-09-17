import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const TaskMaintenancePage: React.FC = () => {
  const {
    tasks,
    departments,
    createMaintenanceTask,
    updateMaintenanceTask,
    deleteTask,
    currentUser,
  } = useApp();

  const isDeptManager = currentUser.role === 'DEPT_MANAGER';

  if (currentUser.role === 'ADMIN') {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          System Administrators do not have access to the Task Names Maintenance Table.
        </p>
      </div>
    );
  }
  const userDept = useMemo(
    () => departments.find(d => d.id === currentUser.departmentId),
    [departments, currentUser.departmentId]
  );
  const currentDeptName = userDept?.name || 'Department';

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Form state - ONLY Task Name
  const [taskName, setTaskName] = useState('');
  const [modalError, setModalError] = useState('');

  // Filter tasks based on search query (Dept Manager sees the full task catalog like EEM Admin)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = task.taskName.toLowerCase().includes(q);
        const matchesId = task.id.toLowerCase().includes(q);
        return matchesName || matchesId;
      }

      return true;
    });
  }, [tasks, search]);

  const openCreateModal = () => {
    setEditingTask(null);
    setTaskName('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskName(task.taskName);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = taskName.trim();

    if (!trimmedName) {
      setModalError('Task Name is required.');
      return;
    }

    if (editingTask) {
      const ok = updateMaintenanceTask(editingTask.id, {
        taskName: trimmedName,
      });
      if (ok) {
        setIsModalOpen(false);
        setEditingTask(null);
      }
    } else {
      const created = createMaintenanceTask({
        taskName: trimmedName,
      });
      if (created) {
        setIsModalOpen(false);
        setTaskName('');
      }
    }
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    deleteTask(
      taskToDelete.id,
      isDeptManager
        ? 'Deleted from Dept Manager Task Maintenance Table'
        : 'Deleted from EEM Admin Task Maintenance Table'
    );
    setTaskToDelete(null);
  };

  return (
    <div id="task-maintenance-container" className="space-y-6">
      {/* Header card with action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Task Maintenance</h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase">
                  {isDeptManager ? 'Dept Manager' : currentUser.role === 'ADMIN' ? 'Admin' : 'EEM Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, edit, and delete task definitions in the system.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-add-maintenance-task"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Table & Filtering Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-maintenance-tasks"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by task name..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Total Tasks:{' '}
            <span className="font-semibold text-slate-800">
              {filteredTasks.length}
            </span>
            {filteredTasks.length !== tasks.length && (
              <span className="text-slate-400 ml-1">
                (of {tasks.length})
              </span>
            )}
          </div>
        </div>

        {/* Tasks Table: strictly Task Name and Actions */}
        {filteredTasks.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No tasks found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? 'Try adjusting your search query.'
                : 'No maintenance tasks created yet. Click "Add Task" above to add your first record.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-16 text-slate-400 font-medium">#</th>
                  <th className="py-3.5 px-6">Task Name</th>
                  <th className="py-3.5 px-6 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task, index) => {
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Index / Counter */}
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Task Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {task.taskName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200/60">
                            {task.id}
                          </span>
                        </div>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`btn-edit-task-${task.id}`}
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-task-${task.id}`}
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Task Modal - strictly Task Name */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingTask
                    ? 'Update the task name.'
                    : 'Enter the task name.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form - ONLY Task Name */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Task Name Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-task-name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Task Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="maintenance-task-name"
                    type="text"
                    required
                    autoFocus
                    value={taskName}
                    onChange={e => {
                      setTaskName(e.target.value);
                      if (modalError) setModalError('');
                    }}
                    placeholder="e.g. System Security Audit"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-maintenance-task"
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  {editingTask ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Delete Task"
          message={`Are you sure you want to delete task "${taskToDelete.taskName}"? This action cannot be undone.`}
          confirmLabel="Delete Task"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setTaskToDelete(null)}
        />
      )}
    </div>
  );
};
