'use client';

import { useState, useEffect, useCallback } from 'react';
import { CashShift, CashTransaction, CashTransactionCategory } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  FileText,
  DollarSign,
  Receipt,
  X,
  Printer,
  Sparkles,
} from 'lucide-react';

export default function AdminCashbookPage() {
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);

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

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchCashbook = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/cashbook');
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.activeShift);
        setBalance(data.balance || 0);
        setOpeningFloat(data.openingFloat || 0);
        setTotalCashIn(data.totalCashIn || 0);
        setTotalCashOut(data.totalCashOut || 0);
        setShifts(data.shifts || []);
        setTransactions(data.transactions || []);
      }
    } catch {
      showNotification('error', 'Failed to synchronize front desk cashbook.');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

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
      const res = await fetch('/api/admin/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open_shift',
          openingFloat: newOpeningFloat,
          notes: openShiftNotes,
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
      const res = await fetch('/api/admin/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_shift',
          shiftId: activeShift.id,
          closingCashCounted,
          notes: closeShiftNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message);
        setIsCloseShiftModalOpen(false);
        setCloseShiftNotes('');
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
      const res = await fetch('/api/admin/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_transaction',
          type: txType,
          category: txCategory,
          amount: txAmount,
          reason: txReason.trim(),
          bookingReference: txBookingRef.trim() || undefined,
          receiptRef: txReceiptRef.trim() || undefined,
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

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.performed_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.booking_reference && t.booking_reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.receipt_ref && t.receipt_ref.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg text-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8AD56] bg-[#D8AD56]/10 px-2 py-0.5 rounded-full">
              Cash Drawer Operations
            </span>
            <span className="text-xs text-[#786B61]">Front Desk Financial Float</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#241912] mt-1 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-[#D8AD56]" />
            <span>Cashbook & Drawer Shifts</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Real-time reception drawer reconciliation, shift handovers, float balances, and petty cash disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCashbook}
            className="px-3.5 py-2 rounded-xl border border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-xs font-semibold text-[#241912] flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D8AD56] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {activeShift ? (
            <>
              <button
                onClick={() => setIsAddTxModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Cash Flow</span>
              </button>
              <button
                onClick={() => {
                  setClosingCashCounted(balance);
                  setIsCloseShiftModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Shift</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Open New Cash Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Drawer Current Cash Balance */}
        <div className="bg-gradient-to-br from-[#241912] via-[#382216] to-[#1E110A] text-white rounded-2xl p-5 border border-[#D8AD56]/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#EFE3D6]/80 font-medium">
            <span>Physical Drawer Cash</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-3xl font-serif font-black text-[#D8AD56] tracking-tight mt-2">
            ₹{balance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#EFE3D6]/70 mt-1 flex items-center justify-between">
            <span>Status:</span>
            <span className="font-semibold text-emerald-400">
              {activeShift ? `Shift #${activeShift.shift_number} Active` : 'Shift Closed'}
            </span>
          </div>
        </div>

        {/* Opening Float */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFE3D6] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#786B61] font-semibold">
            <span>Opening Float</span>
            <Clock className="w-4 h-4 text-[#D8AD56]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#241912]">
            ₹{openingFloat.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#786B61]">Handed over at shift opening</p>
        </div>

        {/* Total Cash In */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFE3D6] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Total Cash In</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-600">
            +₹{totalCashIn.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#786B61]">Walk-ins, advances & change receipts</p>
        </div>

        {/* Total Cash Out */}
        <div className="bg-white rounded-2xl p-5 border border-[#EFE3D6] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>Total Cash Out</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-rose-600">
            -₹{totalCashOut.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#786B61]">Petty cash, vendor payouts & expenses</p>
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
                Cashier: {activeShift.cashier_name} &bull; {activeShift.shift_number}
              </div>
              <div className="text-[11px] text-[#786B61]">
                Opened at: {new Date(activeShift.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(activeShift.opened_at).toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>
          {activeShift.notes && (
            <div className="text-[11px] text-[#786B61] italic max-w-md">
              &ldquo;{activeShift.notes}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Transactions Section */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE3D6] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D8AD56]" />
            <span>Shift Cash Transactions Ledger</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
              />
            </div>

            <div className="flex items-center rounded-xl border border-[#EFE3D6] p-0.5 bg-gray-50 text-xs font-semibold">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${typeFilter === 'all' ? 'bg-[#241912] text-[#D8AD56]' : 'text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('cash_in')}
                className={`px-3 py-1 rounded-lg transition-colors ${typeFilter === 'cash_in' ? 'bg-emerald-700 text-white' : 'text-gray-600'}`}
              >
                Cash In
              </button>
              <button
                onClick={() => setTypeFilter('cash_out')}
                className={`px-3 py-1 rounded-lg transition-colors ${typeFilter === 'cash_out' ? 'bg-rose-700 text-white' : 'text-gray-600'}`}
              >
                Cash Out
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EFE3D6] text-[#786B61] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description / Reason</th>
                <th className="py-2.5 px-3">Ref</th>
                <th className="py-2.5 px-3">Staff</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No cash transactions recorded for this criteria.
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
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tx.type === 'cash_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Shifts Section */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE3D6] shadow-sm space-y-4">
        <h2 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D8AD56]" />
          <span>Shift History & Drawer Audits</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EFE3D6] text-[#786B61] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Shift Number</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3">Opened</th>
                <th className="py-2.5 px-3">Closed</th>
                <th className="py-2.5 px-3 text-right">Opening Float</th>
                <th className="py-2.5 px-3 text-right">Physical Count</th>
                <th className="py-2.5 px-3 text-right">Discrepancy</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]/60">
              {shifts.map((s) => (
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
                        s.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {s.status === 'open' ? 'Active' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Open Shift */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#D8AD56]" />
                <span>Open Cash Drawer Shift</span>
              </h3>
              <button onClick={() => setIsOpenShiftModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#241912] mb-1">Opening Float Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={newOpeningFloat}
                  onChange={(e) => setNewOpeningFloat(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-sm font-mono font-bold text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
                <p className="text-[11px] text-gray-500 mt-1">Starting physical change in the cash drawer.</p>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">Handover Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 10x500 notes, 5x100 notes verified with night shift cashier"
                  value={openShiftNotes}
                  onChange={(e) => setOpenShiftNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold shadow-md"
                >
                  {submitting ? 'Opening...' : 'Confirm & Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Close Shift */}
      {isCloseShiftModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#D8AD56]" />
                <span>Close Shift #{activeShift.shift_number}</span>
              </h3>
              <button onClick={() => setIsCloseShiftModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
              <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EFE3D6] space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Opening Float:</span>
                  <span className="font-mono font-semibold">₹{openingFloat}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Cash Collected (+):</span>
                  <span className="font-mono font-semibold">+₹{totalCashIn}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Total Cash Payouts (-):</span>
                  <span className="font-mono font-semibold">-₹{totalCashOut}</span>
                </div>
                <div className="border-t border-[#EFE3D6] pt-1 flex justify-between font-bold text-[#241912] text-sm">
                  <span>Expected Drawer Cash:</span>
                  <span className="font-mono text-[#D8AD56]">₹{balance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">
                  Physically Counted Cash in Drawer (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={closingCashCounted}
                  onChange={(e) => setClosingCashCounted(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-sm font-mono font-bold text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

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
                <label className="block font-bold text-[#241912] mb-1">Closing & Handover Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes for relieving cashier / manager..."
                  value={closeShiftNotes}
                  onChange={(e) => setCloseShiftNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-bold shadow-md"
                >
                  {submitting ? 'Auditing & Closing...' : 'Audit & Close Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Transaction */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D8AD56]" />
                <span>Record Cash Flow</span>
              </h3>
              <button onClick={() => setIsAddTxModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-3.5 text-xs">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('cash_in')}
                  className={`py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                    txType === 'cash_in'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Cash In (Receipt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('cash_out')}
                  className={`py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                    txType === 'cash_out'
                      ? 'bg-rose-600 text-white border-rose-600 shadow'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Cash Out (Payout)</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">Category</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as CashTransactionCategory)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                >
                  {txType === 'cash_in' ? (
                    <>
                      <option value="guest_payment">Guest Stay Payment / Folio Settlement</option>
                      <option value="front_desk_advance">Advance Room Deposit</option>
                      <option value="change_replenishment">Bank Cash / Float Replenishment</option>
                      <option value="other">Other Cash Inflow</option>
                    </>
                  ) : (
                    <>
                      <option value="petty_cash">Petty Cash Disbursement</option>
                      <option value="vendor_payout">Vendor / Supply Payout</option>
                      <option value="expense_payout">Hotel Operating Expense</option>
                      <option value="other">Other Cash Outflow</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-sm font-mono font-bold text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">Reason / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laundry urgent payout, Key deposit refund, Room 102 stay"
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Booking Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. STG-2026-904"
                    value={txBookingRef}
                    onChange={(e) => setTxBookingRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#EFE3D6] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Receipt / Voucher (Optional)</label>
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
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold shadow-md"
                >
                  {submitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
