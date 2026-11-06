'use client';

import { useState, useEffect, useCallback } from 'react';
import { Booking, PhysicalRoom, PaymentRecord, DailyClosing, Expense } from '@/types';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';

export default function ReportsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Daily Closing inputs
  const [actualCash, setActualCash] = useState<number>(0);
  const [auditNotes, setAuditNotes] = useState('Daily night register balanced and audited.');
  const [closingSuccessMsg, setClosingSuccessMsg] = useState<string | null>(null);
  const [closingErrorMsg, setClosingErrorMsg] = useState<string | null>(null);
  const [isSubmittingClosing, setIsSubmittingClosing] = useState(false);

  const fetchReportsData = useCallback(async () => {
    try {
      const state = await adminOperations.fetchFullState();
      if (state.success) {
        setBookings(state.bookings || []);
        setRooms(state.rooms || []);
        setPayments(state.payments || []);
        setExpenses(state.expenses || []);
        setClosings(state.dailyClosings || []);
      }

      // Fetch today's closing summary
      const closeRes = await fetch('/api/admin/daily-closing');
      if (closeRes.ok) {
        const closeData = await closeRes.json();
        setClosingSummary(closeData.summary);
        if (closeData.summary) {
          setActualCash(closeData.summary.expectedCashInDrawer || 0);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Real-time synchronization
  const { isConnected, status } = useRealtimeSync({
    onRefresh: fetchReportsData,
  });

  const totalBookings = bookings.length;
  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.total_amount, 0);
  const collected = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);
  const occupancy =
    rooms.length > 0
      ? Math.round((rooms.filter((r) => r.operational_status === 'occupied').length / rooms.length) * 100)
      : 0;

  // Execute Night Audit
  const handlePerformDailyClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingClosing(true);
    setClosingSuccessMsg(null);
    setClosingErrorMsg(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/admin/daily-closing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Accounts',
        },
        body: JSON.stringify({
          closingDate: todayStr,
          actualCashCounted: Number(actualCash),
          notes: auditNotes,
          closedByName: 'Accounts Auditor',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Night audit closing failed');

      setClosingSuccessMsg(data.message);
      await fetchReportsData();
    } catch (err: any) {
      setClosingErrorMsg(err.message || 'Error executing daily closing');
    } finally {
      setIsSubmittingClosing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'Booking Reference,Guest Name,Phone,Category,Check In,Check Out,Total,Status\n';
    const rows = bookings
      .map(
        (b) =>
          `"${b.booking_reference}","${b.guest_name}","${b.guest_phone}","${b.category_name}","${b.check_in_date}","${b.check_out_date}",${b.total_amount},"${b.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sri_tayi_grand_bookings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const expectedDrawerCash = closingSummary?.expectedCashInDrawer || 0;
  const cashDiscrepancy = actualCash - expectedDrawerCash;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              FINANCE & ANALYTICS
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected ? 'Real-Time Sync Active' : `Sync: ${status}`}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D8AD56]" />
            <span>Reports, Analytics & Daily Closing</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Operational KPIs, occupancy rates, daily cash drawer reconciliation, and official Night Audit closing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportsData}
            className="p-2.5 rounded-xl bg-white border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#786B61] text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Bookings CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Cumulative Revenue</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-2">
            ₹ {totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">{totalBookings} reservations recorded</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Total Collections</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1565C0] mt-2">
            ₹ {collected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#786B61] mt-1">Settled online & reception</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Occupancy Benchmark</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#382216] mt-2">
            {occupancy}%
          </div>
          <div className="text-xs text-[#786B61] mt-1">Based on 18 physical rooms</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Night Audit Status</span>
          <div className="font-serif text-xl sm:text-2xl font-bold text-[#D8AD56] mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span>{closingSummary?.isAlreadyClosed ? 'Day Closed' : 'Audit Ready'}</span>
          </div>
          <div className="text-xs text-[#786B61] mt-1">Drawer & Ledger Balanced</div>
        </div>
      </div>

      {/* NIGHT AUDIT & DAILY CLOSING WORKSTATION */}
      <div className="bg-gradient-to-br from-[#25150F] via-[#382216] to-[#241912] rounded-3xl border border-[#D8AD56]/50 p-6 sm:p-8 text-white shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#D8AD56] bg-[#D8AD56]/15 px-2.5 py-0.5 rounded-full border border-[#D8AD56]/30">
                DAILY REGISTER CLOSING &amp; NIGHT AUDIT
              </span>
              <span className="text-xs text-[#EFE3D6]/70">
                Date: {closingSummary?.closingDate || new Date().toISOString().split('T')[0]}
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#D8AD56]" />
              <span>Shift Reconcile &amp; Cash Drawer Verification</span>
            </h2>
            <p className="text-xs text-[#EFE3D6]/80 mt-0.5">
              Authoritative ledger balance check between room collections, cash receipts, payouts, and physical count.
            </p>
          </div>

          {closingSummary?.isAlreadyClosed && (
            <div className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-300 border border-green-500/40 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>Today&apos;s Shift is Closed</span>
            </div>
          )}
        </div>

        {/* Live Closing Alerts */}
        {closingSuccessMsg && (
          <div className="p-4 rounded-xl bg-green-900/40 border border-green-500/50 text-green-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>{closingSuccessMsg}</span>
          </div>
        )}

        {closingErrorMsg && (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{closingErrorMsg}</span>
          </div>
        )}

        {/* Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">Today&apos;s Cash Receipts</span>
            <div className="font-serif text-2xl font-bold mt-1 text-white">
              ₹ {(closingSummary?.cashCollected || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/60">Physical currency taken at desk</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">Today&apos;s Cash Expenses</span>
            <div className="font-serif text-2xl font-bold mt-1 text-red-300">
              ₹ {(closingSummary?.cashExpenses || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/60">Disbursed from cash drawer</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">Digital Collections</span>
            <div className="font-serif text-2xl font-bold mt-1 text-blue-300">
              ₹ {((closingSummary?.upiCollected || 0) + (closingSummary?.cardCollected || 0) + (closingSummary?.onlineCollected || 0)).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/60">Razorpay / POS / UPI</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#D8AD56]/15 border border-[#D8AD56]/40">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">Expected Cash in Drawer</span>
            <div className="font-serif text-2xl font-bold mt-1 text-[#D8AD56]">
              ₹ {expectedDrawerCash.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/80">Cash Receipts - Cash Expenses</span>
          </div>
        </div>

        {/* Night Audit Form */}
        <form onSubmit={handlePerformDailyClosing} className="bg-white/10 rounded-2xl p-5 border border-white/15 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[11px] uppercase font-bold text-[#D8AD56] mb-1.5">
                Physical Cash Counted in Drawer (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={actualCash}
                onChange={(e) => setActualCash(Number(e.target.value))}
                className="w-full text-sm font-bold p-3 rounded-xl bg-white text-[#241912] border border-[#D8AD56] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-[#D8AD56] mb-1.5">
                Calculated Variance / Discrepancy
              </label>
              <div
                className={`p-3 rounded-xl font-bold text-sm flex items-center justify-between border ${
                  cashDiscrepancy === 0
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                    : 'bg-red-950/60 text-red-300 border-red-500/50'
                }`}
              >
                <span>{cashDiscrepancy === 0 ? 'Exact Match (₹0)' : `Discrepancy: ₹${cashDiscrepancy}`}</span>
                {cashDiscrepancy === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmittingClosing}
                className="w-full py-3.5 px-4 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmittingClosing ? 'Auditing & Closing...' : 'Execute Night Audit & Close Day'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-[#EFE3D6]/70 mb-1">
              Audit Notes &amp; Shift Discrepancy Explanation
            </label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="e.g. Petty cash balanced, morning handover verified."
              className="w-full text-xs p-2.5 rounded-lg bg-white/90 text-[#241912] border border-transparent focus:border-[#D8AD56]"
            />
          </div>
        </form>

        {/* Audit History Table */}
        <div className="pt-2">
          <h3 className="font-serif text-sm font-bold text-[#D8AD56] uppercase tracking-wider mb-2">
            Historical Night Audit Records
          </h3>
          <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[#EFE3D6]/70 text-[10px] uppercase border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Closing Date</th>
                  <th className="py-2.5 px-4 font-semibold">Total Revenue</th>
                  <th className="py-2.5 px-4 font-semibold">Cash Counted</th>
                  <th className="py-2.5 px-4 font-semibold">Discrepancy</th>
                  <th className="py-2.5 px-4 font-semibold">Audited By</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#EFE3D6]">
                {closings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#EFE3D6]/50">
                      No past closing records found.
                    </td>
                  </tr>
                ) : (
                  closings.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#D8AD56]">{c.closing_date}</td>
                      <td className="py-2.5 px-4 font-bold">₹ {c.total_revenue.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4">₹ {c.actual_cash_counted.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-semibold ${
                            c.discrepancy === 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {c.discrepancy === 0 ? '₹0 (Balanced)' : `₹${c.discrepancy}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#EFE3D6]/80">{c.closed_by_name} ({c.closed_by_role})</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-green-500/20 text-green-300 border border-green-500/40">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-[#EFE3D6]/60">
                        {new Date(c.closed_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
