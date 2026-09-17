import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Role } from '../../types';
import {
  Users,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Search,
  X,
  SquarePen,
  Save,
  Plus,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const {
    users,
    departments,
    workingSchedules,
    createUser,
    updateUser,
    currentUser,
  } = useApp();

  const isAdmin = currentUser.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states matching Edit User modal layout
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('TASK_USER');
  const [departmentId, setDepartmentId] = useState('');
  const [group, setGroup] = useState('');
  const [title, setTitle] = useState('');
  const [workingScheduleId, setWorkingScheduleId] = useState('SCH-001');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Summary counts for KPI cards matching the design
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.status === 'Active').length;
  const inactiveUsersCount = users.filter(u => u.status === 'Inactive').length;
  const engineersCount = users.filter(
    u =>
      (u.title && u.title.toLowerCase().includes('engineer')) ||
      (u.group && u.group.toLowerCase().includes('engineer'))
  ).length;
  const managersCount = users.filter(
    u =>
      u.role === 'MANAGER' ||
      u.role === 'DEPT_MANAGER' ||
      (u.title && u.title.toLowerCase().includes('manager'))
  ).length;

  const availablePositions = useMemo(() => {
    const base = [
      'Coordinator',
      'Senior Analyst',
      'Technical Analyst',
      'Operations Specialist',
      'Project Coordinator',
      'PMO Admin Supervisor',
      'Lead Project Manager',
      'Senior Operations Lead',
      'Technical Lead',
      'System Administrator',
      'Specialist',
      'Analyst',
      'Associate',
      'Manager',
    ];
    const set = new Set(base);
    users.forEach(u => {
      if (u.title?.trim()) set.add(u.title.trim());
    });
    if (title?.trim()) set.add(title.trim());
    return Array.from(set);
  }, [users, title]);

  // Available groups for the selected department in edit modal
  const availableGroups = useMemo(() => {
    if (!departmentId) return [];
    const dept = departments.find(d => d.id === departmentId);
    return dept?.groups || [];
  }, [departments, departmentId]);

  const filteredUsers = users.filter(u => {
    if (selectedDept && u.departmentId !== selectedDept) return false;
    if (selectedRole && u.role !== selectedRole) return false;
    if (selectedStatus && u.status !== selectedStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.title && u.title.toLowerCase().includes(q)) ||
        (u.group && u.group.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleClearFilters = () => {
    setSearch('');
    setSelectedRole('');
    setSelectedStatus('');
    setSelectedDept('');
  };

  const openCreateModal = () => {
    const defaultDept = departments[0]?.id || '';
    const deptObj = departments.find(d => d.id === defaultDept);
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('TASK_USER');
    setDepartmentId(defaultDept);
    setGroup(deptObj?.groups?.[0] || '');
    setTitle('Specialist');
    setWorkingScheduleId('SCH-001');
    setStatus('Active');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setDepartmentId(u.departmentId);
    setGroup(u.group || '');
    setTitle(u.title);
    setWorkingScheduleId(u.workingScheduleId);
    setStatus(u.status);
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full name is required.';
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingUser) {
      updateUser(editingUser.id, {
        name,
        email,
        role,
        departmentId,
        group,
        title,
        workingScheduleId,
        status,
      });
    } else {
      createUser({
        employeeId: `EMP-${(users.length + 1001).toString()}`,
        name,
        email,
        role,
        departmentId,
        group,
        title,
        workingScheduleId,
        status,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          User Management & Role Access Control
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage user accounts, organizational assignments, and system permissions
        </p>
      </div>

      {/* KPI Summary Cards from layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalUsersCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-normal">Total Users</div>
          </div>
          <Users className="w-6 h-6 text-blue-500 stroke-[1.75]" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-emerald-600">{activeUsersCount}</div>
          <div className="text-xs text-slate-500 mt-1 font-normal">Active</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-rose-600">{inactiveUsersCount}</div>
          <div className="text-xs text-slate-500 mt-1 font-normal">Inactive</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-purple-600">{engineersCount}</div>
          <div className="text-xs text-slate-500 mt-1 font-normal">Employee</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-2xl font-bold text-indigo-600">{managersCount}</div>
          <div className="text-xs text-slate-500 mt-1 font-normal">EEM Admins & Dept Mgrs</div>
        </div>
      </div>

      {/* Filter and Search Bar Layout from Image */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[130px]"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">EEM Admin</option>
          <option value="DEPT_MANAGER">Department Manager</option>
          <option value="TASK_USER">Employee</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleClearFilters}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Name & Email</th>
                <th className="py-3 px-4 font-semibold">Job Title</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Group</th>
                <th className="py-3 px-4 font-semibold">Schedule</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No users match current filters</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Try clearing or adjusting your search, role, status, or department filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const dept = departments.find(d => d.id === user.departmentId);
                  const sched = workingSchedules.find(s => s.id === user.workingScheduleId);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{user.title}</td>
                      <td className="py-3 px-4 text-slate-600">{dept?.name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {user.group ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                            {user.group}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-mono text-[11px]">{sched?.name}</span> ({sched?.hoursPerDay}h/d)
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-800'
                              : user.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'DEPT_MANAGER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.role === 'DEPT_MANAGER'
                            ? 'DEPT MGR'
                            : user.role === 'TASK_USER'
                            ? 'EMPLOYEE'
                            : user.role === 'MANAGER'
                            ? 'EEM ADMIN'
                            : user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
                              updateUser(user.id, { status: newStatus });
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.status === 'Active'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.status === 'Active' ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 text-slate-800 animate-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <SquarePen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUser ? 'Edit User' : 'Add User'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser
                      ? 'Update user information, department, and group assignment'
                      : 'Create a new user account with assigned department and group'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Row 1: Full Name * & Email Address * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                  {errors.name && <p className="text-rose-500 text-[11px] mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  />
                  {errors.email && <p className="text-rose-500 text-[11px] mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Row 2: Role * & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as Role)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  >
                    <option value="TASK_USER">Employee</option>
                    <option value="DEPT_MANAGER">Department Manager</option>
                    <option value="MANAGER">EEM Admin</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Position
                  </label>
                  <select
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  >
                    <option value="">Select Position</option>
                    {availablePositions.map(pos => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Department & Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      setDepartmentId(newDeptId);
                      const targetDept = departments.find(d => d.id === newDeptId);
                      if (!targetDept || !targetDept.groups?.includes(group)) {
                        setGroup('');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Group
                  </label>
                  <select
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    disabled={!departmentId}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!departmentId
                        ? 'Select Department first'
                        : availableGroups.length === 0
                        ? 'No groups available'
                        : 'Select Group'}
                    </option>
                    {availableGroups.map(grp => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Status * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status *
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                  >
                    <option value="Active">ACTIVE</option>
                    <option value="Inactive">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5bbd8b] hover:bg-[#4ea87a] rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? 'Update User' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
