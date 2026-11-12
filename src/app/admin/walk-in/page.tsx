'use client';
import QRCode from 'qrcode';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UserPlus,
  BedDouble,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Printer,
  ShieldCheck,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  QrCode,
  KeyRound,
  X,
  Sparkles,
  Check,
  Wifi,
  Copy,
  Radio,
  Lock,
  Unlock,
  Ban,
} from 'lucide-react';
import { ReceptionStandeeModal } from '@/components/admin/ReceptionStandeeModal';
import LuxuryDateRangePicker from '@/components/anantha/LuxuryDateRangePicker';
import LuxurySelect from '@/components/anantha/LuxurySelect';
import { Booking, PhysicalRoom, RoomCategory, RFIDCard } from '@/types';
import {
  issuePhysicalKeycard,
  checkBridgeHealth,
  readPhysicalCard,
  checkoutPhysicalCard,
  playChimeSound,
} from '@/lib/rfid/bridge-client';
import { useRealtimeSync, adminOperations, getAdminHeaders } from '@/lib/realtime-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { normalizeCategoryId } from '@/lib/pricing';

const isCategoryMatch = (roomCatId?: string | null, targetCatId?: string | null) => {
  if (!roomCatId || !targetCatId) return false;
  if (roomCatId === targetCatId) return true;
  return normalizeCategoryId(roomCatId) === normalizeCategoryId(targetCatId);
};

interface AdditionalServiceItem {
  id: string;
  name: string;
  priceInr: number;
}

const DEFAULT_ADDITIONAL_SERVICES: AdditionalServiceItem[] = [
  { id: 'srv-breakfast', name: 'Traditional Temple Breakfast', priceInr: 250 },
  { id: 'srv-pickup', name: 'Kadiri Railway / Bus Station Pickup', priceInr: 300 },
  { id: 'srv-extra-linen', name: 'Extra Mineral Water & Fresh Linen Set', priceInr: 150 },
];

