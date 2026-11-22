'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Wallet,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Lock,
  Unlock,
  Printer,
  Calculator,
  ShieldCheck,
  FileText,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { getAdminHeaders, authStorage } from '@/lib/auth-storage';
import { CashShift, StaffAttendance } from '@/types';

interface DenominationCounts {
  c2000: number;
  c500: number;
  c200: number;
  c100: number;
  c50: number;
  c20: number;
  c10: number;
  c5: number;
  c2: number;
  c1: number;
  coins: number;
}

const DEFAULT_DENOMINATIONS: DenominationCounts = {
  c2000: 0,
  c500: 6,
  c200: 5,
  c100: 8,
  c50: 4,
  c20: 0,
  c10: 0,
  c5: 0,
  c2: 0,
  c1: 0,
  coins: 0,
};

const EMPTY_DENOMINATIONS: DenominationCounts = {
  c2000: 0,
  c500: 0,
  c200: 0,
  c100: 0,
  c50: 0,
  c20: 0,
  c10: 0,
  c5: 0,
  c2: 0,
  c1: 0,
  coins: 0,
};

function calculateDenominationTotal(d: DenominationCounts): number {
  return (
    (Number(d.c2000) || 0) * 2000 +
    (Number(d.c500) || 0) * 500 +
    (Number(d.c200) || 0) * 200 +
    (Number(d.c100) || 0) * 100 +
    (Number(d.c50) || 0) * 50 +
    (Number(d.c20) || 0) * 20 +
    (Number(d.c10) || 0) * 10 +
    (Number(d.c5) || 0) * 5 +
    (Number(d.c2) || 0) * 2 +
    (Number(d.c1) || 0) * 1 +
    (Number(d.coins) || 0) * 1
  );
}

