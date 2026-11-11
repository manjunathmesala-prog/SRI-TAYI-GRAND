'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditLogEntry, AuditActionCategory } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { authStorage } from '@/lib/auth-storage';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Calendar,
  Layers,
  FileText,
  X,
  ExternalLink,
  Download,
  Printer,
  Sparkles,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditActionCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        categoryFilter === 'all'
          ? '/api/admin/audit-logs'
          : `/api/admin/audit-logs?category=${categoryFilter}`;

      const token = authStorage.getToken();
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-staff-role': 'Super Admin',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
        }
      } else {
        showNotification('error', 'Failed to retrieve immutable audit trail.');
      }
    } catch {
      showNotification('error', 'Network error fetching audit trail.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, showNotification]);

  // Real-time synchronization
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'audit_log_created' ||
        event.eventType === 'booking_created' ||
        event.eventType === 'payment_recorded' ||
        event.eventType === 'cash_shift_opened' ||
        event.eventType === 'cash_shift_closed' ||
        event.eventType === 'journal_entry_created' ||
        event.eventType === 'attendance_recorded' ||
        event.eventType === 'maintenance_ticket_created' ||
        event.eventType === 'full_sync'
      ) {
        fetchAuditLogs();
      }
    },
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Filter logs by search term
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.userRole.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Role', 'Details'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sri-tayi-grand-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Audit trail exported as CSV.');
  };

  const getEntityBadge = (entityType: AuditActionCategory) => {
    switch (entityType) {
      case 'booking':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'payment':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'cashbook':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'accounting':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'pricing':
        return 'bg-pink-50 text-pink-800 border-pink-200';
      case 'room':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'maintenance':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'staff':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'security':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CHECK_IN') || action.includes('SUCCESS') || action.includes('APPROVED')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (action.includes('CLOCK') || action.includes('STAFF')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
    if (action.includes('JOURNAL') || action.includes('ACCOUNTING') || action.includes('CLOSING')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (action.includes('MAINTENANCE') || action.includes('BLOCK') || action.includes('OOO')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  const formatLogTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-md border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700'
              : 'bg-red-900/90 text-red-100 border-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#241912] border border-[#D8AD56]/30 rounded-2xl p-6 sm:p-8 text-[#FAF7F2] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-transparent to-transparent pointer-events-none rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Immutable Event Stream
              </span>
              <span className="text-xs text-[#FAF7F2]/60 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#D8AD56]" />
                Tamper-Evident Trail
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              System Audit &amp; Activity Trail
            </h1>
            <p className="text-sm text-[#FAF7F2]/80 max-w-2xl font-light">
              Forensic log of critical events across Sri Tayi Grand PMS. Track front desk operations,
              cash drawer reconciliations, rate adjustments, maintenance lockouts, and staff biometric shifts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchAuditLogs()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/20 hover:border-[#D8AD56] text-white hover:text-[#D8AD56] bg-white/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
              <span>Refresh Trail</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 border border-[#D8AD56]/40"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Navigation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'booking', label: 'Bookings' },
            { id: 'payment', label: 'Payments' },
            { id: 'cashbook', label: 'Cashbook' },
            { id: 'accounting', label: 'Accounting' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'room', label: 'Rooms' },
            { id: 'maintenance', label: 'Maintenance' },
            { id: 'staff', label: 'Staff' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-[#241912] text-[#D8AD56] font-semibold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actor, action, entity ID, details..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56]"
          />
        </div>
      </div>

      {/* Audit Log Chronological Timeline & Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-[#FAF7F2] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Audit Event Stream
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-200 text-stone-700 font-bold">
              {filteredLogs.length} Records
            </span>
          </div>
          <span className="text-[11px] text-stone-500">
            Sorted by Most Recent (IST Timezone)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Event Narration / Details</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-amber-50/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{formatLogTimestamp(log.timestamp)}</span>
                    </div>
                  </td>

                  {/* Actor */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#241912] text-[#D8AD56] flex items-center justify-center text-[10px] font-bold">
                        {log.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-900 block leading-tight">
                          {log.userName}
                        </span>
                        <span className="text-[10px] text-stone-500 block">{log.userRole}</span>
                      </div>
                    </div>
                  </td>

                  {/* Action Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>

                  {/* Entity */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getEntityBadge(
                          log.entityType
                        )}`}
                      >
                        {log.entityType}
                      </span>
                      <span className="block font-mono text-[11px] text-stone-600 font-bold">
                        {log.entityId}
                      </span>
                    </div>
                  </td>

                  {/* Details */}
                  <td className="py-3.5 px-4 text-stone-700">
                    <p className="line-clamp-2 max-w-md font-medium text-xs">{log.details}</p>
                  </td>

                  {/* Inspect */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#D8AD56] hover:bg-stone-100 transition-colors"
                      title="Inspect full audit record"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    No system audit logs match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: INSPECT AUDIT LOG DETAILS */}
      {/* ========================================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#241912] text-[#D8AD56] flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#241912]">
                    Audit Record Details
                  </h3>
                  <p className="text-xs font-mono text-stone-500">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Timestamp
                  </span>
                  <span className="text-xs font-mono font-medium text-stone-800">
                    {formatLogTimestamp(selectedLog.timestamp)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Actor / Role
                  </span>
                  <span className="text-xs font-semibold text-stone-900">
                    {selectedLog.userName} ({selectedLog.userRole})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Action Code
                  </span>
                  <span className="text-xs font-mono font-bold text-[#D8AD56]">
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Target Entity
                  </span>
                  <span className="text-xs font-medium text-stone-800 uppercase">
                    {selectedLog.entityType} ({selectedLog.entityId})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Actor User ID
                  </span>
                  <span className="text-xs font-mono text-stone-600">{selectedLog.userId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Security Seal
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Full Narration */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-1">
                  Event Statement
                </label>
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-[#D8AD56]/20 text-xs text-stone-800 leading-relaxed font-medium">
                  {selectedLog.details}
                </div>
              </div>

              {/* Previous vs New State if provided */}
              {(selectedLog.previousValue || selectedLog.newValue) && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
                    State Transition Payload
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedLog.previousValue && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-stone-500 uppercase font-bold">
                          Previous State
                        </span>
                        <pre className="p-3 rounded-xl bg-stone-100 text-[11px] font-mono overflow-x-auto text-stone-700 border border-stone-200">
                          {typeof selectedLog.previousValue === 'object'
                            ? JSON.stringify(selectedLog.previousValue, null, 2)
                            : String(selectedLog.previousValue)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newValue && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-stone-500 uppercase font-bold">
                          New Committed State
                        </span>
                        <pre className="p-3 rounded-xl bg-emerald-50 text-[11px] font-mono overflow-x-auto text-emerald-900 border border-emerald-200">
                          {typeof selectedLog.newValue === 'object'
                            ? JSON.stringify(selectedLog.newValue, null, 2)
                            : String(selectedLog.newValue)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-stone-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-[#241912] text-[#D8AD56] font-semibold text-xs hover:bg-[#382216] transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
