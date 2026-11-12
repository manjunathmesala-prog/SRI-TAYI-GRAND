'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MaintenanceTicket,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { authStorage } from '@/lib/auth-storage';
import {
  Wrench,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ChevronRight,
  DollarSign,
  Building,
  Lock,
  Unlock,
  Trash2,
  X,
  Sparkles,
  Check,
  Play,
  RotateCcw,
} from 'lucide-react';

const CATEGORY_CONFIG: Record<
  MaintenanceCategory,
  { label: string; labelTe: string; iconBg: string; textCol: string }
> = {
  ac_climate: { label: 'Air Conditioning (HVAC)', labelTe: 'ఎయిర్ కండిషనింగ్ (HVAC)', iconBg: 'bg-cyan-50', textCol: 'text-cyan-800' },
  ac_hvac: { label: 'Air Conditioning (HVAC)', labelTe: 'ఎయిర్ కండిషనింగ్ (HVAC)', iconBg: 'bg-cyan-50', textCol: 'text-cyan-800' },
  plumbing_bath: { label: 'Plumbing & Sanitary', labelTe: 'ప్లంబింగ్ & శానిటరీ', iconBg: 'bg-blue-50', textCol: 'text-blue-800' },
  electrical_lighting: { label: 'Electrical & Power', labelTe: 'ఎలక్ట్రికల్ & విద్యుత్', iconBg: 'bg-amber-50', textCol: 'text-amber-800' },
  smart_lock: { label: 'Smart RFID Door Lock', labelTe: 'స్మార్ట్ RFID డోర్ లాక్', iconBg: 'bg-purple-50', textCol: 'text-purple-800' },
  tv_wifi: { label: 'Smart TV & Wi-Fi', labelTe: 'స్మార్ట్ టీవీ & వై-ఫై', iconBg: 'bg-indigo-50', textCol: 'text-indigo-800' },
  furniture_linen: { label: 'Furniture & Fixtures', labelTe: 'ఫర్నిచర్ & ఉపకరణాలు', iconBg: 'bg-orange-50', textCol: 'text-orange-800' },
  other: { label: 'General Maintenance', labelTe: 'సాధారణ నిర్వహణ', iconBg: 'bg-stone-50', textCol: 'text-stone-800' },
};

const PRIORITY_BADGES: Record<
  MaintenancePriority,
  { label: string; labelTe: string; badgeClass: string }
