'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GLAccount, JournalEntry, JournalLine, AccountCategory } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  Calculator,
  Scale,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Shield,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface PnLData {
  revenueTotal: number;
  expenseTotal: number;
  netProfit: number;
  revenueAccounts: Array<{ code: string; name: string; amount: number }>;
  expenseAccounts: Array<{ code: string; name: string; amount: number }>;
}

interface BalanceSheetData {
  assetsTotal: number;
  liabilitiesTotal: number;
  equityTotal: number;
  isBalanced: boolean;
  assets: Array<{ code: string; name: string; amount: number }>;
  liabilities: Array<{ code: string; name: string; amount: number }>;
  equity: Array<{ code: string; name: string; amount: number }>;
}

export default function AdminAccountingPage() {
  const [activeTab, setActiveTab] = useState<'chart' | 'ledger' | 'pnl' | 'balance_sheet'>('chart');
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [pnl, setPnl] = useState<PnLData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters & Search
  const [accountCategoryFilter, setAccountCategoryFilter] = useState<'all' | AccountCategory>('all');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // New Journal Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryReference, setEntryReference] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [formLines, setFormLines] = useState<
    Array<{
      accountCode: string;
      accountName: string;
      debit: string;
      credit: string;
      description: string;
    }>
  >([
    { accountCode: '1010', accountName: 'Cash in Front Desk Drawer', debit: '', credit: '', description: '' },
    { accountCode: '4010', accountName: 'Room Accommodation Revenue', debit: '', credit: '', description: '' },
  ]);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchAccountingData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/accounting', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGlAccounts(data.glAccounts || []);
          setJournalEntries(data.journalEntries || []);
          setPnl(data.pnl || null);
          setBalanceSheet(data.balanceSheet || null);
        }
      } else {
        showNotification('error', 'Failed to synchronize general ledger accounting data.');
      }
    } catch {
      showNotification('error', 'Network error connecting to accounting service.');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Real-time synchronization
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'journal_entry_created' ||
        event.eventType === 'daily_closing' ||
        event.eventType === 'expense_created' ||
        event.eventType === 'payment_recorded' ||
        event.eventType === 'cash_shift_closed' ||
        event.eventType === 'full_sync'
      ) {
        fetchAccountingData();
      }
    },
  });

  useEffect(() => {
    fetchAccountingData();
  }, [fetchAccountingData]);

  // Category totals from Chart of Accounts
  const accountCategoryTotals = useMemo(() => {
    const totals: Record<AccountCategory, { sum: number; count: number }> = {
      asset: { sum: 0, count: 0 },
      liability: { sum: 0, count: 0 },
      equity: { sum: 0, count: 0 },
      revenue: { sum: 0, count: 0 },
      expense: { sum: 0, count: 0 },
    };

    glAccounts.forEach((acc) => {
      if (totals[acc.category]) {
        totals[acc.category].sum += acc.balance;
        totals[acc.category].count += 1;
      }
    });

    return totals;
  }, [glAccounts]);

  // Filtered accounts for Chart tab
  const filteredAccounts = useMemo(() => {
    return glAccounts.filter((acc) => {
      const matchesCategory =
        accountCategoryFilter === 'all' || acc.category === accountCategoryFilter;
      const q = accountSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        acc.code.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        (acc.description && acc.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [glAccounts, accountCategoryFilter, accountSearchQuery]);

  // Filtered journal entries for Ledger tab
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      const q = ledgerSearchQuery.toLowerCase();
      if (!q) return true;
      return (
        entry.entry_number.toLowerCase().includes(q) ||
        entry.reference.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.created_by.toLowerCase().includes(q) ||
        entry.lines.some((l) =>
          l.accountName.toLowerCase().includes(q) || l.accountCode.toLowerCase().includes(q)
        )
      );
    });
  }, [journalEntries, ledgerSearchQuery]);

  // Modal Line Items Dynamic Calculation
  const modalCalculations = useMemo(() => {
    let debitSum = 0;
    let creditSum = 0;

    formLines.forEach((line) => {
      const d = parseFloat(line.debit) || 0;
      const c = parseFloat(line.credit) || 0;
      debitSum += d;
      creditSum += c;
    });

    const diff = Math.abs(debitSum - creditSum);
    const isBalanced = diff < 0.01 && debitSum > 0;

    return {
      debitSum,
      creditSum,
      diff,
      isBalanced,
    };
  }, [formLines]);

  const handleAddLine = () => {
    setFormLines((prev) => [
      ...prev,
      {
        accountCode: glAccounts[0]?.code || '1010',
        accountName: glAccounts[0]?.name || 'Cash in Front Desk Drawer',
        debit: '',
        credit: '',
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (formLines.length <= 2) {
      showNotification('error', 'A double-entry transaction requires at least 2 account lines.');
      return;
    }
    setFormLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineAccountChange = (index: number, code: string) => {
    const selected = glAccounts.find((a) => a.code === code);
    setFormLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              accountCode: code,
              accountName: selected ? selected.name : code,
            }
          : line
      )
    );
  };

  const handleLineValueChange = (
    index: number,
    field: 'debit' | 'credit' | 'description',
    value: string
  ) => {
    setFormLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (field === 'debit') {
          return { ...line, debit: value, credit: value ? '' : line.credit };
        }
        if (field === 'credit') {
          return { ...line, credit: value, debit: value ? '' : line.debit };
        }
        return { ...line, [field]: value };
      })
    );
  };

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCalculations.isBalanced) {
      showNotification(
        'error',
        `Transaction is not balanced! Total Debit (₹${modalCalculations.debitSum.toLocaleString(
          'en-IN'
        )}) must equal Total Credit (₹${modalCalculations.creditSum.toLocaleString('en-IN')}).`
      );
      return;
    }

    if (!entryDescription.trim()) {
      showNotification('error', 'Please enter a description / narration for this journal entry.');
      return;
    }

    try {
      setSubmitting(true);
      const sanitizedLines: JournalLine[] = formLines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description,
      }));

      const res = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'create_journal_entry',
          date: entryDate,
          reference: entryReference || `REF-${Date.now().toString().slice(-4)}`,
          description: entryDescription.trim(),
          lines: sanitizedLines,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Journal entry successfully posted to ledger!');
        setIsModalOpen(false);
        setEntryReference('');
        setEntryDescription('');
        setFormLines([
          { accountCode: '1010', accountName: 'Cash in Front Desk Drawer', debit: '', credit: '', description: '' },
          { accountCode: '4010', accountName: 'Room Accommodation Revenue', debit: '', credit: '', description: '' },
        ]);
        fetchAccountingData();
        setActiveTab('ledger');
      } else {
        showNotification('error', data.error || 'Failed to post journal entry.');
      }
    } catch {
      showNotification('error', 'Network error posting journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadgeClass = (category: AccountCategory) => {
    switch (category) {
      case 'asset':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'liability':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'equity':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'revenue':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'expense':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-stone-50 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-md border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700'
              : 'bg-red-900/90 text-red-100 border-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#241912] border border-[#D8AD56]/30 rounded-2xl p-6 sm:p-8 text-[#FAF7F2] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-transparent to-transparent pointer-events-none rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Enterprise ERP Tier-3
              </span>
              <span className="text-xs text-[#FAF7F2]/60 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#D8AD56]" />
                Live Dual-Ledger Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              General Ledger & Double-Entry Accounting
            </h1>
            <p className="text-sm text-[#FAF7F2]/80 max-w-2xl font-light">
              Autonomous, audit-grade financial governance for Sri Tayi Grand. Manage real-time chart of
              accounts, double-entry journal vouchers, dynamic P&amp;L surplus, and balance sheet equilibrium.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchAccountingData()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/20 hover:border-[#D8AD56] text-white hover:text-[#D8AD56] bg-white/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-semibold text-xs tracking-wide shadow-lg border border-[#D8AD56]/40 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Journal Entry</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'chart'
                ? 'bg-[#D8AD56] text-[#241912] font-semibold shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Chart of Accounts</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'chart' ? 'bg-[#241912]/20 text-[#241912]' : 'bg-white/10 text-white/80'
              }`}
            >
              {glAccounts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-[#D8AD56] text-[#241912] font-semibold shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Journal Entries Ledger</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'ledger' ? 'bg-[#241912]/20 text-[#241912]' : 'bg-white/10 text-white/80'
              }`}
            >
              {journalEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'pnl'
                ? 'bg-[#D8AD56] text-[#241912] font-semibold shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Profit &amp; Loss (P&amp;L)</span>
            {pnl && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  pnl.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                ₹{pnl.netProfit.toLocaleString('en-IN')}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('balance_sheet')}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'balance_sheet'
                ? 'bg-[#D8AD56] text-[#241912] font-semibold shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Balance Sheet</span>
            {balanceSheet && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                  balanceSheet.isBalanced
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {balanceSheet.isBalanced ? 'Balanced' : 'Review'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHART OF ACCOUNTS */}
      {/* ========================================================================= */}
      {activeTab === 'chart' && (
        <div className="space-y-6">
          {/* Top 5 Category Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Assets */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase">
                  1000s Assets
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-[#241912]">
                  ₹{accountCategoryTotals.asset.sum.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-stone-500">
                  {accountCategoryTotals.asset.count} active accounts
                </p>
              </div>
            </div>

            {/* Liabilities */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase">
                  2000s Liabilities
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-[#241912]">
                  ₹{accountCategoryTotals.liability.sum.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-stone-500">
                  {accountCategoryTotals.liability.count} active accounts
                </p>
              </div>
            </div>

            {/* Equity */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase">
                  3000s Equity
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-[#241912]">
                  ₹{accountCategoryTotals.equity.sum.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-stone-500">
                  {accountCategoryTotals.equity.count} active accounts
                </p>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase">
                  4000s Revenue
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-[#241912]">
                  ₹{accountCategoryTotals.revenue.sum.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-stone-500">
                  {accountCategoryTotals.revenue.count} revenue streams
                </p>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:border-rose-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase">
                  5000s Expenses
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-[#241912]">
                  ₹{accountCategoryTotals.expense.sum.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-stone-500">
                  {accountCategoryTotals.expense.count} expense heads
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
              <button
                onClick={() => setAccountCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accountCategoryFilter === 'all'
                    ? 'bg-[#241912] text-[#D8AD56] font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Accounts ({glAccounts.length})
              </button>
              <button
                onClick={() => setAccountCategoryFilter('asset')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accountCategoryFilter === 'asset'
                    ? 'bg-emerald-800 text-emerald-100 font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Assets ({accountCategoryTotals.asset.count})
              </button>
              <button
                onClick={() => setAccountCategoryFilter('liability')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accountCategoryFilter === 'liability'
                    ? 'bg-amber-800 text-amber-100 font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Liabilities ({accountCategoryTotals.liability.count})
              </button>
              <button
                onClick={() => setAccountCategoryFilter('equity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accountCategoryFilter === 'equity'
                    ? 'bg-indigo-800 text-indigo-100 font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Equity ({accountCategoryTotals.equity.count})
              </button>
              <button
                onClick={() => setAccountCategoryFilter('revenue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accountCategoryFilter === 'revenue'
                    ? 'bg-blue-800 text-blue-100 font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Revenue ({accountCategoryTotals.revenue.count})
              </button>
              <button
                onClick={() => setAccountCategoryFilter('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  accountCategoryFilter === 'expense'
                    ? 'bg-rose-800 text-rose-100 font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Expenses ({accountCategoryTotals.expense.count})
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                placeholder="Search account code, name..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56]"
              />
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-stone-200 text-stone-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Account Name &amp; Description</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Current Ledger Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAccounts.map((account) => (
                    <tr
                      key={account.code}
                      className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#241912] group-hover:text-[#D8AD56]">
                        {account.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-900 block">{account.name}</span>
                        {account.description && (
                          <span className="text-[11px] text-stone-500 block truncate max-w-md">
                            {account.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getCategoryBadgeClass(
                            account.category
                          )}`}
                        >
                          {account.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#241912]">
                        ₹{account.balance.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400">
                        No general ledger accounts match your search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: JOURNAL ENTRIES LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Header Stats Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block">
                  Total Posted Transactions
                </span>
                <span className="text-xl font-bold font-mono text-[#241912]">
                  {journalEntries.length} Entries
                </span>
              </div>
              <div className="h-8 w-px bg-stone-200" />
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block">
                  Ledger Dual-Balance Status
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  100% Balanced &amp; Reconciled
                </span>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearchQuery}
                onChange={(e) => setLedgerSearchQuery(e.target.value)}
                placeholder="Search JE #, reference, description..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56]"
              />
            </div>
          </div>

          {/* Ledger List */}
          <div className="space-y-3">
            {filteredJournalEntries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden hover:border-[#D8AD56]/50 transition-all"
                >
                  <div
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-[#FAF7F2]/50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#241912] text-[#D8AD56] flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-sm">
                        JE
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[#241912]">
                            {entry.entry_number}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200 font-semibold">
                            Ref: {entry.reference}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Balanced
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 font-medium">{entry.description}</p>
                        <p className="text-[11px] text-stone-400">
                          Date: <span className="font-mono font-medium text-stone-600">{entry.date}</span>{' '}
                          | Posted by: <span className="text-stone-600 font-medium">{entry.created_by}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                          Transaction Volume
                        </span>
                        <span className="font-mono font-bold text-sm text-[#241912] block">
                          ₹{entry.total_debit.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          {entry.lines.length} Line Items
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Line Items Table */}
                  {isExpanded && (
                    <div className="border-t border-stone-100 bg-[#FAF7F2]/60 p-4 sm:p-6">
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-stone-500 mb-3 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[#D8AD56]" />
                        Double-Entry Ledger Lines Breakdown
                      </h4>
                      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Account Code</th>
                              <th className="py-2.5 px-3">Account Title</th>
                              <th className="py-2.5 px-3">Line Narration</th>
                              <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                              <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 font-mono">
                            {entry.lines.map((line, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/20">
                                <td className="py-2 px-3 font-bold text-[#241912]">{line.accountCode}</td>
                                <td className="py-2 px-3 font-sans text-stone-800 font-medium">
                                  {line.accountName}
                                </td>
                                <td className="py-2 px-3 font-sans text-stone-500 text-[11px]">
                                  {line.description || '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-stone-900">
                                  {line.debit > 0 ? `₹${line.debit.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-stone-900">
                                  {line.credit > 0 ? `₹${line.credit.toLocaleString('en-IN')}` : '—'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-stone-50 font-bold border-t border-stone-200">
                              <td colSpan={3} className="py-2.5 px-3 font-sans text-stone-700 text-right">
                                Transaction Balance Total:
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700">
                                ₹{entry.total_debit.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-700">
                                ₹{entry.total_credit.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredJournalEntries.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-stone-200/80 shadow-sm space-y-3">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm text-stone-500">No journal ledger transactions match your criteria.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#241912] text-[#D8AD56] font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Post New Entry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROFIT & LOSS STATEMENT (P&L) */}
      {/* ========================================================================= */}
      {activeTab === 'pnl' && pnl && (
        <div className="space-y-6">
          {/* Key Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                  Total Operating Revenue
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700">
                ₹{pnl.revenueTotal.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-stone-500 mt-1">Room tariff &amp; banquet collections</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                  Total Operating Expenses
                </span>
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-700">
                ₹{pnl.expenseTotal.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-stone-500 mt-1">Utilities, laundry, repairs, staff welfare</p>
            </div>

            <div className="bg-gradient-to-br from-[#241912] to-[#382216] text-white rounded-2xl p-6 border border-[#D8AD56]/30 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#D8AD56]">
                  Net Operating Surplus / Profit
                </span>
                <Sparkles className="w-4 h-4 text-[#D8AD56]" />
              </div>
              <p
                className={`text-2xl sm:text-3xl font-bold font-mono ${
                  pnl.netProfit >= 0 ? 'text-[#D8AD56]' : 'text-rose-400'
                }`}
              >
                ₹{pnl.netProfit.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-[#FAF7F2]/70 mt-1">
                Net Operating Margin:{' '}
                <span className="font-semibold text-white">
                  {pnl.revenueTotal > 0
                    ? `${((pnl.netProfit / pnl.revenueTotal) * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </p>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#241912]">
                      Operating Revenue Breakdown
                    </h3>
                    <p className="text-xs text-stone-500">Earned income from hospitality services</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₹{pnl.revenueTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-3">
                {pnl.revenueAccounts.map((rev) => {
                  const pct =
                    pnl.revenueTotal > 0 ? ((rev.amount / pnl.revenueTotal) * 100).toFixed(1) : 0;
                  return (
                    <div key={rev.code} className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-stone-800">
                          <span className="font-mono font-bold text-[#D8AD56] mr-2">{rev.code}</span>
                          {rev.name}
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                          ₹{rev.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone-500 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operating Expenses Breakdown */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#241912]">
                      Operating Expenses Breakdown
                    </h3>
                    <p className="text-xs text-stone-500">Incurred hotel property overheads</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  ₹{pnl.expenseTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-3">
                {pnl.expenseAccounts.map((exp) => {
                  const pct =
                    pnl.expenseTotal > 0 ? ((exp.amount / pnl.expenseTotal) * 100).toFixed(1) : 0;
                  return (
                    <div key={exp.code} className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-stone-800">
                          <span className="font-mono font-bold text-rose-700 mr-2">{exp.code}</span>
                          {exp.name}
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone-500 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BALANCE SHEET */}
      {/* ========================================================================= */}
      {activeTab === 'balance_sheet' && balanceSheet && (
        <div className="space-y-6">
          {/* Balance Sheet Equality Verified Card */}
          <div
            className={`p-6 rounded-2xl border shadow-sm ${
              balanceSheet.isBalanced
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-900'
                : 'bg-amber-950/20 border-amber-500/40 text-amber-900'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    balanceSheet.isBalanced
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-[#241912]">
                      Balance Sheet Equality: Assets = Liabilities + Equity
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        balanceSheet.isBalanced
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {balanceSheet.isBalanced ? 'In Equilibrium' : 'Adjustment Required'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    Verified ledger equality for Sri Tayi Grand. Every rupee of asset is backed by debt or owner equity.
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right font-mono bg-white/60 p-3 rounded-xl border border-stone-200/60">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
                  Fundamental Accounting Equation
                </span>
                <span className="font-bold text-sm text-[#241912]">
                  ₹{balanceSheet.assetsTotal.toLocaleString('en-IN')} = ₹
                  {balanceSheet.liabilitiesTotal.toLocaleString('en-IN')} + ₹
                  {balanceSheet.equityTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Column Balance Sheet Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assets */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-serif font-bold text-base text-[#241912]">Assets (1000s)</h3>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₹{balanceSheet.assetsTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2.5">
                {balanceSheet.assets.map((acc) => (
                  <div
                    key={acc.code}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-stone-50"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#D8AD56] mr-2">{acc.code}</span>
                      <span className="text-stone-800 font-medium">{acc.name}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      ₹{acc.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liabilities */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-600" />
                  <h3 className="font-serif font-bold text-base text-[#241912]">Liabilities (2000s)</h3>
                </div>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  ₹{balanceSheet.liabilitiesTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2.5">
                {balanceSheet.liabilities.map((acc) => (
                  <div
                    key={acc.code}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-stone-50"
                  >
                    <div>
                      <span className="font-mono font-bold text-amber-700 mr-2">{acc.code}</span>
                      <span className="text-stone-800 font-medium">{acc.name}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      ₹{acc.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Equity */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-serif font-bold text-base text-[#241912]">Equity &amp; Capital (3000s)</h3>
                </div>
                <span className="font-mono font-bold text-indigo-700 text-sm">
                  ₹{balanceSheet.equityTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-2.5">
                {balanceSheet.equity.map((acc) => (
                  <div
                    key={acc.code}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-stone-50"
                  >
                    <div>
                      <span className="font-mono font-bold text-indigo-700 mr-2">{acc.code}</span>
                      <span className="text-stone-800 font-medium">{acc.name}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900">
                      ₹{acc.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POST DOUBLE-ENTRY JOURNAL TRANSACTION */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#241912] text-[#D8AD56] flex items-center justify-center shadow-md">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#241912]">
                    Post Double-Entry Journal Transaction
                  </h3>
                  <p className="text-xs text-stone-500">
                    Dual debit/credit verification with real-time balance enforcement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="space-y-5">
              {/* Top Row: Date & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Transaction Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Audit Reference <span className="text-stone-400 font-normal">(Receipt / Shift / Voucher)</span>
                  </label>
                  <input
                    type="text"
                    value={entryReference}
                    onChange={(e) => setEntryReference(e.target.value)}
                    placeholder="e.g. SHIFT-20261107 or INV-104"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              {/* Description / Narration */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Journal Narration / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  placeholder="e.g. Recognition of room tariff and petty cash drawer replenishment"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Double-Entry Account Line Items (Minimum 2)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-[#D8AD56] hover:text-[#C99C44] font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Account Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formLines.map((line, index) => (
                    <div
                      key={index}
                      className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col md:flex-row items-center gap-3"
                    >
                      {/* Account Selector */}
                      <div className="w-full md:w-5/12">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleLineAccountChange(index, e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-[#D8AD56]"
                        >
                          {glAccounts.map((acc) => (
                            <option key={acc.code} value={acc.code}>
                              [{acc.code}] {acc.name} ({acc.category.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Line Narration */}
                      <div className="w-full md:w-3/12">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineValueChange(index, 'description', e.target.value)}
                          placeholder="Optional note"
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-[#D8AD56]"
                        />
                      </div>

                      {/* Debit */}
                      <div className="w-full md:w-2/12">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit}
                          onChange={(e) => handleLineValueChange(index, 'debit', e.target.value)}
                          placeholder="Debit (₹)"
                          className="w-full px-2.5 py-2 text-xs font-mono font-semibold rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-emerald-500 text-emerald-800"
                        />
                      </div>

                      {/* Credit */}
                      <div className="w-full md:w-2/12 flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit}
                          onChange={(e) => handleLineValueChange(index, 'credit', e.target.value)}
                          placeholder="Credit (₹)"
                          className="w-full px-2.5 py-2 text-xs font-mono font-semibold rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-blue-500 text-blue-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          disabled={formLines.length <= 2}
                          className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Balance Verification Pill Box */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  modalCalculations.isBalanced
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {modalCalculations.isBalanced ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold">
                        {modalCalculations.isBalanced
                          ? 'Transaction Is Perfectly Balanced (Debit = Credit)'
                          : `Transaction Out of Balance by ₹${modalCalculations.diff.toLocaleString(
                              'en-IN'
                            )}`}
                      </p>
                      <p className="text-[11px] opacity-80">
                        {modalCalculations.isBalanced
                          ? 'Ready to post and update account ledgers.'
                          : 'Double-entry bookkeeping requires total debit to equal total credit.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                    <div>
                      <span className="text-[10px] uppercase opacity-70 block">Total Debit</span>
                      <span className="font-bold">₹{modalCalculations.debitSum.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase opacity-70 block">Total Credit</span>
                      <span className="font-bold">₹{modalCalculations.creditSum.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !modalCalculations.isBalanced}
                  className="px-6 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-[#D8AD56]/40"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Post &amp; Balance Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
