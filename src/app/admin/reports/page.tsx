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
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';

export default function ReportsAdminPage() {
  const { t, formatCurrency, formatDate, isTelugu } = useAdminLanguage();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Daily Closing inputs
  const [actualCash, setActualCash] = useState<number>(0);
  const [auditNotes, setAuditNotes] = useState(
    isTelugu
      ? 'రోజువారీ రిజిస్టర్ తనిఖీ చేయబడింది మరియు లెడ్జర్ సరిచూడబడింది.'
      : 'Daily night register balanced and audited.'
  );
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

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = isTelugu
      ? 'బుకింగ్ రిఫరెన్స్,అతిథి పేరు,ఫోన్ నంబర్,గది రకం,చెక్-ఇన్ తేదీ,చెక్-అవుట్ తేదీ,మొత్తం,స్థితి\n'
      : 'Booking Reference,Guest Name,Phone,Category,Check In,Check Out,Total,Status\n';

    const rows = bookings
      .map(
        (b) =>
          `"${b.booking_reference}","${b.guest_name}","${b.guest_phone}","${b.category_name}","${b.check_in_date}","${b.check_out_date}",${b.total_amount},"${b.status}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
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
              {isTelugu ? 'ఆర్థిక & విశ్లేషణ' : 'FINANCE & ANALYTICS'}
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected
                ? (isTelugu ? 'ప్రత్యక్ష సింక్రనైజేషన్ సక్రియం' : 'Real-Time Sync Active')
                : `${t('common.reconnecting', 'Sync')}: ${status}`}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D8AD56]" />
            <span>{t('reports.title', 'Financial Reports & Night Audit')}</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            {t(
              'reports.subtitle',
              'Revenue breakdowns, occupancy statistics, cash ledger reconciliation, and shift closings.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportsData}
            className="p-2.5 rounded-xl border border-[#E6D9C5] bg-white text-[#786A5B] hover:text-[#33271D] hover:bg-[#FAF7F2] shadow-xs cursor-pointer"
            title={t('common.refresh', 'Refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('common.exportCsv', 'Export Bookings CSV')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
            {isTelugu ? 'మొత్తం బుకింగ్స్ ఆదాయం' : 'Cumulative Revenue'}
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-2">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">
            {totalBookings} {isTelugu ? 'నమోదైన రిజర్వేషన్లు' : 'reservations recorded'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
            {t('payments.totalCollection', 'Total Collections')}
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1565C0] mt-2">
            {formatCurrency(collected)}
          </div>
          <div className="text-xs text-[#786B61] mt-1">
            {isTelugu ? 'ఆన్‌లైన్ & రిసెప్షన్ ద్వారా జమ చేయబడింది' : 'Settled online & reception'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
            {t('dashboard.occupancyRate', 'Occupancy Benchmark')}
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#382216] mt-2">
            {occupancy}%
          </div>
          <div className="text-xs text-[#786B61] mt-1">
            {isTelugu ? `${rooms.length} గదుల ఆధారంగా` : `Based on ${rooms.length} physical rooms`}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
            {isTelugu ? 'నైట్ ఆడిట్ స్థితి' : 'Night Audit Status'}
          </span>
          <div className="font-serif text-xl sm:text-2xl font-bold text-[#D8AD56] mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span>
              {closingSummary?.isAlreadyClosed
                ? (isTelugu ? 'ఈ రోజు ముగిసింది' : 'Day Closed')
                : (isTelugu ? 'ఆడిట్ సిద్ధంగా ఉంది' : 'Audit Ready')}
            </span>
          </div>
          <div className="text-xs text-[#786B61] mt-1">
            {isTelugu ? 'నగదు మరియు లెడ్జర్ సరిచూడబడింది' : 'Drawer & Ledger Balanced'}
          </div>
        </div>
      </div>

      {/* NIGHT AUDIT & DAILY CLOSING WORKSTATION */}
      <div className="bg-gradient-to-br from-[#25150F] via-[#382216] to-[#241912] rounded-3xl border border-[#D8AD56]/50 p-6 sm:p-8 text-white shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#D8AD56] bg-[#D8AD56]/15 px-2.5 py-0.5 rounded-full border border-[#D8AD56]/30">
                {isTelugu ? 'రోజువారీ రిజిస్టర్ ముగింపు & నైట్ ఆడిట్' : 'DAILY REGISTER CLOSING & NIGHT AUDIT'}
              </span>
              <span className="text-xs text-[#EFE3D6]/70">
                {isTelugu ? 'తేదీ' : 'Date'}: {closingSummary?.closingDate || new Date().toISOString().split('T')[0]}
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#D8AD56]" />
              <span>{isTelugu ? 'షిఫ్ట్ ముగింపు & నగదు సరిచూడటం' : 'Shift Reconcile & Cash Drawer Verification'}</span>
            </h2>
            <p className="text-xs text-[#EFE3D6]/80 mt-0.5">
              {isTelugu
                ? 'గదుల వసూళ్లు, నగదు రసీదులు, ఖర్చులు మరియు భౌతిక కౌంటర్ లెక్కింపుల మధ్య అధికారిక లెడ్జర్ సరిపోలిక.'
                : 'Authoritative ledger balance check between room collections, cash receipts, payouts, and physical count.'}
            </p>
          </div>

          {closingSummary?.isAlreadyClosed && (
            <div className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-300 border border-green-500/40 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>{isTelugu ? 'ఈ రోజు షిఫ్ట్ ముగిసింది' : "Today's Shift is Closed"}</span>
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
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">
              {isTelugu ? 'నేటి నగదు రసీదులు' : "Today's Cash Receipts"}
            </span>
            <div className="font-serif text-2xl font-bold mt-1 text-white">
              {formatCurrency(closingSummary?.cashCollected || 0)}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/60">
              {isTelugu ? 'కౌంటర్ వద్ద నగదు స్వీకరించబడింది' : 'Physical currency taken at desk'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">
              {isTelugu ? 'నేటి నగదు ఖర్చులు' : "Today's Cash Expenses"}
            </span>
            <div className="font-serif text-2xl font-bold mt-1 text-red-300">
              {formatCurrency(closingSummary?.cashExpenses || 0)}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/60">
              {isTelugu ? 'క్యాష్ డ్రాయర్ నుండి చెల్లించబడింది' : 'Disbursed from cash drawer'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">
              {isTelugu ? 'డిజిటల్ & UPI వసూళ్లు' : 'Digital Collections'}
            </span>
            <div className="font-serif text-2xl font-bold mt-1 text-blue-300">
              {formatCurrency(
                (closingSummary?.upiCollected || 0) +
                  (closingSummary?.cardCollected || 0) +
                  (closingSummary?.onlineCollected || 0)
              )}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/60">Razorpay / POS / UPI</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#D8AD56]/15 border border-[#D8AD56]/40">
            <span className="text-[10px] uppercase font-bold text-[#D8AD56]">
              {isTelugu ? 'డ్రాయర్‌లో ఉండాల్సిన నగదు' : 'Expected Cash in Drawer'}
            </span>
            <div className="font-serif text-2xl font-bold mt-1 text-[#D8AD56]">
              {formatCurrency(expectedDrawerCash)}
            </div>
            <span className="text-[10px] text-[#EFE3D6]/80">
              {isTelugu ? 'నగదు రసీదులు - ఖర్చులు' : 'Cash Receipts - Cash Expenses'}
            </span>
          </div>
        </div>

        {/* Night Audit Form */}
        <form onSubmit={handlePerformDailyClosing} className="bg-white/10 rounded-2xl p-5 border border-white/15 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[11px] uppercase font-bold text-[#D8AD56] mb-1.5">
                {isTelugu ? 'డ్రాయర్‌లో లెక్కించిన వాస్తవ నగదు (₹) *' : 'Physical Cash Counted in Drawer (₹) *'}
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
                {isTelugu ? 'లెక్కించిన వ్యత్యాసం / తేడా' : 'Calculated Variance / Discrepancy'}
              </label>
              <div
                className={`p-3 rounded-xl font-bold text-sm flex items-center justify-between border ${
                  cashDiscrepancy === 0
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                    : 'bg-red-950/60 text-red-300 border-red-500/50'
                }`}
              >
                <span>
                  {cashDiscrepancy === 0
                    ? (isTelugu ? 'సరిగ్గా సరిపోయింది (₹0)' : 'Exact Match (₹0)')
                    : `${isTelugu ? 'తేడా' : 'Discrepancy'}: ${formatCurrency(cashDiscrepancy)}`}
                </span>
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
                className="w-full py-3.5 px-4 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isSubmittingClosing
                    ? (isTelugu ? 'ఆడిట్ పూర్తి చేసి మూసివేస్తోంది...' : 'Auditing & Closing...')
                    : (isTelugu ? 'నైట్ ఆడిట్ పూర్తి చేసి రోజును ముగించండి' : 'Execute Night Audit & Close Day')}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-[#EFE3D6]/70 mb-1">
              {isTelugu ? 'ఆడిట్ గమనికలు & వివరణ' : 'Audit Notes & Shift Discrepancy Explanation'}
            </label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder={isTelugu ? 'ఉదాహరణ: పెట్టీ క్యాష్ సరిచూడబడింది, మార్నింగ్ హ్యాండోవర్ పూర్తయింది.' : 'e.g. Petty cash balanced, morning handover verified.'}
              className="w-full text-xs p-2.5 rounded-lg bg-white/90 text-[#241912] border border-transparent focus:border-[#D8AD56]"
            />
          </div>
        </form>

        {/* Audit History Table */}
        <div className="pt-2">
          <h3 className="font-serif text-sm font-bold text-[#D8AD56] uppercase tracking-wider mb-2">
            {isTelugu ? 'చారిత్రక నైట్ ఆడిట్ రికార్డులు' : 'Historical Night Audit Records'}
          </h3>
          <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[#EFE3D6]/70 text-[10px] uppercase border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">{isTelugu ? 'ముగింపు తేదీ' : 'Closing Date'}</th>
                  <th className="py-2.5 px-4 font-semibold">{t('dashboard.totalRevenue', 'Total Revenue')}</th>
                  <th className="py-2.5 px-4 font-semibold">{isTelugu ? 'లెక్కించిన నగదు' : 'Cash Counted'}</th>
                  <th className="py-2.5 px-4 font-semibold">{isTelugu ? 'తేడా' : 'Discrepancy'}</th>
                  <th className="py-2.5 px-4 font-semibold">{isTelugu ? 'ఆడిట్ చేసిన వారు' : 'Audited By'}</th>
                  <th className="py-2.5 px-4 font-semibold">{t('common.status', 'Status')}</th>
                  <th className="py-2.5 px-4 font-semibold">{t('common.time', 'Timestamp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#EFE3D6]">
                {closings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#EFE3D6]/50">
                      {t('common.noRecordsFound', 'No past closing records found.')}
                    </td>
                  </tr>
                ) : (
                  closings.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#D8AD56]">{c.closing_date}</td>
                      <td className="py-2.5 px-4 font-bold">{formatCurrency(c.total_revenue)}</td>
                      <td className="py-2.5 px-4">{formatCurrency(c.actual_cash_counted)}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-semibold ${
                            c.discrepancy === 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(c.discrepancy)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#EFE3D6]/80">{c.closed_by_name}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {isTelugu ? 'ముగిసింది' : 'Closed'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-[#EFE3D6]/60">
                        {formatDate(c.created_at)}
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
