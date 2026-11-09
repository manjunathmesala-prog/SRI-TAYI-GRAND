'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Building,
  Phone,
  Mail,
  Calendar,
  Users,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Clock,
  X,
  Send,
  MessageCircle,
  FileText,
  DollarSign,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { UnifiedEnquiry, EnquiryStatus, EnquiryType } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';

export default function EnquiriesPipelinePage() {
  const [activeTab, setActiveTab] = useState<EnquiryType>('convention');
  const [enquiries, setEnquiries] = useState<UnifiedEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [counts, setCounts] = useState({
    total: 0,
    convention: 0,
    general_stay: 0,
    new: 0,
    contacted: 0,
    quotation_sent: 0,
    converted: 0,
    closed: 0,
  });

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [notesModalEnquiry, setNotesModalEnquiry] = useState<UnifiedEnquiry | null>(null);
  const [statusModalEnquiry, setStatusModalEnquiry] = useState<UnifiedEnquiry | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Enquiry Form Data
  const [newForm, setNewForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Room Booking Enquiry',
    message: '',
    check_in_date: '',
    check_out_date: '',
    room_type: 'deluxe_ac',
    adults_count: 2,
    source: 'direct_phone' as 'direct_phone' | 'walk_in' | 'website_contact',
    admin_notes: '',
  });

  const fetchEnquiries = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/enquiries');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEnquiries(data.enquiries || []);
          if (data.counts) setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Error fetching enquiries:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // Real-time synchronization
  const { isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'enquiry_created' ||
        event.eventType === 'enquiry_updated' ||
        event.eventType === 'full_sync'
      ) {
        fetchEnquiries();
      }
    },
  });

  // Fallback Polling every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEnquiries();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchEnquiries]);

  // Status updates
  const handleUpdateStatus = async (id: string, newStatus: EnquiryStatus) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatusModalEnquiry(null);
        await fetchEnquiries();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notes updates
  const handleSaveNotes = async () => {
    if (!notesModalEnquiry) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/enquiries/${notesModalEnquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: currentNotes }),
      });
      if (res.ok) {
        setNotesModalEnquiry(null);
        await fetchEnquiries();
      }
    } catch (err) {
      console.error('Failed to update notes:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Enquiry
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        setIsNewModalOpen(false);
        setNewForm({
          name: '',
          phone: '',
          email: '',
          subject: 'Room Booking Enquiry',
          message: '',
          check_in_date: '',
          check_out_date: '',
          room_type: 'deluxe_ac',
          adults_count: 2,
          source: 'direct_phone',
          admin_notes: '',
        });
        setActiveTab('general_stay');
        await fetchEnquiries();
      }
    } catch (err) {
      console.error('Failed to create enquiry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpers
  const formatPhoneForWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits;
  };

  const getStatusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'new':
        return {
          label: 'New Lead',
          className: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'contacted':
        return {
          label: 'Contacted',
          className: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'quotation_sent':
        return {
          label: 'Quotation Sent',
          className: 'bg-purple-100 text-purple-800 border-purple-300',
        };
      case 'converted':
        return {
          label: 'Converted (Won)',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'closed':
        return {
          label: 'Closed / Lost',
          className: 'bg-stone-100 text-stone-700 border-stone-300',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  // Filtered List
  const filteredEnquiries = enquiries.filter((item) => {
    if (item.type !== activeTab) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.name?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.reference?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#33271D] p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E6D9C5] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#43001F] text-[#D8AD56] tracking-wider uppercase border border-[#D8AD56]/40">
              Customer Pipeline
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#786A5B]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isConnected ? 'Real-time Pipeline' : 'Connecting...'}</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#43001F] tracking-tight">
            Customer Enquiries & Banquet Leads
          </h1>
          <p className="text-sm text-[#786A5B] mt-1">
            Sri Tayi Grand • Rapid WhatsApp and Direct Call response pipeline for Convention Halls and Guest Stays
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEnquiries()}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-[#E6D9C5] text-[#786A5B] hover:text-[#43001F] hover:border-[#D8AD56] transition-all shadow-sm disabled:opacity-50"
            title="Refresh pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D8AD56]' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-[#D8AD56] font-semibold text-xs tracking-wide shadow-md transition-all border border-[#D8AD56]/40 hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Enquiry</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E6D9C5] shadow-sm">
          <div className="text-[11px] text-[#786A5B] font-semibold uppercase">Total Leads</div>
          <div className="text-xl font-bold font-serif text-[#43001F] mt-0.5">{counts.total}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-[11px] text-blue-700 font-semibold uppercase">New Unread</div>
          <div className="text-xl font-bold font-serif text-blue-800 mt-0.5">{counts.new}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm">
          <div className="text-[11px] text-amber-700 font-semibold uppercase">Contacted</div>
          <div className="text-xl font-bold font-serif text-amber-800 mt-0.5">{counts.contacted}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm">
          <div className="text-[11px] text-purple-700 font-semibold uppercase">Quotes Sent</div>
          <div className="text-xl font-bold font-serif text-purple-800 mt-0.5">{counts.quotation_sent}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-[11px] text-emerald-700 font-semibold uppercase">Converted (Won)</div>
          <div className="text-xl font-bold font-serif text-emerald-800 mt-0.5">{counts.converted}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-sm">
          <div className="text-[11px] text-stone-600 font-semibold uppercase">Closed / Lost</div>
          <div className="text-xl font-bold font-serif text-stone-700 mt-0.5">{counts.closed}</div>
        </div>
      </div>

      {/* Dual Tab Switcher & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6D9C5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Dual Tabs */}
        <div className="inline-flex p-1 bg-[#FDFBF7] rounded-xl border border-[#E6D9C5]">
          <button
            onClick={() => {
              setActiveTab('convention');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'convention'
                ? 'bg-[#43001F] text-[#D8AD56] shadow-sm'
                : 'text-[#786A5B] hover:text-[#43001F]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Convention & Banquet Enquiries</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'convention'
                  ? 'bg-[#D8AD56] text-[#43001F]'
                  : 'bg-[#E6D9C5] text-[#33271D]'
              }`}
            >
              {counts.convention}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('general_stay');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'general_stay'
                ? 'bg-[#43001F] text-[#D8AD56] shadow-sm'
                : 'text-[#786A5B] hover:text-[#43001F]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>General & Room Enquiries</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'general_stay'
                  ? 'bg-[#D8AD56] text-[#43001F]'
                  : 'bg-[#E6D9C5] text-[#33271D]'
              }`}
            >
              {counts.general_stay}
            </span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#786A5B]" />
            <input
              type="text"
              placeholder="Search by name, phone, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#E6D9C5] bg-[#FDFBF7] text-xs text-[#33271D] placeholder-[#786A5B]/60 focus:outline-none focus:border-[#43001F]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#786A5B] hover:text-[#33271D]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-[#E6D9C5] bg-[#FDFBF7] text-xs font-semibold text-[#43001F] focus:outline-none focus:border-[#43001F]"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="quotation_sent">Quotation Sent</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Pipeline Cards Grid */}
      {filteredEnquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F8F3E9] text-[#43001F] flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#43001F]">No enquiries found</h3>
          <p className="text-xs text-[#786A5B] max-w-sm mx-auto">
            There are currently no enquiries matching your filter criteria in this section.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-xs text-[#43001F] font-bold underline hover:text-[#D8AD56]"
          >
            Reset active filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEnquiries.map((enquiry) => {
            const badge = getStatusBadge(enquiry.status);
            const waNumber = formatPhoneForWhatsApp(enquiry.phone);
            const waGreeting = `Hello ${enquiry.name}, warm greetings from Sri Tayi Grand, Kadiri! In reference to your enquiry (${enquiry.reference}) regarding ${enquiry.event_or_checkin_date ? 'date ' + enquiry.event_or_checkin_date : 'your upcoming stay'}, our executive desk is here to provide customized packages and full assistance.`;
            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waGreeting)}`;

            return (
              <div
                key={enquiry.id}
                className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Card Top: Ref & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] font-bold text-[#43001F] bg-[#F8F3E9] px-2 py-0.5 rounded border border-[#E6D9C5]">
                      {enquiry.reference}
                    </span>
                    <button
                      onClick={() => setStatusModalEnquiry(enquiry)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-transform hover:scale-105 ${badge.className}`}
                      title="Click to update status"
                    >
                      {badge.label}
                    </button>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-base text-[#43001F]">
                      {enquiry.name}
                    </h3>

                    <div className="flex flex-col gap-1 text-xs text-[#786A5B] pt-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#43001F]" />
                        <span className="font-mono font-medium text-[#33271D]">{enquiry.phone}</span>
                      </div>
                      {enquiry.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#43001F]" />
                          <span className="truncate">{enquiry.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event or Check-in Details */}
                  <div className="mt-3 pt-3 border-t border-[#E6D9C5]/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {enquiry.event_or_checkin_date && (
                      <div className="flex items-center gap-1.5 text-[#33271D] font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Date: {enquiry.event_or_checkin_date}</span>
                      </div>
                    )}
                    {enquiry.guest_count && (
                      <div className="flex items-center gap-1.5 text-[#786A5B]">
                        <Users className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>{enquiry.guest_count} Guests</span>
                      </div>
                    )}
                  </div>

                  {/* Quoted Amount if present */}
                  {enquiry.quoted_amount ? (
                    <div className="mt-2 flex items-center justify-between bg-[#F8F3E9] p-2 rounded-lg text-xs">
                      <span className="text-[#786A5B] font-semibold">Quoted Budget:</span>
                      <span className="font-mono font-bold text-[#43001F]">
                        ₹{enquiry.quoted_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : null}

                  {/* Message / Details */}
                  {enquiry.details && (
                    <div className="mt-3 p-3 bg-[#FDFBF7] rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] leading-relaxed line-clamp-3">
                      {enquiry.details}
                    </div>
                  )}

                  {/* Admin Notes Box */}
                  {enquiry.admin_notes && (
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <strong className="block text-amber-800">Admin Notes:</strong>
                        <span>{enquiry.admin_notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-[#E6D9C5] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* One-click Direct Call */}
                    <a
                      href={`tel:${enquiry.phone.replace(/\s+/g, '')}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E6D9C5] text-xs font-semibold text-[#43001F] hover:bg-[#F8F3E9] hover:border-[#D8AD56] transition-all shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call Now</span>
                    </a>

                    {/* One-click WhatsApp message launcher */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-sm transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Status Changer Modal Trigger */}
                    <button
                      onClick={() => setStatusModalEnquiry(enquiry)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#F8F3E9] hover:bg-[#E6D9C5] text-[11px] font-semibold text-[#43001F] transition-all border border-[#E6D9C5]"
                    >
                      <span>Update Status</span>
                    </button>

                    {/* Admin Notes Editor Modal Trigger */}
                    <button
                      onClick={() => {
                        setNotesModalEnquiry(enquiry);
                        setCurrentNotes(enquiry.admin_notes || '');
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#F8F3E9] hover:bg-[#E6D9C5] text-[11px] font-semibold text-[#43001F] transition-all border border-[#E6D9C5]"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{enquiry.admin_notes ? 'Edit Notes' : '+ Add Note'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD NEW ENQUIRY MODAL */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#E6D9C5] shadow-2xl relative my-8">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute top-5 right-5 text-[#786A5B] hover:text-[#33271D]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8AD56] bg-[#43001F] px-2 py-0.5 rounded">
                Front Desk Reception
              </span>
              <h2 className="text-xl font-serif font-bold text-[#43001F] mt-1">
                Record New Customer Enquiry
              </h2>
              <p className="text-xs text-[#786A5B]">
                Register walk-in, phone, or direct customer lead into pipeline
              </p>
            </div>

            <form onSubmit={handleCreateEnquiry} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#33271D] mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Naidu"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#33271D] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98490 12345"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#33271D] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="guest@gmail.com"
                    value={newForm.email}
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#33271D] mb-1">
                    Lead Source
                  </label>
                  <select
                    value={newForm.source}
                    onChange={(e) => setNewForm({ ...newForm, source: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                  >
                    <option value="direct_phone">Direct Phone Call</option>
                    <option value="walk_in">Front Desk Walk-In</option>
                    <option value="website_contact">Website Contact Form</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#33271D] mb-1">
                    Check-In Date
                  </label>
                  <input
                    type="date"
                    value={newForm.check_in_date}
                    onChange={(e) => setNewForm({ ...newForm, check_in_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#33271D] mb-1">
                    Expected Guests / Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newForm.adults_count}
                    onChange={(e) => setNewForm({ ...newForm, adults_count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#33271D] mb-1">
                  Enquiry Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Group Stay for Narasimha Swamy Temple Pilgrimage"
                  value={newForm.subject}
                  onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#33271D] mb-1">
                  Enquiry Requirements / Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Details of rooms needed, event duration, special dietary preferences..."
                  value={newForm.message}
                  onChange={(e) => setNewForm({ ...newForm, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#43001F]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#786A5B] hover:text-[#33271D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#43001F] text-[#D8AD56] font-semibold text-xs border border-[#D8AD56]/40 hover:bg-[#2E0015] shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Recording...' : 'Save Lead to Pipeline'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATUS CHANGER MODAL */}
      {/* ========================================================================= */}
      {statusModalEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#E6D9C5] shadow-2xl relative">
            <button
              onClick={() => setStatusModalEnquiry(null)}
              className="absolute top-4 right-4 text-[#786A5B] hover:text-[#33271D]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif font-bold text-base text-[#43001F] mb-1">
              Update Lead Status
            </h3>
            <p className="text-xs text-[#786A5B] mb-4">
              {statusModalEnquiry.name} ({statusModalEnquiry.reference})
            </p>

            <div className="space-y-2">
              {(
                [
                  { key: 'new', label: 'New Lead', color: 'border-blue-300 text-blue-800 hover:bg-blue-50' },
                  { key: 'contacted', label: 'Contacted (Call/WA)', color: 'border-amber-300 text-amber-800 hover:bg-amber-50' },
                  { key: 'quotation_sent', label: 'Quotation Sent', color: 'border-purple-300 text-purple-800 hover:bg-purple-50' },
                  { key: 'converted', label: 'Converted (Confirmed/Won)', color: 'border-emerald-300 text-emerald-800 hover:bg-emerald-50' },
                  { key: 'closed', label: 'Closed / Cancelled', color: 'border-stone-300 text-stone-700 hover:bg-stone-50' },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleUpdateStatus(statusModalEnquiry.id, s.key)}
                  disabled={isSubmitting}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${s.color} ${
                    statusModalEnquiry.status === s.key ? 'ring-2 ring-[#43001F]' : ''
                  }`}
                >
                  <span>{s.label}</span>
                  {statusModalEnquiry.status === s.key && (
                    <CheckCircle2 className="w-4 h-4 text-[#43001F]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN NOTES EDITOR MODAL */}
      {/* ========================================================================= */}
      {notesModalEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E6D9C5] shadow-2xl relative">
            <button
              onClick={() => setNotesModalEnquiry(null)}
              className="absolute top-4 right-4 text-[#786A5B] hover:text-[#33271D]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif font-bold text-base text-[#43001F] mb-1">
              Administrative Remarks & Notes
            </h3>
            <p className="text-xs text-[#786A5B] mb-3">
              Enquiry: {notesModalEnquiry.name} ({notesModalEnquiry.reference})
            </p>

            <textarea
              rows={4}
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              placeholder="e.g. Spoke to guest on call. Agreed on ₹2,200 rate for 3 rooms with complimentary breakfast."
              className="w-full p-3 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] focus:outline-none focus:border-[#43001F]"
            />

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#E6D9C5]">
              <button
                type="button"
                onClick={() => setNotesModalEnquiry(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#786A5B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#43001F] text-[#D8AD56] text-xs font-bold border border-[#D8AD56]/40 hover:bg-[#2E0015] disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Remarks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
