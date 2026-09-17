import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Department } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const DepartmentManagementPage: React.FC = () => {
  const {
    departments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    addGroupToDepartment,
    removeGroupFromDepartment,
    showToast,
    currentUser,
  } = useApp();

  const canManage = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Only Administrators and EEM Admins have access to the Department Maintenance Table.
        </p>
      </div>
    );
  }

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // Form states for Add / Edit Department
  const [name, setName] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [modalError, setModalError] = useState('');

  // Quick inline add group state for a row in the table
  const [activeInlineDeptId, setActiveInlineDeptId] = useState<string | null>(null);
  const [inlineGroupInput, setInlineGroupInput] = useState('');

  const filteredDepts = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.trim().toLowerCase();
    return departments.filter(
      d =>
        d.name.toLowerCase().includes(q) ||
        (d.groups && d.groups.some(g => g.toLowerCase().includes(q)))
    );
  }, [departments, search]);

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setGroups([]);
    setNewGroupInput('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setGroups(dept.groups ? [...dept.groups] : []);
    setNewGroupInput('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleAddGroupInModal = () => {
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    if (groups.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
      setModalError(`Group "${trimmed}" is already added.`);
      return;
    }
    setGroups(prev => [...prev, trimmed]);
    setNewGroupInput('');
    setModalError('');
  };

  const handleRemoveGroupInModal = (groupToRemove: string) => {
    setGroups(prev => prev.filter(g => g !== groupToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setModalError('Department name is required.');
      return;
    }

    // If user typed something in newGroupInput but didn't click + Group, auto-add it if not present
    const pendingGroup = newGroupInput.trim();
    let finalGroups = [...groups];
    if (pendingGroup && !finalGroups.some(g => g.toLowerCase() === pendingGroup.toLowerCase())) {
      finalGroups.push(pendingGroup);
    }

    if (editingDept) {
      updateDepartment(editingDept.id, {
        name: trimmedName,
        groups: finalGroups,
      });
      showToast('success', 'Department Updated', `${trimmedName} was updated successfully.`);
    } else {
      const generatedCode = `DEP-${String(departments.length + 1).padStart(3, '0')}`;
      createDepartment({
        name: trimmedName,
        code: generatedCode,
        groups: finalGroups,
        status: 'Active',
        description: '',
      });
      showToast('success', 'Department Created', `${trimmedName} was added successfully.`);
    }

    setIsModalOpen(false);
    setEditingDept(null);
    setModalError('');
    setNewGroupInput('');
  };

  const handleInlineAddGroup = (deptId: string) => {
    const trimmed = inlineGroupInput.trim();
    if (!trimmed) {
      setActiveInlineDeptId(null);
      return;
    }
    const success = addGroupToDepartment(deptId, trimmed);
    if (success) {
      setInlineGroupInput('');
      setActiveInlineDeptId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Department Maintenance Table
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the list of departments and associated groups
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Department</span>
          </button>
        )}
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Department List</h2>
            <p className="text-xs text-slate-500 mt-0.5">List of all departments and their groups</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search departments or groups..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        {filteredDepts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm text-slate-400">
              {search ? 'No departments matching your search.' : 'No departments added yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-16 text-slate-400 font-medium">#</th>
                  <th className="py-3.5 px-6 w-64">Department Name</th>
                  <th className="py-3.5 px-6">Group</th>
                  {canManage && <th className="py-3.5 px-6 w-28 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepts.map((dept, index) => {
                  const deptGroups = dept.groups || [];
                  const isInlineActive = activeInlineDeptId === dept.id;

                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        <div>
                          <span>{dept.name}</span>
                          {dept.code && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                              {dept.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-700">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {deptGroups.length === 0 && !isInlineActive ? (
                            <span className="text-xs text-slate-400 italic">No groups</span>
                          ) : (
                            deptGroups.map(grp => (
                              <span
                                key={grp}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80 group/grp"
                              >
                                <span>{grp}</span>
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => removeGroupFromDepartment(dept.id, grp)}
                                    className="opacity-40 hover:opacity-100 text-slate-500 hover:text-rose-600 transition-opacity cursor-pointer p-0.5"
                                    title={`Remove group "${grp}"`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))
                          )}

                          {canManage && (
                            <>
                              {isInlineActive ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={inlineGroupInput}
                                    onChange={e => setInlineGroupInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInlineAddGroup(dept.id);
                                      } else if (e.key === 'Escape') {
                                        setActiveInlineDeptId(null);
                                        setInlineGroupInput('');
                                      }
                                    }}
                                    placeholder="Group name..."
                                    autoFocus
                                    className="px-2 py-0.5 text-xs rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-32"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleInlineAddGroup(dept.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                    title="Add Group"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveInlineDeptId(null);
                                      setInlineGroupInput('');
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveInlineDeptId(dept.id);
                                    setInlineGroupInput('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200/60 cursor-pointer"
                                  title="Add Group to department"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Group</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(dept)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title={`Edit Department "${dept.name}"`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeptToDelete(dept)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={`Delete Department "${dept.name}"`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-slate-100 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDept ? 'Edit Department' : 'Add Department'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingDept(null);
                  setModalError('');
                  setNewGroupInput('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technology Services Division"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  className={`w-full px-3.5 py-2.5 border ${
                    modalError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  autoFocus
                />
              </div>

              {/* Group Maintenance */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Group Maintenance
                </label>

                {/* Add Group input + button */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter group name..."
                    value={newGroupInput}
                    onChange={e => setNewGroupInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGroupInModal();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddGroupInModal}
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Group</span>
                  </button>
                </div>

                {/* List of groups */}
                <div className="mt-3">
                  {groups.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No groups added yet. Type a group name and click + Group.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                      {groups.map(g => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs"
                        >
                          <span>{g}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroupInModal(g)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title={`Remove ${g}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {modalError && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {modalError}
                </p>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingDept(null);
                    setModalError('');
                    setNewGroupInput('');
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deptToDelete}
        onClose={() => setDeptToDelete(null)}
        onConfirm={() => {
          if (deptToDelete) {
            deleteDepartment(deptToDelete.id);
            showToast('success', 'Department Deleted', `${deptToDelete.name} has been removed.`);
            setDeptToDelete(null);
          }
        }}
        title={`Delete Department "${deptToDelete?.name || ''}"?`}
        message={`Are you sure you want to remove ${deptToDelete?.name}?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
