'use client';

import { useState, useEffect, useCallback } from 'react';
import { PaymentRecord, Expense, ExpenseCategory, PaymentMethod } from '@/types';
import {
  CreditCard,
  Search,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Download,
  Plus,
  Receipt,
  Trash2,
  Radio,
  X,
  RefreshCw,
} from 'lucide-react';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';

export default function PaymentsAdminPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // New Payment Form
  const [paymentBookingRef, setPaymentBookingRef] = useState('');
  const [paymentGuestName, setPaymentGuestName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(2000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // New Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('laundry');
  const [expAmount, setExpAmount] = useState<number>(500);
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDesc, setExpDesc] = useState('');
  const [expReceipt, setExpReceipt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFinancials = useCallback(async () => {
    try {
      const stateData = await adminOperations.fetchFullState();
      if (stateData.success) {
        setPayments(stateData.payments || []);
        setExpenses(stateData.expenses || []);
      }
    } catch {
      // Ignored
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

  const totalCollected = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const onlineCollected = payments
    .filter((p) => p.status === 'successful' && (p.payment_method === 'online' || p.payment_method === 'upi'))
    .reduce((sum, p) => sum + p.amount, 0);

  const cashCollected = payments
    .filter((p) => p.status === 'successful' && p.payment_method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = expenses
    .filter((e) => e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);

  const netBalance = totalCollected - totalExpenses;

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

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBookingRef || paymentAmount <= 0) return;

    setSubmitting(true);
    try {
      await adminOperations.recordPayment({
        bookingReference: paymentBookingRef,
        guestName: paymentGuestName || 'Hotel Guest',
        amount: Number(paymentAmount),
        paymentMethod,
        staffName: 'Accounts Auditor',
      });
      setShowPaymentModal(false);
      setPaymentBookingRef('');
      setPaymentGuestName('');
      setPaymentAmount(2000);
      await fetchFinancials();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || expAmount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Accounts',
        },
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
      await fetchFinancials();
    } catch (err: any) {
      alert(err.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to remove this expense record?')) return;
    try {
      const res = await fetch(`/api/admin/expenses?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-staff-role': 'Accounts' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
      await fetchFinancials();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              ACCOUNTS & REVENUE
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
            Audit-safe tracking of online collections, front desk cash settlements, expenses, and net profit ledger.
          </p>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, guest, category..."
              className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
            />
          </div>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Record Expense</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Collection</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Gross Collections</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-2">
            ₹ {totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">{payments.length} verified transactions</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Digital (UPI/Cards)</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1565C0] mt-2">
            ₹ {onlineCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#786B61] mt-1">Direct Bank Settled</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Total Expenses</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-red-600 mt-2">
            ₹ {totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#786B61] mt-1">{expenses.length} operational disbursements</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Net Retained Cash</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#2E7D32] mt-2">
            ₹ {netBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">Collections - Expenses</div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFE3D6] pb-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          Customer Collections & Folios ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
                  <th className="py-3.5 px-4 font-semibold">Gateway ID</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#786B61]">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                        {p.payment_reference}
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
                      <td className="py-3.5 px-4 font-mono text-[10px] text-[#786B61]">
                        {p.gateway_payment_id || 'Cash/Desk'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sm text-[#241912]">
                        ₹ {p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#2E7D32]">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#786B61]">
                        {new Date(p.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
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
                    <td colSpan={8} className="py-10 text-center text-[#786B61]">
                      No expense records found.
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
                          className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50"
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
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940]"
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
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  >
                    <option value="laundry">Laundry</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="fnb_supplies">F&B Supplies</option>
                    <option value="utilities">Utilities</option>
                    <option value="staff_welfare">Staff Welfare</option>
                    <option value="repairs">Repairs</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6]"
                  >
                    <option value="cash">Cash (Drawer)</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
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
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-red-700 text-white text-xs font-bold hover:bg-red-800"
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
