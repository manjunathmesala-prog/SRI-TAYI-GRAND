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
  Plus,
  RotateCcw,
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
  ShieldCheck,
  Key,
  Receipt,
  Radio,
  RefreshCw,
  X,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
const LotusBrandIcon = TayiBrandIcon;
import LuxurySelect from '@/components/anantha/LuxurySelect';
import { RecordOtaBookingModal } from '@/components/admin/RecordOtaBookingModal';
import { ChangeRoomModal } from '@/components/admin/ChangeRoomModal';
import { GuestFolioModal } from '@/components/admin/GuestFolioModal';
import { PrintGstInvoiceModal } from '@/components/admin/PrintGstInvoiceModal';
import { RfidHistoryTable } from '@/components/admin/RfidHistoryTable';
import { issuePhysicalKeycard, checkoutPhysicalCard, playChimeSound } from '@/lib/rfid/bridge-client';
import { useRealtimeSync, adminOperations, getAdminHeaders } from '@/lib/realtime-client';
import { Booking, BookingStatus, PhysicalRoom, RoomCategory, FolioCharge } from '@/types';
import { toast } from '@/components/ui/Toast';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { getAuthoritativeTariff } from '@/lib/pricing';

export default function BookingsAdminPage() {
  const { t, formatCurrency, formatDate, translateStatus, isTelugu } = useAdminLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [physicalRooms, setPhysicalRooms] = useState<PhysicalRoom[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showOtaModal, setShowOtaModal] = useState(false);

  // Full Folio / Details inspection modal
  const [selectedRes, setSelectedRes] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resPayments, setResPayments] = useState<any[]>([]);
  const [loadingResPayments, setLoadingResPayments] = useState(false);

  // Add / Assign Room modal
  const [assignRoomTarget, setAssignRoomTarget] = useState<Booking | null>(null);
  const [selectedAssignRoomId, setSelectedAssignRoomId] = useState('');

  // Add Extra Room modal
  const [addExtraRoomTarget, setAddExtraRoomTarget] = useState<Booking | null>(null);
  const [selectedExtraRoomNumber, setSelectedExtraRoomNumber] = useState('');

  // Cancel Checkout modal
  const [cancelCheckoutTarget, setCancelCheckoutTarget] = useState<Booking | null>(null);
  const [changeRoomTarget, setChangeRoomTarget] = useState<Booking | null>(null);

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
  const [checkInSelectedRooms, setCheckInSelectedRooms] = useState<string[]>([]);
  const [issueRfidCard, setIssueRfidCard] = useState(true);
  const [checkInIdType, setCheckInIdType] = useState('aadhaar');
  const [checkInIdNumber, setCheckInIdNumber] = useState('');

  // Quick Check-Out & Folio Settlement modal
  const [checkOutTarget, setCheckOutTarget] = useState<Booking | null>(null);
  const [checkOutSelectedRooms, setCheckOutSelectedRooms] = useState<string[]>([]);
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
        setCategories(data.categories || []);
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
        setAssignRoomTarget(null);
        setCancelCheckoutTarget(null);
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

  // Fetch real-time authoritative payment records for selected reservation
  useEffect(() => {
    if (!selectedRes?.booking_reference) {
      setResPayments([]);
      return;
    }
    let isMounted = true;
    setLoadingResPayments(true);
    fetch(`/api/admin/payments?bookingReference=${encodeURIComponent(selectedRes.booking_reference)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.payments)) {
          setResPayments(data.payments);
        }
      })
      .catch((err) => console.warn('Failed to load reservation payments:', err))
      .finally(() => {
        if (isMounted) setLoadingResPayments(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedRes?.booking_reference]);

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

    const csvHeaders = isTelugu ? ['à°¬à±à°•à°¿à°‚à°—à± à°°à°¿à°«à°°à±†à°¨à±à°¸à±', 'à°…à°¤à°¿à°¥à°¿ à°ªà±‡à°°à±', 'à°«à±‹à°¨à±', 'à°ˆà°®à±†à°¯à°¿à°²à±', 'à°—à°¦à°¿ à°°à°•à°‚', 'à°•à±‡à°Ÿà°¾à°¯à°¿à°‚à°šà°¿à°¨ à°—à°¦à°¿', 'à°šà±†à°•à±-à°‡à°¨à± à°¤à±‡à°¦à±€', 'à°šà±†à°•à±-à°…à°µà±à°Ÿà± à°¤à±‡à°¦à±€', 'à°°à°¾à°¤à±à°°à±à°²à±', 'à°®à±Šà°¤à±à°¤à°‚ (à°°à±‚)', 'à°šà±†à°²à±à°²à°¿à°‚à°šà°¿à°¨à°¦à°¿ (à°°à±‚)', 'à°¬à°•à°¾à°¯à°¿ (à°°à±‚)', 'à°¬à±à°•à°¿à°‚à°—à± à°¸à±à°¥à°¿à°¤à°¿', 'à°šà±†à°²à±à°²à°¿à°‚à°ªà± à°¸à±à°¥à°¿à°¤à°¿', 'à°¬à±à°•à°¿à°‚à°—à± à°®à°¾à°°à±à°—à°‚'] : headers;
    const csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent([csvHeaders.join(','), ...rows].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Sri_Tayi_Grand_Reservations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reservation folios exported to CSV successfully.');
  };

  // Category & Bed Type subtitle lookup helper (e.g. "Standard room: Twin bed")
  const getCategoryBedSubtitle = (catId?: string, catName?: string) => {
    const cat = categories.find((c) => c.id === catId || c.name === catName || c.slug === catId);
    const displayName = cat ? cat.name : catName || 'Standard Room';
    if (cat && cat.bed_type) {
      return `${displayName}: ${cat.bed_type}`;
    }
    return displayName;
  };

  // Action: Confirm Room Assignment
  const handleConfirmAssignRoom = async () => {
    if (!assignRoomTarget) return;
    if (!selectedAssignRoomId) {
      toast.warning('Please select a clean physical room to assign.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.assignRoom({
        roomId: selectedAssignRoomId,
        bookingReference: assignRoomTarget.booking_reference,
        guestName: assignRoomTarget.guest_name,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success(`Room #${selectedAssignRoomId} successfully assigned to ${assignRoomTarget.guest_name}.`);
        setAssignRoomTarget(null);
        setSelectedAssignRoomId('');
        await fetchBookings();
      } else {
        toast.error(res.error || 'Failed to assign room');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while assigning room');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Confirm Add Extra Room to existing booking workflow
  const handleConfirmAddExtraRoom = async () => {
    if (!addExtraRoomTarget) return;
    if (!selectedExtraRoomNumber) {
      toast.warning('Please select an available physical room to add.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.addExtraRoom({
        bookingReference: addExtraRoomTarget.booking_reference,
        roomNumber: selectedExtraRoomNumber,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success(`Extra Room #${selectedExtraRoomNumber} added to booking ${addExtraRoomTarget.booking_reference}!`);
        setAddExtraRoomTarget(null);
        setSelectedExtraRoomNumber('');
        await fetchBookings();
        if (selectedRes && selectedRes.booking_reference === addExtraRoomTarget.booking_reference) {
          setSelectedRes(res.booking);
        }
      } else {
        toast.error(res.error || 'Failed to add extra room');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding extra room');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Confirm Cancel Checkout (Revert stay to In-House)
  const handleConfirmCancelCheckout = async () => {
    if (!cancelCheckoutTarget) return;

    setActionLoading(true);
    try {
      const res = await adminOperations.cancelCheckout({
        bookingReference: cancelCheckoutTarget.booking_reference,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success(
          `Checkout cancelled. Stay ${cancelCheckoutTarget.booking_reference} (Room #${
            cancelCheckoutTarget.assigned_room_number || cancelCheckoutTarget.room_number || 'Room'
          }) restored to In-House status.`
        );
        setCancelCheckoutTarget(null);
        await fetchBookings();
      } else {
        toast.error(res.error || 'Failed to cancel checkout');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while cancelling checkout');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Confirm Check-In
  const handleConfirmCheckIn = async () => {
    if (!checkInTarget) return;

    const isMulti = Boolean(
      checkInTarget.assigned_room_numbers && checkInTarget.assigned_room_numbers.length > 1
    );

    const roomsToCheckIn = isMulti
      ? checkInSelectedRooms.length > 0
        ? checkInSelectedRooms
        : checkInTarget.assigned_room_numbers!
      : selectedRoomNumber
      ? [selectedRoomNumber]
      : [];

    if (roomsToCheckIn.length === 0) {
      toast.warning('Please select at least one physical room number to check in.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.checkIn({
        bookingReference: checkInTarget.booking_reference,
        roomNumber: roomsToCheckIn[0],
        roomNumbers: roomsToCheckIn,
        issueRfid: issueRfidCard,
        idProofType: checkInIdType,
        idProofNumber: checkInIdNumber.trim() || undefined,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        if (issueRfidCard) {
          for (const rNum of roomsToCheckIn) {
            try {
              const hwRes = await issuePhysicalKeycard({
                roomNumber: rNum,
                guestName: checkInTarget.guest_name,
                staffUser: 'Front Desk Duty Officer',
                bookingRef: checkInTarget.booking_reference,
              });
              if (hwRes.success) {
                playChimeSound(true);
              }
            } catch (hwErr) {
              console.warn('[HARDWARE RFID NON-BLOCKING NOTICE]:', hwErr);
            }
          }
        }

        toast.success(
          `Guest ${checkInTarget.guest_name} checked in to Room${
            roomsToCheckIn.length > 1 ? `s #${roomsToCheckIn.join(', #')}` : ` #${roomsToCheckIn[0]}`
          }.${issueRfidCard ? ' RFID Keycard(s) activated.' : ''}`
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

    const isMulti = Boolean(
      checkOutTarget.assigned_room_numbers && checkOutTarget.assigned_room_numbers.length > 1
    );

    const targetRooms = isMulti
      ? checkOutSelectedRooms.length > 0
        ? checkOutSelectedRooms
        : checkOutTarget.assigned_room_numbers!
      : checkOutTarget.assigned_room_number
      ? [checkOutTarget.assigned_room_number]
      : checkOutTarget.room_number
      ? [checkOutTarget.room_number]
      : [];

    if (targetRooms.length === 0) {
      toast.warning('Please select at least one physical room number to check out.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.checkOut({
        bookingReference: checkOutTarget.booking_reference,
        roomNumbers: targetRooms,
        settlementMethod,
        additionalCharges: 0,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        for (const tr of targetRooms) {
          checkoutPhysicalCard(tr, 'Front Desk Duty Officer').catch(() => {});
        }

        toast.success(
          `Guest checked out. ${
            targetRooms.length > 1 ? `Rooms #${targetRooms.join(', #')}` : `Room #${targetRooms[0] || 'Room'}`
          } marked as Vacant Dirty for Housekeeping. Keycards deactivated.`
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

  // Action: Remove specific room from multi-room booking
  const handleRemoveRoomFromBooking = async (roomNumber: string) => {
    if (!selectedRes) return;
    if (
      !window.confirm(
        `Are you sure you want to remove Room #${roomNumber} from this booking?\n\nThe room will be released immediately and the total folio tariff will be recalculated.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.removeRoom({
        bookingReference: selectedRes.booking_reference,
        roomNumber,
        staffName: 'Front Desk Duty Officer',
      });

      if (res.success) {
        toast.success(`Room #${roomNumber} removed from booking and released.`);
        await fetchBookings();
        if (res.booking) {
          setSelectedRes(res.booking);
        } else {
          setSelectedRes(null);
        }
      } else {
        toast.error(res.error || 'Failed to remove room');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error removing room from booking');
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
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
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

  // Action: Permanently Delete Booking
  const handleDeleteBooking = async (ref: string, guestName?: string) => {
    const nameStr = guestName ? ` for ${guestName}` : '';
    if (!window.confirm(`Are you sure you want to permanently delete reservation #${ref}${nameStr}? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminOperations.deleteBooking(ref);
      if (res.success) {
        toast.success(`Reservation #${ref} permanently deleted.`);
        if (selectedRes?.booking_reference === ref) {
          setSelectedRes(null);
        }
        await fetchBookings();
      } else {
        toast.error(res.error || 'Failed to delete reservation');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error deleting reservation');
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
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8D672F] inline-flex items-center gap-1.5">
              <LotusBrandIcon size={14} className="w-3.5 h-3.5" />
              PMS Reservation Operations
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected ? 'Live Sync Active' : `Sync: ${syncStatus}`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A1D13] font-bold">
            {t('bookings.title', 'Guest Reservations & In-House Folios')}
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            {t('bookings.subtitle', 'Manage online bookings, front desk walk-ins, arrivals, in-house guests, and departures.')}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowOtaModal(true)}
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-black text-[#FAF6EE] text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 min-h-[40px] cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#B18A4A]" />
            <span>{t('bookings.recordOta', '+ Record OTA Booking')}</span>
          </button>

          <Link
            href="/admin/front-desk"
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 min-h-[40px] cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('bookings.newBooking', 'Front Desk Walk-In')}</span>
          </Link>

          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs font-semibold text-[#2A1D13] hover:bg-[#FAF6EE] shadow-xs transition-all flex items-center space-x-1.5 min-h-[40px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8D672F]" />
            <span>{t('common.exportCsv', 'Export CSV')}</span>
          </button>

          <Link
            href="/admin/rooms/board"
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs font-semibold text-[#2A1D13] hover:bg-[#FAF6EE] shadow-xs transition-all flex items-center space-x-1.5 min-h-[40px] cursor-pointer"
          >
            <BedDouble className="w-3.5 h-3.5 text-[#8D672F]" />
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
                          {/* HIGHLIGHTED GOVERNMENT ID BADGE */}
                          {r.id_proof_number ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-amber-50 border border-amber-300 shadow-2xs">
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded">
                                <ShieldCheck className="w-3 h-3 text-amber-700" />
                                {r.id_proof_type?.replace(/_/g, ' ').toUpperCase() || 'GOVT ID'}
                              </span>
                              <span className="font-mono font-black text-[11px] text-[#21180F] tracking-wider">
                                {r.id_proof_number}
                              </span>
                              <span className="text-[9px] text-amber-800 font-semibold ml-auto">
                                [Verify Copy]
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              <span>ID Verification Pending</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {r.assigned_room_number ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="inline-flex items-center space-x-1 font-bold text-xs bg-[#21180F] text-white px-2.5 py-1 rounded-xl">
                                <span>
                                  {r.assigned_room_numbers && r.assigned_room_numbers.length > 1
                                    ? `Rooms #${r.assigned_room_numbers.join(', #')}`
                                    : `Room #${r.assigned_room_number}`}
                                </span>
                              </span>
                              <div className="text-[10px] text-[#786A5B] font-medium">{getCategoryBedSubtitle(r.category_id, r.category_name)}</div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignRoomTarget(r);
                                  setSelectedAssignRoomId('');
                                }}
                                className="text-[11px] text-amber-700 font-semibold bg-amber-50 hover:bg-amber-100 hover:border-amber-300 px-2 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
                                title="Click to assign room"
                              >
                                Unassigned
                              </button>
                              <div className="text-[10px] text-[#786A5B] font-medium">{getCategoryBedSubtitle(r.category_id, r.category_name)}</div>
                            </div>
                          )}
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
                        {/* 1. Add Room */}
                        {isConfirmed && !r.assigned_room_number && (
                          <button
                            onClick={() => {
                              setAssignRoomTarget(r);
                              setSelectedAssignRoomId('');
                            }}
                            className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm min-h-[40px] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Room</span>
                          </button>
                        )}

                        {/* 2. Check In */}
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

                        {/* 3. Check Out */}
                        {isCheckedIn && (
                          <>
                            <button
                              onClick={() => setChangeRoomTarget(r)}
                              className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 font-bold text-xs flex items-center justify-center space-x-1.5 min-h-[40px] cursor-pointer shadow-xs"
                              title="Change room due to AC, plumbing, or technical dissatisfaction"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-700" />
                              <span>Change Room</span>
                            </button>
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

                        {/* 4. Cancel Checkout */}
                        {r.status === 'checked_out' && (
                          <button
                            onClick={() => setCancelCheckoutTarget(r)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#FAF5EB] hover:bg-[#EFE3D6] text-[#8a6a2a] border border-[#D8AD56]/60 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs min-h-[40px] cursor-pointer transition-all"
                            title="Cancel checkout & restore guest to In-House status"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#9b7a3e]" />
                            <span>Cancel Checkout</span>
                          </button>
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

                        <button
                          onClick={() => handleDeleteBooking(r.booking_reference, r.guest_name)}
                          className="p-2 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center min-h-[40px] px-2.5 text-xs font-medium cursor-pointer transition-colors"
                          title="Delete Reservation"
                        >
                          <Trash2 className="w-4 h-4" />
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
                            {/* HIGHLIGHTED GOVERNMENT ID BADGE (DESKTOP) */}
                            {r.id_proof_number ? (
                              <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-300 max-w-fit shadow-2xs">
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded">
                                  <ShieldCheck className="w-3 h-3 text-amber-800" />
                                  {r.id_proof_type?.replace(/_/g, ' ').toUpperCase() || 'GOVT ID'}
                                </span>
                                <span className="font-mono font-black text-xs text-[#21180F] tracking-wider">
                                  {r.id_proof_number}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1 text-[10px] text-rose-600 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                <span>ID Pending</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {r.assigned_room_number ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center space-x-1 font-bold text-xs bg-[#21180F] text-white px-2.5 py-1 rounded-xl">
                                  <span>
                                    {r.assigned_room_numbers && r.assigned_room_numbers.length > 1
                                      ? `Rooms #${r.assigned_room_numbers.join(', #')}`
                                      : `Room #${r.assigned_room_number}`}
                                  </span>
                                </span>
                                {r.assigned_room_numbers && r.assigned_room_numbers.length > 1 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                    Multi-Room ({r.assigned_room_numbers.length} Rooms)
                                  </span>
                                )}
                                <div className="text-[10px] text-[#786A5B] font-medium">{getCategoryBedSubtitle(r.category_id, r.category_name)}</div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignRoomTarget(r);
                                    setSelectedAssignRoomId('');
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 hover:bg-amber-100 hover:border-amber-300 px-2 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
                                  title="Click to assign a physical room"
                                >
                                  <span>Unassigned</span>
                                </button>
                                <div className="text-[10px] text-[#786A5B] font-medium">{getCategoryBedSubtitle(r.category_id, r.category_name)}</div>
                              </div>
                            )}
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
                                  : r.status === 'partially_checked_in'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : r.status === 'partially_checked_out'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : isConfirmed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'checked_out'
                                  ? 'bg-slate-100 text-slate-800'
                                  : r.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.status === 'checked_in'
                                ? 'In-House'
                                : r.status === 'partially_checked_in'
                                ? 'Part In-House'
                                : r.status === 'partially_checked_out'
                                ? 'Part Checked-Out'
                                : r.status === 'checked_out'
                                ? 'Completed'
                                : r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* 1. Quick Add Room if Confirmed and unassigned */}
                              {isConfirmed && !r.assigned_room_number && (
                                <button
                                  onClick={() => {
                                    setAssignRoomTarget(r);
                                    setSelectedAssignRoomId('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-sm cursor-pointer"
                                  title="Add / Assign Physical Room to Reservation"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Room</span>
                                </button>
                              )}

                              {/* 2. Quick Check-In if Confirmed or Partially Checked In */}
                              {(isConfirmed || r.status === 'partially_checked_in') && (
                                <button
                                  onClick={() => {
                                    setCheckInTarget(r);
                                    const allRooms = r.assigned_room_numbers && r.assigned_room_numbers.length > 0
                                      ? r.assigned_room_numbers
                                      : r.assigned_room_number
                                      ? [r.assigned_room_number]
                                      : [];
                                    const pendingRooms: string[] = r.booking_rooms && r.booking_rooms.length > 0
                                      ? (r.booking_rooms
                                          .filter((bm) => bm.status !== 'checked_in' && bm.status !== 'checked_out')
                                          .map((bm) => bm.room_number || '')
                                          .filter(Boolean) as string[])
                                      : allRooms;
                                    setCheckInSelectedRooms(pendingRooms.length > 0 ? pendingRooms : allRooms);
                                    setSelectedRoomNumber(pendingRooms[0] || allRooms[0] || '');
                                    setCheckInIdType(r.id_proof_type || 'aadhaar');
                                    setCheckInIdNumber(r.id_proof_number || '');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-sm cursor-pointer"
                                  title="Check In Guest & Assign Room"
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>{r.status === 'partially_checked_in' ? 'Check In Remaining' : 'Check In'}</span>
                                </button>
                              )}

                              {/* 3. Quick Check-Out & Settle if In-House or Partially Checked In/Out */}
                              {(isCheckedIn || r.status === 'partially_checked_in' || r.status === 'partially_checked_out') && (
                                <>
                                  <button
                                    onClick={() => setChangeRoomTarget(r)}
                                    className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-semibold text-[11px] flex items-center space-x-1 shadow-xs cursor-pointer"
                                    title="Change Room (AC / Water / Dissatisfaction)"
                                  >
                                    <ArrowRightLeft className="w-3 h-3 text-sky-700" />
                                    <span>Change Room</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCheckOutTarget(r);
                                      setSettlementAmount(balance.toString());
                                      const activeRooms: string[] = r.booking_rooms && r.booking_rooms.length > 0
                                        ? (r.booking_rooms
                                            .filter((bm) => bm.status !== 'checked_out')
                                            .map((bm) => bm.room_number || '')
                                            .filter(Boolean) as string[])
                                        : (r.assigned_room_numbers && r.assigned_room_numbers.length > 0
                                          ? r.assigned_room_numbers
                                          : (r.assigned_room_number ? [r.assigned_room_number] : []));
                                      setCheckOutSelectedRooms(activeRooms);
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

                              {/* 4. Quick Cancel Checkout if Completed / Checked Out */}
                              {r.status === 'checked_out' && (
                                <button
                                  onClick={() => setCancelCheckoutTarget(r)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF5EB] hover:bg-[#EFE3D6] text-[#8a6a2a] border border-[#D8AD56]/60 font-semibold text-[11px] flex items-center space-x-1 shadow-xs cursor-pointer transition-all"
                                  title="Cancel checkout & revert stay to In-House status"
                                >
                                  <RotateCcw className="w-3 h-3 text-[#9b7a3e]" />
                                  <span>Cancel Checkout</span>
                                </button>
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

                              {/* Delete Reservation */}
                              <button
                                onClick={() => handleDeleteBooking(r.booking_reference, r.guest_name)}
                                className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Delete Reservation"
                              >
                                <Trash2 className="w-4 h-4" />
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

              {checkInTarget.assigned_room_numbers && checkInTarget.assigned_room_numbers.length > 1 ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#33271D]">
                      Select Rooms to Check In ({checkInTarget.assigned_room_numbers.length} Rooms Allocated) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (checkInSelectedRooms.length === checkInTarget.assigned_room_numbers!.length) {
                          setCheckInSelectedRooms([]);
                        } else {
                          setCheckInSelectedRooms([...checkInTarget.assigned_room_numbers!]);
                        }
                      }}
                      className="text-[10px] text-[#8D672F] font-bold hover:underline cursor-pointer"
                    >
                      {checkInSelectedRooms.length === checkInTarget.assigned_room_numbers.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-1.5 p-2 rounded-2xl bg-[#FAF7F2] border border-[#E6D9C5]">
                    {checkInTarget.assigned_room_numbers.map((rNum) => {
                      const roomDetail = checkInTarget.booking_rooms?.find((bm) => bm.room_number === rNum);
                      const isAlreadyCheckedIn = roomDetail?.status === 'checked_in';
                      const isChecked = checkInSelectedRooms.includes(rNum);
                      return (
                        <label
                          key={rNum}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isAlreadyCheckedIn
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 opacity-80'
                              : isChecked
                              ? 'bg-white border-[#8D672F] shadow-xs'
                              : 'bg-white/60 border-[#E6D9C5] text-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAlreadyCheckedIn}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCheckInSelectedRooms((prev) => [...prev, rNum]);
                                } else {
                                  setCheckInSelectedRooms((prev) => prev.filter((r) => r !== rNum));
                                }
                              }}
                              className="w-4 h-4 rounded text-[#8D672F] focus:ring-[#8D672F]"
                            />
                            <div>
                              <span className="font-bold font-mono">Room #{rNum}</span>
                              {roomDetail?.category_name && (
                                <span className="text-[10px] text-[#786A5B] ml-2">({roomDetail.category_name})</span>
                              )}
                            </div>
                          </div>
                          {isAlreadyCheckedIn ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Already In-House
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#8D672F]">
                              {isChecked ? 'Ready to Check In' : 'Pending'}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
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
                            pr.category_id === checkInTarget.category_id ||
                            pr.room_number === checkInTarget.assigned_room_number
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
              )}

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
                  disabled={
                    actionLoading ||
                    (checkInTarget.assigned_room_numbers && checkInTarget.assigned_room_numbers.length > 1
                      ? checkInSelectedRooms.length === 0
                      : !selectedRoomNumber)
                  }
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
                  Check Out: {checkOutTarget.assigned_room_numbers && checkOutTarget.assigned_room_numbers.length > 1
                    ? `Rooms #${checkOutTarget.assigned_room_numbers.join(', #')} (${checkOutTarget.assigned_room_numbers.length} Rooms)`
                    : `Room #${checkOutTarget.assigned_room_number || checkOutTarget.room_number || 'Room'}`}
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

              {/* Multi-Room Departure Selector */}
              {checkOutTarget.assigned_room_numbers && checkOutTarget.assigned_room_numbers.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#33271D]">
                      Select Rooms Checking Out ({checkOutTarget.assigned_room_numbers.length} Rooms Allocated) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allActive: string[] = checkOutTarget.booking_rooms
                          ? (checkOutTarget.booking_rooms.filter((bm) => bm.status !== 'checked_out').map((bm) => bm.room_number || '').filter(Boolean) as string[])
                          : (checkOutTarget.assigned_room_numbers || []);
                        if (checkOutSelectedRooms.length === allActive.length) {
                          setCheckOutSelectedRooms([]);
                        } else {
                          setCheckOutSelectedRooms([...allActive]);
                        }
                      }}
                      className="text-[10px] text-[#8D672F] font-bold hover:underline cursor-pointer"
                    >
                      {checkOutSelectedRooms.length === checkOutTarget.assigned_room_numbers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-1.5 p-2 rounded-2xl bg-[#FAF7F2] border border-[#E6D9C5]">
                    {checkOutTarget.assigned_room_numbers.map((rNum) => {
                      const roomDetail = checkOutTarget.booking_rooms?.find((bm) => bm.room_number === rNum);
                      const isAlreadyCheckedOut = roomDetail?.status === 'checked_out';
                      const isChecked = checkOutSelectedRooms.includes(rNum);
                      return (
                        <label
                          key={rNum}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isAlreadyCheckedOut
                              ? 'bg-slate-50 border-slate-200 text-slate-500 opacity-70'
                              : isChecked
                              ? 'bg-white border-[#21180F] shadow-xs'
                              : 'bg-white/60 border-[#E6D9C5] text-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAlreadyCheckedOut}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCheckOutSelectedRooms((prev) => [...prev, rNum]);
                                } else {
                                  setCheckOutSelectedRooms((prev) => prev.filter((r) => r !== rNum));
                                }
                              }}
                              className="w-4 h-4 rounded text-[#21180F] focus:ring-[#21180F]"
                            />
                            <div>
                              <span className="font-bold font-mono">Room #{rNum}</span>
                              {roomDetail?.category_name && (
                                <span className="text-[10px] text-[#786A5B] ml-2">({roomDetail.category_name})</span>
                              )}
                            </div>
                          </div>
                          {isAlreadyCheckedOut ? (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              Already Checked Out
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-800">
                              {isChecked ? 'Will Check Out' : 'Remain In-House'}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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
                Checking out will release selected room(s), automatically mark as <b>Vacant Dirty</b> for Housekeeping, and <b>deactivate associated physical RFID keycards</b>.
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
                  disabled={
                    actionLoading ||
                    (checkOutTarget.assigned_room_numbers && checkOutTarget.assigned_room_numbers.length > 1
                      ? checkOutSelectedRooms.length === 0
                      : false)
                  }
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

      {/* --- MODAL 2A: ASSIGN / ADD PHYSICAL ROOM TO RESERVATION --- */}
      {assignRoomTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssignRoomTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E6D9C5] space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#8D672F] font-bold">Room Inventory Allocation</span>
                <h3 className="text-lg font-serif text-[#33271D] font-bold">Assign Room: {assignRoomTarget.guest_name}</h3>
              </div>
              <button onClick={() => setAssignRoomTarget(null)} className="text-xs text-[#786A5B] hover:text-black cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Booking Ref:</span>
                  <span className="font-mono font-bold text-[#33271D]">{assignRoomTarget.booking_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Reserved Category:</span>
                  <span className="font-semibold text-[#8D672F]">
                    {getCategoryBedSubtitle(assignRoomTarget.category_id, assignRoomTarget.category_name)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Stay Dates:</span>
                  <span className="font-medium text-[#33271D]">
                    {assignRoomTarget.check_in_date} &rarr; {assignRoomTarget.check_out_date}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#33271D] mb-1.5">
                  Select Clean Physical Room Number *
                </label>
                <LuxurySelect<string>
                  value={selectedAssignRoomId}
                  onChange={(val) => setSelectedAssignRoomId(val)}
                  placeholder="-- Choose Physical Room --"
                  options={[
                    { value: '', label: '-- Choose Physical Room --' },
                    ...physicalRooms
                      .filter(
                        (pr) =>
                          pr.category_id === assignRoomTarget.category_id ||
                          pr.room_number === assignRoomTarget.assigned_room_number ||
                          pr.operational_status === 'available'
                      )
                      .map((pr) => {
                        const isCategoryMatch = pr.category_id === assignRoomTarget.category_id;
                        const isAvailable = pr.operational_status === 'available';
                        const statusTag = isAvailable ? 'Clean & Ready' : pr.operational_status;
                        const matchTag = isCategoryMatch ? 'Exact Category' : 'Upgrade/Cross-type';
                        return {
                          value: pr.room_number,
                          label: `Room #${pr.room_number} (Floor ${pr.floor_number}) â€¢ ${matchTag} [${statusTag}]`,
                        };
                      }),
                  ]}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-[#FAF5EB] border border-[#E2D5BE] rounded-xl text-[11px] text-[#786A5B] leading-relaxed">
                Allocating a room locks this physical door key for the reservation. Once assigned, front desk staff can directly issue physical RFID keycards or check in the arrival.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setAssignRoomTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs text-[#786A5B] hover:bg-[#F8F3E9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !selectedAssignRoomId}
                  onClick={handleConfirmAssignRoom}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Assigning...' : 'Assign Physical Room'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2A-EXT: ADD EXTRA ROOM TO BOOKING --- */}
      {addExtraRoomTarget && (() => {
        const stayNights = Math.max(1, Math.round(
          (new Date(addExtraRoomTarget.check_out_date).getTime() - new Date(addExtraRoomTarget.check_in_date).getTime()) /
          (1000 * 60 * 60 * 24)
        ));
        const today = new Date().toISOString().slice(0, 10);
        const isTodayStay = addExtraRoomTarget.check_in_date <= today && addExtraRoomTarget.check_out_date > today;
        const currentRooms = addExtraRoomTarget.assigned_room_numbers || (addExtraRoomTarget.assigned_room_number ? [addExtraRoomTarget.assigned_room_number] : []);

        const selectableRooms = physicalRooms.filter((pr) => {
          if (!pr.is_active) return false;
          if (pr.operational_status === 'maintenance' || pr.operational_status === 'out_of_service') return false;
          if (currentRooms.includes(pr.room_number)) return false;

          // Check overlap with other active bookings
          const hasConflict = bookings.some((b) => {
            if (b.booking_reference === addExtraRoomTarget.booking_reference) return false;
            if (b.status === 'cancelled' || b.status === 'checked_out') return false;
            const matches =
              b.assigned_room_id === pr.id ||
              b.assigned_room_number === pr.room_number ||
              (b.assigned_room_numbers && b.assigned_room_numbers.includes(pr.room_number));
            if (!matches) return false;
            return b.check_in_date < addExtraRoomTarget.check_out_date && b.check_out_date > addExtraRoomTarget.check_in_date;
          });
          if (hasConflict) return false;

          if (isTodayStay && (pr.operational_status === 'occupied' || pr.operational_status === 'reserved')) {
            return false;
          }

          return true;
        });

        const chosenRoom = physicalRooms.find((r) => r.room_number === selectedExtraRoomNumber);
        const chosenCatTariff = chosenRoom ? getAuthoritativeTariff(chosenRoom.category_id) : null;
        const extraRoomTariff = chosenCatTariff ? chosenCatTariff.baseTariffRupees : 1800;
        const extraSubtotal = extraRoomTariff * stayNights;
        const extraTax = Math.round(extraSubtotal * 0.05);
        const extraTotal = extraSubtotal + extraTax;
        const targetSrc = (addExtraRoomTarget.booking_source as string) || '';
        const isOta =
          targetSrc === 'ota' ||
          targetSrc === 'agoda' ||
          targetSrc === 'expedia' ||
          targetSrc === 'airbnb' ||
          (addExtraRoomTarget.internal_notes && addExtraRoomTarget.internal_notes.toLowerCase().includes('ota'));

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setAddExtraRoomTarget(null);
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
          >
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#E6D9C5] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <BedDouble className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#33271D]">Add Extra Room to Booking</h3>
                    <p className="text-[11px] text-[#786A5B]">Ref: {addExtraRoomTarget.booking_reference} &bull; {addExtraRoomTarget.guest_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddExtraRoomTarget(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stay Duration & Current Rooms */}
              <div className="p-3 bg-[#FAF5EB] border border-[#E2D5BE] rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between text-[#786A5B]">
                  <span>Stay Dates:</span>
                  <span className="font-semibold text-[#33271D]">{addExtraRoomTarget.check_in_date} to {addExtraRoomTarget.check_out_date} ({stayNights} night{stayNights > 1 ? 's' : ''})</span>
                </div>
                <div className="flex justify-between text-[#786A5B]">
                  <span>Currently Assigned:</span>
                  <span className="font-semibold text-[#33271D]">
                    {currentRooms.length > 0 ? `Room(s) #${currentRooms.join(', #')}` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-[#786A5B]">
                  <span>Rooms Count:</span>
                  <span className="font-bold text-[#8D672F]">{addExtraRoomTarget.rooms_count || 1} room(s) &rarr; {(addExtraRoomTarget.rooms_count || 1) + 1} room(s)</span>
                </div>
              </div>

              {/* Room Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#33271D]">
                  Select Available Room to Include <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExtraRoomNumber}
                  onChange={(e) => setSelectedExtraRoomNumber(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FDFBF7] text-[#33271D] focus:outline-hidden focus:ring-2 focus:ring-[#8D672F]"
                >
                  <option value="">-- Choose an available clean room ({selectableRooms.length} available) --</option>
                  {selectableRooms.map((pr) => {
                    const cat = categories.find((c) => c.id === pr.category_id);
                    const catTariff = getAuthoritativeTariff(pr.category_id);
                    return (
                      <option key={pr.id} value={pr.room_number}>
                        Room #{pr.room_number} (Floor {pr.floor_number}) &bull; {cat?.name || pr.category_name || 'Room'} &bull; ₹{catTariff.baseTariffRupees.toLocaleString('en-IN')}/night [{pr.housekeeping_status}]
                      </option>
                    );
                  })}
                </select>
                {selectableRooms.length === 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">No other rooms are available without conflict for these stay dates.</p>
                )}
              </div>

              {/* Pricing Calculation Breakdown */}
              {chosenRoom && chosenCatTariff && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                  <div className="font-bold text-amber-950 pb-1 border-b border-amber-200/60 flex items-center justify-between">
                    <span>Extra Room Tariff & Recalculation</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                      Authoritative Rate
                    </span>
                  </div>
                  <div className="flex justify-between text-[#786A5B]">
                    <span>Category:</span>
                    <span className="font-semibold text-[#33271D]">{chosenCatTariff.name}</span>
                  </div>
                  <div className="flex justify-between text-[#786A5B]">
                    <span>Rate:</span>
                    <span>₹{chosenCatTariff.baseTariffRupees.toLocaleString('en-IN')} &times; {stayNights} night{stayNights > 1 ? 's' : ''} = ₹{extraSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[#786A5B]">
                    <span>GST (5%):</span>
                    <span>₹{extraTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-amber-200/60">
                    <span>Additional Amount for Room #{chosenRoom.room_number}:</span>
                    <span>₹{extraTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#33271D] pt-1 border-t border-amber-200/60 text-xs">
                    <span>Updated Reservation Total:</span>
                    <span className="text-[#8D672F]">₹{(addExtraRoomTarget.total_amount + extraTotal).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* OTA Contract Disclosure */}
              {isOta && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-900 leading-relaxed">
                  <strong>OTA Channel Booking:</strong> The existing OTA voucher reference and channel commission will be preserved. The additional room is added at the standard hotel rate and balance is payable directly at front desk.
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setAddExtraRoomTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs text-[#786A5B] hover:bg-[#F8F3E9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !selectedExtraRoomNumber}
                  onClick={handleConfirmAddExtraRoom}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Adding Extra Room...' : 'Confirm Extra Room'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL 2B: CANCEL CHECKOUT (REVERT STAY TO IN-HOUSE) --- */}
      {cancelCheckoutTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelCheckoutTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E6D9C5] space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#8D672F] font-bold">Stay Lifecycle Reversal</span>
                  <h3 className="text-lg font-serif text-[#33271D] font-bold">Cancel Checkout</h3>
                </div>
              </div>
              <button onClick={() => setCancelCheckoutTarget(null)} className="text-xs text-[#786A5B] hover:text-black cursor-pointer">&times;</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF5EB] border border-[#E2D5BE] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Guest Name:</span>
                  <span className="font-bold text-[#33271D]">{cancelCheckoutTarget.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Booking Ref:</span>
                  <span className="font-mono font-bold text-[#33271D]">{cancelCheckoutTarget.booking_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Room:</span>
                  <span className="font-mono font-bold text-amber-900">
                    Room #{cancelCheckoutTarget.assigned_room_number || cancelCheckoutTarget.room_number || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786A5B]">Category:</span>
                  <span className="text-[#5C4A3A]">
                    {getCategoryBedSubtitle(cancelCheckoutTarget.category_id, cancelCheckoutTarget.category_name)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-2">
                <p className="font-semibold text-amber-950">Confirm Checkout Cancellation:</p>
                <ul className="list-disc pl-4 space-y-1 text-amber-900">
                  <li>Reservation status reverts from <b>Completed</b> to <b>Checked In (In-House)</b>.</li>
                  <li>Room <b>#{cancelCheckoutTarget.assigned_room_number || cancelCheckoutTarget.room_number}</b> is restored to <b>Occupied</b>.</li>
                  <li>Guest physical RFID keycards are restored to <b>Active</b> status.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E6D9C5]">
                <button
                  type="button"
                  onClick={() => setCancelCheckoutTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs text-[#786A5B] hover:bg-[#F8F3E9] cursor-pointer"
                >
                  Keep Checked Out
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmCancelCheckout}
                  className="px-5 py-2.5 rounded-xl bg-[#21180F] hover:bg-black text-[#D8AD56] font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Reverting...' : 'Confirm & Restore In-House'}</span>
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
                  {selectedRes.assigned_room_numbers && selectedRes.assigned_room_numbers.length > 0
                    ? `(Rooms #${selectedRes.assigned_room_numbers.join(', #')})`
                    : selectedRes.assigned_room_number
                    ? `(Room #${selectedRes.assigned_room_number})`
                    : ''}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRes(null)}
                className="text-xs text-[#786A5B] hover:text-[#33271D] cursor-pointer"
              >
                Close &times;
              </button>
            </div>

            {(() => {
              const actualRoomsCount =
                selectedRes.booking_rooms && selectedRes.booking_rooms.length > 0
                  ? selectedRes.booking_rooms.length
                  : selectedRes.assigned_room_numbers && selectedRes.assigned_room_numbers.length > 0
                  ? selectedRes.assigned_room_numbers.length
                  : Number(selectedRes.rooms_count) || 1;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  <div><span className="text-[#786A5B]">Guest Name:</span> <span className="font-semibold text-[#33271D]">{selectedRes.guest_name}</span></div>
                  <div><span className="text-[#786A5B]">Contact Phone:</span> <span className="font-semibold text-[#33271D]">{selectedRes.guest_phone}</span></div>
                  <div><span className="text-[#786A5B]">Email:</span> <span className="font-semibold text-[#33271D]">{selectedRes.guest_email || 'Not specified'}</span></div>
                  <div><span className="text-[#786A5B]">Rooms & Category:</span> <span className="font-semibold text-[#33271D]">{actualRoomsCount} room(s) &bull; {selectedRes.category_name}</span></div>
                  <div><span className="text-[#786A5B]">Check-in Date:</span> <span className="font-semibold text-[#33271D]">{selectedRes.check_in_date}</span></div>
                  <div><span className="text-[#786A5B]">Check-out Date:</span> <span className="font-semibold text-[#33271D]">{selectedRes.check_out_date}</span></div>
                  <div><span className="text-[#786A5B]">Reservation Status:</span> <span className="font-bold uppercase text-[#8D672F]">{selectedRes.status}</span></div>
                  <div><span className="text-[#786A5B]">Payment Status:</span> <span className="font-bold uppercase text-[#8D672F]">{selectedRes.payment_status}</span></div>

                  {/* Room Allocation Breakdown */}
                  {((selectedRes.booking_rooms && selectedRes.booking_rooms.length > 0) ||
                    (selectedRes.assigned_room_numbers && selectedRes.assigned_room_numbers.length > 0) ||
                    selectedRes.assigned_room_number) && (
                    <div className="col-span-2 p-3 rounded-2xl bg-[#FAF6EE] border border-[#E6D9C5] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#33271D]">
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="w-4 h-4 text-[#8D672F]" />
                          <span>
                            {actualRoomsCount > 1
                              ? `Linked Rooms in this Reservation (${actualRoomsCount} Rooms)`
                              : 'Assigned Room Allocation'}
                          </span>
                        </span>
                        {actualRoomsCount > 1 ? (
                          <span className="text-[10px] bg-[#8D672F]/10 text-[#8D672F] px-2 py-0.5 rounded-full font-bold">
                            Multi-Room Party
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Single Room
                          </span>
                        )}
                      </div>
                      {selectedRes.booking_rooms && selectedRes.booking_rooms.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {selectedRes.booking_rooms.map((rm, idx) => {
                            const roomNum =
                              rm.room_number ||
                              selectedRes.assigned_room_number ||
                              selectedRes.assigned_room_numbers?.[idx] ||
                              'Pending Assignment';
                            const canRemove =
                              actualRoomsCount > 1 &&
                              rm.status !== 'checked_out' &&
                              selectedRes.status !== 'checked_out' &&
                              selectedRes.status !== 'cancelled';
                            return (
                              <div key={idx} className="p-2.5 bg-white rounded-xl border border-[#E6D9C5] flex items-center justify-between gap-2 shadow-2xs">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#33271D]">
                                      {roomNum.startsWith('Pending') ? roomNum : `Room #${roomNum}`}
                                    </span>
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                                        rm.status === 'checked_in'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : rm.status === 'checked_out'
                                          ? 'bg-slate-100 text-slate-700'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {rm.status === 'checked_in' ? 'In-House' : rm.status === 'checked_out' ? 'Checked Out' : 'Confirmed'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#786A5B] mt-0.5">{rm.category_name || selectedRes.category_name}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="font-semibold text-[#8D672F]">
                                      ₹{(Number(rm.price_per_night) || Math.round(Number(selectedRes.subtotal_amount || 0) / actualRoomsCount)).toLocaleString('en-IN')}
                                      <span className="text-[9px] text-[#786A5B]">/nt</span>
                                    </div>
                                  </div>
                                  {canRemove && rm.room_number && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRoomFromBooking(rm.room_number!)}
                                      disabled={actionLoading}
                                      className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title={`Remove Room #${rm.room_number} from this booking`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {(selectedRes.assigned_room_numbers && selectedRes.assigned_room_numbers.length > 0
                            ? selectedRes.assigned_room_numbers
                            : selectedRes.assigned_room_number
                            ? [selectedRes.assigned_room_number]
                            : []
                          ).map((rNum) => (
                            <span key={rNum} className="px-2.5 py-1 bg-white rounded-lg border border-[#E6D9C5] font-bold text-[#33271D]">
                              Room #{rNum}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* HIGHLIGHTED STATUTORY GOVERNMENT ID PROOF CARD */}
                  <div className="col-span-2 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        <span>Statutory Government ID Proof ({selectedRes.id_proof_type?.replace(/_/g, ' ').toUpperCase() || 'GOVT ID'})</span>
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Reception Physical Verification Required
                      </span>
                    </div>
                    <div className="font-mono font-black text-sm text-[#21180F] tracking-widest bg-white p-2.5 rounded-xl border border-amber-300 flex items-center justify-between">
                      <span>
                        {selectedRes.id_proof_number
                          ? (selectedRes.id_proof_type?.toLowerCase().includes('aadhaar') && selectedRes.id_proof_number.length >= 8
                              ? `XXXX-XXXX-${selectedRes.id_proof_number.slice(-4)}`
                              : selectedRes.id_proof_number)
                          : 'NO ID SUBMITTED'}
                      </span>
                      <span className="text-[10px] font-sans font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Cross-verify with physical original card
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Financial breakdown */}
            <div className="p-4 rounded-xl bg-[#F8F3E9]/50 border border-[#E6D9C5] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#786A5B] pb-1 border-b border-[#E6D9C5]/50">
                <span>Pricing Mode:</span>
                <span className="font-semibold text-[#8D672F]">
                  {selectedRes.pricing_mode === 'gst_inclusive' ? 'GST Inclusive (Flat Rate)' : 'GST Exclusive (+5% GST)'}
                </span>
              </div>
              <div className="flex justify-between text-[#786A5B]">
                <span>Room Charges:</span>
                <span>₹{selectedRes.subtotal_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#786A5B]">
                <span>Taxes & Fees (5% GST):</span>
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

            {/* Room Transfer & Relocation Audit Trail */}
            {selectedRes.room_transfers && selectedRes.room_transfers.length > 0 && (
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-sky-200/60 font-bold text-sky-950">
                  <span className="flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-sky-700" />
                    <span>Room Transfer & Relocation History ({selectedRes.room_transfers.length})</span>
                  </span>
                  <span className="text-[10px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-semibold">
                    Relocated Stay
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedRes.room_transfers.map((t, idx) => (
                    <div key={t.id || idx} className="p-2.5 rounded-xl bg-white border border-sky-200/70 shadow-2xs flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-900 text-xs">Room #{t.from_room_number} &rarr; Room #{t.to_room_number}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                            {t.reason_category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#786A5B] mt-1">{t.reason_notes}</p>
                      </div>
                      <div className="text-right text-[10px] text-gray-500 shrink-0">
                        <span>{t.transferred_at ? new Date(t.transferred_at).toLocaleString('en-IN') : ''}</span>
                        <span className="block font-semibold text-sky-800 mt-0.5">By {t.actor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Razorpay Gateway Audit & Digital Settlement Link */}
            <div className="p-4 rounded-2xl bg-white border border-[#E6D9C5] space-y-3 text-xs shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6D9C5]">
                <span className="font-bold text-[#33271D] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#8D672F]" />
                  <span>Authoritative Payment Ledger & Gateway Audit</span>
                </span>
                <Link
                  href={`/admin/payments?search=${selectedRes.booking_reference}`}
                  className="text-[10px] text-[#8D672F] font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>View in Financial Ledger &rarr;</span>
                </Link>
              </div>

              {/* Verified Authoritative Transactions List */}
              {loadingResPayments ? (
                <div className="py-2 text-center text-xs text-[#786A5B]">Verifying payment transactions...</div>
              ) : resPayments.length > 0 ? (
                <div className="space-y-2">
                  {resPayments.map((p: any, idx: number) => (
                    <div key={p.id || idx} className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E6D9C5] flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#33271D]">{p.payment_reference}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            p.status === 'successful' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status || 'SUCCESSFUL'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#786A5B] mt-0.5 flex items-center gap-2">
                          <span>Method: <strong className="uppercase text-[#33271D]">{p.payment_method || 'Online'}</strong></span>
                          {p.gateway_payment_id && <span>&bull; Gateway ID: <strong className="font-mono text-[#33271D]">{p.gateway_payment_id}</strong></span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 text-sm">₹{Number(p.amount).toLocaleString('en-IN')}</div>
                        <div className="text-[9px] text-[#786A5B]">
                          {p.paid_at || p.created_at ? new Date(p.paid_at || p.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-center text-[11px]">
                  No payment transactions recorded for this reservation.
                </div>
              )}

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
                {selectedRes.status === 'checked_in' && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = selectedRes;
                      setSelectedRes(null);
                      setChangeRoomTarget(b);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-300 hover:bg-sky-100 text-sky-900 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-sky-700" />
                    <span>Change Room</span>
                  </button>
                )}
                {selectedRes.status !== 'cancelled' && selectedRes.status !== 'checked_out' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddExtraRoomTarget(selectedRes);
                      setSelectedExtraRoomNumber('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    title="Add another room to this reservation"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                    <span>+ Extra Room</span>
                  </button>
                )}
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

                <button
                  disabled={actionLoading}
                  onClick={() => handleDeleteBooking(selectedRes.booking_reference, selectedRes.guest_name)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-stone-200 hover:border-rose-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                  title="Permanently remove reservation record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Booking</span>
                </button>
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
                    Stay {rfidAuditBooking.booking_reference} â€¢ Room {rfidAuditBooking.assigned_room_number || rfidAuditBooking.room_number || 'Unassigned'}
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

      {/* --- MODAL 9: GUEST ROOM CHANGE & RELOCATION MODAL --- */}
      <ChangeRoomModal
        isOpen={!!changeRoomTarget}
        onClose={() => setChangeRoomTarget(null)}
        booking={changeRoomTarget}
        rooms={physicalRooms}
        onRoomChanged={async () => {
          await fetchBookings();
        }}
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