export function UnifiedShiftControl({
  compact = false,
  onShiftStateChange,
}: {
  compact?: boolean;
  onShiftStateChange?: () => void;
}) {
  const { t, formatCurrency, isTelugu } = useAdminLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [activeAttendance, setActiveAttendance] = useState<StaffAttendance | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [totalCashIn, setTotalCashIn] = useState<number>(0);
  const [totalCashOut, setTotalCashOut] = useState<number>(0);
  const [expectedClosingCash, setExpectedClosingCash] = useState<number>(0);
  const [eligibleManagers, setEligibleManagers] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([]);

  // Modals
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isHandoverReceiptOpen, setIsHandoverReceiptOpen] = useState(false);
  const [lastClosedReport, setLastClosedReport] = useState<any>(null);

  // Form states - Start Shift
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [shiftType, setShiftType] = useState<'morning' | 'evening' | 'night' | 'general'>('morning');
  const [startNotes, setStartNotes] = useState('');
  const [startDenominations, setStartDenominations] = useState<DenominationCounts>(DEFAULT_DENOMINATIONS);
  const [startConfirmed, setStartConfirmed] = useState(false);

  // Form states - End Shift
  const [endDenominations, setEndDenominations] = useState<DenominationCounts>(EMPTY_DENOMINATIONS);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [endConfirmed, setEndConfirmed] = useState(false);

  // Notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  // Fetch Authoritative State
  const fetchShiftState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/shifts/unified', {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHasActiveShift(data.hasActiveShift);
          setActiveShift(data.activeShift);
          setActiveAttendance(data.activeAttendance);
          setCurrentBalance(data.balance || 0);
          setOpeningFloat(data.openingFloat || 0);
          setTotalCashIn(data.totalCashIn || 0);
          setTotalCashOut(data.totalCashOut || 0);
          setExpectedClosingCash(data.expectedClosingCash || 0);
          setEligibleManagers(data.eligibleManagers || []);

          if (data.eligibleManagers && data.eligibleManagers.length > 0 && !selectedManagerId) {
            setSelectedManagerId(data.eligibleManagers[0].id);
          }
        }
      }
    } catch (err: any) {
      console.warn('[SHIFT STATE SYNC WARN]', err);
    } finally {
      setLoading(false);
    }
  }, [selectedManagerId]);

  useEffect(() => {
    fetchShiftState();
  }, [fetchShiftState]);

  // Realtime synchronization listener
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'cash_shift_opened' ||
        event.eventType === 'cash_shift_closed' ||
        event.eventType === 'manager_clocked_in' ||
        event.eventType === 'manager_clocked_out' ||
        event.eventType === 'cash_transaction_created' ||
        event.eventType === 'shift_lifecycle_changed'
      ) {
        fetchShiftState();
        if (onShiftStateChange) onShiftStateChange();
      }
    },
  });

  // Calculate live denomination totals
  const calculatedStartFloat = useMemo(() => calculateDenominationTotal(startDenominations), [startDenominations]);
  const calculatedClosingCash = useMemo(() => calculateDenominationTotal(endDenominations), [endDenominations]);
  const liveDiscrepancy = useMemo(() => calculatedClosingCash - expectedClosingCash, [calculatedClosingCash, expectedClosingCash]);

  // Handle Start Shift Submit
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagerId) {
      showNotification('error', 'Please select the Duty Manager on shift.');
      return;
    }
    if (!startConfirmed) {
      showNotification('error', 'Please physically verify and confirm the cash drawer float.');
      return;
    }

    const mgr = eligibleManagers.find((m) => m.id === selectedManagerId);

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/shifts/unified', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: 'start_shift',
          managerId: selectedManagerId,
          managerName: mgr?.full_name || 'Duty Manager',
          openingFloat: calculatedStartFloat,
          openingDenominations: startDenominations,
          shiftType,
          notes: startNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start unified shift.');
      }

      showNotification('success', data.message || 'Shift started successfully!');
      setIsStartModalOpen(false);
      setStartNotes('');
      setStartConfirmed(false);
      await fetchShiftState();
      if (onShiftStateChange) onShiftStateChange();
    } catch (err: any) {
      showNotification('error', err?.message || 'Error executing Start Shift.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle End Shift Submit
  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      showNotification('error', 'No active cash shift found to end.');
      return;
    }
    if (!endConfirmed) {
      showNotification('error', 'Please confirm that the counted cash matches your physical denomination count.');
      return;
    }
    if (liveDiscrepancy !== 0 && !discrepancyReason.trim()) {
      showNotification('error', 'A written explanation is required for any non-zero cash discrepancy.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/shifts/unified', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: 'end_shift',
          shiftId: activeShift.id,
          closingCashCounted: calculatedClosingCash,
          closingDenominations: endDenominations,
          handoverNotes,
          discrepancyReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to end unified shift.');
      }

      showNotification('success', data.message || 'Shift ended and reconciled successfully!');
      setLastClosedReport({
        shift: data.shift,
        attendance: data.attendance,
        financials: data.financials,
        closingDenominations: endDenominations,
        handoverNotes,
        discrepancyReason,
      });

      setIsEndModalOpen(false);
      setIsHandoverReceiptOpen(true);
      setHandoverNotes('');
      setDiscrepancyReason('');
      setEndConfirmed(false);
      setEndDenominations(EMPTY_DENOMINATIONS);
      await fetchShiftState();
      if (onShiftStateChange) onShiftStateChange();
    } catch (err: any) {
      showNotification('error', err?.message || 'Error executing End Shift.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-100'
              : 'bg-rose-900/90 border-rose-500/40 text-rose-100'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-2 hover:opacity-75 cursor-pointer text-white/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Bar Display */}
      {compact ? (
        // Compact View (for Header or Toolbar)
        <div className="flex items-center gap-2">
          {hasActiveShift && activeShift ? (
            <div className="flex items-center gap-2 bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-2.5 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-900">{activeShift.cashier_name}</span>
              <span className="text-emerald-700 font-mono">({formatCurrency(currentBalance)})</span>
              <button
                type="button"
                onClick={() => setIsEndModalOpen(true)}
                className="ml-1 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium transition-all shadow-xs cursor-pointer"
              >
                End Shift
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsStartModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Start Shift</span>
            </button>
          )}
        </div>
      ) : (
        // Full Hero Banner View (For Executive Dashboard & Cashbook)
        <div className="w-full bg-[#FAF8F5] border border-[#E6D9C5] rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Operational Status */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                  hasActiveShift
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                }`}
              >
                {hasActiveShift ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-serif font-bold text-[#2A1D13]">
                    {hasActiveShift
                      ? `Active Shift: ${activeShift?.cashier_name}`
                      : 'Front Desk Cash Drawer & Duty Manager Session Closed'}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                      hasActiveShift
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasActiveShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {hasActiveShift ? 'DRAWER OPEN' : 'DRAWER LOCKED'}
                  </span>
                </div>
                <p className="text-xs text-[#786A5B] mt-0.5 font-medium">
                  {hasActiveShift && activeShift
                    ? `Shift #${activeShift.shift_number} opened at ${new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with float ${formatCurrency(activeShift.opening_float)}.`
                    : 'A duty manager must count the physical cash drawer and start a unified shift to begin operations.'}
                </p>
              </div>
            </div>

            {/* Middle: Live Financial Telemetry (If active) */}
            {hasActiveShift && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-white border border-[#E6D9C5] rounded-xl p-2.5 text-xs font-mono">
                <div>
                  <span className="block text-[10px] text-[#786A5B] font-sans uppercase">Opening Float</span>
                  <span className="font-bold text-[#2A1D13]">{formatCurrency(openingFloat)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-emerald-600 font-sans uppercase">Cash In</span>
                  <span className="font-bold text-emerald-700">+{formatCurrency(totalCashIn)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-rose-600 font-sans uppercase">Cash Out</span>
                  <span className="font-bold text-rose-700">-{formatCurrency(totalCashOut)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#8D672F] font-sans uppercase">Drawer Expected</span>
                  <span className="font-bold text-[#8D672F]">{formatCurrency(expectedClosingCash)}</span>
                </div>
              </div>
            )}

            {/* Right: Primary Action Button */}
            <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
              {hasActiveShift ? (
                <button
                  type="button"
                  onClick={() => setIsEndModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>End Shift & Reconcile</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Start Manager Shift</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: START SHIFT & OPEN CASH DRAWER */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F5] border border-[#E6D9C5] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2A1D13] text-[#EAD8B8] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#2A1D13]">
                    Start Manager Shift & Open Drawer
                  </h3>
                  <p className="text-xs text-[#786A5B]">Sri Tayi Grand Hotel Management System</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStartModalOpen(false)}
                className="p-1 rounded-lg text-[#786A5B] hover:bg-[#E6D9C5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="mt-4 space-y-4">
              {/* Step 1: Manager Selection & Shift Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
                    Duty Manager <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E6D9C5] text-[#2A1D13] font-medium focus:ring-1 focus:ring-[#8D672F] outline-none"
                  >
                    {eligibleManagers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
                    Operating Shift <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E6D9C5] text-[#2A1D13] font-medium focus:ring-1 focus:ring-[#8D672F] outline-none"
                  >
                    <option value="morning">Morning Shift (06:00 - 14:00)</option>
                    <option value="evening">Evening Shift (14:00 - 22:00)</option>
                    <option value="night">Night Shift (22:00 - 06:00)</option>
                    <option value="general">General Duty (Flexible)</option>
                  </select>
                </div>
              </div>

              {/* Step 2: Physical Denomination Breakdown */}
              <div className="border border-[#E6D9C5] rounded-xl p-3.5 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#8D672F]" />
                    <span className="text-xs font-bold text-[#2A1D13] uppercase tracking-wide">
                      Physical Cash Denomination Count
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#8D672F]">
                    Total: {formatCurrency(calculatedStartFloat)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹500 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c500}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c500: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹200 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c200}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c200: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹100 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c100}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c100: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹50 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c50}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c50: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹20 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c20}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c20: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹10 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c10}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c10: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹5 / ₹2 / ₹1 Coins</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.coins}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, coins: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹2000 (Rare)</label>
                    <input
                      type="number"
                      min="0"
                      value={startDenominations.c2000}
                      onChange={(e) =>
                        setStartDenominations({ ...startDenominations, c2000: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Opening Remarks */}
              <div>
                <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
                  Opening Remarks / Handover Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  placeholder="e.g. Received float from previous shift. Drawer locked and verified."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E6D9C5] text-[#2A1D13] placeholder-[#786A5B]/60 outline-none"
                />
              </div>

              {/* Step 4: Physical Count Confirmation Checkbox */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <input
                  type="checkbox"
                  id="confirmPhysicalCount"
                  checked={startConfirmed}
                  onChange={(e) => setStartConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-[#E6D9C5] text-[#8D672F] focus:ring-[#8D672F] cursor-pointer"
                />
                <label htmlFor="confirmPhysicalCount" className="text-xs text-[#2A1D13] font-medium cursor-pointer">
                  I confirm that I have physically counted the Indian Rupee cash notes and coins in the reception drawer,
                  totaling <span className="font-bold text-[#8D672F]">{formatCurrency(calculatedStartFloat)}</span>.
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#786A5B] hover:bg-[#E6D9C5]/40 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !startConfirmed || calculatedStartFloat < 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#EAD8B8] bg-[#2A1D13] hover:bg-[#3D2B1D] disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Committing Atomic Shift...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Clock In & Open Drawer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: END SHIFT & RECONCILE CASH DRAWER */}
      {isEndModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F5] border border-[#E6D9C5] rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-700 text-white flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#2A1D13]">
                    End Shift, Reconcile Drawer & Clock Out
                  </h3>
                  <p className="text-xs text-[#786A5B]">
                    Duty Manager: <span className="font-semibold">{activeShift?.cashier_name}</span> | Shift #
                    {activeShift?.shift_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEndModalOpen(false)}
                className="p-1 rounded-lg text-[#786A5B] hover:bg-[#E6D9C5]/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEndShift} className="mt-4 space-y-4">
              {/* Step 1: Live Financial Ledger Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-white border border-[#E6D9C5] text-xs font-mono">
                <div>
                  <span className="block text-[10px] text-[#786A5B] font-sans uppercase">Opening Float</span>
                  <span className="font-bold text-[#2A1D13]">{formatCurrency(openingFloat)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-emerald-600 font-sans uppercase">+ Cash In</span>
                  <span className="font-bold text-emerald-700">+{formatCurrency(totalCashIn)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-rose-600 font-sans uppercase">- Cash Out</span>
                  <span className="font-bold text-rose-700">-{formatCurrency(totalCashOut)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#8D672F] font-sans uppercase">= Expected Drawer</span>
                  <span className="font-bold text-[#8D672F] text-sm">{formatCurrency(expectedClosingCash)}</span>
                </div>
              </div>

              {/* Step 2: Physical Denomination Count Form */}
              <div className="border border-[#E6D9C5] rounded-xl p-3.5 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#8D672F]" />
                    <span className="text-xs font-bold text-[#2A1D13] uppercase tracking-wide">
                      Counted Physical Closing Cash
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#2A1D13]">
                    Counted: {formatCurrency(calculatedClosingCash)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹500 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c500}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c500: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹200 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c200}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c200: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹100 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c100}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c100: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹50 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c50}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c50: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹20 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c20}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c20: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹10 Notes</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c10}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c10: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹5 / ₹2 / ₹1 Coins</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.coins}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, coins: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#786A5B] font-mono">₹2000 (Rare)</label>
                    <input
                      type="number"
                      min="0"
                      value={endDenominations.c2000}
                      onChange={(e) =>
                        setEndDenominations({ ...endDenominations, c2000: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border border-[#E6D9C5] rounded-lg text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Reconciliation & Discrepancy Indicator */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  liveDiscrepancy === 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : liveDiscrepancy < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {liveDiscrepancy === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {liveDiscrepancy === 0
                        ? 'Drawer Perfectly Reconciled'
                        : liveDiscrepancy < 0
                        ? `Cash Shortage Detected: ${formatCurrency(Math.abs(liveDiscrepancy))}`
                        : `Cash Excess Detected: ${formatCurrency(liveDiscrepancy)}`}
                    </span>
                    <span className="text-[11px] opacity-80">
                      Expected: {formatCurrency(expectedClosingCash)} | Counted: {formatCurrency(calculatedClosingCash)}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold">
                  {liveDiscrepancy > 0 ? `+${formatCurrency(liveDiscrepancy)}` : formatCurrency(liveDiscrepancy)}
                </span>
              </div>

              {/* Discrepancy Explanation Field (Mandatory if discrepancy != 0) */}
              {liveDiscrepancy !== 0 && (
                <div>
                  <label className="block text-xs font-semibold text-rose-800 mb-1">
                    Discrepancy Explanation <span className="text-rose-600">* (Mandatory for audit trail)</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    placeholder="Provide specific reason for cash difference (e.g., guest change discrepancy, petty cash voucher pending receipt, etc.)"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-rose-300 text-[#2A1D13] focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              )}

              {/* Handover Remarks */}
              <div>
                <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
                  Handover Remarks for Next Shift
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Notes for next duty manager (e.g., Room 106 requested early wake-up call, keycard issued, laundry pending)."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E6D9C5] text-[#2A1D13] placeholder-[#786A5B]/60 outline-none"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5]">
                <input
                  type="checkbox"
                  id="confirmEndShift"
                  checked={endConfirmed}
                  onChange={(e) => setEndConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-[#E6D9C5] text-[#8D672F] focus:ring-[#8D672F] cursor-pointer"
                />
                <label htmlFor="confirmEndShift" className="text-xs text-[#2A1D13] font-medium cursor-pointer">
                  I confirm that I have physically counted the reception drawer, reconciled all transactions, and am
                  ready to lock the cash drawer and clock out of duty.
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setIsEndModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#786A5B] hover:bg-[#E6D9C5]/40 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !endConfirmed || (liveDiscrepancy !== 0 && !discrepancyReason.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reconciling & Closing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Close Shift & Clock Out</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SHIFT HANDOVER THERMAL RECEIPT SLIP */}
      {isHandoverReceiptOpen && lastClosedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#E6D9C5] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8D672F]" />
                <h4 className="text-sm font-serif font-bold text-[#2A1D13]">Shift Handover Slip</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsHandoverReceiptOpen(false)}
                className="p-1 rounded text-[#786A5B] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Print Area */}
            <div id="shift-thermal-receipt" className="font-mono text-[11px] space-y-2 py-4 text-[#2A1D13]">
              <div className="text-center border-b pb-2">
                <p className="font-bold text-xs uppercase tracking-wider">SRI TAYI GRAND</p>
                <p className="text-[10px] text-gray-500">Kadiri, Anantapur District, AP</p>
                <p className="font-bold mt-1 text-[11px]">SHIFT CLOSING & HANDOVER SLIP</p>
                <p className="text-[10px] text-gray-500">Shift #{lastClosedReport.shift.shift_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-1 py-1 border-b">
                <span>Duty Manager:</span>
                <span className="font-bold text-right">{lastClosedReport.shift.cashier_name}</span>
                <span>Opened:</span>
                <span className="text-right">{new Date(lastClosedReport.shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>Closed:</span>
                <span className="text-right">{new Date(lastClosedReport.shift.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>Duration:</span>
                <span className="text-right">{lastClosedReport.financials.workHours || 0} hrs</span>
              </div>

              <div className="space-y-1 py-1 border-b">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>{formatCurrency(lastClosedReport.financials.openingFloat)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Cash In:</span>
                  <span>+{formatCurrency(lastClosedReport.financials.totalCashIn)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Total Cash Out:</span>
                  <span>-{formatCurrency(lastClosedReport.financials.totalCashOut)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Expected Cash:</span>
                  <span>{formatCurrency(lastClosedReport.financials.expectedClosingCash)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Counted Cash:</span>
                  <span>{formatCurrency(lastClosedReport.financials.closingCashCounted)}</span>
                </div>
                <div
                  className={`flex justify-between font-bold ${
                    lastClosedReport.financials.discrepancy === 0
                      ? 'text-emerald-700'
                      : lastClosedReport.financials.discrepancy < 0
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }`}
                >
                  <span>Discrepancy:</span>
                  <span>
                    {lastClosedReport.financials.discrepancy > 0
                      ? `+${formatCurrency(lastClosedReport.financials.discrepancy)}`
                      : formatCurrency(lastClosedReport.financials.discrepancy)}
                  </span>
                </div>
              </div>

              {lastClosedReport.discrepancyReason && (
                <div className="py-1 border-b text-[10px]">
                  <span className="font-bold">Discrepancy Note:</span>
                  <p className="text-gray-700 mt-0.5">{lastClosedReport.discrepancyReason}</p>
                </div>
              )}

              {lastClosedReport.handoverNotes && (
                <div className="py-1 border-b text-[10px]">
                  <span className="font-bold">Handover Remarks:</span>
                  <p className="text-gray-700 mt-0.5">{lastClosedReport.handoverNotes}</p>
                </div>
              )}

              <div className="pt-4 flex justify-between text-[10px] text-gray-500">
                <span>Manager Signature</span>
                <span>Auditor / Admin</span>
              </div>
            </div>

            {/* Print and Close Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E6D9C5]">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6D9C5] text-xs font-semibold text-[#2A1D13] hover:bg-slate-100 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHandoverReceiptOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#2A1D13] text-[#EAD8B8] text-xs font-semibold hover:bg-[#3D2B1D] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
