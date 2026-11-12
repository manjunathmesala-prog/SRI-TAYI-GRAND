'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CashShift, CashTransaction, CashTransactionCategory } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { authStorage } from '@/lib/auth-storage';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Receipt,
  X,
  Printer,
  Sparkles,
  Download,
  Calculator,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

interface DenominationCounts {
  c500: number;
  c200: number;
  c100: number;
  c50: number;
  c20: number;
  c10: number;
  coins: number;
}

export default function AdminCashbookPage() {
  const { t, formatCurrency, isTelugu } = useAdminLanguage();
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [totalCashIn, setTotalCashIn] = useState<number>(0);
  const [totalCashOut, setTotalCashOut] = useState<number>(0);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [selectedShiftForPrint, setSelectedShiftForPrint] = useState<CashShift | null>(null);

  // Denomination toggles & state
  const [showOpenDenominations, setShowOpenDenominations] = useState(false);
  const [openDenominations, setOpenDenominations] = useState<DenominationCounts>({
    c500: 6,
    c200: 5,
    c100: 8,
    c50: 4,
    c20: 0,
    c10: 0,
    coins: 0,
  });

  const [showCloseDenominations, setShowCloseDenominations] = useState(false);
  const [closeDenominations, setCloseDenominations] = useState<DenominationCounts>({
    c500: 0,
    c200: 0,
    c100: 0,
    c50: 0,
    c20: 0,
    c10: 0,
    coins: 0,
  });

  // Form states
  const [newOpeningFloat, setNewOpeningFloat] = useState<number>(5000);
  const [openShiftNotes, setOpenShiftNotes] = useState('');
  const [closingCashCounted, setClosingCashCounted] = useState<number>(0);
  const [closeShiftNotes, setCloseShiftNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Transaction form states
  const [txType, setTxType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [txCategory, setTxCategory] = useState<CashTransactionCategory>('guest_payment');
  const [txAmount, setTxAmount] = useState<number>(1000);
  const [txReason, setTxReason] = useState('');
  const [txBookingRef, setTxBookingRef] = useState('');
  const [txReceiptRef, setTxReceiptRef] = useState('');

  // Helper to build headers with active auth token
  const getAuthHeaders = useCallback((extra: Record<string, string> = {}) => {
    const token = authStorage.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }, []);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Compute total from denomination breakdown
  const calcDenomTotal = (d: DenominationCounts) => {
    return (
      (d.c500 || 0) * 500 +
      (d.c200 || 0) * 200 +
      (d.c100 || 0) * 100 +
      (d.c50 || 0) * 50 +
      (d.c20 || 0) * 20 +
      (d.c10 || 0) * 10 +
      (d.coins || 0)
    );
  };

  const fetchCashbook = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cashbook', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.activeShift);
        setBalance(data.balance || 0);
        setOpeningFloat(data.openingFloat || 0);
        setTotalCashIn(data.totalCashIn || 0);
        setTotalCashOut(data.totalCashOut || 0);
        setShifts(data.shifts || []);
        setTransactions(data.transactions || []);
      } else {
        showNotification('error', 'Failed to synchronize front desk cashbook.');
      }
    } catch {
      showNotification('error', 'Network error connecting to cash drawer API.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showNotification]);

  // Reactive wakeup on realtime cash events
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'cash_shift_opened' ||
        event.eventType === 'cash_shift_closed' ||
        event.eventType === 'cash_transaction_created' ||
        event.eventType === 'expense_created'
      ) {
        fetchCashbook();
      }
    },
  });

  useEffect(() => {
    fetchCashbook();
  }, [fetchCashbook]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const staffName = authStorage.getUserName() || 'Front Desk Staff';
      const res = await fetch('/api/admin/cashbook', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'open_shift',
          openingFloat: newOpeningFloat,
          notes: openShiftNotes,
          performedBy: staffName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        setIsOpenShiftModalOpen(false);
        setOpenShiftNotes('');
        fetchCashbook();
      } else {
        showNotification('error', data.error || 'Failed to open shift.');
      }
    } catch {
      showNotification('error', 'Network error opening cash shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      setSubmitting(true);
      const staffName = authStorage.getUserName() || 'Front Desk Staff';
      const res = await fetch('/api/admin/cashbook', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'close_shift',
          shiftId: activeShift.id,
          closingCashCounted,
          notes: closeShiftNotes,
          performedBy: staffName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        setIsCloseShiftModalOpen(false);
        setCloseShiftNotes('');
        setSelectedShiftForPrint(data.shift || activeShift);
        fetchCashbook();
      } else {
        showNotification('error', data.error || 'Failed to close shift.');
      }
    } catch {
      showNotification('error', 'Network error closing shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txReason.trim()) {
      showNotification('error', 'Please specify a description / reason.');
      return;
    }
    try {
      setSubmitting(true);
      const staffName = authStorage.getUserName() || 'Front Desk Staff';
      const res = await fetch('/api/admin/cashbook', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'record_transaction',
          type: txType,
          category: txCategory,
          amount: txAmount,
          reason: txReason.trim(),
          bookingReference: txBookingRef.trim() || undefined,
          receiptRef: txReceiptRef.trim() || undefined,
          performedBy: staffName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        setIsAddTxModalOpen(false);
        setTxReason('');
        setTxBookingRef('');
        setTxReceiptRef('');
        fetchCashbook();
      } else {
        showNotification('error', data.error || 'Failed to record transaction.');
      }
    } catch {
      showNotification('error', 'Network error recording transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (shiftId: string, shiftNumber: string) => {
    if (!window.confirm(`Permanently delete shift #${shiftNumber} and its linked transactions?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/cashbook?shiftId=${encodeURIComponent(shiftId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || `Shift #${shiftNumber} deleted.`);
        fetchCashbook();
      } else {
        showNotification('error', data.error || 'Failed to delete shift.');
      }
    } catch {
      showNotification('error', 'Network error deleting shift.');
    }
  };

  const handleDeleteTransaction = async (txId: string, reason: string) => {
    if (!window.confirm(`Permanently remove transaction "${reason}" from the cash register?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/cashbook?txId=${encodeURIComponent(txId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Transaction removed.');
        fetchCashbook();
      } else {
        showNotification('error', data.error || 'Failed to delete transaction.');
      }
    } catch {
      showNotification('error', 'Network error deleting transaction.');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.performed_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.booking_reference && t.booking_reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.receipt_ref && t.receipt_ref.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, typeFilter, categoryFilter]);

  // Export transactions ledger as CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Time', 'Type', 'Category', 'Description / Reason', 'Reference', 'Staff', 'Amount (INR)'];
    const rows = filteredTransactions.map((tx) => [
      `"${new Date(tx.performed_at).toLocaleString('en-IN')}"`,
      `"${tx.type.toUpperCase()}"`,
      `"${tx.category.replace(/_/g, ' ')}"`,
      `"${tx.reason.replace(/"/g, '""')}"`,
      `"${tx.booking_reference || tx.receipt_ref || '-'}"`,
      `"${tx.performed_by}"`,
      tx.type === 'cash_in' ? tx.amount : -tx.amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SriTayiGrand_Cashbook_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {feedback && (
        <div
          role="alert"
          aria-live="assertive"
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg text-xs sm:text-sm transition-all animate-fadeIn ${
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
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8AD56] bg-[#D8AD56]/10 px-2.5 py-0.5 rounded-full border border-[#D8AD56]/20">
              {isTelugu ? 'క్యాష్ డ్రాయర్ ఆపరేషన్స్' : 'Cash Drawer Operations'}
            </span>
            <span className="text-xs text-[#786B61]">
              {isTelugu ? 'ఫ్రంట్ డెస్క్ ఆర్థిక నిధులు' : 'Front Desk Financial Float'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#241912] mt-1 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-[#D8AD56]" />
            <span>{isTelugu ? 'క్యాష్‌బుక్ & డ్రాయర్ షిఫ్ట్‌లు' : 'Cashbook & Drawer Shifts'}</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            {isTelugu
              ? 'రిసెప్షన్ నగదు బ్యాలెన్స్, షిఫ్ట్ అప్పగింతలు, మరియు చిన్న ఖర్చుల ప్రత్యక్ష ఆడిట్.'
              : 'Real-time reception drawer reconciliation, shift handovers, float balances, and petty cash disbursements.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchCashbook}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-xs font-semibold text-[#241912] flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D8AD56] ${loading ? 'animate-spin' : ''}`} />
            <span>{isTelugu ? 'రీఫ్రెష్' : 'Refresh'}</span>
          </button>

          {activeShift ? (
            <>
              <button
                onClick={() => setIsAddTxModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] active:bg-[#20000E] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isTelugu ? '+ నగదు నమోదు' : '+ Record Cash Flow'}</span>
              </button>
              <button
                onClick={() => {
                  setClosingCashCounted(balance);
                  setIsCloseShiftModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#241912] hover:bg-[#382216] active:bg-[#150B05] text-[#D8AD56] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isTelugu ? 'షిఫ్ట్ ముగించండి' : 'Close Shift'}</span>
              </button>
              <button
                onClick={() => setSelectedShiftForPrint(activeShift)}
                className="px-3.5 py-2 rounded-xl border border-[#D8AD56]/40 bg-[#F8F3E9] hover:bg-[#EFE3D6] text-[#43001F] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Print Shift Handover Summary"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isTelugu ? 'రసీదు ముద్రణ' : 'Print Slip'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] active:bg-[#20000E] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-[#D8AD56]" />
              <span>{isTelugu ? 'కొత్త క్యాష్ షిఫ్ట్ ప్రారంభించండి' : 'Open New Cash Shift'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Drawer Current Cash Balance */}
        <div className="bg-gradient-to-br from-[#241912] via-[#382216] to-[#1E110A] text-white rounded-2xl p-5 border border-[#D8AD56]/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#EFE3D6]/80 font-medium">
            <span>{isTelugu ? 'కౌంటర్ వద్ద నగదు' : 'Physical Drawer Cash'}</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeShift ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
          </div>
          <div className="text-3xl font-serif font-black text-[#D8AD56] tracking-tight mt-2">
            ₹{balance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#EFE3D6]/70 mt-1 flex items-center justify-between">
            <span>{isTelugu ? 'స్థితి:' : 'Status:'}</span>
            <span className={`font-semibold ${activeShift ? 'text-emerald-400' : 'text-stone-400'}`}>
              {activeShift
                ? isTelugu
                  ? `షిఫ్ట్ #${activeShift.shift_number} చురుకుగా ఉంది`
                  : `Shift #${activeShift.shift_number} Active`
                : isTelugu
                ? 'షిఫ్ట్ మూసివేయబడింది'
                : 'Shift Closed'}
            </span>
          </div>
        </div>

        {/* Opening Float */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFE3D6] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#786B61] font-semibold">
            <span>{isTelugu ? 'ప్రారంభ ఫ్లోట్' : 'Opening Float'}</span>
            <Clock className="w-4 h-4 text-[#D8AD56]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#241912]">
            ₹{openingFloat.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#786B61]">
            {isTelugu ? 'షిఫ్ట్ ప్రారంభంలో అప్పగించిన నగదు' : 'Handed over at shift opening'}
          </p>
        </div>

        {/* Total Cash In */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFE3D6] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>{isTelugu ? 'మొత్తం నగదు జమ' : 'Total Cash In'}</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-600">
            +₹{totalCashIn.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#786B61]">
            {isTelugu ? 'వాక్-ఇన్‌లు, అడ్వాన్సులు & రసీదులు' : 'Walk-ins, advances & change receipts'}
          </p>
        </div>

        {/* Total Cash Out */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFE3D6] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>{isTelugu ? 'మొత్తం నగదు ఖర్చు' : 'Total Cash Out'}</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-rose-600">
            -₹{totalCashOut.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#786B61]">
            {isTelugu ? 'చిల్లర ఖర్చులు, వెండర్ చెల్లింపులు' : 'Petty cash, vendor payouts & expenses'}
          </p>
        </div>
      </div>

      {/* Active Shift Details Banner */}
      {activeShift && (
        <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D8AD56]/20 text-[#241912] flex items-center justify-center font-bold">
              <User className="w-4 h-4 text-[#D8AD56]" />
            </div>
            <div>
              <div className="font-bold text-[#241912]">
                {isTelugu ? 'క్యాషియర్:' : 'Cashier:'} {activeShift.cashier_name} &bull; {activeShift.shift_number}
              </div>
              <div className="text-[11px] text-[#786B61]">
                {isTelugu ? 'ప్రారంభ సమయం:' : 'Opened at:'}{' '}
                {new Date(activeShift.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                {new Date(activeShift.opened_at).toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>
          {activeShift.notes && (
            <div className="text-[11px] text-[#786B61] italic max-w-md bg-white px-3 py-1.5 rounded-lg border border-[#EFE3D6]">
              &ldquo;{activeShift.notes}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Transactions Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE3D6] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D8AD56]" />
            <span>{isTelugu ? 'షిఫ్ట్ నగదు లావాదేవీల రికార్డు' : 'Shift Cash Transactions Ledger'}</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isTelugu ? 'లావాదేవీలను వెతకండి...' : 'Search transactions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56] min-w-[200px]"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center rounded-xl border border-[#EFE3D6] p-0.5 bg-gray-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'all' ? 'bg-[#241912] text-[#D8AD56]' : 'text-gray-600 hover:text-[#241912]'
                }`}
              >
                {isTelugu ? 'అన్నీ' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('cash_in')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'cash_in' ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                {isTelugu ? 'జమ' : 'Cash In'}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('cash_out')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  typeFilter === 'cash_out' ? 'bg-rose-700 text-white' : 'text-gray-600 hover:text-rose-700'
                }`}
              >
                {isTelugu ? 'ఖర్చు' : 'Cash Out'}
              </button>
            </div>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="px-3 py-1.5 rounded-xl border border-[#EFE3D6] bg-white hover:bg-stone-50 text-xs font-semibold text-[#241912] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="Export Ledger to CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#D8AD56]" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EFE3D6] text-[#786B61] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">{isTelugu ? 'సమయం' : 'Time'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'రకం' : 'Type'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'వర్గం' : 'Category'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'వివరణ / కారణం' : 'Description / Reason'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'రిఫరెన్స్' : 'Ref'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'సిబ్బంది' : 'Staff'}</th>
                <th className="py-2.5 px-3 text-right">{isTelugu ? 'మొత్తం' : 'Amount'}</th>
                <th className="py-2.5 px-3 text-right">{isTelugu ? 'చర్య' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    {isTelugu ? 'లావాదేవీలు ఏవీ లేవు.' : 'No cash transactions recorded for this criteria.'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {new Date(tx.performed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tx.type === 'cash_in'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {tx.type === 'cash_in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        <span>{tx.type === 'cash_in' ? 'Cash In' : 'Cash Out'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium capitalize text-gray-700">
                      {tx.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#241912]">{tx.reason}</td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {tx.booking_reference || tx.receipt_ref || '—'}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{tx.performed_by}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                      <span className={tx.type === 'cash_in' ? 'text-emerald-700' : 'text-rose-700'}>
                        {tx.type === 'cash_in' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(tx.id, tx.reason)}
                        className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={isTelugu ? 'లావాదేవీ తొలగించు' : 'Delete Transaction'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Shifts Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE3D6] shadow-sm space-y-4">
        <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D8AD56]" />
          <span>{isTelugu ? 'గత షిఫ్ట్‌లు & ఆడిట్ రికార్డులు' : 'Shift History & Drawer Audits'}</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EFE3D6] text-[#786B61] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">{isTelugu ? 'షిఫ్ట్ నంబర్' : 'Shift Number'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'క్యాషియర్' : 'Cashier'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'ప్రారంభం' : 'Opened'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'ముగింపు' : 'Closed'}</th>
                <th className="py-2.5 px-3 text-right">{isTelugu ? 'ప్రారంభ ఫ్లోట్' : 'Opening Float'}</th>
                <th className="py-2.5 px-3 text-right">{isTelugu ? 'లెక్కింపు నగదు' : 'Physical Count'}</th>
                <th className="py-2.5 px-3 text-right">{isTelugu ? 'తేడా' : 'Discrepancy'}</th>
                <th className="py-2.5 px-3">{isTelugu ? 'స్థితి' : 'Status'}</th>
                <th className="py-2.5 px-3 text-center">{isTelugu ? 'చర్య' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]/60">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    {isTelugu ? 'గత షిఫ్ట్ రికార్డులు ఏవీ లేవు.' : 'No cash shift records found in database.'}
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#241912]">{s.shift_number}</td>
                    <td className="py-3 px-3 font-semibold text-gray-700">{s.cashier_name}</td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {new Date(s.opened_at).toLocaleDateString('en-IN')} {new Date(s.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {s.closed_at ? `${new Date(s.closed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      ₹{s.opening_float.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#241912]">
                      {s.closing_cash_counted !== undefined ? `₹${s.closing_cash_counted.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {s.discrepancy === undefined ? (
                        <span className="text-gray-400">—</span>
                      ) : s.discrepancy === 0 ? (
                        <span className="text-emerald-700">Balanced (₹0)</span>
                      ) : s.discrepancy > 0 ? (
                        <span className="text-blue-700">+₹{s.discrepancy} (Over)</span>
                      ) : (
                        <span className="text-rose-700">₹{s.discrepancy} (Short)</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {s.status === 'open' ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedShiftForPrint(s)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-[#43001F] transition-colors cursor-pointer"
                          title="Print Handover Report"
                        >
                          <Printer className="w-4 h-4 text-[#D8AD56]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(s.id, s.shift_number)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Delete Shift Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Open Shift */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#D8AD56]" />
                <span>{isTelugu ? 'క్యాష్ డ్రాయర్ షిఫ్ట్ ప్రారంభం' : 'Open Cash Drawer Shift'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#241912]">
                    {isTelugu ? 'ప్రారంభ ఫ్లోట్ బ్యాలెన్స్ (₹)' : 'Opening Float Balance (₹)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOpenDenominations(!showOpenDenominations)}
                    className="text-[#D8AD56] hover:text-[#B18A4A] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{showOpenDenominations ? 'Hide Note Counter' : 'Use Note Counter'}</span>
                    {showOpenDenominations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={newOpeningFloat}
                  onChange={(e) => setNewOpeningFloat(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-base font-mono font-bold text-[#241912] focus:outline-none focus:ring-2 focus:ring-[#D8AD56]/20 focus:border-[#D8AD56]"
                />

                {/* Quick Float Selection Chips */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Quick Set:</span>
                  {[2000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewOpeningFloat(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                        newOpeningFloat === preset
                          ? 'bg-[#43001F] text-white border-[#43001F]'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Denomination Breakdown Accordion */}
              {showOpenDenominations && (
                <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E6D9C5] space-y-2.5">
                  <div className="font-bold text-[#241912] flex items-center justify-between text-xs">
                    <span>Indian Currency Denomination Counter</span>
                    <span className="text-[11px] text-[#B18A4A] font-mono">
                      Sum: ₹{calcDenomTotal(openDenominations).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                    {[
                      { key: 'c500', label: '₹500 notes', mult: 500 },
                      { key: 'c200', label: '₹200 notes', mult: 200 },
                      { key: 'c100', label: '₹100 notes', mult: 100 },
                      { key: 'c50', label: '₹50 notes', mult: 50 },
                      { key: 'c20', label: '₹20 notes', mult: 20 },
                      { key: 'c10', label: '₹10 notes', mult: 10 },
                    ].map(({ key, label, mult }) => (
                      <div key={key} className="bg-white p-2 rounded-lg border border-[#E6D9C5]">
                        <span className="block text-[10px] text-gray-500 font-sans">{label}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="number"
                            min="0"
                            value={(openDenominations as any)[key]}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              const updated = { ...openDenominations, [key]: val };
                              setOpenDenominations(updated);
                              setNewOpeningFloat(calcDenomTotal(updated));
                            }}
                            className="w-full text-xs font-bold p-1 rounded border border-gray-200 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#241912] mb-1">
                  {isTelugu ? 'అప్పగింత వివరాలు (ఐచ్ఛికం)' : 'Handover Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isTelugu
                      ? 'ఉదా: రాత్రి షిఫ్ట్ క్యాషియర్ నుండి ₹5,000 నగదు ధృవీకరించబడింది.'
                      : 'e.g. 10x500 notes, verified with outgoing cashier.'
                  }
                  value={openShiftNotes}
                  onChange={(e) => setOpenShiftNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  {isTelugu ? 'రద్దు' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Opening...' : isTelugu ? 'షిఫ్ట్ ప్రారంభించండి' : 'Confirm & Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Close Shift */}
      {isCloseShiftModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#D8AD56]" />
                <span>
                  {isTelugu ? 'షిఫ్ట్ ముగింపు & ఆడిట్' : 'Close Shift'} #{activeShift.shift_number}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
              <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EFE3D6] space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Opening Float:</span>
                  <span className="font-mono font-semibold">₹{openingFloat.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Cash Collected (+):</span>
                  <span className="font-mono font-semibold">+₹{totalCashIn.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Total Cash Payouts (-):</span>
                  <span className="font-mono font-semibold">-₹{totalCashOut.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-[#EFE3D6] pt-1.5 flex justify-between font-bold text-[#241912] text-sm">
                  <span>Expected Drawer Cash:</span>
                  <span className="font-mono text-[#D8AD56]">₹{balance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#241912]">
                    {isTelugu ? 'డ్రాయర్‌లో లెక్కించిన నగదు (₹)' : 'Physically Counted Cash in Drawer (₹)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCloseDenominations(!showCloseDenominations)}
                    className="text-[#D8AD56] hover:text-[#B18A4A] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{showCloseDenominations ? 'Hide Counter' : 'Count Notes'}</span>
                    {showCloseDenominations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={closingCashCounted}
                  onChange={(e) => setClosingCashCounted(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-base font-mono font-bold text-[#241912] focus:outline-none focus:ring-2 focus:ring-[#D8AD56]/20 focus:border-[#D8AD56]"
                />
              </div>

              {/* Close Denominations Accordion */}
              {showCloseDenominations && (
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E6D9C5] space-y-2">
                  <div className="font-bold text-[#241912] flex items-center justify-between text-xs">
                    <span>Physical Cash Counting Form</span>
                    <span className="text-[11px] text-[#B18A4A] font-mono">
                      Total: ₹{calcDenomTotal(closeDenominations).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                    {[
                      { key: 'c500', label: '₹500', mult: 500 },
                      { key: 'c200', label: '₹200', mult: 200 },
                      { key: 'c100', label: '₹100', mult: 100 },
                      { key: 'c50', label: '₹50', mult: 50 },
                      { key: 'c20', label: '₹20', mult: 20 },
                      { key: 'c10', label: '₹10', mult: 10 },
                    ].map(({ key, label }) => (
                      <div key={key} className="bg-white p-2 rounded-lg border border-[#E6D9C5]">
                        <span className="block text-[10px] text-gray-500 font-sans">{label}</span>
                        <input
                          type="number"
                          min="0"
                          value={(closeDenominations as any)[key]}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            const updated = { ...closeDenominations, [key]: val };
                            setCloseDenominations(updated);
                            setClosingCashCounted(calcDenomTotal(updated));
                          }}
                          className="w-full text-xs font-bold p-1 rounded border border-gray-200 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discrepancy Live Alert */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  closingCashCounted === balance
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : closingCashCounted > balance
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>Calculated Discrepancy:</span>
                <span className="font-mono">
                  {closingCashCounted === balance
                    ? '₹0 (Exact Match)'
                    : closingCashCounted > balance
                    ? `+₹${closingCashCounted - balance} (Over)`
                    : `-₹${balance - closingCashCounted} (Short)`}
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">
                  {isTelugu ? 'ముగింపు మరియు అప్పగింత వివరాలు' : 'Closing & Handover Remarks'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isTelugu
                      ? 'తదుపరి క్యాషియర్ లేదా మేనేజర్‌కు వివరణ...'
                      : 'Notes for relieving cashier / duty manager...'
                  }
                  value={closeShiftNotes}
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  {isTelugu ? 'రద్దు' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Auditing & Closing...' : isTelugu ? 'ఆడిట్ చేసి ముగించండి' : 'Audit & Close Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Transaction */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D8AD56]" />
                <span>{isTelugu ? 'నగదు లావాదేవీ నమోదు' : 'Record Cash Flow'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTxModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-3.5 text-xs">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('cash_in');
                    setTxCategory('guest_payment');
                  }}
                  className={`py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'cash_in'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{isTelugu ? 'నగదు జమ (Receipt)' : 'Cash In (Receipt)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('cash_out');
                    setTxCategory('vendor_payout');
                  }}
                  className={`py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'cash_out'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{isTelugu ? 'నగదు ఖర్చు (Payout)' : 'Cash Out (Payout)'}</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">
                  {isTelugu ? 'వర్గం' : 'Category'}
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={txCategory}
                  onChange={(val) => setTxCategory(val as CashTransactionCategory)}
                  options={
                    txType === 'cash_in'
                      ? [
                          { value: 'guest_payment', label: 'Guest Stay Folio Payment' },
                          { value: 'front_desk_advance', label: 'Advance Room Deposit' },
                          { value: 'change_replenishment', label: 'Float / Change Replenishment' },
                          { value: 'other', label: 'Other Cash Inflow' },
                        ]
                      : [
                          { value: 'petty_cash', label: 'Petty Cash Disbursement' },
                          { value: 'vendor_payout', label: 'Vendor / Supply Payout' },
                          { value: 'expense_payout', label: 'Hotel Operating Expense' },
                          { value: 'other', label: 'Other Cash Outflow' },
                        ]
                  }
                />
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">
                  {isTelugu ? 'మొత్తం (₹)' : 'Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-base font-mono font-bold text-[#241912] focus:outline-none focus:ring-2 focus:ring-[#D8AD56]/20 focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">
                  {isTelugu ? 'కారణం / వివరణ' : 'Reason / Description'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isTelugu
                      ? 'ఉదా: రూమ్ 102 వాక్-ఇన్ అడ్వాన్స్ లేదా లాండ్రీ చెల్లింపు'
                      : 'e.g. Laundry urgent payout, Key deposit refund, Room 102 stay'
                  }
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">
                    {isTelugu ? 'బుకింగ్ రిఫరెన్స్' : 'Booking Ref (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STG-2026-904"
                    value={txBookingRef}
                    onChange={(e) => setTxBookingRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#EFE3D6] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">
                    {isTelugu ? 'రసీదు / వోచర్ #' : 'Receipt # (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REC-9821"
                    value={txReceiptRef}
                    onChange={(e) => setTxReceiptRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#EFE3D6] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  {isTelugu ? 'రద్దు' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : isTelugu ? 'నమోదు చేయండి' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE SLIP MODAL: Shift Handover Report */}
      {selectedShiftForPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#D8AD56]" />
                <h3 className="font-serif font-bold text-lg text-[#241912]">
                  Shift Handover Audit Slip
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShiftForPrint(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div id="shift-print-area" className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#EFE3D6] space-y-3 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <h4 className="font-serif font-bold text-base text-[#241912] tracking-wider">
                  SRI TAYI GRAND
                </h4>
                <p className="text-[10px] text-stone-500 uppercase">
                  Reception Cash Drawer Reconciliation
                </p>
                <p className="text-[10px] text-stone-500">Kadiri, Andhra Pradesh</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-dashed border-stone-300">
                <div>
                  <span className="text-stone-500 block">Shift Number:</span>
                  <span className="font-bold text-[#241912]">{selectedShiftForPrint.shift_number}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Cashier:</span>
                  <span className="font-bold text-[#241912]">{selectedShiftForPrint.cashier_name}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Opened:</span>
                  <span>{new Date(selectedShiftForPrint.opened_at).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Closed:</span>
                  <span>
                    {selectedShiftForPrint.closed_at
                      ? new Date(selectedShiftForPrint.closed_at).toLocaleString('en-IN')
                      : 'Active / In Progress'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] pb-2 border-b border-dashed border-stone-300">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span className="font-bold">₹{selectedShiftForPrint.opening_float.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Cash Collected (+):</span>
                  <span>+₹{totalCashIn.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Total Cash Outflows (-):</span>
                  <span>-₹{totalCashOut.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-[#241912] pt-1 border-t border-stone-200">
                  <span>Expected Drawer Cash:</span>
                  <span>₹{balance.toLocaleString('en-IN')}</span>
                </div>
                {selectedShiftForPrint.closing_cash_counted !== undefined && (
                  <div className="flex justify-between text-[#43001F] font-bold">
                    <span>Physical Cash Counted:</span>
                    <span>₹{selectedShiftForPrint.closing_cash_counted.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {selectedShiftForPrint.discrepancy !== undefined && (
                  <div className="flex justify-between font-bold">
                    <span>Audit Discrepancy:</span>
                    <span
                      className={
                        selectedShiftForPrint.discrepancy === 0
                          ? 'text-emerald-700'
                          : selectedShiftForPrint.discrepancy > 0
                          ? 'text-blue-700'
                          : 'text-rose-700'
                      }
                    >
                      {selectedShiftForPrint.discrepancy === 0
                        ? 'Balanced (₹0)'
                        : selectedShiftForPrint.discrepancy > 0
                        ? `+₹${selectedShiftForPrint.discrepancy} (Over)`
                        : `₹${selectedShiftForPrint.discrepancy} (Short)`}
                    </span>
                  </div>
                )}
              </div>

              {selectedShiftForPrint.notes && (
                <div className="text-[10px] text-stone-600 italic">
                  Remarks: {selectedShiftForPrint.notes}
                </div>
              )}

              <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] text-stone-500">
                <div className="border-t border-stone-400 pt-1">
                  Cashier Signature
                </div>
                <div className="border-t border-stone-400 pt-1">
                  Duty Manager Signature
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
              <button
                type="button"
                onClick={() => setSelectedShiftForPrint(null)}
                className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D8AD56]" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
