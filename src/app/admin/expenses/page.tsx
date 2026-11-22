'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseCategory, PaymentMethod } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  DollarSign,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Layers,
  Calendar,
  CreditCard,
  Banknote,
  X,
  FileText,
  Building,
  TrendingDown,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { authStorage } from '@/lib/auth-storage';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  laundry: 'Linen & Laundry',
  maintenance: 'Property Maintenance',
  fnb_supplies: 'F&B & Welcome Amenities',
  utilities: 'Power, Water & Generator Diesel',
  staff_welfare: 'Staff Welfare & Food',
  repairs: 'Electrical & Plumbing Repairs',
  marketing: 'Local Marketing & Signboards',
  other: 'General Operational Expense',
};

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('laundry');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(1500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const getAuthHeaders = useCallback((extra: Record<string, string> = {}) => {
    return authStorage.getAuthHeaders(extra);
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/expenses', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch {
      showNotification('error', 'Failed to synchronize operating expenses.');
    } finally {
      setLoading(false);
    }
  }, [showNotification, getAuthHeaders]);

  // Reactive sync on expense events
  useRealtimeSync({
    onEvent: (event) => {
      if (event.eventType === 'expense_created' || event.eventType === 'expense_deleted') {
        fetchExpenses();
      }
    },
  });

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || amount <= 0) {
      showNotification('error', 'Please enter a valid title and positive amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim() || undefined,
          amount: Number(amount),
          payment_method: paymentMethod,
          expense_date: expenseDate,
          receipt_ref: receiptRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Expense successfully recorded.');
        setIsAddModalOpen(false);
        setTitle('');
        setDescription('');
        setReceiptRef('');
        fetchExpenses();
      } else {
        showNotification('error', data.error || 'Failed to record expense.');
      }
    } catch {
      showNotification('error', 'Network error logging expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, expTitle: string) => {
    if (!confirm(`Are you sure you want to remove expense "${expTitle}" from the ledger?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/expenses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', `Expense "${expTitle}" removed.`);
        fetchExpenses();
      } else {
        showNotification('error', data.error || 'Failed to delete expense.');
      }
    } catch {
      showNotification('error', 'Network error removing expense.');
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashSpent = expenses.filter((e) => e.payment_method === 'cash').reduce((sum, e) => sum + e.amount, 0);
  const upiSpent = expenses.filter((e) => e.payment_method === 'upi').reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.receipt_ref && e.receipt_ref.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.recorded_by.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1D13] tracking-tight">
            Operating Expenses
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchExpenses}
            className="p-2.5 rounded-xl border border-[#E6D9C5] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#786A5B] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8D672F] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <span className="text-xs uppercase tracking-wider text-[#786A5B] font-semibold">Total Operating Outflows</span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1D13] tracking-tight mt-1">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold uppercase tracking-wider">
            <span>Cash Disbursements</span>
            <Banknote className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-600 mt-1">
            ₹{cashSpent.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-700 font-semibold uppercase tracking-wider">
            <span>UPI / Bank Transfer</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-blue-600 mt-1">
            ₹{upiSpent.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Expense Ledger Table */}
      <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-serif font-bold text-base text-[#2A1D13] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8D672F]" />
            <span>Expense Vouchers</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search expense titles, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
              />
            </div>

            <div className="min-w-[190px]">
              <LuxurySelect
                size="sm"
                variant="admin"
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val as any)}
                options={[
                  { value: 'all', label: 'All Expense Categories' },
                  ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Mobile Expenses Card List */}
        <div className="md:hidden space-y-2.5">
          {filteredExpenses.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              No operating expenses match your selected filters.
            </div>
          ) : (
            filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 rounded-xl border border-[#EFE3D6] bg-white shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[#241912] truncate">{exp.title}</span>
                  <span className="font-mono font-bold text-sm text-[#241912] shrink-0">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                {exp.description && (
                  <p className="text-[11px] text-gray-500 line-clamp-2">{exp.description}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EFE3D6]/60 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D8AD56]/15 text-[#382216]">
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                        exp.payment_method === 'cash'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {exp.payment_method === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                      <span>{exp.payment_method.toUpperCase()}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-gray-500 font-mono text-[10px]">{exp.expense_date}</span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id, exp.title)}
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Expense Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EFE3D6] text-[#786B61] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Expense Title & Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3">Receipt / Ref</th>
                <th className="py-2.5 px-3">Authorized By</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No operating expenses match your selected filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#241912]">{exp.title}</div>
                      {exp.description && (
                        <div className="text-[11px] text-gray-500 line-clamp-1">{exp.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D8AD56]/15 text-[#382216]">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 capitalize font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                          exp.payment_method === 'cash'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {exp.payment_method === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        <span>{exp.payment_method.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                      {exp.receipt_ref || '—'}
                    </td>
                    <td className="py-3 px-3 text-gray-700">{exp.recorded_by}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-sm text-[#241912]">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Expense Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Expense */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" data-testid="record-expense-modal" className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#EFE3D6] animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <h3 className="font-serif font-bold text-lg text-[#241912] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D8AD56]" />
                <span>Record New Hotel Operating Expense</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#241912] mb-1">Expense Category</label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={category}
                    onChange={(val) => setCategory(val as ExpenseCategory)}
                    options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241912] mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EFE3D6] text-xs font-mono text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241912] mb-1">Expense Title / Vendor</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linen Laundry Batch 40 sheets, 20L Diesel for Generator"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#241912] mb-1">Disbursement Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-sm font-mono font-bold text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241912] mb-1">Payment Method</label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                    options={[
                      { value: 'cash', label: 'Cash (Auto-deducts from Drawer)' },
                      { value: 'upi', label: 'UPI / QR Code Scan' },
                      { value: 'card', label: 'Business Debit / Credit Card' },
                      { value: 'online', label: 'Net Banking / NEFT' },
                    ]}
                  />
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <b>Front Desk Linkage:</b> Since payment method is Cash, this will automatically record a cash-out transaction in the active front desk shift.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Invoice / Receipt Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-981 or Vendor Bill #"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs font-mono text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Items delivered, warranty info, vendor contact details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE3D6] text-xs text-[#241912] focus:outline-none focus:ring-1 focus:ring-[#D8AD56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold shadow-md"
                >
                  {submitting ? 'Recording...' : 'Authorize & Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
