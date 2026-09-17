import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { exportToExcel } from '../../utils/exportUtils';

export const AuditTrailPage: React.FC = () => {
  const { auditLogs, currentUser } = useApp();

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (selectedAction && log.action !== selectedAction) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesEntity = log.entityId.toLowerCase().includes(q);
        const matchesUser = log.performedByName.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        const matchesReason = log.reason && log.reason.toLowerCase().includes(q);
        if (!matchesEntity && !matchesUser && !matchesDetails && !matchesReason) return false;
      }
      return true;
    });
  }, [auditLogs, selectedAction, search]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map(l => l.action)));
  }, [auditLogs]);

  const handleExportExcel = () => {
    const data = filteredLogs.map(l => ({
      'Log ID': l.id,
      'Timestamp': new Date(l.timestamp).toLocaleString(),
      'Action': l.action,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId,
      'Performed By': `${l.performedByName} (${l.performedByRole})`,
      'Details': l.details,
      'Reason (BR-010)': l.reason || 'N/A',
    }));

    exportToExcel(
      {
        reportName: 'System Audit Trail & Compliance Ledger',
        generatedDate: new Date().toLocaleString(),
        generatedBy: `${currentUser.name} (${currentUser.role})`,
        filtersApplied: {
          Action: selectedAction || 'All',
        },
        summaryKpis: {
          'Total Logged Events': filteredLogs.length,
        },
      },
      data,
      'System_Audit_Trail'
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            System Audit Trail & Compliance Ledger
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search audit trail..."
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>

          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Action Types</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          Logged Events: <strong className="text-slate-800">{filteredLogs.length}</strong>
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Log ID</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Target Entity</th>
                <th className="py-3 px-4 font-semibold">Performed By</th>
                <th className="py-3 px-4 font-semibold">Details</th>
                <th className="py-3 px-4 font-semibold">Compliance Reason (BR-010)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map(log => {
                const isManual = log.action === 'MANUAL_TIME_ADD';

                return (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isManual ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-500">{log.id}</td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                          isManual
                            ? 'bg-amber-100 text-amber-800'
                            : log.action.includes('CREATE')
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action.includes('DELETE')
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {log.entityType}: {log.entityId}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-800">
                      <span className="font-semibold">{log.performedByName}</span>{' '}
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({log.performedByRole})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 max-w-[240px] truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.reason ? (
                        <span className="text-amber-900 font-medium bg-amber-100/70 px-2 py-0.5 rounded">
                          {log.reason}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
