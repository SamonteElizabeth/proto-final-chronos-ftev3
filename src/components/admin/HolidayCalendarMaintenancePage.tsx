import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Holiday, HolidayType } from '../../types';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const HolidayCalendarMaintenancePage: React.FC = () => {
  const {
    holidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    toggleHolidayStatus,
    currentUser,
  } = useApp();

  if (currentUser.role !== 'MANAGER') {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {currentUser.role === 'ADMIN'
            ? 'System Administrators do not have access to the Holiday Calendar Maintenance Table.'
            : 'Department Managers do not have access to the Holiday Calendar Maintenance Table.'}
        </p>
      </div>
    );
  }

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [date, setDate] = useState('2026-01-01');
  const [type, setType] = useState<HolidayType>('Regular Holiday');
  const [recurring, setRecurring] = useState(true);
  const [formError, setFormError] = useState('');

  // Available years from existing holidays
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    holidays.forEach(h => {
      if (h.date) {
        const y = h.date.split('-')[0];
        if (y) years.add(y);
      }
    });
    years.add('2026');
    years.add('2027');
    return Array.from(years).sort();
  }, [holidays]);

  // Filtered and sorted holidays
  const filteredHolidays = useMemo(() => {
    return holidays
      .filter(h => {
        // Search
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchName = h.name.toLowerCase().includes(q);
          const matchDate = h.date.includes(q);
          const matchDesc = (h.description || '').toLowerCase().includes(q);
          if (!matchName && !matchDate && !matchDesc) return false;
        }

        // Year filter
        if (selectedYear !== 'ALL') {
          if (!h.date.startsWith(selectedYear)) return false;
        }

        // Type filter
        if (selectedType !== 'ALL') {
          if (h.type !== selectedType) return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          if ((h.status || 'Active') !== selectedStatus) return false;
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, search, selectedYear, selectedType, selectedStatus]);

  const openCreateModal = () => {
    setEditingHoliday(null);
    setName('');
    setDate('2026-08-21');
    setType('Regular Holiday');
    setRecurring(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    setName(h.name);
    setDate(h.date);
    setType(h.type);
    setRecurring(h.recurring === 'Annually' || h.recurring === true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError('Holiday Name is required.');
      return;
    }

    if (!date) {
      setFormError('Date is required.');
      return;
    }

    if (editingHoliday) {
      updateHoliday(editingHoliday.id, {
        name: trimmedName,
        date,
        type,
        recurring: recurring ? 'Annually' : 'None',
        status: editingHoliday.status || 'Active',
        description: editingHoliday.description || '',
      });
    } else {
      createHoliday({
        name: trimmedName,
        date,
        type,
        recurring: recurring ? 'Annually' : 'None',
        status: 'Active',
        description: '',
      });
    }

    setIsModalOpen(false);
    setEditingHoliday(null);
  };

  const formatHolidayDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return {
        formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      };
    } catch {
      return { formatted: dateStr, weekday: '' };
    }
  };

  const getTypeBadge = (holType: HolidayType) => {
    switch (holType) {
      case 'Regular Holiday':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Regular Holiday
          </span>
        );
      case 'Special Non-Working Holiday':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Special Non-Working
          </span>
        );
      case 'Company Holiday':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Company Holiday
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {holType}
          </span>
        );
    }
  };

  return (
    <div id="holiday-maintenance-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Holiday Calendar</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official holiday schedule used for calculating working days, target hours, and employee utilization.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-holiday"
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-holidays"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search holiday name, date..."
                className="w-full pl-8.5 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Year Selector */}
            <select
              id="filter-holiday-year"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>

            {/* Type Selector */}
            <select
              id="filter-holiday-type"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Holiday Types</option>
              <option value="Regular Holiday">Regular Holiday</option>
              <option value="Special Non-Working Holiday">Special Non-Working</option>
              <option value="Company Holiday">Company Holiday</option>
            </select>

            {/* Status Filter */}
            <select
              id="filter-holiday-status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end lg:self-center">
            Showing <span className="font-semibold text-slate-800">{filteredHolidays.length}</span> of {holidays.length} holidays
          </div>
        </div>

        {/* Informative callout */}
        <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-100/60 flex items-center gap-2 text-xs text-blue-800">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            Holidays marked as <strong>Active</strong> are automatically excluded from the employee working day count when calculating monthly FTE Capacity and Target Hours.
          </span>
        </div>

        {/* Holidays Table */}
        {filteredHolidays.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No holidays found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedType !== 'ALL' || selectedYear !== 'ALL' || selectedStatus !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'No holidays defined in the calendar. Click "Add Holiday" to register one.'}
            </p>
            {(search || selectedType !== 'ALL' || selectedYear !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedType('ALL');
                  setSelectedYear('ALL');
                  setSelectedStatus('ALL');
                }}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-6 w-16 text-slate-400 font-medium">#</th>
                  <th className="py-3 px-6">Holiday Name</th>
                  <th className="py-3 px-6 w-56">Date &amp; Day</th>
                  <th className="py-3 px-6 w-52">Type</th>
                  <th className="py-3 px-6 w-32 text-center">Frequency</th>
                  <th className="py-3 px-6 w-32 text-center">Status</th>
                  <th className="py-3 px-6 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHolidays.map((h, index) => {
                  const dateInfo = formatHolidayDate(h.date);
                  const isActive = (h.status || 'Active') === 'Active';

                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Holiday Name */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {h.name}
                        </div>
                        {h.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {h.description}
                          </div>
                        )}
                      </td>

                      {/* Date & Day */}
                      <td className="py-3.5 px-6">
                        <div className="font-mono text-xs font-medium text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateInfo.formatted}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 pl-5">
                          {dateInfo.weekday}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-6">
                        {getTypeBadge(h.type)}
                      </td>

                      {/* Frequency */}
                      <td className="py-3.5 px-6 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {h.recurring === 'Annually' || h.recurring === true ? 'Annual Recurring' : 'One-time'}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => toggleHolidayStatus(h.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                          }`}
                          title={`Click to ${isActive ? 'deactivate' : 'activate'} this holiday`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`btn-edit-holiday-${h.id}`}
                            type="button"
                            onClick={() => openEditModal(h)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={`Edit "${h.name}"`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-holiday-${h.id}`}
                            type="button"
                            onClick={() => setHolidayToDelete(h)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Delete "${h.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Holiday Name */}
                <div className="space-y-1">
                  <label htmlFor="holiday-name" className="block text-xs font-semibold text-slate-700">
                    Holiday Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="holiday-name"
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="e.g. Rizal Day or Foundation Day"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Date Picker */}
                <div className="space-y-1">
                  <label htmlFor="holiday-date" className="block text-xs font-semibold text-slate-700">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="holiday-date"
                    type="date"
                    required
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Holiday Type */}
                <div className="space-y-1">
                  <label htmlFor="holiday-type" className="block text-xs font-semibold text-slate-700">
                    Holiday Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="holiday-type"
                    value={type}
                    onChange={e => setType(e.target.value as HolidayType)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="Regular Holiday">Regular Holiday (100% Non-working)</option>
                    <option value="Special Non-Working Holiday">Special Non-Working Holiday</option>
                    <option value="Company Holiday">Company Holiday</option>
                  </select>
                </div>

                {/* Recurring Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={e => setRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span>
                      <strong>Recurring Annually</strong> (repeats every year on the same date)
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-holiday"
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  {editingHoliday ? 'Save Changes' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {holidayToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Delete Holiday"
          message={`Are you sure you want to delete holiday "${holidayToDelete.name}" (${holidayToDelete.date})? This may change the working day counts in capacity reports.`}
          confirmLabel="Delete Holiday"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {
            deleteHoliday(holidayToDelete.id);
            setHolidayToDelete(null);
          }}
          onClose={() => setHolidayToDelete(null)}
        />
      )}
    </div>
  );
};
