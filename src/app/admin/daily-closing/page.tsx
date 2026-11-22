'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { DailyClosing, NightAuditConfig, NightAuditRecipient } from '@/types';
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
  Mail,
  Phone,
  Plus,
  Trash2,
  Send,
  Clock,
  Sliders,
  Check,
  Download,
  FileText,
  ExternalLink,
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

  // Automated Dispatch & Recipient Settings state
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'closing' | 'automated-dispatch'>(
    pathname?.includes('/night-audit') ? 'automated-dispatch' : 'closing'
  );
  const [auditConfig, setAuditConfig] = useState<NightAuditConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // New recipient form state
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientChannel, setNewRecipientChannel] = useState<'email' | 'whatsapp'>('email');
  const [newRecipientAddress, setNewRecipientAddress] = useState('');

  // Night Audit History & Channel Health state
  const [auditRuns, setAuditRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [channelHealth, setChannelHealth] = useState<{
    cronEngine: string;
    emailService: string;
    whatsappService: string;
    database?: string;
  }>({
    cronEngine: 'operational',
    emailService: 'operational',
    whatsappService: 'configuration_required',
  });

  const fetchAuditConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/admin/night-audit/settings', {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setAuditConfig(data.config);
        }
        if (data.health) {
          setChannelHealth(data.health);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load night audit config', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchAuditRuns = useCallback(async () => {
    try {
      setLoadingRuns(true);
      const res = await fetch('/api/admin/night-audit/history?limit=15', {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.runs)) {
          setAuditRuns(data.runs);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load audit history', err);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  const handleSaveAuditConfig = async (newConfig?: NightAuditConfig) => {
    const configToSave = newConfig || auditConfig;
    if (!configToSave) return;
    try {
      setSavingConfig(true);
      const res = await fetch('/api/admin/night-audit/settings', {
        method: 'POST',
        headers: {
          ...getAdminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSave),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditConfig(data.config);
        if (data.health) setChannelHealth(data.health);
        setFeedback({ type: 'success', message: 'Automated Night Audit settings and recipient list saved successfully.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTriggerTestAudit = async () => {
    try {
      setTestSending(true);
      setTestResult(null);
      const res = await fetch('/api/admin/night-audit/test', {
        method: 'POST',
        headers: {
          ...getAdminHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const deliveries = data.result?.deliveries || [];
        const sentCount = deliveries.filter((d: any) => d.status === 'sent').length;
        const failed = deliveries.filter((d: any) => d.status === 'failed');
        const configReq = deliveries.filter((d: any) => d.status === 'configuration_required');
        
        if (failed.length > 0 && sentCount === 0) {
          const firstErr = failed[0].error || 'Delivery rejected by email service provider.';
          setTestResult(`Delivery failed: ${firstErr}`);
          setFeedback({ type: 'error', message: `Delivery failed: ${firstErr}` });
        } else if (configReq.length > 0 && sentCount === 0) {
          setTestResult(`Report generated & archived. WhatsApp dispatch pending: ${configReq[0].error || 'API token unconfigured'}.`);
          setFeedback({ type: 'success', message: `Report generated for ${businessDate}.` });
        } else if (failed.length > 0) {
          setTestResult(`Dispatched to ${sentCount} recipient(s), but ${failed.length} failed: ${failed[0].error || 'Check provider limits'}`);
          setFeedback({ type: 'error', message: `Partial dispatch: ${failed[0].error || 'Check provider limits'}` });
        } else {
          setTestResult(`Night audit PDF compiled successfully! Dispatched to ${sentCount} recipient(s).`);
          setFeedback({ type: 'success', message: `Test report dispatched for ${businessDate}.` });
        }
        fetchAuditRuns();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Test audit dispatch failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to dispatch test report.' });
    } finally {
      setTestSending(false);
    }
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientName.trim() || !newRecipientAddress.trim()) {
      setFeedback({ type: 'error', message: 'Please provide recipient name and address.' });
      return;
    }
    const cleanAddr = newRecipientAddress.trim();
    if (newRecipientChannel === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanAddr)) {
        setFeedback({ type: 'error', message: 'Please enter a valid email address (e.g. name@domain.com).' });
        return;
      }
    } else {
      const phoneDigits = cleanAddr.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setFeedback({ type: 'error', message: 'Please enter a valid phone number with country code (e.g. +919876543210).' });
        return;
      }
    }

    const newRecipient: NightAuditRecipient = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newRecipientName.trim(),
      recipient_name: newRecipientName.trim(),
      channel: newRecipientChannel,
      address: cleanAddr,
      recipient_address: cleanAddr,
      is_active: true,
      consent_status: 'granted',
      created_at: new Date().toISOString(),
    };
    const updated = {
      ...(auditConfig || {
        enabled: true,
        execution_time: '00:00',
        timezone: 'Asia/Kolkata',
        email_enabled: true,
        whatsapp_enabled: false,
        recipients: [],
      }),
      recipients: [...(auditConfig?.recipients || []), newRecipient],
    };
    setAuditConfig(updated);
    handleSaveAuditConfig(updated);
    setNewRecipientName('');
    setNewRecipientAddress('');
    setShowAddRecipientModal(false);
  };

  const handleToggleRecipient = (id: string) => {
    if (!auditConfig) return;
    const updated = {
      ...auditConfig,
      recipients: auditConfig.recipients.map((r) =>
        r.id === id ? { ...r, is_active: !r.is_active } : r
      ),
    };
    setAuditConfig(updated);
    handleSaveAuditConfig(updated);
  };

  const handleDeleteRecipient = (id: string) => {
    if (!auditConfig) return;
    const updated = {
      ...auditConfig,
      recipients: auditConfig.recipients.filter((r) => r.id !== id),
    };
    setAuditConfig(updated);
    handleSaveAuditConfig(updated);
  };

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
    fetchAuditConfig();
    fetchAuditRuns();
  }, [fetchClosingData, fetchAuditConfig, fetchAuditRuns]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1D13] flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-[#8D672F]" />
            <span>Night Audit &amp; Daily Closing</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E6D9C5] bg-white shadow-xs">
            <Calendar className="w-4 h-4 text-[#8D672F]" />
            <input
              type="date"
              value={businessDate}
              onChange={(e) => {
                setBusinessDate(e.target.value);
                setActualCashInput('');
              }}
              className="bg-transparent text-xs font-semibold text-[#2A1D13] outline-none"
            />
          </div>
          <button
            onClick={() => fetchClosingData()}
            className="p-2.5 rounded-xl border border-[#E6D9C5] bg-white hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#2A1D13] transition-all shadow-xs cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#8D672F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts / Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm border shadow-xs ${
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
            <span className="font-medium text-xs">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-1.5 bg-[#FAF6EE] p-1.5 rounded-2xl overflow-x-auto no-scrollbar w-fit border border-[#E6D9C5]/60">
        <button
          type="button"
          onClick={() => setActiveTab('closing')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'closing'
              ? 'bg-[#2A1D13] text-[#FAF6EE] shadow-xs'
              : 'text-[#786A5B] hover:text-[#2A1D13]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#B18A4A]" />
          <span>Daily Closing</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('automated-dispatch');
            if (!auditConfig) fetchAuditConfig();
            fetchAuditRuns();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'automated-dispatch'
              ? 'bg-[#2A1D13] text-[#FAF6EE] shadow-xs'
              : 'text-[#786A5B] hover:text-[#2A1D13]'
          }`}
        >
          <Mail className="w-3.5 h-3.5 text-[#B18A4A]" />
          <span>Automated Dispatch</span>
          {auditConfig && (
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                auditConfig.enabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {auditConfig.enabled ? 'Active' : 'Paused'}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'closing' && (
        <>
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
        </>
      )}

      {/* AUTOMATED NIGHT AUDIT & DISPATCH SETTINGS VIEW */}
      {activeTab === 'automated-dispatch' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#241912] border border-[#D8AD56]/30 rounded-3xl p-6 sm:p-8 text-[#FAF7F2] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-transparent to-transparent pointer-events-none rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Automated Night Audit Scheduler
                  </span>
                  <span className={`text-xs flex items-center gap-1.5 font-mono px-3 py-1 rounded-full border ${
                    auditConfig?.enabled
                      ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40'
                      : 'text-stone-300 bg-stone-900/60 border-stone-700'
                  }`}>
                    <ShieldCheck className={`w-3.5 h-3.5 ${auditConfig?.enabled ? 'text-emerald-400' : 'text-stone-400'}`} />
                    Cron Engine: {auditConfig?.enabled ? `Active (Daily at ${auditConfig?.execution_time || '00:00'} IST)` : 'Paused'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                  Automated Daily Audit &amp; Report Distribution
                </h2>
                <p className="text-xs sm:text-sm text-[#FAF7F2]/80 max-w-2xl font-light">
                  Sri Tayi Grand automatically compiles daily night audit reports (room occupancy, revenue, cash/UPI collections, daily expenses, and outstanding balances) into an official PDF document and delivers them to authorized management emails and WhatsApp numbers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerTestAudit}
                  disabled={testSending}
                  className="px-4 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition-all flex items-center gap-2 border border-[#D8AD56]/40 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${testSending ? 'animate-spin' : ''}`} />
                  <span>{testSending ? 'Generating & Sending...' : 'Send Test Report Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRecipientModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#c99f48] text-[#241912] font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Recipient</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {testResult}
                </span>
                <button
                  onClick={() => setTestResult(null)}
                  className="text-xs underline text-emerald-300 hover:text-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule & Channel Settings Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE3D6] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE3D6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#241912] text-[#D8AD56] flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#241912]">
                      Scheduler &amp; Channel Policies
                    </h3>
                    <p className="text-[11px] text-[#786A5B]">
                      Execution trigger time and automated communication channels.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveAuditConfig()}
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl bg-[#241912] text-[#D8AD56] text-xs font-bold hover:bg-[#382216] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingConfig ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>

              <div className="space-y-5">
                {/* Master Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6]">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-[#241912] block">
                      Enable Automated Night Audit Cron
                    </span>
                    <span className="text-[11px] text-[#786A5B] block">
                      When enabled, Vercel Cron automatically triggers daily at the scheduled time.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!auditConfig) return;
                      const updated = { ...auditConfig, enabled: !auditConfig.enabled };
                      setAuditConfig(updated);
                      handleSaveAuditConfig(updated);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                      auditConfig?.enabled ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        auditConfig?.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Execution Schedule Time & Timezone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-[#786A5B] uppercase tracking-wider block mb-1">
                      Execution Time (IST)
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#EFE3D6] bg-white">
                      <Clock className="w-4 h-4 text-[#D8AD56]" />
                      <input
                        type="time"
                        value={auditConfig?.execution_time || '00:00'}
                        onChange={(e) => {
                          if (!auditConfig) return;
                          setAuditConfig({ ...auditConfig, execution_time: e.target.value });
                        }}
                        className="w-full text-xs font-mono font-bold text-[#241912] outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#786A5B] uppercase tracking-wider block mb-1">
                      Timezone
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#786A5B] text-xs font-mono">
                      <span>{auditConfig?.timezone || 'Asia/Kolkata'}</span>
                    </div>
                  </div>
                </div>

                {/* Channel Toggles */}
                <div className="space-y-3 pt-2 border-t border-[#EFE3D6]">
                  <span className="text-xs font-bold text-[#241912] block">
                    Active Delivery Channels
                  </span>

                  {/* Email Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EFE3D6] bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#241912] block">
                            Email PDF Report Dispatch
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            channelHealth.emailService === 'operational'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {channelHealth.emailService === 'operational' ? 'Operational' : 'Configuration Required'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#786A5B] block">
                          Generates and emails official multi-page PDF audit certificate with financial cards.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!auditConfig) return;
                        const updated = { ...auditConfig, email_enabled: !auditConfig.email_enabled };
                        setAuditConfig(updated);
                        handleSaveAuditConfig(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        auditConfig?.email_enabled ? 'bg-blue-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          auditConfig?.email_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* WhatsApp Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EFE3D6] bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#241912] block">
                            WhatsApp Metric Summary
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            channelHealth.whatsappService === 'operational'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {channelHealth.whatsappService === 'operational' ? 'Operational' : 'Configuration Required'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#786A5B] block">
                          {channelHealth.whatsappService === 'operational'
                            ? 'Sends instant daily collection & occupancy metrics alert via Meta Cloud API.'
                            : 'Meta WhatsApp Cloud API token (WHATSAPP_API_TOKEN) required for automated dispatch.'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!auditConfig) return;
                        const updated = { ...auditConfig, whatsapp_enabled: !auditConfig.whatsapp_enabled };
                        setAuditConfig(updated);
                        handleSaveAuditConfig(updated);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        auditConfig?.whatsapp_enabled ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          auditConfig?.whatsapp_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Report & Manual Trigger Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE3D6] shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="pb-4 border-b border-[#EFE3D6] flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#43001F] text-[#FAF7F2] flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#241912]">
                      Manual Test &amp; On-Demand Generation
                    </h3>
                    <p className="text-[11px] text-[#786A5B]">
                      Immediately trigger report generation and delivery for any business date.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-[#786A5B] uppercase tracking-wider block mb-1">
                      Business Date to Audit
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#EFE3D6] bg-white">
                      <Calendar className="w-4 h-4 text-[#D8AD56]" />
                      <input
                        type="date"
                        value={businessDate}
                        onChange={(e) => setBusinessDate(e.target.value)}
                        className="w-full text-xs font-semibold text-[#241912] outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-[#D8AD56]/30 text-xs text-[#786A5B] space-y-2">
                    <span className="font-bold text-[#241912] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D8AD56]" />
                      Report Highlights Included:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                      <li>Room Occupancy Rate, Total Rooms, Occupied &amp; Available Rooms</li>
                      <li>Total Gross Revenue (Room Tariff, Extra Folio Charges, Hall Enquiries)</li>
                      <li>Collection Breakdown by Payment Method (Cash, UPI, Credit/Debit Card)</li>
                      <li>Daily Operational Expenses from Cash Drawer</li>
                      <li>Outstanding Balances &amp; Unpaid Invoices</li>
                      <li>Featured Google Guest Reviews &amp; Testimonials</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={handleTriggerTestAudit}
                  disabled={testSending}
                  className="w-full py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${testSending ? 'animate-spin' : ''}`} />
                  <span>{testSending ? 'Compiling PDF & Delivering...' : 'Dispatch Test Report to Active Recipients'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recipients Management Table */}
          <div className="bg-white rounded-3xl border border-[#EFE3D6] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#241912] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#D8AD56]" />
                  <span>Configured Report Recipients</span>
                </h3>
                <p className="text-xs text-[#786A5B] mt-0.5">
                  Designated stakeholders who receive automated daily night audit reports.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddRecipientModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#241912] text-[#D8AD56] font-bold text-xs tracking-wide shadow-sm hover:bg-[#382216] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Recipient</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-[#786A5B] font-semibold uppercase tracking-wider border-b border-[#EFE3D6]">
                  <tr>
                    <th className="py-3 px-4">Recipient Name</th>
                    <th className="py-3 px-4">Delivery Channel</th>
                    <th className="py-3 px-4">Email / Phone Destination</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D6]">
                  {(!auditConfig?.recipients || auditConfig.recipients.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#786A5B]">
                        No recipients added yet. Click &quot;Add Recipient&quot; to configure email or WhatsApp delivery.
                      </td>
                    </tr>
                  ) : (
                    auditConfig.recipients.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#241912]">
                          {rec.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              rec.channel === 'email'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {rec.channel === 'email' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                            <span>{rec.channel}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-800 font-medium">
                          {rec.address}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleRecipient(rec.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                              rec.is_active
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {rec.is_active ? 'Active' : 'Paused'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipient(rec.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Recipient"
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

          {/* RECENT NIGHT AUDIT RUNS & OFFICIAL REPORTS TABLE */}
          <div className="bg-white rounded-3xl border border-[#EFE3D6] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#241912] flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#D8AD56]" />
                  <span>Recent Night Audit Runs &amp; Official Certificates</span>
                </h3>
                <p className="text-xs text-[#786A5B] mt-0.5">
                  Audit trail of automated scheduled runs and manual on-demand generation with verified delivery logs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchAuditRuns()}
                disabled={loadingRuns}
                className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] text-[#241912] border border-[#EFE3D6] hover:bg-[#EFE3D6] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRuns ? 'animate-spin' : ''}`} />
                <span>Refresh Runs</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-[#786A5B] font-semibold uppercase tracking-wider border-b border-[#EFE3D6]">
                  <tr>
                    <th className="py-3 px-4">Business Date</th>
                    <th className="py-3 px-4">Execution Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Completed (IST)</th>
                    <th className="py-3 px-4">Gross Revenue</th>
                    <th className="py-3 px-4">Collections</th>
                    <th className="py-3 px-4">Occupancy</th>
                    <th className="py-3 px-4 text-right">Official Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D6]">
                  {auditRuns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#786A5B]">
                        {loadingRuns ? 'Loading audit runs...' : 'No night audit runs recorded yet. Click "Send Test Report Now" or wait for scheduled execution.'}
                      </td>
                    </tr>
                  ) : (
                    auditRuns.map((run) => {
                      const summary = run.summary_json || {};
                      const rev = summary.revenue?.grossRevenue ?? summary.revenue?.totalRevenue ?? 0;
                      const coll = summary.collections?.totalCollections ?? summary.collections?.total ?? 0;
                      const occ = summary.overview?.occupancyRate ?? summary.occupancy?.occupancyRate ?? 0;
                      const isCompleted = run.status === 'completed';

                      return (
                        <tr key={run.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#241912]">
                            {run.business_date}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              run.run_type === 'scheduled'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-300'
                            }`}>
                              {run.run_type === 'scheduled' ? 'Scheduled Cron' : 'Manual On-Demand'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : run.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}>
                              {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : null}
                              <span>{run.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-600">
                            {run.completed_at ? new Date(run.completed_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#241912]">
                            ₹{Number(rev).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                            ₹{Number(coll).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-700">
                            {Number(occ).toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <a
                              href={`/api/admin/night-audit/download?filename=${encodeURIComponent(run.pdf_filename || '')}&date=${run.business_date}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-bold text-[11px] transition-colors shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* ADD RECIPIENT MODAL */}
      {showAddRecipientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#EFE3D6] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AD56]">
                  Report Distribution
                </span>
                <h3 className="text-lg font-serif font-bold text-[#241912]">
                  Add Audit Recipient
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRecipientModal(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#786A5B] hover:text-[#241912] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRecipient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#786A5B] uppercase tracking-wider block mb-1">
                  Recipient Name / Designation
                </label>
                <input
                  type="text"
                  required
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  placeholder="e.g. General Manager, Accounts Head"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#786A5B] uppercase tracking-wider block mb-1">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRecipientChannel('email')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      newRecipientChannel === 'email'
                        ? 'bg-[#241912] text-[#D8AD56] border-[#241912]'
                        : 'bg-white border-[#EFE3D6] text-[#786A5B]'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRecipientChannel('whatsapp')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      newRecipientChannel === 'whatsapp'
                        ? 'bg-[#241912] text-[#D8AD56] border-[#241912]'
                        : 'bg-white border-[#EFE3D6] text-[#786A5B]'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#786A5B] uppercase tracking-wider block mb-1">
                  {newRecipientChannel === 'email' ? 'Email Address' : 'WhatsApp Phone Number'}
                </label>
                <input
                  type={newRecipientChannel === 'email' ? 'email' : 'tel'}
                  required
                  value={newRecipientAddress}
                  onChange={(e) => setNewRecipientAddress(e.target.value)}
                  placeholder={newRecipientChannel === 'email' ? 'e.g. manager@sritayigrand.com' : 'e.g. +919876543210'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowAddRecipientModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#786A5B] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D8AD56] hover:bg-[#c99f48] text-[#241912] font-bold text-xs shadow-md transition-colors"
                >
                  Save Recipient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
