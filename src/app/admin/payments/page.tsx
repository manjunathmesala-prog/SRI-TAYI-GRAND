'use client';

import { useState, useEffect, useCallback } from 'react';
import { PaymentRecord, Expense, ExpenseCategory, PaymentMethod } from '@/types';
import {
  CreditCard,
  Search,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Receipt,
  Trash2,
  Radio,
  X,
  RefreshCw,
  Send,
  RotateCcw,
  Copy,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { authStorage } from '@/lib/auth-storage';

export default function PaymentsAdminPage() {
  const { t, formatCurrency, formatDate, translateStatus, isTelugu } = useAdminLanguage();
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentRecord | null>(null);

  // Reconciliation state
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);

  // New Payment Form
  const [paymentBookingRef, setPaymentBookingRef] = useState('');
  const [paymentGuestName, setPaymentGuestName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(2000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Send Payment Link Form
  const [linkBookingRef, setLinkBookingRef] = useState('');
  const [linkAmount, setLinkAmount] = useState<number>(3500);
  const [linkDescription, setLinkDescription] = useState('Room Booking Advance');
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);
  const [linkCopySuccess, setLinkCopySuccess] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Refund Form
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('Cancellation');
  const [customRefundReason, setCustomRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // New Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('laundry');
  const [expAmount, setExpAmount] = useState<number>(500);
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDesc, setExpDesc] = useState('');
  const [expReceipt, setExpReceipt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFinancials = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payments', {
        headers: authStorage.getAuthHeaders({ 'x-staff-role': 'Super Admin' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.payments) setPayments(data.payments);
      } else {
        const stateData = await adminOperations.fetchFullState();
        if (stateData.success && stateData.payments) {
          setPayments(stateData.payments);
        }
      }

      // Fetch expenses
      const expRes = await fetch('/api/admin/expenses', {
        headers: authStorage.getAuthHeaders({ 'x-staff-role': 'Super Admin' }),
      });
      if (expRes.ok) {
        const expData = await expRes.json();
        if (expData.expenses) setExpenses(expData.expenses);
      }
    } catch {
      // Fallback
      const stateData = await adminOperations.fetchFullState();
      if (stateData.success) {
        setPayments(stateData.payments || []);
        setExpenses(stateData.expenses || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  // Real-time synchronization
  const { isConnected, status } = useRealtimeSync({
    onRefresh: fetchFinancials,
  });

  // Reconciliation Metrics
  const totalReceived = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const reconciledCount = payments.filter((p) => p.reconciled).length;
  const pendingCount = payments.filter((p) => p.status === 'pending' || !p.reconciled).length;
  const totalRefunded = payments.reduce((sum, p) => sum + (p.refund_amount || 0), 0);

  const totalExpenses = expenses
    .filter((e) => e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);

  const netBalance = totalReceived - totalExpenses;

  // Reconcile payments handler
  const handleReconcilePayments = async () => {
    setIsReconciling(true);
    setReconcileFeedback(null);
    try {
      const res = await fetch('/api/admin/payments/reconciliation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile payments');

      setReconcileFeedback(`Reconciliation complete: ${data.reconciled_count} payments verified (₹${data.total_amount.toLocaleString('en-IN')})`);
      showToast('success', `Reconciliation complete: ${data.reconciled_count} payments verified.`);
      await fetchFinancials();
      setTimeout(() => setReconcileFeedback(null), 6000);
    } catch (err: any) {
      showToast('error', err.message || 'Error reconciling payments');
    } finally {
      setIsReconciling(false);
    }
  };

  // Open Refund Modal
  const handleOpenRefund = (payment: PaymentRecord) => {
    setSelectedPaymentForRefund(payment);
    const maxRefund = payment.amount - (payment.refund_amount || 0);
    setRefundType('full');
    setRefundAmount(maxRefund);
    setRefundReason('Cancellation');
    setCustomRefundReason('');
    setRefundError(null);
    setShowRefundModal(true);
  };

  // Process Refund Submit
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;

    const maxRefund = selectedPaymentForRefund.amount - (selectedPaymentForRefund.refund_amount || 0);
    const finalAmount = refundType === 'full' ? maxRefund : refundAmount;

    if (finalAmount <= 0 || finalAmount > maxRefund) {
      setRefundError(`Refund amount must be between ₹1 and ₹${maxRefund.toLocaleString('en-IN')}`);
      return;
    }

    const finalReason = refundReason === 'Other' ? (customRefundReason || 'Customer Request') : refundReason;

    setIsProcessingRefund(true);
    setRefundError(null);
    try {
      const res = await fetch(`/api/admin/payments/${selectedPaymentForRefund.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          amount: finalAmount,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setShowRefundModal(false);
      setSelectedPaymentForRefund(null);
      await fetchFinancials();
    } catch (err: any) {
      setRefundError(err.message || 'Refund processing failed');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Create Payment Link Submit
  const handleGeneratePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkBookingRef || linkAmount <= 0) return;

    setIsGeneratingLink(true);
    try {
      const res = await fetch('/api/admin/payments/create-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          bookingReference: linkBookingRef,
          amount: Number(linkAmount),
          description: linkDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate payment link');
      }

      setGeneratedLinkUrl(data.link_url);
      showToast('success', 'Payment link generated successfully.');
      await fetchFinancials();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create payment link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Create Manual Payment Submit
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBookingRef || paymentAmount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          bookingReference: paymentBookingRef,
          guestName: paymentGuestName || 'Hotel Guest',
          amount: Number(paymentAmount),
          paymentMethod,
          status: 'successful',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      setShowPaymentModal(false);
      setPaymentBookingRef('');
      setPaymentGuestName('');
      setPaymentAmount(2000);
      showToast('success', `Payment of ₹${Number(paymentAmount).toLocaleString('en-IN')} recorded successfully.`);
      await fetchFinancials();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Expense Submit
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || expAmount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: authStorage.getAuthHeaders({
          'Content-Type': 'application/json',
          'x-staff-role': 'Accounts',
        }),
        body: JSON.stringify({
          title: expTitle,
          category: expCategory,
          amount: Number(expAmount),
          payment_method: expMethod,
          description: expDesc,
          receipt_ref: expReceipt,
          recorded_by: 'Accounts Team',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record expense');

      setShowExpenseModal(false);
      setExpTitle('');
      setExpDesc('');
      setExpReceipt('');
      setExpAmount(500);
      showToast('success', `Expense "${expTitle}" recorded in financial ledger.`);
      await fetchFinancials();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to remove this expense record?')) return;
    try {
      const res = await fetch(`/api/admin/expenses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authStorage.getAuthHeaders({ 'x-staff-role': 'Accounts' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
      showToast('success', 'Expense record removed successfully.');
      await fetchFinancials();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete expense');
    }
  };

  const filteredPayments = payments.filter((p) =>
    p.payment_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.gateway_payment_id && p.gateway_payment_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredExpenses = expenses.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (e.receipt_ref && e.receipt_ref.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const previewMessage = `Namaste! Sri Tayi Grand booking payment request for reference #${linkBookingRef || 'STG-BOOKING'}. Please complete your payment of ₹${Number(linkAmount || 0).toLocaleString('en-IN')} via: ${generatedLinkUrl || 'https://rzp.io/l/stg-preview'}. Thank you for choosing Sri Tayi Grand, Kadiri.`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              ACCOUNTS & RECONCILIATION
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
            <CreditCard className="w-6 h-6 text-[#D8AD56]" />
            <span>Payments & Financial Ledger</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Razorpay reconciliation, instant payment requests, in-app refunds, and operational ledger tracking.
          </p>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ref, guest..."
              className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
            />
          </div>

          <button
            onClick={() => {
              setLinkBookingRef('');
              setLinkAmount(3500);
              setLinkDescription('Room Booking Advance');
              setGeneratedLinkUrl(null);
              setLinkCopySuccess(false);
              setShowPaymentLinkModal(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Payment Link</span>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isTelugu ? '+ ఖర్చు నమోదు' : '+ Record Expense'}</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Collection</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Feedback Alert */}
      {reconcileFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{reconcileFeedback}</span>
          </div>
          <button onClick={() => setReconcileFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards: Reconciliation & Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Received */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Total Received</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-2">
            ₹ {totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">
            {payments.filter((p) => p.status === 'successful').length} successful collections
          </div>
        </div>

        {/* Reconciled Count */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Reconciled Count</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1565C0] mt-2">
            {reconciledCount} / {payments.length}
          </div>
          <div className="text-xs text-[#786B61] mt-1">
            Bank & Gateway matched
          </div>
        </div>

        {/* Pending Count */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Pending Count</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 mt-2">
            {pendingCount}
          </div>
          <div className="text-xs text-amber-700 mt-1">
            Awaiting sync or settlement
          </div>
        </div>

        {/* Reconciliation Action & Net Balance */}
        <div className="bg-gradient-to-br from-[#2D1B13] to-[#43001F] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#D8AD56]">Payment Reconciliation</span>
              {totalRefunded > 0 && (
                <span className="text-[9px] bg-red-500/30 text-red-200 px-1.5 py-0.5 rounded font-mono">
                  -₹{totalRefunded.toLocaleString('en-IN')} Ref
                </span>
              )}
            </div>
            <div className="font-serif text-lg font-bold mt-1 text-white">
              Net: ₹ {netBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <button
            onClick={handleReconcilePayments}
            disabled={isReconciling}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-[#D8AD56] hover:bg-[#C99E44] text-[#241912] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
            <span>{isReconciling ? 'Reconciling...' : 'Reconcile Payments'}</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFE3D6] pb-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          Customer Collections & Folios ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          Hotel Operating Expenses ({expenses.length})
        </button>
      </div>

      {/* Main Table */}
      {activeTab === 'payments' ? (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Payment Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Booking Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Guest Name</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Reconciliation</th>
                  <th className="py-3.5 px-4 font-semibold">Status / Refund</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#786B61]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CreditCard className="w-8 h-8 text-stone-300" />
                        <span className="font-semibold text-sm text-[#241912]">No Payment Transactions Found</span>
                        <p className="text-xs text-[#786B61] max-w-sm">
                          {searchQuery
                            ? 'No payment records match your search filter.'
                            : 'No guest payments have been recorded yet.'}
                        </p>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isFullyRefunded = p.refund_status === 'full' || (p.refund_amount !== undefined && p.refund_amount >= p.amount);
                    const canRefund = p.status === 'successful' && !isFullyRefunded;

                    return (
                      <tr key={p.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-[#382216]">{p.payment_reference}</div>
                          {p.gateway_payment_id && (
                            <span className="font-mono text-[10px] text-[#786B61] block">{p.gateway_payment_id}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-[#786B61]">
                          {p.booking_reference}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">{p.guest_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-800">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-sm text-[#241912]">
                          ₹ {p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          {p.reconciled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Reconciled</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Unreconciled</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                p.status === 'successful'
                                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                  : p.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.refund_status && p.refund_status !== 'none' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {p.refund_status === 'full' ? 'Full Refund' : `Refund: ₹${p.refund_amount}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#786B61]">
                          {new Date(p.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.payment_link_url && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(p.payment_link_url || '');
                                  showToast('success', 'Payment link copied to clipboard!');
                                }}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Copy Payment Link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canRefund && (
                              <button
                                onClick={() => handleOpenRefund(p)}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Process Refund"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Refund</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Title & Description</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Receipt Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Recorded By</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#786B61]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <TrendingDown className="w-8 h-8 text-stone-300" />
                        <span className="font-semibold text-sm text-[#241912]">No Expenses Logged</span>
                        <p className="text-xs text-[#786B61] max-w-sm">
                          {searchQuery
                            ? 'No operational expenses match your search query.'
                            : 'No operating expenses logged yet.'}
                        </p>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <strong className="block text-[#241912]">{e.title}</strong>
                        {e.description && (
                          <span className="text-[11px] text-[#786B61] block">{e.description}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          {e.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-800">
                          {e.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#786B61]">
                        {e.receipt_ref || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sm text-red-600">
                        ₹ {e.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-[#786B61] text-[11px]">
                        {e.recorded_by}
                      </td>
                      <td className="py-3.5 px-4 text-[#786B61]">
                        {e.expense_date}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          title="Delete Expense"
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
      )}

      {/* MODAL: SEND PAYMENT LINK */}
      {showPaymentLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#1E3A8A]" />
                <h3 className="font-serif text-lg font-bold text-[#241912]">Generate & Send Payment Link</h3>
              </div>
              <button
                onClick={() => setShowPaymentLinkModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGeneratePaymentLink} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Booking Reference *
                </label>
                <input
                  type="text"
                  required
                  value={linkBookingRef}
                  onChange={(e) => setLinkBookingRef(e.target.value)}
                  placeholder="e.g. STG-20261109-8812"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-mono focus:border-[#D8AD56] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={linkAmount}
                    onChange={(e) => setLinkAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-bold focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={linkDescription}
                    onChange={(e) => setLinkDescription(e.target.value)}
                    placeholder="e.g. 50% Advance Booking"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGeneratingLink}
                className="w-full py-2.5 rounded-xl bg-[#1E3A8A] text-white text-xs font-bold hover:bg-[#1E40AF] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isGeneratingLink ? 'Creating Secure Payment Link...' : 'Generate Razorpay Payment Link'}</span>
              </button>
            </form>

            {/* Generated Link & Message Preview */}
            {generatedLinkUrl && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-blue-900 tracking-wider">
                    Generated Link
                  </span>
                  <a
                    href={generatedLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-2 bg-white rounded border border-blue-200 font-mono text-xs text-blue-900 break-all select-all">
                  {generatedLinkUrl}
                </div>

                {/* SMS / WhatsApp Preview Box */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#786B61] mb-1">
                    SMS / WhatsApp Preview
                  </label>
                  <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-[#241912] font-sans leading-relaxed">
                    {previewMessage}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewMessage);
                      setLinkCopySuccess(true);
                      setTimeout(() => setLinkCopySuccess(false), 3000);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                    <span>{linkCopySuccess ? 'Message Copied!' : 'Copy SMS / WhatsApp Text'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(previewMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </a>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#EFE3D6]">
              <button
                type="button"
                onClick={() => setShowPaymentLinkModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROCESS IN-APP REFUND */}
      {showRefundModal && selectedPaymentForRefund && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-300 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-serif text-lg font-bold text-[#241912]">Process In-App Refund</h3>
              </div>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Summary Info */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#786B61]">Payment Reference:</span>
                <span className="font-mono font-bold text-[#241912]">{selectedPaymentForRefund.payment_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#786B61]">Booking Ref:</span>
                <span className="font-mono text-[#241912]">{selectedPaymentForRefund.booking_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#786B61]">Guest Name:</span>
                <span className="font-bold text-[#241912]">{selectedPaymentForRefund.guest_name}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5">
                <span className="text-[#786B61]">Original Paid Amount:</span>
                <span className="font-bold text-[#241912]">₹ {selectedPaymentForRefund.amount.toLocaleString('en-IN')}</span>
              </div>
              {selectedPaymentForRefund.refund_amount ? (
                <div className="flex justify-between text-rose-700">
                  <span>Already Refunded:</span>
                  <span className="font-bold">-₹ {selectedPaymentForRefund.refund_amount.toLocaleString('en-IN')}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-emerald-800 font-bold border-t border-gray-200 pt-1">
                <span>Eligible Max Refund:</span>
                <span>₹ {(selectedPaymentForRefund.amount - (selectedPaymentForRefund.refund_amount || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {refundError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{refundError}</span>
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-4">
              {/* Full or Partial Refund Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1.5">
                  Refund Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRefundType('full');
                      setRefundAmount(selectedPaymentForRefund.amount - (selectedPaymentForRefund.refund_amount || 0));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      refundType === 'full'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Full Refund (₹{(selectedPaymentForRefund.amount - (selectedPaymentForRefund.refund_amount || 0)).toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundType('partial')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      refundType === 'partial'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Partial Refund
                  </button>
                </div>
              </div>

              {/* Partial Amount Input */}
              {refundType === 'partial' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Partial Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedPaymentForRefund.amount - (selectedPaymentForRefund.refund_amount || 0)}
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Refund Reason */}
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Reason for Refund *
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={refundReason}
                  onChange={(val) => setRefundReason(String(val))}
                  className="mb-2"
                  options={[
                    { value: 'Cancellation', label: 'Booking Cancellation' },
                    { value: 'Overcharge', label: 'Billing Overcharge / Dual Debit' },
                    { value: 'Booking adjustment', label: 'Booking Date Adjustment / Downgrade' },
                    { value: 'Service complaint', label: 'Service Complaint / Room Issue' },
                    { value: 'Other', label: 'Other Reason' },
                  ]}
                />

                {refundReason === 'Other' && (
                  <input
                    type="text"
                    required
                    value={customRefundReason}
                    onChange={(e) => setCustomRefundReason(e.target.value)}
                    placeholder="Enter detailed refund reason..."
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-rose-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isProcessingRefund ? 'Processing Refund...' : 'Authorize Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#241912]">Record Customer Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Booking Reference *
                </label>
                <input
                  type="text"
                  required
                  value={paymentBookingRef}
                  onChange={(e) => setPaymentBookingRef(e.target.value)}
                  placeholder="e.g. STG-20261106-1234"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={paymentGuestName}
                  onChange={(e) => setPaymentGuestName(e.target.value)}
                  placeholder="Guest Full Name"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Method *
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as any)}
                    options={[
                      { value: 'cash', label: 'Cash' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'card', label: 'Card' },
                      { value: 'online', label: 'Online' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015] cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Commit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#241912]">Record Operational Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Laundry Dry Cleaning, Welcome Kit"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Category *
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={expCategory}
                    onChange={(val) => setExpCategory(val as any)}
                    options={[
                      { value: 'laundry', label: 'Laundry' },
                      { value: 'maintenance', label: 'Maintenance' },
                      { value: 'fnb_supplies', label: 'F&B Supplies' },
                      { value: 'utilities', label: 'Utilities' },
                      { value: 'staff_welfare', label: 'Staff Welfare' },
                      { value: 'repairs', label: 'Repairs' },
                      { value: 'marketing', label: 'Marketing' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Payment Method *
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={expMethod}
                    onChange={(val) => setExpMethod(val as any)}
                    options={[
                      { value: 'cash', label: 'Cash (Drawer)' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'card', label: 'Card' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Receipt / Invoice Ref
                  </label>
                  <input
                    type="text"
                    value={expReceipt}
                    onChange={(e) => setExpReceipt(e.target.value)}
                    placeholder="e.g. INV-4921"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Description / Vendor Notes
                </label>
                <textarea
                  rows={2}
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Details of goods, services, or vendor"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-red-700 text-white text-xs font-bold hover:bg-red-800 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Commit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
