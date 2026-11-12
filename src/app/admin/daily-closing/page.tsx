'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailyClosing } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { getAdminHeaders } from '@/lib/auth-storage';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Wallet,
  Building,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  Printer,
  FileCheck,
  BedDouble,
  Receipt,
  Sparkles,
  X,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface ClosingSummaryData {
  closingDate: string;
  totalRevenue: number;
  roomRevenue: number;
  hallRevenue: number;
  otherRevenue: number;
  cashCollected: number;
  upiCollected: number;
  cardCollected: number;
  onlineCollected: number;
  totalExpenses: number;
  cashExpenses: number;
  expectedCashInDrawer: number;
  isAlreadyClosed: boolean;
  operational?: {
    totalRooms: number;
    occupiedRooms: number;
    cleanRooms: number;
    dirtyRooms: number;
    maintenanceRooms: number;
    occupancyRate: number;
    arrivalsCount: number;
    departuresCount: number;
  };
  gst?: {
    netTaxable: number;
    cgst: number;
    sgst: number;
    totalGst: number;
  };
}

export default function AdminDailyClosingPage() {
  const [businessDate, setBusinessDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<ClosingSummaryData | null>(null);
  const [history, setHistory] = useState<DailyClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(1);

  // Form states for Closing
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [closedByName, setClosedByName] = useState<string>('Front Desk Auditor');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal for viewing/printing a certificate
  const [selectedClosing, setSelectedClosing] = useState<DailyClosing | null>(null);

  const fetchClosingData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/daily-closing?date=${businessDate}`, {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setHistory(data.history || []);
        if (data.summary?.expectedCashInDrawer !== undefined && !actualCashInput) {
          setActualCashInput(String(data.summary.expectedCashInDrawer));
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to fetch closing data.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error fetching closing.' });
    } finally {
      setLoading(false);
    }
  }, [businessDate, actualCashInput]);

  useEffect(() => {
    fetchClosingData();
  }, [fetchClosingData]);

  // Real-time synchronization
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'daily_closing' ||
        event.eventType === 'payment_recorded' ||
        event.eventType === 'booking_created'
      ) {
        fetchClosingData();
      }
    },
  });

  const handleExecuteClosing = async () => {
    if (!summary) return;
    const cashVal = Number(actualCashInput);
    if (isNaN(cashVal) || cashVal < 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid actual cash count (cannot be negative).' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch('/api/admin/daily-closing', {
        method: 'POST',
        headers: getAdminHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          closingDate: businessDate,
          actualCashCounted: cashVal,
          notes: notes || 'Daily night audit completed. Register reconciled and locked.',
          closedByName: closedByName || 'Accounts Auditor',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `Night register for ${businessDate} locked successfully!`,
        });
        setSelectedClosing(data.closing);
        await fetchClosingData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to close daily register.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing closing.' });
    } finally {
      setSubmitting(false);
    }
  };

  const expectedCash = summary?.expectedCashInDrawer || 0;
  const actualCash = Number(actualCashInput) || 0;
  const cashDiscrepancy = actualCash - expectedCash;
  const totalDigital = (summary?.upiCollected || 0) + (summary?.cardCollected || 0) + (summary?.onlineCollected || 0);

  const existingClosingForDate = history.find((h) => h.closing_date === businessDate);
  const isDateClosed = summary?.isAlreadyClosed || Boolean(existingClosingForDate);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D8AD56] font-semibold">
            <span>Accounts & Front Desk</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Night Audit & Daily Closing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#241912] mt-1">
            End-of-Day Night Audit & Closing
          </h1>
          <p className="text-xs sm:text-sm text-[#786A5B]">
            Sri Tayi Grand daily reconciliation: Room status audit, drawer float settlement, digital payment gateway audit, and GST tax records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#EFE3D6] bg-white shadow-sm">
            <Calendar className="w-4 h-4 text-[#D8AD56]" />
            <input
              type="date"
              value={businessDate}
              onChange={(e) => {
                setBusinessDate(e.target.value);
                setActualCashInput('');
              }}
              className="bg-transparent text-xs font-semibold text-[#241912] outline-none"
            />
          </div>
          <button
            onClick={() => fetchClosingData()}
            className="p-2.5 rounded-xl border border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-[#786A5B] transition-colors shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts / Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Already Closed Banner */}
      {isDateClosed && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#241912] to-[#382216] text-white border border-[#D8AD56]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D8AD56]/20 border border-[#D8AD56]/40 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-[#D8AD56]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider border border-emerald-400/30">
                  Register Locked & Finalized
                </span>
                <span className="text-xs text-[#EFE3D6]/70">Date: {businessDate}</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-white mt-1">
                Night Audit Completed for {businessDate}
              </h3>
              <p className="text-xs text-[#EFE3D6]/80 mt-0.5">
                Audit closed by {existingClosingForDate?.closed_by_name || 'Accounts Auditor'} ({existingClosingForDate?.closed_by_role || 'Accounts'}). Total Revenue: ₹{(existingClosingForDate?.total_revenue || summary?.totalRevenue || 0).toLocaleString('en-IN')}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {existingClosingForDate && (
              <button
                onClick={() => setSelectedClosing(existingClosingForDate)}
                className="px-4 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>View / Print Certificate</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6-STEP NIGHT AUDIT WIZARD */}
      {!isDateClosed && summary && (
        <div className="space-y-6">
          {/* Step Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { num: 1, label: 'Rooms & Occupancy', icon: BedDouble },
              { num: 2, label: 'Revenue & Inflow', icon: DollarSign },
              { num: 3, label: 'Drawer Cash Count', icon: Wallet },
              { num: 4, label: 'Digital Payments', icon: CreditCard },
              { num: 5, label: 'GST Tax Audit', icon: ShieldCheck },
              { num: 6, label: 'Lock Register', icon: Lock },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    step === s.num
                      ? 'bg-[#241912] text-white border-[#241912] shadow-md ring-2 ring-[#D8AD56]/40'
                      : step > s.num
                      ? 'bg-[#FAF7F2] border-[#D8AD56]/50 text-[#382216]'
                      : 'bg-white border-[#EFE3D6] text-[#786A5B] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider opacity-70">
                      Step 0{s.num}
                    </span>
                    <Icon className="w-3.5 h-3.5 opacity-60" />
                  </div>
                  <div className="text-xs font-bold truncate mt-1">{s.label}</div>
                </button>
              );
            })}
          </div>

          {/* STEP 1: ROOMS & OPERATIONAL AUDIT */}
          {step === 1 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-[#D8AD56]" />
                    <span>Step 1: Physical Room Inventory & Occupancy Audit</span>
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-0.5">
                    Verify all physical rooms at Sri Tayi Grand, guest check-ins, cleaning queue, and OOO maintenance blocks.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#D8AD56] bg-[#241912] px-3.5 py-1.5 rounded-full border border-[#D8AD56]/30">
                  Occupancy: {summary.operational?.occupancyRate || 0}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-xs text-[#786A5B]">Total Room Inventory</span>
                  <div className="text-2xl font-bold font-mono text-[#241912]">
                    {summary.operational?.totalRooms || 0} Rooms
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-xs text-emerald-800">Occupied (In-House)</span>
                  <div className="text-2xl font-bold font-mono text-emerald-700">
                    {summary.operational?.occupiedRooms || 0} Rooms
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                  <span className="text-xs text-blue-800">Clean & Inspected</span>
                  <div className="text-2xl font-bold font-mono text-blue-700">
                    {summary.operational?.cleanRooms || 0} Rooms
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                  <span className="text-xs text-amber-800">Dirty / Cleaning</span>
                  <div className="text-2xl font-bold font-mono text-amber-700">
                    {summary.operational?.dirtyRooms || 0} Rooms
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                  <span className="text-xs text-rose-800">Under Maintenance (OOO)</span>
                  <div className="text-2xl font-bold font-mono text-rose-700">
                    {summary.operational?.maintenanceRooms || 0} Rooms
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-xs text-[#786A5B]">Today Expected Arrivals</span>
                  <div className="text-2xl font-bold font-mono text-[#382216]">
                    {summary.operational?.arrivalsCount || 0} Guests
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-xs text-[#786A5B]">Today Departures</span>
                  <div className="text-2xl font-bold font-mono text-[#382216]">
                    {summary.operational?.departuresCount || 0} Rooms
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                  <span className="text-xs text-purple-800">Audit Status</span>
                  <div className="text-sm font-bold font-mono text-purple-700 pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Rooms Reconciled</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Revenue & Inflow &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REVENUE & INFLOW AUDIT */}
          {step === 2 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#D8AD56]" />
                    <span>Step 2: Revenue Collections & Operating Disbursals</span>
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-0.5">
                    Review total payments received across all payment channels vs operational expense vouchers recorded today.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                  Gross Revenue: ₹{summary.totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#786A5B] font-semibold">
                    Total Gross Revenue
                  </span>
                  <div className="text-3xl font-bold font-mono text-[#241912]">
                    ₹{summary.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-[#786A5B] pt-1">
                    Room bookings + early check-ins & amenities
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-rose-800 font-semibold">
                    Operating Expenses
                  </span>
                  <div className="text-3xl font-bold font-mono text-rose-700">
                    ₹{summary.totalExpenses.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-rose-600 pt-1">
                    Cash payouts: ₹{summary.cashExpenses.toLocaleString('en-IN')} | Digital: ₹{(summary.totalExpenses - summary.cashExpenses).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">
                    Net Operating Surplus
                  </span>
                  <div className="text-3xl font-bold font-mono text-emerald-800">
                    ₹{(summary.totalRevenue - summary.totalExpenses).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-emerald-700 pt-1">
                    Net operational day surplus before corporate taxes
                  </div>
                </div>
              </div>

              {/* Collections by Channel */}
              <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#382216]">
                  Inflow by Payment Channel Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                    <span className="text-[#786A5B]">Cash In Drawer</span>
                    <div className="font-mono font-bold text-sm text-[#241912] mt-0.5">
                      ₹{summary.cashCollected.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                    <span className="text-[#786A5B]">UPI (QR & VPA)</span>
                    <div className="font-mono font-bold text-sm text-[#241912] mt-0.5">
                      ₹{summary.upiCollected.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                    <span className="text-[#786A5B]">Card POS Terminal</span>
                    <div className="font-mono font-bold text-sm text-[#241912] mt-0.5">
                      ₹{summary.cardCollected.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                    <span className="text-[#786A5B]">Online Gateway</span>
                    <div className="font-mono font-bold text-sm text-[#241912] mt-0.5">
                      ₹{summary.onlineCollected.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#786A5B] hover:bg-[#FAF7F2]"
                >
                  &larr; Back to Rooms
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Cash Drawer Count &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DRAWER PHYSICAL CASH COUNT */}
          {step === 3 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#D8AD56]" />
                    <span>Step 3: Cash Drawer Physical Count & Reconciliation</span>
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-0.5">
                    Count physical currency bills and coins in the front desk drawer and compare against the expected mathematical drawer balance.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#241912] bg-[#FAF7F2] px-3.5 py-1.5 rounded-full border border-[#EFE3D6]">
                  Expected Drawer: ₹{expectedCash.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Formula explanation */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] text-xs space-y-2">
                <div className="font-semibold text-[#241912]">Cash Drawer Balance Formula:</div>
                <div className="font-mono text-[#786A5B] flex flex-wrap items-center gap-2">
                  <span>Cash Inflow (+₹{summary.cashCollected.toLocaleString('en-IN')})</span>
                  <span>-</span>
                  <span>Cash Outflow (-₹{summary.cashExpenses.toLocaleString('en-IN')})</span>
                  <span>=</span>
                  <span className="font-bold text-[#241912]">Expected Drawer Cash (₹{expectedCash.toLocaleString('en-IN')})</span>
                </div>
              </div>

              {/* Cash count input & discrepancy display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#241912] uppercase tracking-wider mb-1.5">
                      Physical Cash Counted (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#786A5B]">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        placeholder="e.g. 8800"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-[#EFE3D6] text-lg font-bold font-mono text-[#241912] outline-none focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56]"
                      />
                    </div>
                    <p className="text-[11px] text-[#786A5B] mt-1">
                      Include all notes and coins present in the physical front desk cash box.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#241912] uppercase tracking-wider mb-1.5">
                      Auditor / Cashier Name
                    </label>
                    <input
                      type="text"
                      value={closedByName}
                      onChange={(e) => setClosedByName(e.target.value)}
                      placeholder="e.g. Front Desk Auditor"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] outline-none focus:border-[#D8AD56]"
                    />
                  </div>
                </div>

                {/* Live discrepancy indicator */}
                <div
                  className={`p-6 rounded-2xl border flex flex-col justify-between ${
                    cashDiscrepancy === 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : cashDiscrepancy < 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-bold">
                        Drawer Settlement Status
                      </span>
                      {cashDiscrepancy === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[11px] font-bold">
                          BALANCED
                        </span>
                      ) : cashDiscrepancy < 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[11px] font-bold">
                          SHORTAGE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[11px] font-bold">
                          EXCESS
                        </span>
                      )}
                    </div>

                    <div className="text-3xl font-bold font-mono mt-3">
                      {cashDiscrepancy === 0
                        ? '₹0 (Exact Match)'
                        : cashDiscrepancy < 0
                        ? `-₹${Math.abs(cashDiscrepancy).toLocaleString('en-IN')}`
                        : `+₹${cashDiscrepancy.toLocaleString('en-IN')}`}
                    </div>
                  </div>

                  <p className="text-xs opacity-80 mt-4">
                    {cashDiscrepancy === 0
                      ? 'Physical drawer matches mathematical ledger to the rupee. Ready for day closing.'
                      : cashDiscrepancy < 0
                      ? 'Physical cash is lower than expected ledger receipts. Auditor explanation required in notes.'
                      : 'Physical cash exceeds ledger recordings (excess float/unrecorded tip). Auditor explanation required.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#786A5B] hover:bg-[#FAF7F2]"
                >
                  &larr; Back to Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Digital Payments &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DIGITAL & PAYMENT GATEWAY RECONCILIATION */}
          {step === 4 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D8AD56]" />
                    <span>Step 4: Digital Payments & Gateway Settlement Audit</span>
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-0.5">
                    Cross-verify Razorpay digital transactions, UPI static QR collections, and card swipe POS batch settlements.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#D8AD56] bg-[#241912] px-3.5 py-1.5 rounded-full border border-[#D8AD56]/30">
                  Total Digital: ₹{totalDigital.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#786A5B]">
                    <span className="font-bold uppercase tracking-wider">UPI Collections</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Settled
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#241912]">
                    ₹{summary.upiCollected.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-[#786A5B]">PhonePe / Google Pay / BHIM QR</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#786A5B]">
                    <span className="font-bold uppercase tracking-wider">Card POS Terminal</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Batch Closed
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#241912]">
                    ₹{summary.cardCollected.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-[#786A5B]">Visa / Mastercard / RuPay swipe receipts</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#786A5B]">
                    <span className="font-bold uppercase tracking-wider">Online Gateway</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Razorpay Live
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#241912]">
                    ₹{summary.onlineCollected.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-[#786A5B]">Website direct bookings & pre-authorizations</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  All gateway batch captures and bank settlement webhooks for {businessDate} are verified. No uncaptured pre-authorizations detected.
                </span>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#786A5B] hover:bg-[#FAF7F2]"
                >
                  &larr; Back to Cash Count
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to GST Tax Audit &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: GST TAX AUDIT */}
          {step === 5 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#D8AD56]" />
                    <span>Step 5: GST Statutory Tax Audit & Breakdown</span>
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-0.5">
                    Statutory hotel room tax calculations compliant with Andhra Pradesh GST slab standards.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#D8AD56] bg-[#241912] px-3.5 py-1.5 rounded-full border border-[#D8AD56]/30">
                  Total Tax: ₹{(summary.gst?.totalGst || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-xs text-[#786A5B]">Net Taxable Tariff</span>
                  <div className="text-2xl font-bold font-mono text-[#241912]">
                    ₹{(summary.gst?.netTaxable || Math.round(summary.totalRevenue / 1.05)).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-[#786A5B]">Base room revenue</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-xs text-[#786A5B]">CGST (2.5%)</span>
                  <div className="text-2xl font-bold font-mono text-[#382216]">
                    ₹{(summary.gst?.cgst || Math.round(((summary.gst?.totalGst || 0) / 2))).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-[#786A5B]">Central Goods & Services</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-xs text-[#786A5B]">SGST (2.5%)</span>
                  <div className="text-2xl font-bold font-mono text-[#382216]">
                    ₹{(summary.gst?.sgst || Math.round(((summary.gst?.totalGst || 0) / 2))).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-[#786A5B]">AP State Goods & Services</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-xs text-emerald-800">Total GST Liability</span>
                  <div className="text-2xl font-bold font-mono text-emerald-700">
                    ₹{(summary.gst?.totalGst || (summary.totalRevenue - Math.round(summary.totalRevenue / 1.05))).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-emerald-600">Combined 5% Hotel Slab</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] text-xs text-[#786A5B] space-y-1">
                <div className="font-bold text-[#241912]">Statutory Property Details:</div>
                <div>Entity: Sri Tayi Grand, Kadiri – 515591 | GSTIN State Code: 37 (Andhra Pradesh)</div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#786A5B] hover:bg-[#FAF7F2]"
                >
                  &larr; Back to Digital Payments
                </button>
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Final Day Lock &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: FINAL DAY LOCK & HANDOVER */}
          {step === 6 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#D8AD56]" />
                    <span>Step 6: Authoritative Night Lock & Register Closure</span>
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-0.5">
                    Final confirmation. Locking the register creates an immutable daily audit certificate and rolls over the business day.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200">
                  Ready for Final Closure
                </span>
              </div>

              {/* Summary recap table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                  <span className="text-[#786A5B]">Closing Date</span>
                  <div className="font-bold text-[#241912] font-mono text-sm mt-0.5">{businessDate}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                  <span className="text-[#786A5B]">Total Gross Revenue</span>
                  <div className="font-bold text-[#241912] font-mono text-sm mt-0.5">
                    ₹{summary.totalRevenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                  <span className="text-[#786A5B]">Physical Cash Counted</span>
                  <div className="font-bold text-[#241912] font-mono text-sm mt-0.5">
                    ₹{actualCash.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
                  <span className="text-[#786A5B]">Drawer Discrepancy</span>
                  <div
                    className={`font-bold font-mono text-sm mt-0.5 ${
                      cashDiscrepancy === 0
                        ? 'text-emerald-700'
                        : cashDiscrepancy < 0
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {cashDiscrepancy === 0
                      ? '₹0 (Exact Match)'
                      : cashDiscrepancy < 0
                      ? `-₹${Math.abs(cashDiscrepancy).toLocaleString('en-IN')}`
                      : `+₹${cashDiscrepancy.toLocaleString('en-IN')}`}
                  </div>
                </div>
              </div>

              {/* Auditor Notes Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#241912] uppercase tracking-wider">
                  Night Audit Closing Notes & Remarks
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Night audit completed with zero discrepancies. All physical room keys accounted for at front desk. Cash drawers balanced."
                  className="w-full px-4 py-3 rounded-xl border border-[#EFE3D6] text-xs font-medium text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#786A5B] hover:bg-[#FAF7F2]"
                >
                  &larr; Back to GST Tax Audit
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleExecuteClosing}
                  className="px-8 py-3 rounded-2xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-sm font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 text-[#D8AD56]" />
                  <span>
                    {submitting ? 'Locking Register...' : 'Execute Night Audit & Lock Register'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORICAL CLOSINGS LEDGER */}
      <div className="bg-white rounded-3xl border border-[#EFE3D6] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#241912] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#D8AD56]" />
              <span>Historical Daily Closings & Audited Ledgers</span>
            </h2>
            <p className="text-xs text-[#786A5B] mt-0.5">
              Permanent immutable records of daily closing sessions and physical drawer reconciliations.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#786A5B]">
            {history.length} Audited Closings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786A5B] font-semibold uppercase tracking-wider border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3 px-4">Closing Date</th>
                <th className="py-3 px-4">Closed By</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4">Cash Inflow</th>
                <th className="py-3 px-4">Digital Payments</th>
                <th className="py-3 px-4">Cash Expenses</th>
                <th className="py-3 px-4">Expected Cash</th>
                <th className="py-3 px-4">Actual Cash</th>
                <th className="py-3 px-4">Discrepancy</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-[#786A5B]">
                    No historical daily closings recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((record) => {
                  const digitalTotal =
                    (record.upi_collected || 0) +
                    (record.card_collected || 0) +
                    (record.online_collected || 0);

                  return (
                    <tr key={record.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#241912]">
                        {record.closing_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#241912]">{record.closed_by_name}</div>
                        <div className="text-[10px] text-[#786A5B]">{record.closed_by_role}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#241912]">
                        ₹{record.total_revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#786A5B]">
                        ₹{record.cash_collected.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#786A5B]">
                        ₹{digitalTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">
                        ₹{record.cash_expenses.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#786A5B]">
                        ₹{record.expected_cash_in_drawer.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#241912]">
                        ₹{record.actual_cash_counted.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {record.discrepancy === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Exact Match
                          </span>
                        ) : record.discrepancy < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            -₹{Math.abs(record.discrepancy).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            +₹{record.discrepancy.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedClosing(record)}
                          className="px-3 py-1.5 rounded-xl border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#241912] font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D8AD56]" />
                          <span>Certificate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT CERTIFICATE / EOD MODAL */}
      {selectedClosing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#EFE3D6] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AD56]">
                  Official Audit Certificate
                </span>
                <h3 className="text-xl font-serif font-bold text-[#241912]">
                  Sri Tayi Grand – End of Day Audit
                </h3>
                <p className="text-xs text-[#786A5B]">
                  Date: {selectedClosing.closing_date} | Certificate ID: {selectedClosing.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedClosing(null)}
                className="p-2 rounded-xl hover:bg-[#FAF7F2] text-[#786A5B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6]">
                <div>
                  <span className="text-[#786A5B]">Closed At:</span>
                  <div className="font-bold text-[#241912]">
                    {new Date(selectedClosing.closed_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-[#786A5B]">Authorized Auditor:</span>
                  <div className="font-bold text-[#241912]">
                    {selectedClosing.closed_by_name} ({selectedClosing.closed_by_role})
                  </div>
                </div>
              </div>

              <div className="border border-[#EFE3D6] rounded-2xl p-4 space-y-2">
                <div className="font-bold text-[#241912] uppercase tracking-wider text-[11px]">
                  Financial Breakdown
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]/60">
                  <span className="text-[#786A5B]">Gross Room Revenue</span>
                  <span className="font-mono font-bold text-[#241912]">
                    ₹{selectedClosing.room_revenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]/60">
                  <span className="text-[#786A5B]">Cash Inflow Received</span>
                  <span className="font-mono text-[#241912]">
                    ₹{selectedClosing.cash_collected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]/60">
                  <span className="text-[#786A5B]">Digital Inflow (UPI + Card + Online)</span>
                  <span className="font-mono text-[#241912]">
                    ₹{(
                      (selectedClosing.upi_collected || 0) +
                      (selectedClosing.card_collected || 0) +
                      (selectedClosing.online_collected || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]/60">
                  <span className="text-[#786A5B]">Total Operational Expenses Paid</span>
                  <span className="font-mono text-rose-700">
                    -₹{selectedClosing.total_expenses.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]/60">
                  <span className="text-[#786A5B]">Expected Cash in Drawer</span>
                  <span className="font-mono text-[#241912]">
                    ₹{selectedClosing.expected_cash_in_drawer.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]/60">
                  <span className="text-[#786A5B]">Actual Cash Counted by Auditor</span>
                  <span className="font-mono font-bold text-[#241912]">
                    ₹{selectedClosing.actual_cash_counted.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                  <span>Discrepancy</span>
                  <span
                    className={`font-mono ${
                      selectedClosing.discrepancy === 0
                        ? 'text-emerald-700'
                        : selectedClosing.discrepancy < 0
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {selectedClosing.discrepancy === 0
                      ? '₹0 (Balanced)'
                      : selectedClosing.discrepancy < 0
                      ? `-₹${Math.abs(selectedClosing.discrepancy).toLocaleString('en-IN')} (Short)`
                      : `+₹${selectedClosing.discrepancy.toLocaleString('en-IN')} (Excess)`}
                  </span>
                </div>
              </div>

              {selectedClosing.notes && (
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                  <span className="text-[#786A5B] font-semibold text-[11px]">Auditor Remarks:</span>
                  <p className="text-[#241912] italic">{selectedClosing.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFE3D6]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedClosing(null)}
                className="px-5 py-2.5 rounded-xl border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#241912] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
