'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MaintenanceTicket,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  Wrench,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShieldAlert,
  ChevronRight,
  DollarSign,
  Building,
  Lock,
  Unlock,
  Trash2,
  X,
  Sparkles,
  Check,
} from 'lucide-react';

const CATEGORY_CONFIG: Record<
  MaintenanceCategory,
  { label: string; iconBg: string; textCol: string }
> = {
  ac_climate: { label: 'Air Conditioning (HVAC)', iconBg: 'bg-cyan-50', textCol: 'text-cyan-800' },
  ac_hvac: { label: 'Air Conditioning (HVAC)', iconBg: 'bg-cyan-50', textCol: 'text-cyan-800' },
  plumbing_bath: { label: 'Plumbing & Sanitary', iconBg: 'bg-blue-50', textCol: 'text-blue-800' },
  electrical_lighting: { label: 'Electrical & Power', iconBg: 'bg-amber-50', textCol: 'text-amber-800' },
  smart_lock: { label: 'Smart RFID Door Lock', iconBg: 'bg-purple-50', textCol: 'text-purple-800' },
  tv_wifi: { label: 'Smart TV & Wi-Fi', iconBg: 'bg-indigo-50', textCol: 'text-indigo-800' },
  furniture_linen: { label: 'Furniture & Fixtures', iconBg: 'bg-orange-50', textCol: 'text-orange-800' },
  other: { label: 'General Maintenance', iconBg: 'bg-stone-50', textCol: 'text-stone-800' },
};