> = {
  urgent: {
    label: 'Urgent',
    labelTe: 'అత్యవసరం',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
  },
  high: {
    label: 'High',
    labelTe: 'అధికం',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
  },
  normal: {
    label: 'Normal',
    labelTe: 'సాధారణం',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  low: {
    label: 'Low',
    labelTe: 'తక్కువ',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
};

const STATUS_BADGES: Record<
  MaintenanceStatus,
  { label: string; labelTe: string; badgeClass: string }
> = {
  reported: {
    label: 'Reported',
    labelTe: 'నివేదించబడింది',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  in_progress: {
    label: 'In Progress',
    labelTe: 'పురోగతిలో ఉంది',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  resolved: {
    label: 'Resolved',
    labelTe: 'పరిష్కరించబడింది',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    labelTe: 'రద్దు చేయబడింది',
    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
  },
};

export default function AdminMaintenancePage() {
  const { formatCurrency, formatDate, isTelugu } = useAdminLanguage();

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [rooms, setRooms] = useState<
    Array<{
      room_number: string;
      operational_status: string;
      housekeeping_status: string;
      category_name: string;
    }>
  >([]);
  const [stats, setStats] = useState({
    totalTickets: 0,
    activeCount: 0,
    urgentCount: 0,
    blockedCount: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState<MaintenanceTicket | null>(null);

  // Create Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('ac_climate');
  const [priority, setPriority] = useState<MaintenancePriority>('urgent');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [roomBlocked, setRoomBlocked] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Resolve Form State
  const [actualCost, setActualCost] = useState<number>(0);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Helper for authenticated API calls
  const getAuthHeaders = useCallback((extra: Record<string, string> = {}) => {
    const token = typeof window !== 'undefined' ? authStorage.getToken() : null;
    const role = typeof window !== 'undefined' ? authStorage.getRole() || 'Super Admin' : 'Super Admin';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-staff-role': role,
      ...extra,
    };
  }, []);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchMaintenanceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/maintenance', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        setRooms(data.rooms || []);
        if (data.stats) setStats(data.stats);
        if (!roomNumber && data.rooms?.length > 0) {
          setRoomNumber(data.rooms[0].room_number);
        }
      } else {
        showNotification('error', data.error || 'Failed to fetch tickets.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error fetching maintenance.');
    } finally {
      setLoading(false);
    }
  }, [roomNumber, getAuthHeaders, showNotification]);

  useEffect(() => {
    fetchMaintenanceData();
  }, [fetchMaintenanceData]);

  // Real-time synchronization
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'maintenance_ticket_created' ||
        event.eventType === 'maintenance_ticket_updated' ||
        event.eventType === 'maintenance_ticket_deleted' ||
        event.eventType === 'room_assigned' ||
        event.eventType === 'housekeeping_updated' ||
        event.eventType === 'room_status_changed'
      ) {
        fetchMaintenanceData();
      }
    },
  });

  // Handle Category Change in New Ticket Form with Smart Presets
  const handleCategoryPreset = (cat: MaintenanceCategory) => {
    setCategory(cat);
    if (!issueTitle) {
      switch (cat) {
        case 'ac_climate':
        case 'ac_hvac':
          setIssueTitle('AC cooling low / Remote control faulty');
          setEstimatedCost(1200);
          break;
        case 'plumbing_bath':
          setIssueTitle('Bathroom mixer tap pressure drop / drain slow');
          setEstimatedCost(650);
          break;
        case 'electrical_lighting':
          setIssueTitle('Bedside reading lamp / master switch flickering');
          setEstimatedCost(450);
          break;
        case 'smart_lock':
          setIssueTitle('RFID Smart Lock battery low beep / latch stiff');
          setEstimatedCost(500);
          break;
        case 'tv_wifi':
          setIssueTitle('Smart TV HDMI input no signal / Wi-Fi drop');
          setEstimatedCost(300);
          break;
        case 'furniture_linen':
          setIssueTitle('Wardrobe hinge loose / comfort mattress check');
          setEstimatedCost(500);
          break;
        default:
          break;
      }
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !issueTitle.trim()) {
      showNotification('error', 'Room number and Issue title are required.');
      return;
    }

    try {
      setSubmitting(true);
      const staffName = authStorage.getUserName() || 'Duty Supervisor';
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_number: roomNumber,
          issue_title: issueTitle.trim(),
          description: description.trim(),
          category,
          priority,
          assigned_to: assignedTo.trim() || undefined,
          estimated_cost: Number(estimatedCost) || 0,
          room_blocked: roomBlocked,
          reported_by: staffName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification(
          'success',
          data.message || `Ticket created for Room ${roomNumber}.`
        );
        setIsCreateModalOpen(false);
        setIssueTitle('');
        setDescription('');
        setEstimatedCost(0);
        setAssignedTo('');
        setRoomBlocked(true);
        await fetchMaintenanceData();
      } else {
        showNotification('error', data.error || 'Failed to create ticket.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error creating ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Toggle (e.g., reported -> in_progress)
  const handleUpdateStatus = async (ticket: MaintenanceTicket, newStatus: MaintenanceStatus) => {
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: ticket.id,
          updates: { status: newStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Ticket #${ticket.id} status changed to ${newStatus}.`);
        await fetchMaintenanceData();
      } else {
        showNotification('error', data.error || 'Failed to update status.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating status.');
    }
  };

  // Toggle Room Block (OOO)
  const handleToggleRoomBlock = async (ticket: MaintenanceTicket) => {
    try {
      const nextBlocked = !ticket.room_blocked;
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: ticket.id,
          updates: { room_blocked: nextBlocked },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(
          'success',
          nextBlocked
            ? `Room ${ticket.room_number} is now marked Out-of-Order (OOO).`
            : `Room ${ticket.room_number} is unblocked.`
        );
        await fetchMaintenanceData();
      } else {
        showNotification('error', data.error || 'Failed to update room block.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating room block.');
    }
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;

    try {
      setResolving(true);
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: resolvingTicket.id,
          updates: {
            status: 'resolved',
            actual_cost: Number(actualCost) || 0,
            resolution_notes: resolutionNotes.trim() || 'Work completed and tested.',
            room_blocked: false,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification(
          'success',
          `Ticket #${resolvingTicket.id} resolved. Room ${resolvingTicket.room_number} unblocked and transferred to Housekeeping.`
        );
        setResolvingTicket(null);
        setActualCost(0);
        setResolutionNotes('');
        await fetchMaintenanceData();
      } else {
        showNotification('error', data.error || 'Failed to resolve ticket.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error resolving ticket.');
    } finally {
      setResolving(false);
    }
  };

  const handleDeleteTicket = async (id: string, roomNum: string) => {
    if (!confirm(`Are you sure you want to delete maintenance ticket #${id} for Room ${roomNum}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/maintenance?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', `Ticket #${id} deleted.`);
        await fetchMaintenanceData();
      } else {
        showNotification('error', data.error || 'Failed to delete ticket.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error deleting ticket.');
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.room_number.toLowerCase().includes(q) ||
          t.issue_title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_to && t.assigned_to.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, categoryFilter, priorityFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D8AD56] font-semibold">
            <span>{isTelugu ? 'ఇంజనీరింగ్ & హౌస్‌కీపింగ్' : 'Engineering & Housekeeping'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{isTelugu ? 'ఆస్తి నిర్వహణ & వర్క్ ఆర్డర్‌లు' : 'Property Maintenance & Work Orders'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#241912] mt-1">
            {isTelugu ? 'ఆస్తి నిర్వహణ & మరమ్మతులు (OOO బ్లాక్‌లు)' : 'Property Maintenance & Out-of-Order (OOO) Blocks'}
          </h1>
          <p className="text-xs sm:text-sm text-[#786A5B]">
            {isTelugu
              ? 'AC, ప్లంబింగ్, స్మార్ట్ RFID లాక్‌ల కోసం వర్క్ ఆర్డర్‌లను సృష్టించండి మరియు తనిఖీ చేసే వరకు గదులను OOO లో ఉంచండి.'
              : 'Create work orders for AC, plumbing, smart RFID locks, and automatically take physical rooms out-of-order until inspected.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchMaintenanceData()}
            className="p-2.5 rounded-xl border border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-[#786A5B] transition-colors shadow-xs cursor-pointer"
            title={isTelugu ? 'రిఫ్రెష్ చేయండి' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 transition-colors cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>{isTelugu ? '+ కొత్త వర్క్ ఆర్డర్' : '+ New Work Order'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm border shadow-xs transition-all ${
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
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
          >
            {isTelugu ? 'తీసివేయి' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">
              {isTelugu ? 'మొత్తం ఆర్డర్లు' : 'Total Orders'}
            </span>
            <Wrench className="w-4 h-4 text-[#D8AD56]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#241912]">
            {stats.totalTickets}
          </div>
          <div className="text-[11px] text-[#786A5B]">
            {isTelugu ? 'అన్ని నమోదైన మరమ్మతులు' : 'All recorded repairs'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">
              {isTelugu ? 'ప్రస్తుతం పనిలో ఉన్నవి' : 'Active In Work'}
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-700">
            {stats.activeCount}
          </div>
          <div className="text-[11px] text-[#786A5B]">
            {isTelugu ? 'నివేదించబడిన లేదా పురోగతిలో ఉన్నవి' : 'Reported or in progress'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">
              {isTelugu ? 'అత్యవసర ప్రాధాన్యత' : 'Urgent Priority'}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-700">
            {stats.urgentCount}
          </div>
          <div className="text-[11px] text-[#786A5B]">
            {isTelugu ? 'వెంటనే పరిష్కారం కావాలి' : 'Requires immediate lead fix'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">
              {isTelugu ? 'నిలిపివేసిన గదులు' : 'Rooms Blocked'}
            </span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-700">
            {stats.blockedCount}
          </div>
          <div className="text-[11px] text-[#786A5B]">
            {isTelugu ? 'అందుబాటులో లేని గదుల స్థితి' : 'Out-of-order room state'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-xs space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">
              {isTelugu ? 'మరమ్మతు ఖర్చు' : 'Repair Spend'}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#241912]">
            ₹{stats.totalCost.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#786A5B]">
            {isTelugu ? 'మొత్తం మరమ్మతు ఖర్చులు' : 'Combined repair outlays'}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-[#EFE3D6] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#786A5B]" />
          <input
            type="text"
            placeholder={isTelugu ? 'గది, సమస్య, టెక్నీషియన్ శోధించండి...' : 'Search room, issue, technician...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] placeholder-[#786A5B] outline-none focus:border-[#D8AD56]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="min-w-[170px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(String(val))}
              options={[
                { value: 'all', label: isTelugu ? 'అన్ని విభాగాలు' : 'All Categories' },
                { value: 'ac_climate', label: isTelugu ? 'ఎయిర్ కండిషనింగ్ (HVAC)' : 'Air Conditioning (HVAC)' },
                { value: 'plumbing_bath', label: isTelugu ? 'ప్లంబింగ్ & శానిటరీ' : 'Plumbing & Sanitary' },
                { value: 'electrical_lighting', label: isTelugu ? 'ఎలక్ట్రికల్ & పవర్' : 'Electrical & Power' },
                { value: 'smart_lock', label: isTelugu ? 'స్మార్ట్ RFID లాక్' : 'Smart RFID Lock' },
                { value: 'tv_wifi', label: isTelugu ? 'టీవీ & వై-ఫై' : 'TV & Wi-Fi' },
                { value: 'furniture_linen', label: isTelugu ? 'ఫర్నిచర్ & ఫిక్స్చర్స్' : 'Furniture & Fixtures' },
                { value: 'other', label: isTelugu ? 'సాధారణ నిర్వహణ' : 'General Maintenance' },
              ]}
            />
          </div>

          <div className="min-w-[140px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(String(val))}
              options={[
                { value: 'all', label: isTelugu ? 'అన్ని ప్రాధాన్యతలు' : 'All Priorities' },
                { value: 'urgent', label: isTelugu ? 'అత్యవసరం' : 'Urgent' },
                { value: 'high', label: isTelugu ? 'అధికం' : 'High' },
                { value: 'normal', label: isTelugu ? 'సాధారణం' : 'Normal' },
                { value: 'low', label: isTelugu ? 'తక్కువ' : 'Low' },
              ]}
            />
          </div>

          <div className="min-w-[140px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={statusFilter}
              onChange={(val) => setStatusFilter(String(val))}
              options={[
                { value: 'all', label: isTelugu ? 'అన్ని స్థితులు' : 'All Statuses' },
                { value: 'reported', label: isTelugu ? 'నివేదించబడింది' : 'Reported' },
                { value: 'in_progress', label: isTelugu ? 'పురోగతిలో ఉంది' : 'In Progress' },
                { value: 'resolved', label: isTelugu ? 'పరిష్కరించబడింది' : 'Resolved' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* WORK ORDERS TABLE */}
      <div className="bg-white rounded-3xl border border-[#EFE3D6] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#241912] flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#D8AD56]" />
              <span>{isTelugu ? 'క్రియాశీల వర్క్ ఆర్డర్‌లు & నిర్వహణ చరిత్ర' : 'Active Work Orders & Maintenance History'}</span>
            </h2>
            <p className="text-xs text-[#786A5B] mt-0.5">
              {isTelugu
                ? 'గది మరమ్మతుల స్థితి, టెక్నీషియన్ కేటాయింపులు మరియు Out-of-Order లాక్‌లు.'
                : 'Live status of room repairs, technician allocations, and Out-of-Order locks.'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#786A5B]">
            {isTelugu
              ? `${tickets.length} టిక్కెట్లలో ${filteredTickets.length} చూపిస్తోంది`
              : `Showing ${filteredTickets.length} of ${tickets.length} tickets`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786A5B] font-semibold uppercase tracking-wider border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4">{isTelugu ? 'టిక్కెట్ ID' : 'Ticket ID'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'గది సంఖ్య' : 'Room Number'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'సమస్య & విభాగం' : 'Issue Title & Category'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'ప్రాధాన్యత' : 'Priority'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'స్థితి' : 'Status'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'కేటాయించబడినది' : 'Assigned To'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'ఖర్చు (అంచనా/అసలు)' : 'Cost (Est / Act)'}</th>
                <th className="py-3.5 px-4">{isTelugu ? 'నమోదైన సమయం' : 'Reported At'}</th>
                <th className="py-3.5 px-4 text-right">{isTelugu ? 'చర్యలు' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#786A5B]">
                    {isTelugu ? 'ఫిల్టర్‌లకు సరిపోయే నిర్వహణ టిక్కెట్లు లేవు.' : 'No maintenance tickets matching the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const cat = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.other;
                  const prio = PRIORITY_BADGES[ticket.priority] || PRIORITY_BADGES.normal;
                  const stat = STATUS_BADGES[ticket.status] || STATUS_BADGES.reported;

                  return (
                    <tr key={ticket.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#241912]">
                        #{ticket.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#241912] font-mono">
                            Room {ticket.room_number}
                          </span>
                          {ticket.room_blocked && ticket.status !== 'resolved' && (
                            <span
                              className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200 flex items-center gap-1 shrink-0"
                              title="Room is Out-of-Order (Blocked from guest bookings)"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>OOO</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-[#241912] leading-snug">{ticket.issue_title}</div>
                        <div className="text-[11px] text-[#786A5B] flex items-center gap-1.5 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${cat.iconBg} ${cat.textCol}`}>
                            {isTelugu ? cat.labelTe : cat.label}
                          </span>
                        </div>
                        {ticket.description && (
                          <p className="text-[11px] text-[#786A5B] mt-1 line-clamp-2 italic">
                            {ticket.description}
                          </p>
                        )}
                        {ticket.resolution_notes && (
                          <p className="text-[10px] text-emerald-800 mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 line-clamp-2 font-medium">
                            ✓ {ticket.resolution_notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] border ${prio.badgeClass}`}
                        >
                          {isTelugu ? prio.labelTe : prio.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stat.badgeClass}`}
                        >
                          {isTelugu ? stat.labelTe : stat.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#241912]">
                          {ticket.assigned_to || (
                            <span className="text-[#786A5B] italic">{isTelugu ? 'కేటాయించలేదు' : 'Unassigned'}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#786A5B]">
                          {isTelugu ? 'ద్వారా' : 'By'} {ticket.reported_by}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-[#241912] font-bold">
                          ₹{(ticket.actual_cost ?? ticket.estimated_cost ?? 0).toLocaleString('en-IN')}
                        </div>
                        {ticket.actual_cost !== undefined && ticket.estimated_cost > 0 && (
                          <div className="text-[10px] text-[#786A5B]">
                            {isTelugu ? 'అంచనా:' : 'Est:'} ₹{ticket.estimated_cost.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#786A5B] font-mono">
                        {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {ticket.status === 'reported' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ticket, 'in_progress')}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              title={isTelugu ? 'పనిని ప్రారంభించండి' : 'Start work on ticket'}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isTelugu ? 'ప్రారంభించు' : 'Start Work'}</span>
                            </button>
                          )}

                          {ticket.status !== 'resolved' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleRoomBlock(ticket)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  ticket.room_blocked
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                                title={ticket.room_blocked ? 'Unblock Room' : 'Block Room (OOO)'}
                              >
                                {ticket.room_blocked ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingTicket(ticket);
                                  setActualCost(ticket.estimated_cost || 0);
                                  setResolutionNotes('');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                                title={isTelugu ? 'పరిష్కరించి హౌస్‌కీపింగ్‌కు విడుదల చేయండి' : 'Mark resolved and release room to Housekeeping'}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isTelugu ? 'పరిష్కరించు' : 'Resolve'}</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px] px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isTelugu ? 'పూర్తయింది' : 'Done'}</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(ticket.id, ticket.room_number)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-[#786A5B] hover:text-rose-600 transition-colors cursor-pointer"
                            title={isTelugu ? 'టిక్కెట్ తొలగించు' : 'Delete Ticket'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE WORK ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#EFE3D6] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AD56]">
                  {isTelugu ? 'ఇంజనీరింగ్ డెస్క్' : 'Engineering Desk'}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#241912]">
                  {isTelugu ? 'కొత్త నిర్వహణ వర్క్ ఆర్డర్' : 'New Maintenance Work Order'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl hover:bg-[#FAF7F2] text-[#786A5B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    {isTelugu ? 'గది సంఖ్య *' : 'Room Number *'}
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={roomNumber}
                    onChange={(val) => setRoomNumber(String(val))}
                    options={rooms.map((r) => ({
                      value: r.room_number,
                      label: `Room ${r.room_number} (${r.category_name}) - ${r.operational_status === 'maintenance' ? 'OOO' : r.operational_status}`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    {isTelugu ? 'ప్రాధాన్యత స్థాయి *' : 'Priority Level *'}
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={priority}
                    onChange={(val) => setPriority(val as MaintenancePriority)}
                    options={[
                      { value: 'urgent', label: isTelugu ? 'అత్యవసరం (వెంటనే పరిష్కారం కావాలి)' : 'Urgent (Immediate Fix Needed)' },
                      { value: 'high', label: isTelugu ? 'అధికం (అతిథి బసపై ప్రభావం)' : 'High (Affects Guest Stay)' },
                      { value: 'normal', label: isTelugu ? 'సాధారణం (ప్రామాణిక పరిష్కారం)' : 'Normal (Standard Fix)' },
                      { value: 'low', label: isTelugu ? 'తక్కువ (అంత అత్యవసరం కాదు)' : 'Low (Cosmetic / Non-Urgent)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  {isTelugu ? 'సమస్య శీర్షిక *' : 'Issue Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AC cooling low / Remote control faulty"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] font-semibold text-xs text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    {isTelugu ? 'విభాగం *' : 'Category *'}
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={category}
                    onChange={(val) => handleCategoryPreset(val as MaintenanceCategory)}
                    options={[
                      { value: 'ac_climate', label: isTelugu ? 'ఎయిర్ కండిషనింగ్ (HVAC)' : 'Air Conditioning (HVAC)' },
                      { value: 'plumbing_bath', label: isTelugu ? 'ప్లంబింగ్ & శానిటరీ' : 'Plumbing & Sanitary' },
                      { value: 'electrical_lighting', label: isTelugu ? 'ఎలక్ట్రికల్ & పవర్' : 'Electrical & Power' },
                      { value: 'smart_lock', label: isTelugu ? 'స్మార్ట్ RFID డోర్ లాక్' : 'Smart RFID Door Lock' },
                      { value: 'tv_wifi', label: isTelugu ? 'స్మార్ట్ టీవీ & వై-ఫై' : 'Smart TV & Wi-Fi' },
                      { value: 'furniture_linen', label: isTelugu ? 'ఫర్నిచర్ & బెడ్డింగ్' : 'Furniture & Bedding' },
                      { value: 'other', label: isTelugu ? 'సాధారణ నిర్వహణ' : 'General Maintenance' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    {isTelugu ? 'అంచనా ఖర్చు (₹)' : 'Estimated Cost (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EFE3D6] font-mono font-semibold text-xs text-[#241912] outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  {isTelugu ? 'కేటాయించిన టెక్నీషియన్ / వెండర్' : 'Assigned Technician / Vendor'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suresh (HVAC Tech) / External Plumber"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] font-semibold text-xs text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  {isTelugu ? 'వివరణాత్మక గమనికలు & లక్షణాలు' : 'Detailed Notes & Symptoms'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    isTelugu
                      ? 'సమస్య, గదిలోని ప్రదేశం, అతిథి నివేదిక వివరాలను వివరించండి...'
                      : 'Describe the issue, location in the room, guest report details...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] text-xs font-medium text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Out-of-Order Room Block Checkbox */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="roomBlocked"
                  checked={roomBlocked}
                  onChange={(e) => setRoomBlocked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="roomBlocked" className="cursor-pointer">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-700" />
                    <span>{isTelugu ? 'గదిని నిలిపివేయండి (Take Out-of-Order / OOO)' : 'Block Room (Take Out-of-Order / OOO)'}</span>
                  </div>
                  <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                    {isTelugu
                      ? `వెంటనే గది ${roomNumber} ని నిర్వహణలో ఉన్నట్లుగా గుర్తిస్తుంది. పరిష్కరించే వరకు ఫ్రంట్ డెస్క్ చెక్-ఇన్ మరియు ఆన్‌లైన్ OTA బుకింగ్‌లను నిరోధిస్తుంది.`
                      : `Immediately marks Room ${roomNumber} as Under Maintenance. Prevents front desk check-in and online OTA bookings until resolved.`}
                  </p>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#786A5B] font-semibold cursor-pointer"
                >
                  {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {submitting
                    ? (isTelugu ? 'సృష్టిస్తోంది...' : 'Creating Work Order...')
                    : (isTelugu ? 'వర్క్ ఆర్డర్ సృష్టించండి' : 'Create Work Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#EFE3D6] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">
                  {isTelugu ? 'వర్క్ ఆర్డర్ పరిష్కారం' : 'Work Order Resolution'}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#241912]">
                  {isTelugu ? `టిక్కెట్ #${resolvingTicket.id} ని పరిష్కరించండి` : `Resolve Ticket #${resolvingTicket.id}`}
                </h3>
                <p className="text-xs text-[#786A5B]">
                  Room {resolvingTicket.room_number} – {resolvingTicket.issue_title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="p-2 rounded-xl hover:bg-[#FAF7F2] text-[#786A5B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1.5">
                <div className="text-[#786A5B]">
                  {isTelugu ? 'నివేదించిన వారు:' : 'Reported by:'} <span className="font-semibold text-[#241912]">{resolvingTicket.reported_by}</span>
                </div>
                <div className="text-[#786A5B]">
                  {isTelugu ? 'విభాగం:' : 'Category:'} <span className="font-semibold text-[#241912]">{CATEGORY_CONFIG[resolvingTicket.category]?.label || resolvingTicket.category}</span>
                </div>
                {resolvingTicket.estimated_cost > 0 && (
                  <div className="text-[#786A5B]">
                    {isTelugu ? 'అంచనా ఖర్చు:' : 'Estimated Cost:'} <span className="font-mono font-semibold text-[#241912]">₹{resolvingTicket.estimated_cost.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  {isTelugu ? 'అసలు మరమ్మతు ఖర్చు (₹) *' : 'Actual Repair Cost (₹) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 1200"
                  value={actualCost}
                  onChange={(e) => setActualCost(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] font-mono font-bold text-sm text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  {isTelugu ? 'పరిష్కార గమనికలు & భర్తీ చేసిన భాగాలు' : 'Resolution Notes & Parts Replaced'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    isTelugu
                      ? 'ఉదాహరణ: AC కెపాసిటర్ భర్తీ చేయబడింది, స్విచ్‌బోర్డ్ రిపేర్ చేయబడింది, శీతలీకరణ 21°C కి పరీక్షించబడింది.'
                      : 'e.g. Replaced AC capacitor, re-soldered electrical switchboard, verified cooling temperature to 21°C.'
                  }
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] text-xs font-medium text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Automatic unblock notice */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold">
                    {isTelugu ? 'హౌస్‌కీపింగ్‌కు ఆటోమేటెడ్ బదిలీ:' : 'Automated Turnover to Housekeeping:'}
                  </span>
                  <br />
                  {isTelugu
                    ? `ఈ టిక్కెట్‌ను పరిష్కరించడం ద్వారా గది ${resolvingTicket.room_number} నిర్వహణ బ్లాక్ నుండి విడుదల చేయబడుతుంది మరియు దాని స్థితి క్లీనింగ్ (డర్టీ) కి సెట్ చేయబడుతుంది, తద్వారా తదుపరి అతిథి చెక్-ఇన్ ముందు శానిటైజ్ చేయబడుతుంది.`
                    : `Resolving this ticket will automatically unblock Room ${resolvingTicket.room_number} from maintenance and set its status to Cleaning (Dirty), alerting housekeeping to sanitize and inspect the room before re-activating for guest check-in.`}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#786A5B] font-semibold cursor-pointer"
                >
                  {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {resolving
                    ? (isTelugu ? 'పరిష్కరిస్తోంది...' : 'Resolving...')
                    : (isTelugu ? 'నిర్ధారించి హౌస్‌కీపింగ్‌కు విడుదల చేయండి' : 'Confirm & Release to Housekeeping')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