export default function AnanthaWalkInPage() {
  const { t, formatCurrency, formatDate, translateStatus, isTelugu } = useAdminLanguage();
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Data sources
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [physicalRooms, setPhysicalRooms] = useState<PhysicalRoom[]>([]);
  const [services] = useState<AdditionalServiceItem[]>(DEFAULT_ADDITIONAL_SERVICES);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [numAdults, setNumAdults] = useState<number>(2);
  const [numChildren, setNumChildren] = useState<number>(0);

  // Guest details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestIdProofType, setGuestIdProofType] = useState<string>('Aadhaar Card');
  const [guestIdProofNumber, setGuestIdProofNumber] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestCity, setGuestCity] = useState('Kadiri');
  const [nationality, setNationality] = useState<'Indian' | 'Foreigner'>('Indian');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Pilgrimage / Temple Darshan');

  // Rate & discounts
  const [customRate, setCustomRate] = useState<string>('');
  const [discountInr, setDiscountInr] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Payment & check-in
  const [instantCheckIn, setInstantCheckIn] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [frontDeskNotes, setFrontDeskNotes] = useState('');

  // Cash Tendered & Live Change State
  const [cashTendered, setCashTendered] = useState<number>(0);

  // UPI QR & Verification State
  const [upiUtr, setUpiUtr] = useState<string>('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [showUpiQr, setShowUpiQr] = useState<boolean>(true);
  const [upiCopied, setUpiCopied] = useState<boolean>(false);
  const [upiConfirmed, setUpiConfirmed] = useState<boolean>(false);

  // Card POS Machine Details
  const [cardLast4, setCardLast4] = useState<string>('');
  const [cardAuthCode, setCardAuthCode] = useState<string>('');
  const [cardNetwork, setCardNetwork] = useState<string>('Visa');
  const [cardConfirmed, setCardConfirmed] = useState<boolean>(false);

  // Operational states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdReservation, setCreatedReservation] = useState<Booking | null>(null);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [walkInQueue, setWalkInQueue] = useState<Booking[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<Booking | null>(null);
  const [assignRoomNumber, setAssignRoomNumber] = useState('');
  const [assigningKey, setAssigningKey] = useState(false);

  // RFID Keycard Activation Post-Confirmation State
  const [rfidSelectedRoom, setRfidSelectedRoom] = useState('');
  const [rfidCardUid, setRfidCardUid] = useState('');
  const [rfidIsEncoding, setRfidIsEncoding] = useState(false);
  const [rfidBridgeOnline, setRfidBridgeOnline] = useState(true);
  const [rfidBridgeDetails, setRfidBridgeDetails] = useState<{ port?: number; readerType?: number; service?: string }>({});
  const [isRecheckingBridge, setIsRecheckingBridge] = useState(false);
  const [isReadingPhysicalCard, setIsReadingPhysicalCard] = useState(false);
  const [rfidSuccessMessage, setRfidSuccessMessage] = useState<string | null>(null);
  const [rfidErrorMessage, setRfidErrorMessage] = useState<string | null>(null);
  const [rfidActivatedCount, setRfidActivatedCount] = useState<number>(0);
  const [activeGuestCards, setActiveGuestCards] = useState<RFIDCard[]>([]);
  const [tapTestStatus, setTapTestStatus] = useState<{ cardUid: string; message: string; success: boolean } | null>(null);
  const [isTestingTap, setIsTestingTap] = useState(false);

  // Real-time synchronization
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'room_assigned' ||
        event.eventType === 'room_status_changed' ||
        event.eventType === 'housekeeping_updated' ||
        event.eventType === 'check_in' ||
        event.eventType === 'check_out'
      ) {
        fetchData();
        loadWalkInQueue();
      }
    },
  });

  // Check RFID Hardware Bridge health with auto-recovery and notifications
  const checkRfidStatus = useCallback(async (manual = false) => {
    if (manual) setIsRecheckingBridge(true);
    try {
      const res = await checkBridgeHealth();
      setRfidBridgeOnline(res.isOnline);
      if (res.isOnline) {
        setRfidBridgeDetails({ port: res.port, readerType: res.readerType, service: res.service });
        if (manual) {
          playChimeSound(true);
          setRfidSuccessMessage(`🟢 Be-Tech BIS 5.7 USB Card Encoder is ONLINE & READY (Port ${res.port || 1}, Type ${res.readerType || 4})`);
          setRfidErrorMessage(null);
        }
      } else {
        if (manual) {
          playChimeSound(false);
          setRfidErrorMessage(res.error || 'Be-Tech USB Reader not responding. Check that the USB cable is firmly connected.');
        }
      }
    } catch {
      setRfidBridgeOnline(false);
      if (manual) {
        playChimeSound(false);
        setRfidErrorMessage('Keycard bridge unreachable. Ensure the Be-Tech USB cable is plugged into this computer.');
      }
    } finally {
      if (manual) setIsRecheckingBridge(false);
    }
  }, []);

  useEffect(() => {
    checkRfidStatus();
    const interval = setInterval(checkRfidStatus, 15000);
    return () => clearInterval(interval);
  }, [checkRfidStatus]);

  // Load walk-in queue
  const loadWalkInQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/walk-ins/queue', {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWalkInQueue(data.queue || []);
      }
    } catch {}
  }, []);

  // Fetch all live data
  const fetchData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      const res = await fetch('/api/admin/operations?action=get_full_state', {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const cats: RoomCategory[] = data.categories || [];
        const rms: PhysicalRoom[] = data.rooms || [];
        setCategories(cats);
        setPhysicalRooms(rms);

        if (cats.length > 0) {
          setSelectedCategoryId((prev) => {
            if (prev) return prev;
            const initialCat = cats[0].id;
            const availPhys = rms.filter(
              (pr) => isCategoryMatch(pr.category_id, initialCat) && pr.operational_status === 'available' && pr.housekeeping_status === 'clean'
            );
            if (availPhys.length > 0) {
              setSelectedRoomNumber(availPhys[0].room_number);
            }
            return initialCat;
          });
        }
      }
    } catch {
      setError('Failed to load room inventory data.');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    loadWalkInQueue();
    const interval = setInterval(loadWalkInQueue, 8000);
    return () => clearInterval(interval);
  }, [fetchData, loadWalkInQueue]);

  // When room category changes, pick first available physical room
  const handleRoomTypeChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const matchingPhys = physicalRooms.filter(
      (pr) => isCategoryMatch(pr.category_id, catId) && pr.operational_status === 'available' && pr.housekeeping_status === 'clean'
    );
    if (matchingPhys.length > 0) {
      setSelectedRoomNumber(matchingPhys[0].room_number);
    } else {
      setSelectedRoomNumber('');
    }
  };

  // Calculations
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  const calculateNights = () => {
    try {
      const d1 = new Date(checkInDate + 'T00:00:00Z');
      const d2 = new Date(checkOutDate + 'T00:00:00Z');
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  };

  const numNights = calculateNights();
  const effectiveNightlyRate = customRate && Number(customRate) > 0 ? Number(customRate) : (selectedCategory?.base_price_per_night || 2100);
  const roomSubtotal = effectiveNightlyRate * numNights;

  const servicesSubtotal = selectedServices.reduce((acc, sId) => {
    const s = services.find((srv) => srv.id === sId);
    return acc + (s ? s.priceInr : 0);
  }, 0);

  const discountAmount = Math.max(0, Number(discountInr) || 0);
  const taxableSubtotal = Math.max(0, roomSubtotal + servicesSubtotal - discountAmount);
  // 5% standard GST per luxury room guidelines
  const taxPercentage = 5;
  const taxesInr = Math.round(taxableSubtotal * (taxPercentage / 100));
  const totalAmountInr = taxableSubtotal + taxesInr;

  // Auto-fill paid amount when total changes if empty or previously matching
  useEffect(() => {
    setAmountPaid((prev) => (!prev || Number(prev) === 0 ? totalAmountInr.toString() : prev));
  }, [totalAmountInr]);

  const paidAmountNum = Math.min(totalAmountInr, Math.max(0, Number(amountPaid) || 0));
  const balanceDue = Math.max(0, totalAmountInr - paidAmountNum);

  // Filter available physical rooms for selected category
  const availableRoomsForType = useMemo(() => {
    return physicalRooms.filter(
      (pr) => isCategoryMatch(pr.category_id, selectedCategoryId)
    );
  }, [physicalRooms, selectedCategoryId]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  // Submit Handler: Creates walk-in booking and records payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRoomNumber) {
      setError('Please select an available physical room number.');
      return;
    }
    if (!guestName.trim()) {
      setError('Guest full name is required.');
      return;
    }
    if (!guestPhone.trim()) {
      setError('Guest mobile number is required.');
      return;
    }
    const cleanManualId = guestIdProofNumber.trim().replace(/\s+/g, '').toUpperCase();
    if (!cleanManualId) {
      setError('Government ID Proof Number is mandatory for Indian statutory hotel compliance.');
      return;
    }
    if (guestIdProofType.toLowerCase().includes('aadhaar')) {
      const numericAadhaar = cleanManualId.replace(/\D/g, '');
      if (numericAadhaar.length !== 12) {
        setError('Please enter the full 12-digit Aadhaar Card number.');
        return;
      }
    } else if (guestIdProofType.toLowerCase().includes('pan')) {
      if (cleanManualId.length !== 10) {
        setError('PAN Card number must be exactly 10 alphanumeric characters.');
        return;
      }
    } else if (cleanManualId.length < 6) {
      setError('Please enter the complete full Government ID number.');
      return;
    }

    try {
      setSubmitting(true);

      let pMethod: 'cash' | 'upi' | 'card' = paymentMethod;
      let finalPayRef = transactionRef.trim();
      if (!finalPayRef) {
        if (pMethod === 'cash') finalPayRef = `CASH-DRAWER-₹${paidAmountNum}`;
        else if (pMethod === 'upi') finalPayRef = upiUtr.trim() ? `UPI-UTR-${upiUtr.trim().toUpperCase()}` : `UPI-VERIFIED-${Date.now().toString().slice(-6)}`;
        else if (pMethod === 'card') finalPayRef = `POS-${cardNetwork.toUpperCase()}-${cardLast4.trim() ? `****${cardLast4.trim()}` : 'CARD'}-${cardAuthCode.trim() ? cardAuthCode.trim().toUpperCase() : 'AUTH'}`;
      }

      const notesArr = [
        frontDeskNotes.trim() || null,
        discountAmount > 0 ? `Discount ₹${discountAmount}: ${discountReason || 'Front Desk Discount'}` : null,
        selectedServices.length > 0 ? `Add-ons: ${selectedServices.join(', ')}` : null,
        pMethod === 'cash' ? `Cash Collected: ₹${paidAmountNum}${cashTendered > paidAmountNum ? ` (Tendered ₹${cashTendered}, Change ₹${cashTendered - paidAmountNum})` : ''}` : null,
        pMethod === 'upi' ? `UPI Verified${upiUtr.trim() ? ` | UTR: ${upiUtr.trim()}` : ''}` : null,
        pMethod === 'card' ? `POS Slip: ${cardNetwork} ${cardLast4.trim() ? `****${cardLast4.trim()}` : ''} ${cardAuthCode.trim() ? `Auth: ${cardAuthCode.trim()}` : ''}`.trim() : null,
      ].filter(Boolean).join(' | ');

      const res = await adminOperations.statutoryWalkIn({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        nationality,
        cityOfOrigin: guestCity.trim() || undefined,
        idProofType: guestIdProofType,
        idProofNumber: guestIdProofNumber.trim(),
        purposeOfVisit,
        categoryId: selectedCategoryId,
        roomNumber: selectedRoomNumber,
        checkInDate,
        checkOutDate,
        adultsCount: numAdults,
        childrenCount: numChildren,
        baseTariff: effectiveNightlyRate,
        isTariffOverridden: Boolean(customRate && Number(customRate) > 0),
        tariffOverrideReason: customRate ? 'Front desk custom rate' : undefined,
        paymentMethod: pMethod,
        amountCollected: paidAmountNum,
        paymentReference: transactionRef.trim() || `FD-COLLECTED-₹${paidAmountNum}`,
        issueKeycard: false, // We activate keycard explicitly in post-booking step per user requirement!
        specialRequests: notesArr || undefined,
        staffName: 'Front Desk Lead',
      });

      if (!res.success || !res.booking) {
        throw new Error(res.error || 'Failed to process walk-in reservation.');
      }

      setCreatedReservation(res.booking);
      setRfidSelectedRoom(selectedRoomNumber);
      setRfidCardUid(`BT-57-${Math.floor(100000 + Math.random() * 900000)}`);
      setRfidSuccessMessage(null);
      setRfidErrorMessage(null);
      setRfidActivatedCount(0);

      playChimeSound(true);

      // Refresh physical rooms
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving walk-in reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  // RFID Keycard Activation Handler (Called in Voucher View)
  const handleActivateRfidCard = async () => {
    if (!rfidSelectedRoom) {
      setRfidErrorMessage('Please select a room number for keycard activation.');
      return;
    }

    try {
      setRfidIsEncoding(true);
      setRfidErrorMessage(null);
      setRfidSuccessMessage(null);
      setTapTestStatus(null);

      const targetGuestName = createdReservation?.guest_name || guestName.trim() || 'Valued Guest';
      const targetBookingRef = createdReservation?.booking_reference || `TG-W-${Date.now().toString().slice(-6)}`;
      const targetExpiryDate = new Date(
        `${checkOutDate || createdReservation?.check_out_date || new Date().toISOString().split('T')[0]}T11:00:00+05:30`
      );

      // 1. Issue physical keycard through Be-Tech hardware bridge (strictly perpetual lifetime)
      const cardResult = await issuePhysicalKeycard({
        roomNumber: rfidSelectedRoom,
        guestName: targetGuestName,
        bookingRef: targetBookingRef,
        staffUser: 'Front Desk Walk-In Desk',
      });

      const effectiveCardUid = cardResult.cardNo
        ? `BT-57-${cardResult.cardNo}`
        : rfidCardUid || `BT-57-${Math.floor(100000 + Math.random() * 900000)}`;

      // 2. Persist the issued card to database via /api/rfid/cards
      let savedCard: RFIDCard | null = null;
      try {
        const regRes = await fetch('/api/rfid/cards', {
          method: 'POST',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            action: 'create_guest',
            roomNumber: rfidSelectedRoom,
            guestName: targetGuestName,
            bookingRef: targetBookingRef,
            issuedBy: 'Front Desk Walk-In Desk',
            expiresAt: targetExpiryDate.toISOString(),
            cardUid: effectiveCardUid,
          }),
        });

        if (regRes.ok) {
          const regData = await regRes.json();
          if (regData.success && regData.card) {
            savedCard = regData.card;
            setActiveGuestCards((prev) => [
              regData.card,
              ...prev.filter((c) => c.card_uid !== regData.card.card_uid),
            ]);
          }
        }
      } catch (dbErr) {
        console.warn('[RFID CARD DB PERSISTENCE NOTICE]', dbErr);
      }

      // If database registration produced a card, or fallback object
      if (!savedCard) {
        savedCard = {
          id: `crd-${Date.now()}`,
          card_uid: effectiveCardUid,
          card_label: `Guest Card - Room ${rfidSelectedRoom}`,
          card_type: 'guest',
          assigned_room_number: rfidSelectedRoom,
          room_number: rfidSelectedRoom,
          booking_reference: targetBookingRef,
          guest_name: targetGuestName,
          status: 'active',
          activated_at: new Date().toISOString(),
          expires_at: targetExpiryDate.toISOString(),
          created_at: new Date().toISOString(),
        };
        setActiveGuestCards((prev) => [savedCard!, ...prev.filter((c) => c.card_uid !== effectiveCardUid)]);
      }

      // Update reservation keycard info
      if (createdReservation) {
        createdReservation.keycard_uid = effectiveCardUid;
        createdReservation.keycard_issued_at = new Date().toISOString();
      }

      playChimeSound(true);
      setRfidActivatedCount((c) => c + 1);
      setRfidBridgeOnline(true);
      setRfidSuccessMessage(
        `Physical Keycard (SN: ${cardResult.cardNo || effectiveCardUid}) successfully encoded & activated for Room #${rfidSelectedRoom}! Door lock access is live.`
      );

      // Pre-generate fresh sequence for optional next companion card
      setRfidCardUid(`BT-57-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err: any) {
      playChimeSound(false);
      setRfidErrorMessage(err.message || 'Keycard bridge communication failed. Please check USB reader connection.');
    } finally {
      setRfidIsEncoding(false);
    }
  };

  // Read card currently resting on Be-Tech reader
  const handleReadPhysicalCard = async () => {
    setIsReadingPhysicalCard(true);
    setRfidErrorMessage(null);
    setRfidSuccessMessage(null);
    try {
      const result = await readPhysicalCard('Front Desk Walk-In Desk');
      playChimeSound(result.success);
      if (result.success && result.cardNo) {
        const scannedUid = `BT-57-${result.cardNo}`;
        setRfidCardUid(scannedUid);
        setRfidSuccessMessage(
          `Scanned card on Be-Tech encoder: SN #${result.cardNo}${result.roomNumber ? ` (Allocated: Room #${result.roomNumber})` : ''}`
        );
      } else {
        setRfidErrorMessage(result.error || 'No Mifare card detected on encoder. Please place card flat on reader.');
      }
    } catch (err: any) {
      playChimeSound(false);
      setRfidErrorMessage(err.message || 'Failed to read physical card from hardware reader.');
    } finally {
      setIsReadingPhysicalCard(false);
    }
  };

  // Test simulated door lock tap to verify access
  const handleTestDoorTap = async (targetCardUid: string) => {
    setIsTestingTap(true);
    setTapTestStatus(null);
    try {
      const res = await fetch('/api/rfid/tap', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          cardUid: targetCardUid,
          roomNumber: rfidSelectedRoom,
          action: 'door_unlock',
        }),
      });

      const data = await res.json();
      playChimeSound(data.accessGranted);
      if (data.accessGranted) {
        setTapTestStatus({
          cardUid: targetCardUid,
          success: true,
          message: `ACCESS GRANTED: Green LED / Door Unlocked for Room #${rfidSelectedRoom}!`,
        });
      } else {
        setTapTestStatus({
          cardUid: targetCardUid,
          success: false,
          message: `ACCESS DENIED: ${data.message || 'Card is not authorized for Room #' + rfidSelectedRoom}`,
        });
      }
    } catch (err: any) {
      playChimeSound(false);
      setTapTestStatus({
        cardUid: targetCardUid,
        success: false,
        message: err.message || 'Tap verification failed',
      });
    } finally {
      setIsTestingTap(false);
    }
  };

  // Deactivate or revoke a card
  const handleDeactivateCard = async (targetCardUid: string) => {
    try {
      await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'toggle_status',
          cardUid: targetCardUid,
          status: 'inactive',
        }),
      });

      // Also invoke physical checkout
      checkoutPhysicalCard(rfidSelectedRoom, 'Front Desk Walk-In Desk').catch(() => {});

      setActiveGuestCards((prev) =>
        prev.map((c) => (c.card_uid === targetCardUid ? { ...c, status: 'inactive' } : c))
      );
      playChimeSound(true);
      setRfidSuccessMessage(`Card ${targetCardUid} deactivated and removed from active door locks.`);
    } catch (err: any) {
      setRfidErrorMessage(err.message || 'Failed to deactivate card');
    }
  };

  const handlePrintGRC = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const resetForm = () => {
    setCreatedReservation(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestIdProofNumber('');
    setGuestAddress('');
    setGuestCity('Kadiri');
    setCustomRate('');
    setDiscountInr('');
    setDiscountReason('');
    setSelectedServices([]);
    setTransactionRef('');
    setFrontDeskNotes('');
    setCheckInDate(todayStr);
    setCheckOutDate(tomorrowStr);
    setRfidSuccessMessage(null);
    setRfidErrorMessage(null);
    setRfidActivatedCount(0);
    setActiveGuestCards([]);
    setTapTestStatus(null);
    fetchData();
    loadWalkInQueue();
  };

  // Handle live queue assignment
  const handleAssignAndHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem || !assignRoomNumber) return;

    try {
      setAssigningKey(true);
      const res = await fetch('/api/admin/walk-ins/assign-and-encode', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bookingReference: selectedQueueItem.booking_reference,
          roomNumber: assignRoomNumber,
          staffName: 'Front Desk Lead',
        }),
      });

      if (res.ok) {
        playChimeSound(true);
        setSelectedQueueItem(null);
        setAssignRoomNumber('');
        loadWalkInQueue();
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to assign room.');
      }
    } catch {
      alert('Error connecting to front desk queue.');
    } finally {
      setAssigningKey(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-[#E6D9C5]">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#8D672F] font-semibold mb-1">
            <Sparkles className="w-4 h-3.5 text-[#8D672F]" />
            <span>Front Desk PMS Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#33271D]">
            {t('walkIn.title', 'Walk-In Guest Registration & Check-In')}
          </h1>
          <p className="text-xs sm:text-sm text-[#786A5B] mt-0.5">
            {t('walkIn.subtitle', 'Direct counter check-in, real-time physical room assignment, ID compliance, and instantaneous folio billing.')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admin/rooms/board"
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs font-semibold text-[#33271D] hover:bg-[#F8F3E9] transition-all flex items-center space-x-1.5 shadow-xs min-h-[42px]"
          >
            <BedDouble className="w-3.5 h-3.5 text-[#B18A4A]" />
            <span>Room Tape Chart</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsStandeeModalOpen(true)}
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl border border-[#8D672F]/50 bg-[#F8F3E9] text-xs font-semibold text-[#8D672F] hover:bg-[#8D672F] hover:text-white transition-all flex items-center space-x-1.5 shadow-xs min-h-[42px] cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{t('walkIn.printStandee', 'Print Desk Standee QR')}</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs text-[#786A5B] hover:text-[#33271D] shadow-xs transition-all min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
            title="Refresh Room Matrix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInitial ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile QR Walk-In Arrivals Queue Banner */}
      {walkInQueue.length > 0 && (
        <div className="bg-[#21180F] text-white p-4 sm:p-5 rounded-3xl border border-[#8D672F] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-serif font-bold text-sm text-[#D8AD56]">
                Live Mobile QR Walk-In Arrivals ({walkInQueue.length} Waiting at Counter)
              </h3>
            </div>
            <span className="text-[11px] text-stone-300 hidden sm:inline">
              Guests scanned acrylic desk standee & awaiting key
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {walkInQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-[#D8AD56] font-bold block">
                      Ref: {item.booking_reference}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-white">
                      {item.guest_name}
                    </h4>
                    <span className="text-[11px] text-stone-300 block">{item.guest_phone}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                    Awaiting Room & Key
                  </span>
                </div>

                {/* HIGHLIGHTED GOVERNMENT ID VERIFICATION BOX */}
                <div className="bg-[#2D1F13] border-2 border-[#D8AD56]/70 rounded-xl p-2.5 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#D8AD56] font-extrabold uppercase flex items-center gap-1 tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D8AD56]" />
                      <span>{item.id_proof_type?.replace(/_/g, ' ').toUpperCase() || 'GOVT ID'}</span>
                    </span>
                    <span className="text-[9px] bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Verify Physical Copy
                    </span>
                  </div>
                  <div className="font-mono font-black text-xs text-white tracking-widest bg-black/50 px-2.5 py-1.5 rounded-lg border border-white/15 flex items-center justify-between">
                    <span>{item.id_proof_number || 'NO ID SUBMITTED'}</span>
                    <span className="text-[9px] font-sans font-medium text-[#D8AD56]">Check Original</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-300 pt-1 border-t border-white/10">
                  <span>{item.category_name || 'Room Stay'}</span>
                  <span className="font-bold text-[#D8AD56]">₹{item.total_amount?.toLocaleString('en-IN')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedQueueItem(item);
                    const matchRooms = physicalRooms.filter(
                      (pr) => isCategoryMatch(pr.category_id, item.category_id) && pr.operational_status === 'available' && pr.housekeeping_status === 'clean'
                    );
                    if (matchRooms.length > 0) {
                      setAssignRoomNumber(matchRooms[0].room_number);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Assign Room & Hand Over Key</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-800 text-xs sm:text-sm shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS CONFIRMATION & RFID ACTIVATION VIEW */}
      {createdReservation && (
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-[#B18A4A]/30 shadow-xl space-y-6">
          {/* Hotel Letterhead */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6D9C5] gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl border border-[#D8AD56]/80 p-1 bg-[#21180F] shadow-xs flex items-center justify-center shrink-0">
                <Image
                  src="/images/hotel/tayi-grand-logo.png"
                  alt="Sri Tayi Grand Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#33271D] tracking-wide uppercase leading-tight">
                  Sri Tayi Grand
                </h3>
                <p className="text-[11px] text-[#786A5B]">
                  Clock Tower Main Road, Beside Syndicate Bank, Kadiri 515591 &bull; Tel: +91 98765 43210
                </p>
                <p className="text-[9px] uppercase font-bold text-[#8D672F] tracking-wider mt-0.5">
                  Guest Registration Card (GRC) &bull; Statutory In-House Record
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6D9C5]">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {createdReservation.status === 'checked_in' ? 'Guest Checked In' : 'Walk-In Confirmed'}
                  </span>
                  <span className="text-xs text-[#786A5B]">Ref: <b>{createdReservation.booking_reference}</b></span>
                </div>
                <h2 className="text-lg sm:text-xl font-serif font-bold text-[#33271D] mt-1">
                  Room {createdReservation.assigned_room_number} &mdash; {createdReservation.guest_name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrintGRC}
                className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2.5 rounded-xl bg-[#21180F] hover:bg-black text-white text-xs uppercase tracking-wider font-semibold shadow-md transition-all flex items-center space-x-1.5 min-h-[42px] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#B18A4A]" />
                <span>Print GRC</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2.5 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-wider font-semibold shadow-md transition-all flex items-center space-x-1.5 min-h-[42px] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Next Walk-In</span>
              </button>
            </div>
          </div>

          {/* Folio Voucher Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5]/80">
              <span className="text-[#786A5B] block mb-1">Room Assigned</span>
              <span className="text-base font-bold text-[#33271D]">Room {createdReservation.assigned_room_number}</span>
              <span className="text-[11px] text-[#786A5B] block">{createdReservation.category_name}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5]/80">
              <span className="text-[#786A5B] block mb-1">Duration</span>
              <span className="text-base font-bold text-[#33271D]">{numNights} Night(s)</span>
              <span className="text-[11px] text-[#786A5B] block">{createdReservation.check_in_date} to {createdReservation.check_out_date}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5]/80">
              <span className="text-[#786A5B] block mb-1">Government ID</span>
              <span className="text-base font-bold text-[#33271D] uppercase">{createdReservation.id_proof_type || guestIdProofType}</span>
              <span className="text-[11px] text-[#786A5B] block font-mono">{createdReservation.id_proof_number || guestIdProofNumber}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8F3E9]/50 border border-[#E6D9C5]/80">
              <span className="text-[#786A5B] block mb-1">Payment Status</span>
              <span className="text-base font-bold text-emerald-700 capitalize">
                {createdReservation.payment_status} (₹{createdReservation.paid_amount?.toLocaleString('en-IN')})
              </span>
              <span className="text-[11px] text-[#786A5B] block">
                Total Folio: ₹{createdReservation.total_amount?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* DEDICATED RFID KEYCARD ACTIVATION MODULE (POST CONFIRMATION) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#21180F] via-[#2D1F14] to-[#21180F] text-white border-2 border-[#D8AD56] shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#8D672F]/30 border border-[#D8AD56] flex items-center justify-center text-[#D8AD56] shrink-0">
                  <KeyRound className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AD56]">
                      PHYSICAL RFID KEYCARD ENCODING
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${rfidBridgeOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${rfidBridgeOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                      {rfidBridgeOnline ? (rfidBridgeDetails.port ? `Encoder Online (Port ${rfidBridgeDetails.port}, ACR120 Mifare)` : 'Encoder Online (Port 1, ACR120 Mifare)') : 'Bridge Offline'}
                    </span>
                    <button
                      type="button"
                      onClick={() => checkRfidStatus(true)}
                      disabled={isRecheckingBridge}
                      className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[#E6D9C5] hover:text-white text-[9px] font-medium flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      title="Recheck Be-Tech Hardware Bridge status"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isRecheckingBridge ? 'animate-spin' : ''}`} />
                      <span>{isRecheckingBridge ? 'Rechecking...' : 'Recheck Bridge'}</span>
                    </button>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5">
                    Activate Smart Door Keycard for Guest
                  </h3>
                  <p className="text-xs text-[#E6D9C5]/80">
                    Place physical Mifare card on Be-Tech encoder to program door lock access.
                  </p>
                </div>
              </div>

              {rfidActivatedCount > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{rfidActivatedCount} Card(s) Active</span>
                </div>
              )}
            </div>

            {/* Tap Test Verification Banner */}
            {tapTestStatus && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 border transition-all ${tapTestStatus.success ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200' : 'bg-rose-950/70 border-rose-400 text-rose-200'}`}>
                <div className="flex items-center gap-2.5">
                  {tapTestStatus.success ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold">{tapTestStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTapTestStatus(null)}
                  className="text-white/60 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Success / Error Messages */}
            {rfidSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{rfidSuccessMessage}</span>
              </div>
            )}
            {rfidErrorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                <span>{rfidErrorMessage}</span>
              </div>
            )}

            {/* Room Number & Encoder Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#E6D9C5] mb-1.5">
                  Assigned Room Number:
                </label>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 font-mono font-bold text-white text-sm flex items-center justify-between">
                  <span>Room #{rfidSelectedRoom}</span>
                  <span className="text-[10px] text-[#D8AD56] font-sans uppercase">Floor {createdReservation.assigned_room_number?.slice(0, 1) || '1'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#E6D9C5] mb-1.5">
                  Guest Name on Card:
                </label>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 font-semibold text-white text-xs truncate">
                  {createdReservation.guest_name}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#E6D9C5]">
                    Card UID Sequence:
                  </label>
                  <button
                    type="button"
                    onClick={handleReadPhysicalCard}
                    disabled={isReadingPhysicalCard || !rfidBridgeOnline}
                    className="text-[10px] text-[#D8AD56] hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Scan card placed on Be-Tech encoder"
                  >
                    <Radio className={`w-3 h-3 ${isReadingPhysicalCard ? 'animate-pulse text-amber-400' : ''}`} />
                    <span>{isReadingPhysicalCard ? 'Scanning Reader...' : 'Read from Reader'}</span>
                  </button>
                </div>
                <div className="p-1.5 pl-2.5 rounded-xl bg-white/10 border border-white/20 font-mono text-amber-200 text-xs flex items-center justify-between">
                  <input
                    type="text"
                    value={rfidCardUid}
                    onChange={(e) => setRfidCardUid(e.target.value)}
                    className="bg-transparent border-0 text-amber-200 font-mono text-xs w-full focus:outline-hidden"
                    placeholder="BT-57-XXXXXX"
                  />
                  <button
                    type="button"
                    onClick={handleReadPhysicalCard}
                    disabled={isReadingPhysicalCard || !rfidBridgeOnline}
                    className="p-1.5 rounded-lg bg-[#D8AD56]/20 hover:bg-[#D8AD56]/40 text-[#D8AD56] transition-colors cursor-pointer shrink-0 ml-1"
                    title="Read Mifare Card on Be-Tech Reader"
                  >
                    <Radio className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Guest Cards List & Door Testing */}
            {activeGuestCards.length > 0 && (
              <div className="p-4 rounded-2xl bg-black/40 border border-[#D8AD56]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#D8AD56] uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Active Keycards for Room #{rfidSelectedRoom} ({activeGuestCards.length})
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Door Locks Synchronized
                  </span>
                </div>

                <div className="space-y-2">
                  {activeGuestCards.map((card, idx) => (
                    <div
                      key={card.card_uid || idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#D8AD56]/20 border border-[#D8AD56]/40 flex items-center justify-center text-[#D8AD56] shrink-0 font-mono text-[10px] font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-300">{card.card_uid}</span>
                            <span className={`text-[9px] px-2 py-0.2 rounded-full font-semibold ${card.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'}`}>
                              {card.status === 'active' ? '🟢 Active & Authorized' : '🔴 Inactive / Revoked'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#E6D9C5]/70">
                            Issued: {new Date(card.activated_at || card.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} &bull; Guest: {card.guest_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleTestDoorTap(card.card_uid)}
                          disabled={isTestingTap || card.status !== 'active'}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
                          title="Simulate door tap to test door unlock"
                        >
                          <Unlock className="w-3 h-3 text-emerald-300" />
                          <span>Test Door Tap</span>
                        </button>
                        {card.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateCard(card.card_uid)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-400/40 text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                            title="Deactivate and revoke keycard access"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keycard Encoding Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-[#E6D9C5]/70">
                Perpetual lifetime validity (beginTime 0001010000 &bull; endTime 9912312359) compliant with Be-Tech door locks.
              </span>

              <button
                type="button"
                onClick={handleActivateRfidCard}
                disabled={rfidIsEncoding}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-[#D8AD56] via-[#C49A45] to-[#8D672F] hover:brightness-110 active:scale-[0.99] text-[#21180F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shrink-0"
              >
                {rfidIsEncoding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#21180F]" />
                    <span>Encoding on Hardware Reader...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-[#21180F]" />
                    <span>{rfidActivatedCount > 0 ? '+ Encode Additional Keycard' : '⚡ Activate Physical Keycard Now'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Terminal Grid (Shown when creating a new walk-in) */}
      {!createdReservation && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Guest & Room Form (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Stay & Room Assignment */}
            <div className="bg-white rounded-3xl p-4 sm:p-7 border border-[#E6D9C5] shadow-xs space-y-4 sm:space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-[#E6D9C5]">
                <div className="w-7 h-7 rounded-lg bg-[#8D672F]/10 text-[#8D672F] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="font-serif font-bold text-base text-[#33271D]">
                  Room Category & Physical Room Allocation
                </h3>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <LuxuryDateRangePicker
                    checkInDate={checkInDate}
                    checkOutDate={checkOutDate}
                    onChange={(inDate, outDate) => {
                      setCheckInDate(inDate);
                      setCheckOutDate(outDate);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Duration</label>
                  <div className="p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-xs sm:text-sm font-semibold text-[#8D672F] flex items-center justify-between">
                    <span>{numNights} Night(s)</span>
                    <Clock className="w-3.5 h-3.5 text-[#B18A4A]" />
                  </div>
                </div>
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-xs font-medium text-[#786A5B] mb-2">Room Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((rt) => {
                    const isSelected = selectedCategoryId === rt.id;
                    const countAvailable = physicalRooms.filter(
                      (pr) => isCategoryMatch(pr.category_id, rt.id) && pr.operational_status === 'available' && pr.housekeeping_status === 'clean'
                    ).length;

                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => handleRoomTypeChange(rt.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#8D672F] bg-[#8D672F]/5 ring-1 ring-[#8D672F]'
                            : 'border-[#E6D9C5] bg-white hover:bg-[#F8F3E9]/50'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#33271D] truncate">{rt.name}</div>
                        <div className="text-[11px] text-[#8D672F] font-semibold mt-0.5">
                          ₹{rt.base_price_per_night?.toLocaleString('en-IN')}<span className="text-[9px] font-normal text-[#786A5B]">/nt</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className={countAvailable > 0 ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}>
                            {countAvailable > 0 ? `${countAvailable} Clean` : 'None clean'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Physical Room Selection Dropdown & Quick Badges */}
              <div>
                <label className="block text-xs font-medium text-[#786A5B] mb-1.5 flex items-center justify-between">
                  <span>Physical Room Number (Mandatory for Walk-In)</span>
                  <span className="text-[11px] text-[#8D672F]">
                    {availableRoomsForType.filter((pr) => pr.operational_status === 'available' && pr.housekeeping_status === 'clean').length} Room(s) available on floor
                  </span>
                </label>

                {availableRoomsForType.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No clean rooms currently available for this category. Please clean a dirty room in the Tape Chart or select another category.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableRoomsForType.map((pr) => {
                      const isSelected = selectedRoomNumber === pr.room_number;
                      const isDirty = pr.housekeeping_status === 'dirty' || pr.housekeeping_status === 'in_progress';
                      const isOccupied = pr.operational_status === 'occupied';

                      return (
                        <button
                          key={pr.id}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setSelectedRoomNumber(pr.room_number)}
                          className={`p-2.5 rounded-xl border text-center transition-all min-h-[46px] flex flex-col justify-center items-center cursor-pointer ${
                            isSelected
                              ? 'bg-[#21180F] text-white border-black shadow-md font-bold'
                              : isOccupied
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                              : isDirty
                              ? 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100'
                              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100 font-medium'
                          }`}
                        >
                          <div className="text-xs font-bold">#{pr.room_number}</div>
                          <div className="text-[9px] uppercase tracking-wider opacity-80">
                            {isOccupied ? 'Occupied' : isDirty ? 'Dirty' : `Fl. ${pr.floor_number}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Adults & Children */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Adults (Age 12+)</label>
                  <LuxurySelect<number>
                    value={numAdults}
                    onChange={(val) => setNumAdults(val)}
                    options={[1, 2, 3, 4].map((n) => ({
                      value: n,
                      label: `${n} ${n === 1 ? 'Adult' : 'Adults'}`,
                    }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Children (Age 0-11)</label>
                  <LuxurySelect<number>
                    value={numChildren}
                    onChange={(val) => setNumChildren(val)}
                    options={[0, 1, 2, 3].map((n) => ({
                      value: n,
                      label: `${n} ${n === 1 ? 'Child' : 'Children'}`,
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 2. Guest Information & Statutory ID Proof */}
            <div className="bg-white rounded-3xl p-4 sm:p-7 border border-[#E6D9C5] shadow-xs space-y-4 sm:space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-[#E6D9C5]">
                <div className="w-7 h-7 rounded-lg bg-[#8D672F]/10 text-[#8D672F] flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="font-serif font-bold text-base text-[#33271D]">
                  Guest Identification & Statutory Compliance
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Guest Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#B18A4A] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar Sharma"
                      className="w-full pl-9 p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Mobile Phone *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#B18A4A] absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Email (Optional)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#B18A4A] absolute left-3 top-3" />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="w-full pl-9 p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Origin City / State</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#B18A4A] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={guestCity}
                      onChange={(e) => setGuestCity(e.target.value)}
                      placeholder="e.g. Bangalore, Karnataka"
                      className="w-full pl-9 p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Indian Hotel Statutory ID Proof */}
              <div className="p-4 rounded-2xl bg-[#B18A4A]/5 border border-[#B18A4A]/20 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#8D672F]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Statutory Government ID Verification (Police Compliance)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#786A5B] mb-1">ID Proof Type *</label>
                    <LuxurySelect<string>
                      value={guestIdProofType}
                      onChange={(val) => setGuestIdProofType(val)}
                      variant="white"
                      options={[
                        { value: 'Aadhaar Card', label: 'Aadhaar Card (UIDAI)' },
                        { value: 'Passport', label: 'Passport' },
                        { value: 'Driving License', label: 'Driving License' },
                        { value: 'Voter ID', label: 'Voter ID (EPIC)' },
                        { value: 'Other Official Govt ID', label: 'Other Official Govt ID' },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#786A5B] mb-1">ID Proof Number / Document Ref *</label>
                    <input
                      type="text"
                      value={guestIdProofNumber}
                      onChange={(e) => setGuestIdProofNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 5482 1928 3847"
                      className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs sm:text-sm text-[#33271D] outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={guestAddress}
                    onChange={(e) => setGuestAddress(e.target.value)}
                    placeholder="Permanent Address as per ID Proof"
                    className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-white text-xs sm:text-sm text-[#33271D] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Rates, Add-ons & Front-Desk Adjustments */}
            <div className="bg-white rounded-3xl p-4 sm:p-7 border border-[#E6D9C5] shadow-xs space-y-4 sm:space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-[#E6D9C5]">
                <div className="w-7 h-7 rounded-lg bg-[#8D672F]/10 text-[#8D672F] flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="font-serif font-bold text-base text-[#33271D]">
                  Rate Override, Services & Front-Desk Discounts
                </h3>
              </div>

              {/* Rate Override & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Custom Nightly Rate (₹)</label>
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder={`Rack: ₹${selectedCategory?.base_price_per_night || 2100}`}
                    className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                  />
                  <span className="text-[10px] text-[#786A5B] block mt-0.5">Leave blank to use base rate.</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Special Discount (₹)</label>
                  <input
                    type="number"
                    value={discountInr}
                    onChange={(e) => setDiscountInr(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-1">Discount Reason</label>
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. GM Courtesy / Corporate"
                    className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                  />
                </div>
              </div>

              {/* Add-ons */}
              {services.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#786A5B] mb-2">Optional Services</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {services.map((srv) => {
                      const isSelected = selectedServices.includes(srv.id);
                      return (
                        <div
                          key={srv.id}
                          onClick={() => handleServiceToggle(srv.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-[#8D672F] bg-[#8D672F]/5 ring-1 ring-[#8D672F]'
                              : 'border-[#E6D9C5] bg-white hover:bg-[#F8F3E9]/30'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-[#33271D]">{srv.name}</div>
                            <div className="text-[11px] text-[#8D672F] font-semibold">₹{srv.priceInr.toLocaleString('en-IN')}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#8D672F] bg-[#8D672F] text-white' : 'border-[#E6D9C5]'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Front Desk Notes */}
              <div>
                <label className="block text-xs font-medium text-[#786A5B] mb-1">Front Desk Operational Notes</label>
                <textarea
                  rows={2}
                  value={frontDeskNotes}
                  onChange={(e) => setFrontDeskNotes(e.target.value)}
                  placeholder="e.g. Late departure requested, vegetarian breakfast preference, early morning call at 6 AM."
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] bg-[#F8F3E9]/30 text-xs sm:text-sm text-[#33271D] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Folio Summary & Payment (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#21180F] text-[#F8F3E9] rounded-3xl p-4 sm:p-7 shadow-xl border border-[#3a2c1f] space-y-5 sm:space-y-6 sticky top-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#3a2c1f]">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#B18A4A] font-semibold">
                    Front Desk Billing
                  </div>
                  <h3 className="text-lg font-serif font-bold text-white">
                    Walk-In Stay Folio
                  </h3>
                </div>
                <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-full text-[#B18A4A]">
                  INR (₹)
                </span>
              </div>

              {/* Breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-[#E6D9C5]/80">
                  <span>Room Charge ({numNights} Night{numNights > 1 ? 's' : ''})</span>
                  <span className="font-mono text-white font-semibold">₹{roomSubtotal.toLocaleString('en-IN')}</span>
                </div>

                {servicesSubtotal > 0 && (
                  <div className="flex justify-between items-center text-[#E6D9C5]/80">
                    <span>Add-on Services</span>
                    <span className="font-mono text-white font-semibold">₹{servicesSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Front Desk Discount</span>
                    <span className="font-mono font-semibold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[#E6D9C5]/80">
                  <span>Statutory GST ({taxPercentage}%)</span>
                  <span className="font-mono text-white font-semibold">₹{taxesInr.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-3 border-t border-[#3a2c1f] flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Total Payable</span>
                  <span className="text-xl font-bold font-mono text-[#B18A4A]">
                    ₹{totalAmountInr.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Settlement Section */}
              <div className="pt-4 border-t border-[#3a2c1f] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#B18A4A] uppercase tracking-wider">
                    Payment Collection Method *
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    Bill Total: ₹{totalAmountInr.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Strictly 3 counter options: CASH, UPI, CARD (Pay Later Removed) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      if (!amountPaid || amountPaid === '0') setAmountPaid(totalAmountInr.toString());
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-[#8D672F] text-white border-[#B18A4A] shadow-md ring-1 ring-amber-400/50'
                        : 'border-[#3a2c1f] bg-white/5 text-[#E6D9C5] hover:bg-white/10'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-amber-300" />
                    <span>CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('upi');
                      if (!amountPaid || amountPaid === '0') setAmountPaid(totalAmountInr.toString());
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'bg-[#8D672F] text-white border-[#B18A4A] shadow-md ring-1 ring-amber-400/50'
                        : 'border-[#3a2c1f] bg-white/5 text-[#E6D9C5] hover:bg-white/10'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-300" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('card');
                      if (!amountPaid || amountPaid === '0') setAmountPaid(totalAmountInr.toString());
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-[#8D672F] text-white border-[#B18A4A] shadow-md ring-1 ring-amber-400/50'
                        : 'border-[#3a2c1f] bg-white/5 text-[#E6D9C5] hover:bg-white/10'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-300" />
                    <span>CARD (POS)</span>
                  </button>
                </div>

                {/* Amount Collected Input */}
                <div>
                  <label className="block text-[11px] font-medium text-[#E6D9C5]/80 mb-1">
                    Amount Collected at Counter (₹) *
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border border-[#3a2c1f] bg-white/10 text-white font-mono text-sm outline-none focus:border-[#B18A4A]"
                  />
                </div>

                {/* CASH DYNAMIC PANEL */}
                {paymentMethod === 'cash' && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-amber-400/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">Counter Cash Register Collection</h4>
                          <p className="text-[10px] text-[#E6D9C5]/70">Collect physical Indian currency in front desk cash drawer</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">
                        ₹{paidAmountNum.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-[#E6D9C5]/80 uppercase block mb-1">
                          Cash Tendered by Guest (₹)
                        </label>
                        <input
                          type="number"
                          min={paidAmountNum}
                          value={cashTendered || ''}
                          onChange={(e) => setCashTendered(Number(e.target.value))}
                          placeholder="e.g. 2500"
                          className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#3a2c1f] bg-black/30 text-white outline-none focus:border-amber-400"
                        />
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setCashTendered(paidAmountNum)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-amber-200 cursor-pointer"
                          >
                            Exact ₹{paidAmountNum}
                          </button>
                          {paidAmountNum % 500 !== 0 && (
                            <button
                              type="button"
                              onClick={() => setCashTendered(Math.ceil(paidAmountNum / 500) * 500)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-amber-200 cursor-pointer"
                            >
                              ₹{Math.ceil(paidAmountNum / 500) * 500}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCashTendered(Math.ceil(paidAmountNum / 1000) * 1000)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-amber-200 cursor-pointer"
                          >
                            ₹{Math.ceil(paidAmountNum / 1000) * 1000}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#E6D9C5]/70 uppercase block">Change to Return to Guest:</span>
                          <span className={`text-base font-bold font-mono ${cashTendered >= paidAmountNum ? 'text-emerald-400' : 'text-stone-400'}`}>
                            ₹ {Math.max(0, cashTendered - paidAmountNum).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-300 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Ready to deposit ₹{paidAmountNum.toLocaleString('en-IN')} in cash register</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI DYNAMIC PANEL */}
                {paymentMethod === 'upi' && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-amber-400/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">Instant UPI & QR Code Collection</h4>
                          <p className="text-[10px] text-[#E6D9C5]/70">Guest scans dynamic QR via Google Pay, PhonePe, Paytm, or BHIM</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowUpiQr(!showUpiQr)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10 flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3 h-3 text-amber-300" />
                        <span>{showUpiQr ? 'Hide QR' : 'Show Dynamic QR'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      {showUpiQr && (
                        <div className="p-3 rounded-xl bg-black/40 border border-amber-400/30 flex flex-col items-center text-center">
                          <span className="text-[9px] uppercase font-bold text-amber-200/80 tracking-wider mb-1">
                            Scan to Pay ₹{paidAmountNum.toLocaleString('en-IN')}
                          </span>
                          <div className="bg-white p-2 rounded-xl shadow-md">
                            {upiQrDataUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={upiQrDataUrl}
                                alt="Sri Tayi Grand Front Desk UPI QR"
                                className="w-28 h-28 rounded-lg"
                              />
                            ) : (
                              <div className="w-28 h-28 flex items-center justify-center text-stone-500">
                                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-amber-200">
                            <span>UPI ID: <strong>sritayigrand@icici</strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText('sritayigrand@icici');
                                setUpiCopied(true);
                                setTimeout(() => setUpiCopied(false), 2000);
                              }}
                              className="p-1 rounded hover:bg-white/20 text-amber-300 transition-colors cursor-pointer"
                              title="Copy UPI ID"
                            >
                              {upiCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-[#E6D9C5]/80 uppercase block mb-1">
                            12-Digit UPI UTR / Transaction ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={upiUtr}
                            onChange={(e) => setUpiUtr(e.target.value)}
                            placeholder="e.g. 412890123456"
                            maxLength={22}
                            className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#3a2c1f] bg-black/30 text-white outline-none focus:border-amber-400"
                          />
                          <span className="text-[10px] text-[#E6D9C5]/60 mt-0.5 block">
                            Verify 12-digit UTR from guest PhonePe / GPay screen
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setUpiConfirmed(!upiConfirmed)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                            upiConfirmed
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{upiConfirmed ? '✓ UPI Payment Received & Verified' : 'Mark UPI Payment Verified'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD DYNAMIC PANEL */}
                {paymentMethod === 'card' && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-amber-400/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">Counter EDC POS Machine Terminal</h4>
                          <p className="text-[10px] text-[#E6D9C5]/70">Swipe, insert chip, or tap contactless card on reception terminal</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-400/30">
                        ₹{paidAmountNum.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-[#E6D9C5]/80 uppercase block mb-1">Card Network *</label>
                        <select
                          value={cardNetwork}
                          onChange={(e) => setCardNetwork(e.target.value)}
                          className="w-full text-xs font-bold p-2.5 rounded-lg border border-[#3a2c1f] bg-black/40 text-white outline-none focus:border-amber-400"
                        >
                          <option value="Visa">Visa Card</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="RuPay">RuPay (Domestic)</option>
                          <option value="Amex">American Express</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#E6D9C5]/80 uppercase block mb-1">Card Last 4 Digits</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={cardLast4}
                          onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 4242"
                          className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#3a2c1f] bg-black/40 text-white outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#E6D9C5]/80 uppercase block mb-1">POS Approval Auth Code</label>
                        <input
                          type="text"
                          value={cardAuthCode}
                          onChange={(e) => setCardAuthCode(e.target.value)}
                          placeholder="e.g. AUTH-88291"
                          className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#3a2c1f] bg-black/40 text-white outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/10">
                      <span className="text-[10px] text-[#E6D9C5]/70">
                        Charge <strong>₹{paidAmountNum.toLocaleString('en-IN')}</strong> on the EDC POS terminal and retain signed slip.
                      </span>
                      <button
                        type="button"
                        onClick={() => setCardConfirmed(!cardConfirmed)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          cardConfirmed
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-blue-500/20 text-blue-300 border-blue-400/40 hover:bg-blue-500/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{cardConfirmed ? '✓ Card Charge Authorized' : 'Mark POS Card Charge Authorized'}</span>
                      </button>
                    </div>
                  </div>
                )}
                {/* Instant Check-In Toggle */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="instantCheckIn"
                    checked={instantCheckIn}
                    onChange={(e) => setInstantCheckIn(e.target.checked)}
                    className="mt-0.5 accent-[#8D672F] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="instantCheckIn" className="text-xs text-[#E6D9C5] cursor-pointer">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Check In Immediately</span>
                    </span>
                    Assign Room #{selectedRoomNumber || '...'} as occupied now & register arrival timestamp.
                  </label>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting || !selectedRoomNumber}
                  className="w-full py-4 rounded-full bg-[#8D672F] hover:bg-[#B18A4A] disabled:opacity-50 text-white text-xs uppercase tracking-widest font-bold shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Allocating Room & Booking...</span>
                    </>
                  ) : (
                    <>
                      <span>{instantCheckIn ? 'Complete Walk-In & Check-In' : 'Confirm Walk-In Reservation'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Sticky Mobile Reception Action Bar (< lg) */}
      {!createdReservation && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-[#21180F]/95 backdrop-blur-md border-t border-[#3a2c1f] px-4 py-2.5 shadow-2xl safe-area-bottom">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#B18A4A] font-semibold">Total Folio</div>
              <div className="text-base font-serif font-bold text-white tabular-nums">
                ₹{totalAmountInr.toLocaleString('en-IN')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              disabled={submitting || !selectedRoomNumber}
              className="px-5 py-2.5 rounded-full bg-[#8D672F] active:bg-[#6D4E21] text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking In...</span>
                </>
              ) : (
                <>
                  <span>Check In #{selectedRoomNumber || '...'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reception Standee Generator Modal */}
      <ReceptionStandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
      />

      {/* Assign Room & Key Handover Modal (For live QR queue items) */}
      {selectedQueueItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6D9C5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D9C5]">
              <h3 className="font-serif font-bold text-base text-[#33271D] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#8D672F]" />
                <span>Assign Key: {selectedQueueItem.guest_name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedQueueItem(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8F3E9] p-3.5 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#786A5B]">Booking Ref:</span>
                <span className="font-mono font-bold text-[#33271D]">{selectedQueueItem.booking_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#786A5B]">Category:</span>
                <span className="font-bold text-[#8D672F]">{selectedQueueItem.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#786A5B]">Total Folio:</span>
                <span className="font-bold text-[#33271D]">₹{selectedQueueItem.total_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* PROMINENT GOVERNMENT ID STATUTORY CHECK IN MODAL */}
            <div className="bg-amber-50 rounded-2xl p-3.5 border-2 border-amber-300 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Statutory Government ID Proof ({selectedQueueItem.id_proof_type?.replace(/_/g, ' ').toUpperCase() || 'GOVT ID'})</span>
                </span>
                <span className="text-[10px] bg-amber-300 text-amber-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mandatory Verification
                </span>
              </div>
              <div className="font-mono font-black text-sm text-[#21180F] tracking-widest bg-white p-2.5 rounded-xl border border-amber-300 flex items-center justify-between">
                <span>{selectedQueueItem.id_proof_number || 'NO ID NUMBER RECORDED'}</span>
                <span className="text-[10px] font-sans font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Cross-verify with physical copy
                </span>
              </div>
            </div>

            <form onSubmit={handleAssignAndHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33271D] mb-1">
                  Select Available Clean Room:
                </label>
                <select
                  value={assignRoomNumber}
                  onChange={(e) => setAssignRoomNumber(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] bg-white focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                >
                  <option value="">-- Choose Physical Room --</option>
                  {physicalRooms
                    .filter((pr) => pr.operational_status === 'available' && pr.housekeeping_status === 'clean')
                    .map((pr) => (
                      <option key={pr.id} value={pr.room_number}>
                        Room {pr.room_number} (Floor {pr.floor_number} - {categories.find((c) => isCategoryMatch(c.id, pr.category_id))?.name || 'AC Room'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQueueItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#E6D9C5] text-xs font-semibold text-[#786A5B] hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningKey || !assignRoomNumber}
                  className="px-5 py-2.5 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{assigningKey ? 'Assigning...' : 'Hand Over Key'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
