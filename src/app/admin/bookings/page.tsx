'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Loader2,
  CreditCard,
  DollarSign,
  UserPlus,
  LogIn,
  LogOut,
  PlusCircle,
  Printer,
  BedDouble,
  User,
  Phone,
  Calendar,
  Building,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Zap,
  Globe,
  QrCode,
  Download,
  FileText,
  Key,
  Receipt,
  Radio,
  RefreshCw,
  X,
} from 'lucide-react';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
const LotusBrandIcon = TayiBrandIcon;
import LuxurySelect from '@/components/anantha/LuxurySelect';
import { RecordOtaBookingModal } from '@/components/admin/RecordOtaBookingModal';
import { GuestFolioModal } from '@/components/admin/GuestFolioModal';
import { PrintGstInvoiceModal } from '@/components/admin/PrintGstInvoiceModal';
import { RfidHistoryTable } from '@/components/admin/RfidHistoryTable';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import { Booking, BookingStatus, PhysicalRoom, FolioCharge } from '@/types';
import { toast } from '@/components/ui/Toast';

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [physicalRooms, setPhysicalRooms] = useState<PhysicalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showOtaModal, setShowOtaModal] = useState(false);

  // Full Folio / Details inspection modal
  const [selectedRes, setSelectedRes] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // RFID Forensic Door Tap Audit modal
  const [rfidAuditBooking, setRfidAuditBooking] = useState<Booking | null>(null);

  // Guest Folio & Incidentals modal
  const [folioModalBooking, setFolioModalBooking] = useState<Booking | null>(null);

  // Printable GST Tax Invoice modal
  const [printInvoiceBooking, setPrintInvoiceBooking] = useState<Booking | null>(null);
  const [printInvoiceCharges, setPrintInvoiceCharges] = useState<FolioCharge[]>([]);

  // Quick Check-In modal
  const [checkInTarget, setCheckInTarget] = useState<Booking | null>(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [issueRfidCard, setIssueRfidCard] = useState(true);
  const [checkInIdType, setCheckInIdType] = useState('aadhaar');
  const [checkInIdNumber, setCheckInIdNumber] = useState('');

  // Quick Check-Out & Folio Settlement modal
  const [checkOutTarget, setCheckOutTarget] = useState<Booking | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [settlementAmount, setSettlementAmount] = useState<string>('0');
  const [settlementRef, setSettlementRef] = useState('');

  // Add Incidental Charge modal
  const [chargeTarget, setChargeTarget] = useState<Booking | null>(null);
  const [chargeCategory, setChargeCategory] = useState<'room' | 'dining' | 'laundry' | 'beverage' | 'service' | 'misc'>('dining');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');

  // Payment Link modal state
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState<{ url: string; qr?: string } | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch Authoritative State
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminOperations.fetchFullState(true);
      if (data.success) {
        setBookings(data.bookings || []);
        setPhysicalRooms(data.rooms || []);
      }
    } catch (err: any) {
      console.error('Failed to load reservations:', err);
      toast.error('Failed to fetch reservations from PMS database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time synchronization
  const { isConnected, status: syncStatus } = useRealtimeSync({
    onRefresh: fetchBookings,
    onEvent: (event) => {
      if (
        event.eventType === 'booking_created' ||
        event.eventType === 'booking_updated' ||
        event.eventType === 'check_in' ||
        event.eventType === 'check_out' ||
        event.eventType === 'payment_recorded'
      ) {
        fetchBookings();
      }
    },
  });

  // Global ESC key listener for modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCheckInTarget(null);
        setCheckOutTarget(null);
        setChargeTarget(null);
        setSelectedRes(null);
        setRfidAuditBooking(null);
        setFolioModalBooking(null);
        setPrintInvoiceBooking(null);
        setGeneratedPaymentLink(null);
        setShowOtaModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter reservations by source, search term, and status
  const displayedReservations = useMemo(() => {
    return bookings.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'confirmed' && r.status !== 'confirmed') return false;
        if (statusFilter === 'checked_in' && r.status !== 'checked_in') return false;
        if (statusFilter === 'completed' && r.status !== 'checked_out') return false;
        if (statusFilter === 'cancelled' && r.status !== 'cancelled') return false;
      }

      // 2. Source Filter
      const src = (r.booking_source || '').toLowerCase();
      const notes = (r.internal_notes || '').toLowerCase();
      const isWalkIn = src.includes('walk_in') || src.includes('manual') || notes.includes('walk-in');
      const isOta =
        src === 'makemytrip' ||
        src === 'goibibo' ||
        src === 'booking_com' ||
        src === 'agoda' ||
        src === 'airbnb' ||
        src === 'expedia' ||
        src === 'ota' ||
        notes.includes('ota') ||
        notes.includes('makemytrip') ||
        notes.includes('booking.com');
      const isOnline = !isWalkIn && !isOta;

      if (sourceFilter === 'walk_in' && !isWalkIn) return false;
      if (sourceFilter === 'online' && !isOnline) return false;
      if (sourceFilter === 'ota' && !isOta) return false;

      // 3. Search Query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesRef = r.booking_reference.toLowerCase().includes(q);
        const matchesName = r.guest_name.toLowerCase().includes(q);
        const matchesPhone = r.guest_phone.includes(q);
        const matchesRoom = (r.assigned_room_number || '').includes(q);
        if (!matchesRef && !matchesName && !matchesPhone && !matchesRoom) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, statusFilter, sourceFilter, search]);

  // Source Badge Component
  const renderSourceBadge = (r: Booking) => {
    const src = (r.booking_source || '').toLowerCase();
    const notes = (r.internal_notes || '').toLowerCase();

    if (src.includes('walk_in') || src.includes('manual') || notes.includes('walk-in')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
          <Zap className="w-2.5 h-2.5 text-amber-600" />
          <span>Walk-In</span>
        </span>
      );
    }
    if (src === 'makemytrip' || notes.includes('makemytrip') || notes.includes('mmt')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-wider bg-red-50 text-red-700 border border-red-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          <span>MMT</span>
        </span>
      );
    }
    if (src === 'goibibo' || notes.includes('goibibo')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-wider bg-orange-50 text-orange-700 border border-orange-300">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
          <span>Goibibo</span>
        </span>
      );
    }
    if (src === 'booking_com' || notes.includes('booking.com')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-wider bg-blue-50 text-blue-900 border border-blue-300">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
          <span>Booking.com</span>
        </span>
      );
    }
    if (src === 'agoda' || src === 'airbnb' || src === 'expedia' || src === 'ota' || notes.includes('ota')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-wider bg-purple-50 text-purple-800 border border-purple-300">
          <Globe className="w-2.5 h-2.5 text-purple-700" />
          <span>OTA</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
        <Globe className="w-2.5 h-2.5 text-blue-700" />
        <span>Website</span>
      </span>
    );
  };

  // CSV Export for auditing and accounts
  const handleExportCsv = () => {
    if (displayedReservations.length === 0) {
      toast.warning('No reservations available to export.');
      return;
    }
    const headers = [
      'Booking Reference',
      'Guest Name',
      'Phone',
      'Email',
      'Room Category',
      'Room Number',
      'Check-in Date',
      'Check-out Date',
      'Nights',
      'Total Amount (INR)',
      'Paid Amount (INR)',
      'Balance Due (INR)',
      'Status',
      'Payment Status',
      'Source',
    ];
    const rows = displayedReservations.map((r) => {
      const balance = Math.max(0, r.total_amount - r.paid_amount);
      const d1 = new Date(r.check_in_date);
      const d2 = new Date(r.check_out_date);
      const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      return [
        `"${r.booking_reference}"`,
        `"${r.guest_name}"`,
        `"${r.guest_phone}"`,
        `"${r.guest_email || ''}"`,
        `"${r.category_name}"`,
        `"${r.assigned_room_number || 'Unassigned'}"`,
        `"${r.check_in_date}"`,
        `"${r.check_out_date}"`,
        nights,
        r.total_amount,
        r.paid_amount,
        balance,
        `"${r.status}"`,
        `"${r.payment_status}"`,
        `"${r.booking_source || 'website'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sri_Tayi_Grand_Reservations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reservation folios exported to CSV successfully.');
  };

  // Action: Confirm Check-In
  const handleConfirmCheckIn = async () => {
    if (!checkInTarget) return;
    if (!selectedRoomNumber) {
      toast.warning('Please select a clean physical room number.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.checkIn({
        bookingReference: checkInTarget.booking_reference,
        roomNumber: selectedRoomNumber,
        issueRfid: issueRfidCard,
        idProofType: checkInIdType,
        idProofNumber: checkInIdNumber.trim() || undefined,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success(
          `Guest ${checkInTarget.guest_name} checked in to Room #${selectedRoomNumber}.${
            issueRfidCard ? ' RFID Keycard activated.' : ''
          }`
        );
        setCheckInTarget(null);
        await fetchBookings();
      } else {
        toast.error(res.error || 'Check-in failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while checking in guest');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Confirm Check-Out & Settlement
  const handleConfirmCheckOut = async () => {
    if (!checkOutTarget) return;

    setActionLoading(true);
    try {
      const settleNum = Number(settlementAmount) || 0;
      const res = await adminOperations.checkOut({
        bookingReference: checkOutTarget.booking_reference,
        settlementMethod,
        additionalCharges: 0,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success(
          `Guest checked out. Room #${
            checkOutTarget.assigned_room_number || checkOutTarget.room_number || 'Room'
          } is now marked as Vacant Dirty for Housekeeping. Keycards deactivated.`
        );
        setCheckOutTarget(null);
        await fetchBookings();
      } else {
        toast.error(res.error || 'Check-out failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while checking out guest');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Folio Charge
  const handleAddFolioCharge = async () => {
    if (!chargeTarget || !chargeDescription.trim() || !chargeAmount) {
      toast.warning('Please enter charge description and amount.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.addFolioCharge(chargeTarget.booking_reference, {
        category: (chargeCategory as any) || 'room_service',
        description: chargeDescription.trim(),
        amount: Number(chargeAmount),
        posted_by: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success('Folio incidentals charge added successfully.');
        setChargeTarget(null);
        setChargeDescription('');
        setChargeAmount('');
        await fetchBookings();
      } else {
        toast.error(res.error || 'Failed to post charge');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while adding folio charge');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Generate Razorpay Payment Link
  const handleGeneratePaymentLink = async (res: Booking) => {
    const due = Math.max(0, res.total_amount - res.paid_amount);
    if (due <= 0) {
      toast.info('This reservation is already fully paid.');
      return;
    }

    setGeneratingLink(true);
    try {
      const response = await fetch('/api/admin/payments/create-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: res.id,
          bookingReference: res.booking_reference,
          amountInr: due,
          guestName: res.guest_name,
          guestEmail: res.guest_email,
          guestPhone: res.guest_phone,
          description: `Settlement balance for ${res.booking_reference} (${res.category_name})`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Digital Razorpay payment link & QR generated.');
        setGeneratedPaymentLink({
          url: data.paymentLinkUrl,
          qr: data.qrCodeUrl,
        });
      } else {
        toast.error(data.error || 'Failed to generate payment link');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  // Action: Cancel Booking
  const handleCancelBooking = async (ref: string) => {
    const reason = prompt('Enter cancellation reason (e.g. Guest phone request, No-show):');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await adminOperations.updateBookingStatus({
        bookingReference: ref,
        status: 'cancelled',
        notes: `Cancelled by Front Desk: ${reason}`,
        staffName: 'Front Desk Duty Officer',
      });
      if (res.success) {
        toast.success('Reservation cancelled and inventory released.');
        setSelectedRes(null);
        await fetchBookings();
      } else {
        toast.error(res.error || 'Failed to cancel reservation');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while cancelling');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Mark Paid
  const handleMarkPaid = async (ref: string, totalAmount: number) => {
    if (!confirm(`Mark reservation ${ref} as paid via Front Desk / POS for ₹${totalAmount.toLocaleString('en-IN')}?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: ref,
          amount: totalAmount,
          paymentMethod: 'cash',
          notes: 'Marked paid by Front Desk Duty Officer',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Reservation marked as paid successfully.');
        setSelectedRes(null);
        await fetchBookings();
      } else {
        toast.error(data.error || 'Failed to update payment status');
      }
    } catch {
      toast.error('Network error while updating payment');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header matching exact luxury design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#8D672F] inline-flex items-center gap-1.5">
              <LotusBrandIcon size={14} className="w-3.5 h-3.5" />
              PMS RESERVATION OPERATIONS
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected ? 'Real-Time Sync Active' : `Sync: ${syncStatus}`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#33271D] font-bold">
            Guest Reservations & In-House Folios
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            Manage online bookings, front desk walk-ins, arrivals, in-house guests, and departures.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowOtaModal(true)}
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-[#21180F] hover:bg-black text-[#FAF6EE] text-xs uppercase tracking-wider font-bold border border-[#B18A4A]/50 shadow-md transition-all flex items-center space-x-1.5 min-h-[42px] cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#B18A4A]" />
            <span>+ Record OTA Booking</span>
          </button>

          <Link
            href="/admin/front-desk"
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-wider font-semibold shadow-md transition-all flex items-center space-x-1.5 min-h-[42px] cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>New Walk-In</span>
          </Link>

          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs font-semibold text-[#33271D] hover:bg-[#F8F3E9] shadow-sm transition-all flex items-center space-x-1.5 min-h-[42px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#B18A4A]" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/admin/rooms/board"
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs font-semibold text-[#33271D] hover:bg-[#F8F3E9] transition-all flex items-center space-x-1.5 min-h-[42px] cursor-pointer"
          >
            <BedDouble className="w-3.5 h-3.5 text-[#B18A4A]" />
            <span>Tape Chart</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E6D9C5] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Source Tabs */}
        <div className="flex items-center space-x-1 bg-[#F8F3E9] p-1 rounded-xl overflow-x-auto no-scrollbar touch-scroll shrink-0">
          {[
            { id: 'all', label: 'All Sources', icon: null },
            { id: 'walk_in', label: 'Walk-In', icon: Zap },
            { id: 'online', label: 'Website', icon: Globe },
            { id: 'ota', label: 'MakeMyTrip & OTAs', icon: Globe },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSourceFilter(s.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  sourceFilter === s.id ? 'bg-[#8D672F] text-white shadow-sm' : 'text-[#786A5B] hover:text-[#33271D]'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="flex-1 flex items-center gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#786A5B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, guest name, phone..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs text-[#33271D] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#8D672F] text-white text-xs font-semibold hover:bg-[#6D4E21] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-h-[38px] transition-opacity cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Search</span>
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#786A5B] shrink-0" />
          <LuxurySelect<string>
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            variant="white"
            size="sm"
            options={[
              { value: 'all', label: 'All Lifecycle Statuses' },
              { value: 'confirmed', label: 'Confirmed (Arrival Pending)' },
              { value: 'checked_in', label: 'Checked In (In-House)' },
              { value: 'completed', label: 'Completed (Checked Out)' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            className="w-full md:w-60"
          />
        </div>
      </div>

      {/* Reservations Container */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E6D9C5] shadow-sm">
        {loading && bookings.length === 0 ? (
          <div className="py-20 flex items-center justify-center space-x-2 text-xs text-[#786A5B]">
            <Loader2 className="w-5 h-5 animate-spin text-[#8D672F]" />
            <span>Loading reservations...</span>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW: Designed for phone screens (< lg) */}
            <div className="block lg:hidden space-y-3.5">
              {displayedReservations.length > 0 ? (
                displayedReservations.map((r) => {
                  const isCheckedIn = r.status === 'checked_in';
                  const isConfirmed = r.status === 'confirmed';
                  const balance = Math.max(0, r.total_amount - r.paid_amount);
                  const d1 = new Date(r.check_in_date);
                  const d2 = new Date(r.check_out_date);
                  const numNights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div key={r.id} className="bg-[#FAF6EE]/50 rounded-2xl p-4 border border-[#E6D9C5] shadow-xs space-y-3">
                      {/* Top Row: Ref, Source badge, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#8D672F]">{r.booking_reference}</span>
                          {renderSourceBadge(r)}
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCheckedIn
                              ? 'bg-[#21180F] text-[#B18A4A] border border-black'
                              : isConfirmed
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'checked_out'
                              ? 'bg-slate-100 text-slate-800'
                              : r.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status === 'checked_in' ? 'In-House' : r.status === 'checked_out' ? 'Completed' : r.status}
                        </span>
                      </div>

                      {/* Guest info & Room */}
                      <div className="flex items-start justify-between gap-2 pt-1 border-t border-[#E6D9C5]/50">
                        <div>
                          <div className="font-semibold text-sm text-[#33271D]">{r.guest_name}</div>
                          <a
                            href={`tel:${r.guest_phone}`}
                            className="text-xs text-[#8D672F] underline font-mono inline-flex items-center gap-1 mt-0.5 hover:text-black"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{r.guest_phone}</span>
                          </a>
                          {r.id_proof_number && (
                            <div className="text-[10px] text-[#786A5B] font-mono mt-0.5">
                              ID: {r.id_proof_type?.toUpperCase()} {r.id_proof_number}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {r.assigned_room_number ? (
                            <span className="inline-flex items-center space-x-1 font-bold text-xs bg-[#21180F] text-white px-2.5 py-1 rounded-xl">
                              <span>Room #{r.assigned_room_number}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Unassigned
                            </span>
                          )}
                          <div className="text-[10px] text-[#786A5B] mt-1">{r.category_name}</div>
                        </div>
                      </div>

                      {/* Stay dates & financials */}
                      <div className="p-2.5 rounded-xl bg-white border border-[#E6D9C5]/60 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-[#33271D] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#B18A4A]" />
                            <span>{r.check_in_date} &rarr; {r.check_out_date}</span>
                          </div>
                          <div className="text-[10px] text-[#786A5B]">{numNights} Night(s)</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#33271D]">₹{r.total_amount.toLocaleString('en-IN')}</div>
                          <div className={`text-[10px] font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {balance > 0 ? `Due: ₹${balance.toLocaleString('en-IN')}` : 'Fully Paid'}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Toolbar for mobile */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E6D9C5]/50">
                        {isConfirmed && (
                          <button
                            onClick={() => {
                              setCheckInTarget(r);
                              setSelectedRoomNumber(r.assigned_room_number || '');
                              setCheckInIdType(r.id_proof_type || 'aadhaar');
                              setCheckInIdNumber(r.id_proof_number || '');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm min-h-[40px] cursor-pointer"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Check In</span>
                          </button>
                        )}

                        {isCheckedIn && (
                          <>
                            <button
                              onClick={() => {
                                setCheckOutTarget(r);
                                setSettlementAmount(balance.toString());
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#21180F] hover:bg-black text-[#B18A4A] font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm min-h-[40px] cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5 text-white" />
                              <span>Check Out</span>
                            </button>

                            <button
                              onClick={() => setChargeTarget(r)}
                              className="py-2 px-3 rounded-xl border border-[#E6D9C5] bg-white text-[#8D672F] font-semibold text-xs flex items-center justify-center space-x-1 min-h-[40px] cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>+ Charge</span>
                            </button>
                          </>
                        )}

                        {/* RFID Door Tap History */}
                        <button
                          onClick={() => setRfidAuditBooking(r)}
                          className="py-2 px-3 rounded-xl bg-[#FAF5EB] border border-[#E2D5BE] text-[#8a6a2a] hover:bg-[#E2D5BE]/60 text-xs font-semibold flex items-center justify-center space-x-1 min-h-[40px] cursor-pointer"
                          title="Physical Door Lock Tap Forensic Logs"
                        >
                          <Key className="w-3.5 h-3.5 text-[#9b7a3e]" />
                          <span>RFID</span>
                        </button>

                        {/* Guest Folio & Charges */}
                        <button
                          onClick={() => setFolioModalBooking(r)}
                          className="p-2 rounded-xl bg-[#382216] text-[#D8AD56] hover:bg-[#25150F] flex items-center justify-center min-h-[40px] px-3 text-xs font-bold cursor-pointer shadow-xs"
                          title="Open Folio, Incidentals & Settle"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1" />
                          <span>Folio</span>
                        </button>

                        {/* Print Tax Invoice */}
                        <button
                          onClick={() => {
                            setPrintInvoiceBooking(r);
                            setPrintInvoiceCharges([]);
                          }}
                          className="p-2 rounded-xl border border-[#D8AD56]/40 bg-white text-[#382216] hover:bg-[#F8F3E9] flex items-center justify-center min-h-[40px] px-3 text-xs font-semibold cursor-pointer"
                          title="Print Official GST Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          <span>Invoice</span>
                        </button>

                        <button
                          onClick={() => setSelectedRes(r)}
                          className="p-2 rounded-xl border border-[#E6D9C5] bg-white text-[#8D672F] hover:bg-[#F8F3E9] flex items-center justify-center min-h-[40px] px-2.5 text-xs font-medium cursor-pointer"
                          title="Inspect Full Folio"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-[#786A5B] bg-[#FAF6EE]/50 rounded-2xl border border-[#E6D9C5] space-y-3">
                  <Calendar className="w-8 h-8 text-[#8D672F]/50 mx-auto" />
                  <p className="font-medium text-[#33271D]">No matching reservations found</p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Link
                      href="/admin/front-desk"
                      className="px-3.5 py-1.5 rounded-xl bg-[#8D672F] text-white text-xs font-semibold hover:bg-[#6D4E21] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Walk-In</span>
                    </Link>
                    <button
                      onClick={() => setShowOtaModal(true)}
                      className="px-3.5 py-1.5 rounded-xl border border-[#8D672F] text-[#8D672F] text-xs font-semibold hover:bg-[#8D672F]/10 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Record OTA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW: For screens >= lg (Exact Match to Screenshot) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="text-[11px] uppercase tracking-wider text-[#786A5B] bg-[#F8F3E9]/60">
                  <tr>
                    <th className="p-3 rounded-l-xl">Ref & Source</th>
                    <th className="p-3">Guest Details</th>
                    <th className="p-3">Room Assigned</th>
                    <th className="p-3">Stay Dates</th>
                    <th className="p-3">Total & Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 rounded-r-xl text-right">PMS Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D9C5]/50">
                  {displayedReservations.length > 0 ? (
                    displayedReservations.map((r) => {
                      const isCheckedIn = r.status === 'checked_in';
                      const isConfirmed = r.status === 'confirmed';
                      const balance = Math.max(0, r.total_amount - r.paid_amount);
                      const d1 = new Date(r.check_in_date);
                      const d2 = new Date(r.check_out_date);
                      const numNights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));

                      return (
                        <tr key={r.id} className="hover:bg-[#F8F3E9]/30 transition-colors">
                          <td className="p-3 font-mono font-semibold text-[#8D672F]">
                            <div>{r.booking_reference}</div>
                            <div className="mt-1">{renderSourceBadge(r)}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[#33271D]">{r.guest_name}</div>
                            <a
                              href={`tel:${r.guest_phone}`}
                              className="text-[11px] text-[#786A5B] hover:text-[#8D672F] underline"
                            >
                              {r.guest_phone}
                            </a>
                            {r.id_proof_number && (
                              <div className="text-[10px] text-[#786A5B] font-mono mt-0.5">
                                ID: {r.id_proof_type?.toUpperCase()} {r.id_proof_number}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {r.assigned_room_number ? (
                              <span className="inline-flex items-center space-x-1 font-bold text-xs bg-[#21180F] text-white px-2.5 py-1 rounded-xl">
                                <span>Room #{r.assigned_room_number}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Unassigned
                              </span>
                            )}
                            <div className="text-[10px] text-[#786A5B] mt-0.5">{r.category_name}</div>
                          </td>
                          <td className="p-3 text-[#786A5B]">
                            <div className="font-medium text-[#33271D]">{r.check_in_date} &rarr; {r.check_out_date}</div>
                            <div className="text-[10px]">{numNights} Night(s)</div>
                          </td>
                          <td className="p-3 font-semibold text-[#33271D]">
                            <div>₹{r.total_amount.toLocaleString('en-IN')}</div>
                            <div className={`text-[10px] font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {balance > 0 ? `Due: ₹${balance.toLocaleString('en-IN')}` : 'Fully Paid'}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCheckedIn
                                  ? 'bg-[#21180F] text-[#B18A4A] border border-black'
                                  : isConfirmed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'checked_out'
                                  ? 'bg-slate-100 text-slate-800'
                                  : r.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.status === 'checked_in' ? 'In-House' : r.status === 'checked_out' ? 'Completed' : r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Quick Check-In if Confirmed */}
                              {isConfirmed && (
                                <button
                                  onClick={() => {
                                    setCheckInTarget(r);
                                    setSelectedRoomNumber(r.assigned_room_number || '');
                                    setCheckInIdType(r.id_proof_type || 'aadhaar');
                                    setCheckInIdNumber(r.id_proof_number || '');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-sm cursor-pointer"
                                  title="Check In Guest & Assign Room"
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>Check In</span>
                                </button>
                              )}

                              {/* Quick Check-Out & Settle if In-House */}
                              {isCheckedIn && (
                                <>
                                  <button
                                    onClick={() => {
                                      setCheckOutTarget(r);
                                      setSettlementAmount(balance.toString());
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#21180F] hover:bg-black text-[#B18A4A] font-semibold text-[11px] flex items-center space-x-1 shadow-sm cursor-pointer"
                                    title="Check Out & Settle Folio (Deactivates RFID)"
                                  >
                                    <LogOut className="w-3 h-3 text-white" />
                                    <span>Check Out</span>
                                  </button>

                                  <button
                                    onClick={() => setChargeTarget(r)}
                                    className="p-1.5 rounded-lg border border-[#E6D9C5] text-[#8D672F] hover:bg-[#F8F3E9] cursor-pointer"
                                    title="Post Folio Incidentals (Room Service, Extra Bed, Laundry)"
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {/* Forensic Door Tap History */}
                              <button
                                onClick={() => setRfidAuditBooking(r)}
                                className="p-1.5 rounded-lg bg-[#FAF5EB] border border-[#E2D5BE] text-[#8a6a2a] hover:bg-[#E2D5BE]/60 cursor-pointer"
                                title="View Physical RFID Door Lock Audit Trail"
                              >
                                <Key className="w-4 h-4 text-[#9b7a3e]" />
                              </button>

                              {/* Folio / Incidentals Modal */}
                              <button
                                onClick={() => setFolioModalBooking(r)}
                                className="p-1.5 rounded-lg bg-[#382216] text-[#D8AD56] hover:bg-[#25150F] cursor-pointer shadow-xs"
                                title="Open Guest Folio & Incidentals"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>

                              {/* Print Official GST Tax Invoice */}
                              <button
                                onClick={() => {
                                  setPrintInvoiceBooking(r);
                                  setPrintInvoiceCharges([]);
                                }}
                                className="p-1.5 rounded-lg border border-[#D8AD56]/40 text-[#382216] hover:bg-[#F8F3E9] cursor-pointer"
                                title="Print Official GST Tax Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Full Folio Inspector */}
                              <button
                                onClick={() => setSelectedRes(r)}
                                className="p-1.5 rounded-lg border border-[#E6D9C5] text-[#8D672F] hover:bg-[#F8F3E9] cursor-pointer"
                                title="Inspect Full Folio & Gateway Audit"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-[#786A5B]">
                        <Calendar className="w-8 h-8 text-[#8D672F]/50 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-[#33271D] mb-1">No reservations match your current filters</p>
                        <p className="text-xs text-[#786A5B] mb-4">Clear filters or register a new guest directly at the front desk.</p>
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href="/admin/front-desk"
                            className="px-4 py-2 rounded-xl bg-[#8D672F] text-white text-xs font-semibold hover:bg-[#6D4E21] inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>New Walk-In Guest</span>
                          </Link>
                          <button
                            onClick={() => setShowOtaModal(true)}
                            className="px-4 py-2 rounded-xl border border-[#8D672F] text-[#8D672F] text-xs font-semibold hover:bg-[#8D672F]/10 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Record OTA Booking</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* --- MODAL 1: CHECK-IN GUEST WITH RFID KEYCARD ENCODING OPTION --- */}
      {checkInTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCheckInTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E6D9C5] space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#8D672F] font-bold">Front Desk Arrival</span>
                <h3 className="text-lg font-serif text-[#33271D] font-bold">Check In: {checkInTarget.guest_name}</h3>
              </div>
              <button onClick={() => setCheckInTarget(null)} className="text-xs text-[#786A5B] hover:text-black cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5] space-y-1">
                <div><b>Booking Reference:</b> {checkInTarget.booking_reference}</div>
                <div><b>Category:</b> {checkInTarget.category_name}</div>
                <div><b>Dates:</b> {checkInTarget.check_in_date} to {checkInTarget.check_out_date}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1.5">
                  Allocate Physical Room Number *
                </label>
                <LuxurySelect<string>
                  value={selectedRoomNumber}
                  onChange={(val) => setSelectedRoomNumber(val)}
                  placeholder="-- Choose Clean Physical Room --"
                  options={[
                    { value: '', label: '-- Choose Clean Physical Room --' },
                    ...physicalRooms
                      .filter(
                        (pr) =>
                          (pr.category_id === checkInTarget.category_id ||
                            pr.room_number === checkInTarget.assigned_room_number)
                      )
                      .map((pr) => ({
                        value: pr.room_number,
                        label: `Room #${pr.room_number} (Floor ${pr.floor_number}) — ${
                          pr.operational_status === 'available' ? 'Available Clean' : pr.operational_status
                        }`,
                      })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Guest Statutory Identity Proof */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">ID Proof Type</label>
                  <select
                    value={checkInIdType}
                    onChange={(e) => setCheckInIdType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#D5C7B5] bg-white text-xs text-[#33271D]"
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="passport">Passport</option>
                    <option value="driving_license">Driving License</option>
                    <option value="voter_id">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">ID Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 5678 1234 9012"
                    value={checkInIdNumber}
                    onChange={(e) => setCheckInIdNumber(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#D5C7B5] bg-white text-xs font-mono text-[#33271D]"
                  />
                </div>
              </div>

              {/* RFID Keycard Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAF5EB] border border-[#E2D5BE] cursor-pointer">
                <input
                  type="checkbox"
                  checked={issueRfidCard}
                  onChange={(e) => setIssueRfidCard(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#8D672F] focus:ring-[#8D672F]"
                />
                <div>
                  <div className="font-bold text-[#8a6a2a] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#9b7a3e]" />
                    <span>Encode & Activate RFID Room Keycard</span>
                  </div>
                  <div className="text-[10px] text-[#786A5B] mt-0.5">
                    Registers physical keycard for door lock access during stay. Automatically deactivated on check-out.
                  </div>
                </div>
              </label>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setCheckInTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs text-[#786A5B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !selectedRoomNumber}
                  onClick={handleConfirmCheckIn}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {actionLoading ? 'Checking In...' : 'Confirm Arrival & Check In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CHECK-OUT GUEST & SETTLE FOLIO (AUTOMATIC KEYCARD DEACTIVATION) --- */}
      {checkOutTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCheckOutTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E6D9C5] space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#8D672F] font-bold">Front Desk Departure</span>
                <h3 className="text-lg font-serif text-[#33271D] font-bold">
                  Check Out: Room #{checkOutTarget.assigned_room_number || checkOutTarget.room_number || 'Room'}
                </h3>
              </div>
              <button onClick={() => setCheckOutTarget(null)} className="text-xs text-[#786A5B] hover:text-black cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5] space-y-1">
                <div><b>Guest:</b> {checkOutTarget.guest_name}</div>
                <div><b>Total Folio:</b> ₹{checkOutTarget.total_amount.toLocaleString('en-IN')}</div>
                <div><b>Amount Paid:</b> ₹{checkOutTarget.paid_amount.toLocaleString('en-IN')}</div>
                <div className="text-sm font-bold text-amber-800 pt-1 border-t border-[#E6D9C5]">
                  Balance Due: ₹{Math.max(0, checkOutTarget.total_amount - checkOutTarget.paid_amount).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1">
                  Settlement Collection Amount (₹)
                </label>
                <input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs font-mono font-bold text-[#33271D] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'card', label: 'POS Card' },
                  { id: 'upi', label: 'UPI' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettlementMethod(m.id as any)}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      settlementMethod === m.id ? 'bg-[#8D672F] text-white border-[#8D672F]' : 'border-[#E6D9C5] text-[#33271D]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1">
                  Receipt / Transaction Ref (Optional)
                </label>
                <input
                  type="text"
                  value={settlementRef}
                  onChange={(e) => setSettlementRef(e.target.value)}
                  placeholder="e.g. POS-1029 or Cash Counter"
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs text-[#33271D] outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                Checking out will release Room #{checkOutTarget.assigned_room_number || checkOutTarget.room_number || ''}, automatically mark it as <b>Vacant Dirty</b> for Housekeeping, and <b>deactivate associated physical RFID keycards</b>.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setCheckOutTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs text-[#786A5B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmCheckOut}
                  className="px-5 py-2.5 rounded-xl bg-[#21180F] hover:bg-black text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {actionLoading ? 'Processing...' : 'Settle & Complete Check-Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: POST INCIDENTAL CHARGE --- */}
      {chargeTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setChargeTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E6D9C5] space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#8D672F] font-bold">In-House Room Service</span>
                <h3 className="text-lg font-serif text-[#33271D] font-bold">
                  Post Charge: Room #{chargeTarget.assigned_room_number || chargeTarget.room_number || 'Room'}
                </h3>
              </div>
              <button onClick={() => setChargeTarget(null)} className="text-xs text-[#786A5B] hover:text-black cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1">Category</label>
                <LuxurySelect<any>
                  value={chargeCategory}
                  onChange={(val) => setChargeCategory(val)}
                  options={[
                    { value: 'dining', label: 'In-Room Dining / Restaurant' },
                    { value: 'laundry', label: 'Laundry / Dry Cleaning' },
                    { value: 'beverage', label: 'Beverage / Minibar' },
                    { value: 'service', label: 'Extra Bed / Amenities' },
                    { value: 'misc', label: 'Miscellaneous' },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1">Charge Description *</label>
                <input
                  type="text"
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  placeholder="e.g. Andhra Thali lunch (2x)"
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs text-[#33271D] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="500"
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs font-mono font-bold text-[#33271D] outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setChargeTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs text-[#786A5B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !chargeDescription || !chargeAmount}
                  onClick={handleAddFolioCharge}
                  className="px-5 py-2.5 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {actionLoading ? 'Posting...' : 'Post Charge to Folio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: FULL FOLIO INSPECTOR & RAZORPAY GATEWAY AUDIT --- */}
      {selectedRes && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRes(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-[#E6D9C5] space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#786A5B]">
                  {selectedRes.booking_source?.includes('walk_in') ? 'Walk-In Guest Folio' : 'Online Guest Reservation'}
                </span>
                <h3 className="text-xl font-serif text-[#33271D] font-bold">
                  {selectedRes.booking_reference}{' '}
                  {selectedRes.assigned_room_number ? `(Room #${selectedRes.assigned_room_number})` : ''}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRes(null)}
                className="text-xs text-[#786A5B] hover:text-[#33271D] cursor-pointer"
              >
                Close &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div><span className="text-[#786A5B]">Guest Name:</span> <span className="font-semibold text-[#33271D]">{selectedRes.guest_name}</span></div>
              <div><span className="text-[#786A5B]">Contact Phone:</span> <span className="font-semibold text-[#33271D]">{selectedRes.guest_phone}</span></div>
              <div><span className="text-[#786A5B]">Email:</span> <span className="font-semibold text-[#33271D]">{selectedRes.guest_email || 'Not specified'}</span></div>
              <div><span className="text-[#786A5B]">Room Category:</span> <span className="font-semibold text-[#33271D]">{selectedRes.category_name}</span></div>
              <div><span className="text-[#786A5B]">Check-in Date:</span> <span className="font-semibold text-[#33271D]">{selectedRes.check_in_date}</span></div>
              <div><span className="text-[#786A5B]">Check-out Date:</span> <span className="font-semibold text-[#33271D]">{selectedRes.check_out_date}</span></div>
              <div><span className="text-[#786A5B]">Reservation Status:</span> <span className="font-bold uppercase text-[#8D672F]">{selectedRes.status}</span></div>
              <div><span className="text-[#786A5B]">Payment Status:</span> <span className="font-bold uppercase text-[#8D672F]">{selectedRes.payment_status}</span></div>

              {selectedRes.id_proof_number && (
                <div className="col-span-2 p-2.5 rounded-xl bg-[#F8F3E9] border border-[#E6D9C5] flex items-center justify-between">
                  <span><b>Government ID:</b> {selectedRes.id_proof_type?.toUpperCase()}</span>
                  <span className="font-mono font-bold text-[#33271D]">{selectedRes.id_proof_number}</span>
                </div>
              )}
            </div>

            {/* Financial breakdown */}
            <div className="p-4 rounded-xl bg-[#F8F3E9]/50 border border-[#E6D9C5] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#786A5B]">
                <span>Room Charges:</span>
                <span>₹{selectedRes.subtotal_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#786A5B]">
                <span>Taxes & Fees (12% GST):</span>
                <span>₹{selectedRes.tax_amount.toLocaleString('en-IN')}</span>
              </div>
              {selectedRes.additional_charges_amount > 0 && (
                <div className="flex justify-between text-[#786A5B]">
                  <span>Incidentals & Extra Services:</span>
                  <span>₹{selectedRes.additional_charges_amount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[#33271D] pt-1 border-t border-[#E6D9C5]">
                <span>Total Folio Amount:</span>
                <span className="text-[#8D672F]">₹{selectedRes.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Amount Paid:</span>
                <span>₹{selectedRes.paid_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-[#E6D9C5]">
                <span>Balance Due:</span>
                <span>₹{Math.max(0, selectedRes.total_amount - selectedRes.paid_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Razorpay Gateway Audit & Digital Settlement Link */}
            <div className="p-4 rounded-2xl bg-white border border-[#E6D9C5] space-y-3 text-xs shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6D9C5]">
                <span className="font-bold text-[#33271D] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#8D672F]" />
                  <span>Razorpay Payment System & Gateway Audit</span>
                </span>
                <Link
                  href={`/admin/payments?search=${selectedRes.booking_reference}`}
                  className="text-[10px] text-[#8D672F] font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>View in Financial Ledger &rarr;</span>
                </Link>
              </div>

              {/* Digital Payment Link Button or Display */}
              {Math.max(0, selectedRes.total_amount - selectedRes.paid_amount) > 0 && selectedRes.status !== 'cancelled' && (
                <div className="pt-2">
                  {generatedPaymentLink ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="text-[11px] text-emerald-900 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Active Razorpay Payment Link Generated:</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-emerald-950 truncate">
                          {generatedPaymentLink.url}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPaymentLink.url);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold shrink-0 flex items-center space-x-1 cursor-pointer"
                        >
                          {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{linkCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      {generatedPaymentLink.qr && (
                        <div className="pt-2 flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={generatedPaymentLink.qr} alt="UPI QR" className="w-32 h-32 object-contain bg-white p-1 rounded-lg border border-emerald-200" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={generatingLink}
                      onClick={() => handleGeneratePaymentLink(selectedRes)}
                      className="w-full py-2 px-3 rounded-xl bg-[#8D672F]/10 border border-[#8D672F]/30 hover:bg-[#8D672F]/20 text-[#8D672F] font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#8D672F]" />
                      <span>{generatingLink ? 'Creating Razorpay Link...' : 'Generate Razorpay Payment Link / QR for Balance'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6D9C5]">
              <div className="flex items-center gap-4">
                <Link
                  href={`/booking/confirmation/${selectedRes.booking_reference}`}
                  target="_blank"
                  className="text-xs text-[#8D672F] underline cursor-pointer"
                >
                  Print Guest Voucher &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const b = selectedRes;
                    setSelectedRes(null);
                    setPrintInvoiceBooking(b);
                    setPrintInvoiceCharges([]);
                  }}
                  className="text-xs text-[#8D672F] underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>GST Tax Invoice &rarr;</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedRes.payment_status !== 'successful' && selectedRes.status !== 'cancelled' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleMarkPaid(selectedRes.booking_reference, selectedRes.total_amount)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Mark Paid (Front Desk)
                  </button>
                )}

                {selectedRes.status !== 'cancelled' && selectedRes.status !== 'checked_out' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleCancelBooking(selectedRes.booking_reference)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: RFID DOOR TAP FORENSIC AUDIT TRAIL MODAL --- */}
      {rfidAuditBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-4 sm:p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] border border-[#E2D5BE] flex items-center justify-center text-[#9b7a3e]">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9b7a3e] block">
                    Forensic Door Lock Audit Trail
                  </span>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#241912]">
                    Stay {rfidAuditBooking.booking_reference} • Room {rfidAuditBooking.assigned_room_number || rfidAuditBooking.room_number || 'Unassigned'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setRfidAuditBooking(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                title="Close Audit Trail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RfidHistoryTable
              roomNumber={rfidAuditBooking.assigned_room_number || rfidAuditBooking.room_number}
              bookingId={rfidAuditBooking.id || rfidAuditBooking.booking_reference}
              guestName={rfidAuditBooking.guest_name}
              checkInTime={rfidAuditBooking.checked_in_at || rfidAuditBooking.check_in_date}
              checkOutTime={rfidAuditBooking.checked_out_at || rfidAuditBooking.check_out_date}
            />
          </div>
        </div>
      )}

      {/* --- MODAL 6: GUEST FOLIO & INCIDENTAL CHARGES MODAL --- */}
      <GuestFolioModal
        isOpen={!!folioModalBooking}
        onClose={() => setFolioModalBooking(null)}
        booking={folioModalBooking}
        onOpenPrintInvoice={(b, charges) => {
          setPrintInvoiceBooking(b);
          setPrintInvoiceCharges(charges);
        }}
        onBookingUpdated={fetchBookings}
      />

      {/* --- MODAL 7: PRINTABLE GST TAX INVOICE MODAL --- */}
      <PrintGstInvoiceModal
        isOpen={!!printInvoiceBooking}
        onClose={() => setPrintInvoiceBooking(null)}
        booking={printInvoiceBooking}
        folioCharges={printInvoiceCharges}
      />

      {/* --- MODAL 8: RECORD OTA BOOKING MODAL --- */}
      <RecordOtaBookingModal
        isOpen={showOtaModal}
        onClose={() => setShowOtaModal(false)}
        onSuccess={() => {
          fetchBookings();
        }}
      />
    </div>
  );
}