const PRIORITY_BADGES: Record<MaintenancePriority, { label: string; badgeClass: string }> = {
  urgent: {
    label: 'Urgent',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
  },
  normal: {
    label: 'Normal',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
};

const STATUS_BADGES: Record<MaintenanceStatus, { label: string; badgeClass: string }> = {
  reported: {
    label: 'Reported',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
  },
};

export default function AdminMaintenancePage() {
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
  const [priority, setPriority] = useState<MaintenancePriority>('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [roomBlocked, setRoomBlocked] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Resolve Form State
  const [actualCost, setActualCost] = useState<number>(0);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchMaintenanceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/maintenance', {
        headers: { 'x-staff-role': 'Super Admin' },
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
        setFeedback({ type: 'error', message: data.error || 'Failed to fetch tickets.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching maintenance.' });
    } finally {
      setLoading(false);
    }
  }, [roomNumber]);

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
        event.eventType === 'housekeeping_updated'
      ) {
        fetchMaintenanceData();
      }
    },
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !issueTitle.trim()) {
      setFeedback({ type: 'error', message: 'Room number and Issue title are required.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          room_number: roomNumber,
          issue_title: issueTitle.trim(),
          description: description.trim(),
          category,
          priority,
          assigned_to: assignedTo.trim() || undefined,
          estimated_cost: Number(estimatedCost) || 0,
          room_blocked: roomBlocked,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `Ticket created for Room ${roomNumber}.`,
        });
        setIsCreateModalOpen(false);
        setIssueTitle('');
        setDescription('');
        setEstimatedCost(0);
        setAssignedTo('');
        setRoomBlocked(true);
        await fetchMaintenanceData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create ticket.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating ticket.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;

    try {
      setResolving(true);
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
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
        setFeedback({
          type: 'success',
          message: `Ticket #${resolvingTicket.id} resolved. Room ${resolvingTicket.room_number} unblocked and transferred to Housekeeping.`,
        });
        setResolvingTicket(null);
        setActualCost(0);
        setResolutionNotes('');
        await fetchMaintenanceData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to resolve ticket.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error resolving ticket.' });
    } finally {
      setResolving(false);
    }
  };

  const handleDeleteTicket = async (id: string, roomNum: string) => {
    if (!confirm(`Are you sure you want to delete maintenance ticket #${id} for Room ${roomNum}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/maintenance?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-staff-role': 'Super Admin' },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Ticket #${id} deleted.` });
        await fetchMaintenanceData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete ticket.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error deleting ticket.' });
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.room_number.toLowerCase().includes(q) ||
        t.issue_title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.assigned_to && t.assigned_to.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D8AD56] font-semibold">
            <span>Engineering & Housekeeping</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Property Maintenance & Work Orders</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#241912] mt-1">
            Property Maintenance & Out-of-Order (OOO) Blocks
          </h1>
          <p className="text-xs sm:text-sm text-[#786A5B]">
            Create work orders for AC, plumbing, smart RFID locks, and automatically take physical rooms out-of-order until inspected.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchMaintenanceData()}
            className="p-2.5 rounded-xl border border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-[#786A5B] transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm border shadow-sm ${
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
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Orders</span>
            <Wrench className="w-4 h-4 text-[#D8AD56]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#241912]">
            {stats.totalTickets}
          </div>
          <div className="text-[11px] text-[#786A5B]">All recorded repairs</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">Active In Work</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-700">
            {stats.activeCount}
          </div>
          <div className="text-[11px] text-[#786A5B]">Reported or in progress</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">Urgent Priority</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-700">
            {stats.urgentCount}
          </div>
          <div className="text-[11px] text-[#786A5B]">Requires immediate lead fix</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">Rooms Blocked</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-700">
            {stats.blockedCount}
          </div>
          <div className="text-[11px] text-[#786A5B]">Out-of-order room state</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EFE3D6] shadow-sm space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#786A5B]">
            <span className="text-xs uppercase tracking-wider font-semibold">Repair Spend</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#241912]">
            ₹{stats.totalCost.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#786A5B]">Combined repair outlays</div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-[#EFE3D6] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#786A5B]" />
          <input
            type="text"
            placeholder="Search room, issue, technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] placeholder-[#786A5B] outline-none focus:border-[#D8AD56]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] bg-white outline-none focus:border-[#D8AD56]"
          >
            <option value="all">All Categories</option>
            <option value="ac_climate">Air Conditioning (HVAC)</option>
            <option value="plumbing_bath">Plumbing & Sanitary</option>
            <option value="electrical_lighting">Electrical & Power</option>
            <option value="smart_lock">Smart RFID Lock</option>
            <option value="tv_wifi">TV & Wi-Fi</option>
            <option value="furniture_linen">Furniture & Fixtures</option>
            <option value="other">General Maintenance</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] bg-white outline-none focus:border-[#D8AD56]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#EFE3D6] text-xs font-semibold text-[#241912] bg-white outline-none focus:border-[#D8AD56]"
          >
            <option value="all">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* WORK ORDERS TABLE */}
      <div className="bg-white rounded-3xl border border-[#EFE3D6] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#241912] flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#D8AD56]" />
              <span>Active Work Orders & Maintenance History</span>
            </h2>
            <p className="text-xs text-[#786A5B] mt-0.5">
              Live status of room repairs, technician allocations, and Out-of-Order locks.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#786A5B]">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786A5B] font-semibold uppercase tracking-wider border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Room Number</th>
                <th className="py-3 px-4">Issue Title & Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Cost (Est / Act)</th>
                <th className="py-3 px-4">Reported At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6]">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-[#786A5B]">
                    No maintenance tickets matching the current filters.
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
                              className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200 flex items-center gap-1"
                              title="Room is Out-of-Order (Blocked from guest bookings)"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>OOO</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#241912]">{ticket.issue_title}</div>
                        <div className="text-[11px] text-[#786A5B] flex items-center gap-1.5 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${cat.iconBg} ${cat.textCol}`}>
                            {cat.label}
                          </span>
                        </div>
                        {ticket.description && (
                          <p className="text-[11px] text-[#786A5B] mt-1 line-clamp-1 italic">
                            {ticket.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] border ${prio.badgeClass}`}
                        >
                          {prio.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stat.badgeClass}`}
                        >
                          {stat.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#241912]">
                          {ticket.assigned_to || (
                            <span className="text-[#786A5B] italic">Unassigned</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#786A5B]">By {ticket.reported_by}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-[#241912] font-bold">
                          ₹{(ticket.actual_cost ?? ticket.estimated_cost ?? 0).toLocaleString('en-IN')}
                        </div>
                        {ticket.actual_cost !== undefined && ticket.estimated_cost > 0 && (
                          <div className="text-[10px] text-[#786A5B]">
                            Est: ₹{ticket.estimated_cost.toLocaleString('en-IN')}
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
                        <div className="flex items-center justify-end gap-1.5">
                          {ticket.status !== 'resolved' ? (
                            <button
                              onClick={() => {
                                setResolvingTicket(ticket);
                                setActualCost(ticket.estimated_cost || 0);
                                setResolutionNotes('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition-colors"
                              title="Mark resolved and release room to Housekeeping"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-[11px] px-2 py-1 bg-emerald-50 rounded-lg">
                              Done
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteTicket(ticket.id, ticket.room_number)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-[#786A5B] hover:text-rose-600 transition-colors"
                            title="Delete Ticket"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#EFE3D6] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AD56]">
                  Engineering Desk
                </span>
                <h3 className="text-xl font-serif font-bold text-[#241912]">
                  New Maintenance Work Order
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl hover:bg-[#FAF7F2] text-[#786A5B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    Room Number *
                  </label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EFE3D6] font-mono font-bold text-sm text-[#241912] bg-white outline-none focus:border-[#D8AD56]"
                  >
                    {rooms.map((r) => (
                      <option key={r.room_number} value={r.room_number}>
                        Room {r.room_number} ({r.category_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EFE3D6] font-semibold text-xs text-[#241912] bg-white outline-none focus:border-[#D8AD56]"
                  >
                    <option value="low">Low (Cosmetic / Non-Urgent)</option>
                    <option value="normal">Normal (Standard Fix)</option>
                    <option value="high">High (Affects Guest Stay)</option>
                    <option value="urgent">Urgent (Immediate Fix Needed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  Issue Title *
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
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EFE3D6] font-semibold text-xs text-[#241912] bg-white outline-none focus:border-[#D8AD56]"
                  >
                    <option value="ac_climate">Air Conditioning (HVAC)</option>
                    <option value="plumbing_bath">Plumbing & Sanitary</option>
                    <option value="electrical_lighting">Electrical & Power</option>
                    <option value="smart_lock">Smart RFID Door Lock</option>
                    <option value="tv_wifi">Smart TV & Wi-Fi</option>
                    <option value="furniture_linen">Furniture & Bedding</option>
                    <option value="other">General Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EFE3D6] font-mono font-semibold text-xs text-[#241912] outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  Assigned Technician / Vendor
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
                  Detailed Notes & Symptoms
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue, location in the room, guest report details..."
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
                  className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="roomBlocked" className="cursor-pointer">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-700" />
                    <span>Block Room (Take Out-of-Order / OOO)</span>
                  </div>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    Immediately marks Room {roomNumber} as Under Maintenance. Prevents front desk check-in and online OTA bookings until resolved.
                  </p>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#786A5B] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Work Order...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#EFE3D6] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">
                  Work Order Resolution
                </span>
                <h3 className="text-xl font-serif font-bold text-[#241912]">
                  Resolve Ticket #{resolvingTicket.id}
                </h3>
                <p className="text-xs text-[#786A5B]">
                  Room {resolvingTicket.room_number} – {resolvingTicket.issue_title}
                </p>
              </div>
              <button
                onClick={() => setResolvingTicket(null)}
                className="p-2 rounded-xl hover:bg-[#FAF7F2] text-[#786A5B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1.5">
                <div className="text-[#786A5B]">Reported by: <span className="font-semibold text-[#241912]">{resolvingTicket.reported_by}</span></div>
                <div className="text-[#786A5B]">Category: <span className="font-semibold text-[#241912]">{CATEGORY_CONFIG[resolvingTicket.category]?.label || resolvingTicket.category}</span></div>
                {resolvingTicket.estimated_cost > 0 && (
                  <div className="text-[#786A5B]">Estimated Cost: <span className="font-mono font-semibold text-[#241912]">₹{resolvingTicket.estimated_cost.toLocaleString('en-IN')}</span></div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#241912] uppercase tracking-wider mb-1">
                  Actual Repair Cost (₹) *
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
                  Resolution Notes & Parts Replaced
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Replaced AC capacitor, re-soldered electrical switchboard, verified cooling temperature to 21°C."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EFE3D6] text-xs font-medium text-[#241912] outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Automatic unblock notice */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold">Automated Turnover to Housekeeping:</span>
                  <br />
                  Resolving this ticket will automatically unblock Room {resolvingTicket.room_number} from maintenance and set its status to <span className="font-bold">Cleaning (Dirty)</span>, alerting housekeeping to sanitize and inspect the room before re-activating for guest check-in.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#786A5B] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {resolving ? 'Resolving...' : 'Confirm & Release to Housekeeping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
