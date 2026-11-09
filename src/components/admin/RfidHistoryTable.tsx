'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RfidTapHistoryRecord,
  RfidStaySummaryMetrics,
  RfidHistoryCardType,
  RfidHistoryAccessResult,
} from '@/types/rfid-history';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import {
  Clock,
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  DoorOpen,
  Lock,
  Layers,
  Sparkles,
  User,
} from 'lucide-react';

export interface RfidHistoryProps {
  roomNumber?: string;
  bookingId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  guestName?: string;
  className?: string;
  initialView?: 'timeline' | 'table';
  compact?: boolean;
}

export function RfidHistoryTable({
  roomNumber,
  bookingId,
  checkInTime,
  checkOutTime,
  guestName,
  className = '',
  initialView = 'timeline',
  compact = false,
}: RfidHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [taps, setTaps] = useState<RfidTapHistoryRecord[]>([]);
  const [metrics, setMetrics] = useState<RfidStaySummaryMetrics>({
    totalTaps: 0,
    firstEntryTime: null,
    lastTappedTime: null,
    grantedTaps: 0,
    deniedTaps: 0,
    guestTaps: 0,
    staffTaps: 0,
    masterTaps: 0,
  });

  const [activeTab, setActiveTab] = useState<'timeline' | 'table'>(initialView);
  const [filterCardType, setFilterCardType] = useState<RfidHistoryCardType | 'ALL'>('ALL');
  const [filterResult, setFilterResult] = useState<RfidHistoryAccessResult | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      let url = '';

      if (roomNumber) {
        url = `/api/rooms/${encodeURIComponent(roomNumber)}/rfid-history?`;
        if (bookingId) url += `bookingId=${encodeURIComponent(bookingId)}&`;
        if (checkInTime) url += `checkInTime=${encodeURIComponent(checkInTime)}&`;
        if (checkOutTime) url += `checkOutTime=${encodeURIComponent(checkOutTime)}&`;
      } else {
        url = '/api/rfid/history?limit=100&';
        if (bookingId) url += `bookingId=${encodeURIComponent(bookingId)}&`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setTaps(data.taps || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        } else {
          // Compute local metrics if global endpoint was used
          const list: RfidTapHistoryRecord[] = data.taps || [];
          const granted = list.filter((t) => t.accessResult === 'GRANTED');
          const sortedGranted = [...granted].sort(
            (a, b) => new Date(a.tappedAt).getTime() - new Date(b.tappedAt).getTime()
          );

          setMetrics({
            totalTaps: list.length,
            firstEntryTime: sortedGranted.length > 0 ? sortedGranted[0].tappedAt : null,
            lastTappedTime: list.length > 0 ? list[0].tappedAt : null,
            grantedTaps: granted.length,
            deniedTaps: list.filter((t) => t.accessResult !== 'GRANTED').length,
            guestTaps: list.filter((t) => t.cardType === 'GUEST').length,
            staffTaps: list.filter((t) => t.cardType === 'STAFF').length,
            masterTaps: list.filter((t) => t.cardType === 'MASTER' || t.cardType === 'MAINTENANCE').length,
          });
        }
      }
    } catch (err) {
      console.error('[RfidHistoryTable] Failed to load history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roomNumber, bookingId, checkInTime, checkOutTime]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // Filtered dataset
  const filteredTaps = taps.filter((tap) => {
    if (filterCardType !== 'ALL' && tap.cardType !== filterCardType) return false;
    if (filterResult !== 'ALL' && tap.accessResult !== filterResult) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCard = tap.cardUid.toLowerCase().includes(q);
      const matchHolder = (tap.customerName || '').toLowerCase().includes(q);
      const matchReason = (tap.reason || '').toLowerCase().includes(q);
      const matchRoom = tap.roomNumber.toLowerCase().includes(q);
      if (!matchCard && !matchHolder && !matchReason && !matchRoom) return false;
    }
    return true;
  });

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'No recorded taps';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getResultBadge = (result: RfidHistoryAccessResult) => {
    switch (result) {
      case 'GRANTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Access Granted
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Card Expired
          </span>
        );
      case 'WRONG_ROOM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Wrong Room
          </span>
        );
      case 'DENIED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            Access Denied
          </span>
        );
    }
  };

  const getCardTypeBadge = (cardType: RfidHistoryCardType) => {
    switch (cardType) {
      case 'MASTER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            Master Override
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-sky-100 text-sky-800 border border-sky-200">
            <UserCheck className="w-3 h-3 text-sky-600" />
            Housekeeping Staff
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-stone-100 text-stone-800 border border-stone-200">
            <Layers className="w-3 h-3 text-stone-600" />
            Maintenance
          </span>
        );
      case 'GUEST':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-200">
            <Key className="w-3 h-3 text-amber-700" />
            Guest Keycard
          </span>
        );
    }
  };

  return (
    <div className={`flex flex-col gap-4 bg-white rounded-xl border border-stone-200 shadow-sm p-4 sm:p-5 ${className}`}>
      
      {/* HEADER BAR: Title, Stay Info, Refresh, View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF5EB] border border-[#E2D5BE] flex items-center justify-center text-[#9b7a3e]">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              {roomNumber ? `Room ${roomNumber} RFID Tap Audit Trail` : 'Universal RFID Tap Audit Trail'}
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {bookingId
              ? `Chronological door unlock history strictly for Stay ${bookingId} ${guestName ? `(${guestName})` : ''}`
              : 'Real-time append-only forensic tap history across physical Be-Tech door locks'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-50"
            title="Refresh Tap Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#9b7a3e]' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'timeline'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* STAY SUMMARY METRICS CARDS (Check-in to Check-out Aggregation) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Taps */}
        <div className="bg-[#FAF5EB]/60 border border-[#E2D5BE]/60 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-medium">Total Taps During Stay</span>
            <Layers className="w-3.5 h-3.5 text-[#9b7a3e]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-stone-900">{metrics.totalTaps}</span>
            <span className="text-[11px] text-stone-500">
              ({metrics.grantedTaps} granted, {metrics.deniedTaps} denied)
            </span>
          </div>
        </div>

        {/* First Entry Time */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-medium">First Entry Time</span>
            <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-xs font-semibold text-stone-900 block truncate" title={formatDateTime(metrics.firstEntryTime)}>
              {metrics.firstEntryTime ? formatDateTime(metrics.firstEntryTime) : 'No successful entries'}
            </span>
            <span className="text-[10px] text-stone-400">Initial room unlock by guest</span>
          </div>
        </div>

        {/* Last Tapped Time */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex flex-col">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-medium">Last Tapped Time</span>
            <Clock className="w-3.5 h-3.5 text-stone-600" />
          </div>
          <div className="mt-1">
            <span className="text-xs font-semibold text-stone-900 block truncate" title={formatDateTime(metrics.lastTappedTime)}>
              {metrics.lastTappedTime ? formatDateTime(metrics.lastTappedTime) : 'Never'}
            </span>
            <span className="text-[10px] text-stone-400">Most recent reader interaction</span>
          </div>
        </div>

        {/* Universal Breakdown Card */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-medium">Access Breakdown</span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium">
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900" title="Guest Taps">
              {metrics.guestTaps} Guest
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800" title="Housekeeping Taps">
              {metrics.staffTaps} Staff
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800" title="Master Taps">
              {metrics.masterTaps} Master
            </span>
          </div>
        </div>
      </div>

      {/* QUICK FILTERS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Card UID, Holder Name, Reason..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#9b7a3e] focus:border-[#9b7a3e]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Card Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <Filter className="w-3 h-3 text-stone-400" />
            <div className="min-w-[140px]">
              <LuxurySelect
                size="sm"
                variant="admin"
                value={filterCardType}
                onChange={(val) => setFilterCardType(val as any)}
                options={[
                  { value: 'ALL', label: 'All Card Types' },
                  { value: 'GUEST', label: 'Guest Keys' },
                  { value: 'STAFF', label: 'Housekeeping Staff' },
                  { value: 'MASTER', label: 'Super Admin Master' },
                  { value: 'MAINTENANCE', label: 'Maintenance' },
                ]}
              />
            </div>
          </div>

          {/* Result Filter */}
          <div className="min-w-[130px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={filterResult}
              onChange={(val) => setFilterResult(val as any)}
              options={[
                { value: 'ALL', label: 'All Results' },
                { value: 'GRANTED', label: 'Granted Only' },
                { value: 'DENIED', label: 'Denied Only' },
                { value: 'EXPIRED', label: 'Expired Cards' },
                { value: 'WRONG_ROOM', label: 'Wrong Room' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* CONTENT AREA: TIMELINE OR TABLE */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#9b7a3e]" />
          <span className="text-xs">Querying Sri Tayi Grand RFID tap history...</span>
        </div>
      ) : filteredTaps.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2 border border-dashed border-stone-200 rounded-xl">
          <DoorOpen className="w-8 h-8 text-stone-300" />
          <span className="text-xs font-medium text-stone-600">No RFID tap events found</span>
          <span className="text-[11px] text-stone-400">
            {searchQuery || filterCardType !== 'ALL' || filterResult !== 'ALL'
              ? 'Try resetting the quick filters to see all recorded taps.'
              : 'Physical door locks will record taps here automatically when keycards are presented.'}
          </span>
        </div>
      ) : activeTab === 'timeline' ? (
        /* ================= CHRONOLOGICAL TIMELINE VIEW ================= */
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-200">
          {filteredTaps.map((tap) => {
            const isGranted = tap.accessResult === 'GRANTED';
            return (
              <div key={tap.id} className="relative group">
                {/* Node icon on vertical line */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${
                    isGranted
                      ? 'bg-emerald-500 text-white'
                      : tap.accessResult === 'WRONG_ROOM'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {isGranted ? (
                    <DoorOpen className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                </div>

                {/* Card Container */}
                <div className="bg-stone-50/70 hover:bg-stone-50 border border-stone-200 rounded-xl p-3.5 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getResultBadge(tap.accessResult)}
                      {getCardTypeBadge(tap.cardType)}
                      <span className="text-xs font-bold text-stone-800 font-mono">
                        Room {tap.roomNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{formatDateTime(tap.tappedAt)}</span>
                    </div>
                  </div>

                  {/* Holder & Reason Row */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-stone-600">
                        <User className="w-3 h-3" />
                      </div>
                      <span className="font-semibold text-stone-800">
                        {tap.customerName || 'Unregistered Cardholder'}
                      </span>
                      {tap.bookingId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-600 font-mono">
                          Stay: {tap.bookingId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-stone-500">
                      <span>UID: {tap.cardUid}</span>
                      <span>•</span>
                      <span className="font-semibold text-stone-700">Door: {tap.doorStatus}</span>
                    </div>
                  </div>

                  {/* Security Reason Note */}
                  {tap.reason && (
                    <div className="mt-2 text-[11px] text-stone-600 bg-white/80 rounded px-2.5 py-1 border border-stone-200/60">
                      {tap.reason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= DETAILED AUDIT DATA TABLE ================= */
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF5EB] text-stone-700 font-semibold uppercase tracking-wider text-[10px] border-b border-[#E2D5BE]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Room #</th>
                <th className="py-2.5 px-3">Card Type</th>
                <th className="py-2.5 px-3">Cardholder / Staff</th>
                <th className="py-2.5 px-3">Card UID</th>
                <th className="py-2.5 px-3">Access Result</th>
                <th className="py-2.5 px-3">Door Status</th>
                <th className="py-2.5 px-3">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredTaps.map((tap) => (
                <tr key={tap.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-stone-600 text-[11px]">
                    {formatDateTime(tap.tappedAt)}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-stone-900">
                    Room {tap.roomNumber}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getCardTypeBadge(tap.cardType)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-stone-900">
                      {tap.customerName || 'N/A'}
                    </div>
                    {tap.bookingId && (
                      <div className="text-[10px] text-stone-400 font-mono">
                        Ref: {tap.bookingId}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">
                    {tap.cardUid}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getResultBadge(tap.accessResult)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-medium text-stone-700">
                    {tap.doorStatus}
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate" title={tap.reason}>
                    {tap.reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER AUDIT NOTICE */}
      <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
        <span>Append-Only Forensic Log • Sri Tayi Grand Physical Access Controller</span>
        <span>Showing {filteredTaps.length} of {taps.length} records</span>
      </div>
    </div>
  );
}

// Export alternate alias requested in prompt
export const RfidActivityTimeline = RfidHistoryTable;
