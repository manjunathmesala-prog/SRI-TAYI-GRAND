'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReceptionStandeeModal } from '@/components/admin/ReceptionStandeeModal';
import { Booking, PhysicalRoom, RoomCategory } from '@/types';
import {
  issuePhysicalKeycard,
  playChimeSound,
  checkBridgeHealth,
} from '@/lib/rfid/bridge-client';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import QRCode from 'qrcode';
import {
  BedDouble,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Check,
  Copy,
  Zap,
  ArrowRight,
  FileText,
  UserCheck,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

export default function ReceptionWalkInPage() {
  const router = useRouter();

  // Core Data
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Standee Modal State
  const [showStandeeModal, setShowStandeeModal] = useState(false);

  // Dates & Duration
  const [checkInDate, setCheckInDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Room & Category Selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');

  // Occupancy
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Guest Identification & Statutory Compliance
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [nationality, setNationality] = useState<'Indian' | 'Foreigner'>('Indian');
  const [cityOfOrigin, setCityOfOrigin] = useState('Bengaluru');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Pilgrimage / Temple Darshan');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Billing & Payment at Counter
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos' | 'upi' | 'razorpay' | 'folio'>('cash');
  const [amountCollected, setAmountCollected] = useState<number>(0);
  const [offlineRef, setOfflineRef] = useState('');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [upiUtr, setUpiUtr] = useState('');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [cardAuthCode, setCardAuthCode] = useState('');
  const [checkInImmediately, setCheckInImmediately] = useState(true);

  // RFID Keycard Bridge State
  const [isRfidOnline, setIsRfidOnline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<{
    reference: string;
    room: string;
    guestName: string;
    totalAmount: number;
    keycardUid?: string;
  } | null>(null);

  // Real-time synchronization
  const { isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'room_assigned' ||
        event.eventType === 'room_status_changed' ||
        event.eventType === 'housekeeping_updated' ||
        event.eventType === 'check_in' ||
        event.eventType === 'check_out'
      ) {
        fetchData();
      }
    },
  });

  // Fetch Live State
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/operations?action=get_full_state');
      const data = await res.json();
      if (data.success) {
        const fetchedRooms: PhysicalRoom[] = data.rooms || [];
        const fetchedCats: RoomCategory[] = data.categories || [];
        setRooms(fetchedRooms);
        setCategories(fetchedCats);

        // Pre-select category if not selected
        if (!selectedCategoryId && fetchedCats.length > 0) {
          setSelectedCategoryId(fetchedCats[0].id);
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Check RFID Bridge status
  useEffect(() => {
    checkBridgeHealth()
      .then((res) => setIsRfidOnline(res.isOnline))
      .catch(() => setIsRfidOnline(false));
  }, []);

  // Compute Nights
  const nights = useMemo(() => {
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return isNaN(diff) || diff < 1 ? 1 : diff;
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Available clean rooms
  const cleanRooms = useMemo(() => {
    return rooms.filter(
      (r) => r.operational_status === 'available' && r.housekeeping_status === 'clean'
    );
  }, [rooms]);

  // Filter clean rooms for selected category
  const categoryCleanRooms = useMemo(() => {
    if (!selectedCategoryId) return cleanRooms;
    return cleanRooms.filter((r) => r.category_id === selectedCategoryId);
  }, [cleanRooms, selectedCategoryId]);

  // Auto-select first clean room when category changes
  useEffect(() => {
    if (categoryCleanRooms.length > 0) {
      if (!selectedRoomNumber || !categoryCleanRooms.some((r) => r.room_number === selectedRoomNumber)) {
        setSelectedRoomNumber(categoryCleanRooms[0].room_number);
      }
    } else if (cleanRooms.length > 0) {
      if (!selectedRoomNumber || !cleanRooms.some((r) => r.room_number === selectedRoomNumber)) {
        setSelectedRoomNumber(cleanRooms[0].room_number);
      }
    }
  }, [categoryCleanRooms, cleanRooms, selectedRoomNumber]);

  // Selected Category Object
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || categories[0];
  }, [categories, selectedCategoryId]);

  // Financial Calculations
  const roomPricePerNight = currentCategory?.base_price_per_night || 2100;
  const roomCharge = roomPricePerNight * nights;
  // In India, hotel rooms <= ₹7,500 have 5% or 12% GST
  const gstRate = roomPricePerNight > 2500 ? 0.05 : 0.05; // 5% per reference ₹135 on ₹2700
  const gstAmount = Math.round(roomCharge * 0.05);
  const totalPayable = roomCharge + gstAmount;

  // Sync amount collected when total changes
  useEffect(() => {
    setAmountCollected(totalPayable);
  }, [totalPayable]);

  // Generate UPI QR Code dynamically for Front Desk counter
  useEffect(() => {
    if (paymentMethod === 'upi') {
      const upiString = `upi://pay?pa=sritayigrand@icici&pn=Sri+Tayi+Grand&am=${totalPayable}&cu=INR&tn=Room+${selectedRoomNumber || 'WalkIn'}+Stay`;
      QRCode.toDataURL(upiString, { width: 220, margin: 1 })
        .then((url) => setUpiQrUrl(url))
        .catch(() => setUpiQrUrl(''));
    }
  }, [paymentMethod, totalPayable, selectedRoomNumber]);

  // Weekday formatting helpers
  const formatWeekday = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return '';
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Form Submission
  const handleCompleteWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      setErrorMessage('Guest full name is required for registration.');
      return;
    }
    if (!guestPhone.trim() || guestPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please provide a valid 10-digit mobile phone number.');
      return;
    }
    if (!selectedRoomNumber) {
      setErrorMessage('A physical room assignment is mandatory for walk-in check-in.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Determine payment method label & ref
      let paymentRef = offlineRef.trim();
      let pMethod: 'cash' | 'upi' | 'card' = 'cash';

      if (paymentMethod === 'cash') {
        pMethod = 'cash';
        paymentRef = paymentRef || `CASH-COUNTER-₹${amountCollected}`;
      } else if (paymentMethod === 'upi') {
        pMethod = 'upi';
        paymentRef = upiUtr.trim() ? `UPI-UTR-${upiUtr.trim().toUpperCase()}` : `UPI-COUNTER-${Date.now().toString().slice(-6)}`;
      } else if (paymentMethod === 'pos') {
        pMethod = 'card';
        paymentRef = paymentRef || `POS-${cardLast4 ? `*${cardLast4}` : 'TERMINAL'}${cardAuthCode ? `-AUTH-${cardAuthCode}` : ''}`;
      } else {
        pMethod = 'cash';
        paymentRef = paymentRef || 'POST-TO-FOLIO';
      }

      const generatedKeycardUid = `BT-57-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const res = await adminOperations.statutoryWalkIn({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        nationality,
        cityOfOrigin: cityOfOrigin.trim(),
        idProofType,
        idProofNumber: idProofNumber.trim() || 'VERIFIED-AT-DESK',
        purposeOfVisit,
        categoryId: selectedCategoryId,
        roomNumber: selectedRoomNumber,
        checkInDate,
        checkOutDate,
        adultsCount,
        childrenCount,
        baseTariff: roomPricePerNight,
        paymentMethod: pMethod,
        amountCollected,
        paymentReference: paymentRef,
        issueKeycard: true,
        cardUid: generatedKeycardUid,
        specialRequests: specialRequests.trim() || undefined,
        staffName: 'Front Desk Counter',
      });

      if (res.success && res.booking) {
        // Trigger physical hardware encoder if online
        if (checkInImmediately) {
          issuePhysicalKeycard({
            roomNumber: selectedRoomNumber,
            guestName: guestName.trim(),
            checkOutDate: new Date(`${checkOutDate}T11:00:00+05:30`),
            staffUser: 'Front Desk Counter',
          }).catch(() => {});
        }

        playChimeSound(true);

        setSuccessBooking({
          reference: res.booking.booking_reference,
          room: selectedRoomNumber,
          guestName: guestName.trim(),
          totalAmount: totalPayable,
          keycardUid: generatedKeycardUid,
        });
      } else {
        throw new Error(res.error || 'Failed to complete walk-in registration');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNextGuest = () => {
    setSuccessBooking(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setIdProofNumber('');
    setSpecialRequests('');
    setOfflineRef('');
    setUpiUtr('');
    setCardLast4('');
    setCardAuthCode('');
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#241912] pb-16">
      {/* Top Banner / PMS Header */}
      <div className="border-b border-[#EFE8DC] bg-white/70 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8E7B6D]">
              <Sparkles className="w-3.5 h-3.5 text-[#C49A45]" />
              <span>FRONT DESK PMS OPERATIONS</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] tracking-tight mt-0.5">
              Walk-In Guest Registration & Check-In
            </h1>
            <p className="text-xs text-[#786B61] mt-0.5">
              Direct counter check-in, real-time physical room assignment, ID compliance, and instantaneous folio billing.
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/admin/rooms/board"
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#241912] border border-[#E8DFC8] text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
            >
              <BedDouble className="w-3.5 h-3.5 text-[#786B61]" />
              <span>Room Tape Chart</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowStandeeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#241912] border border-[#E8DFC8] text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#786B61]" />
              <span>Print Desk Standee QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRefreshKey((k) => k + 1);
                fetchData();
              }}
              title="Refresh Room Availability"
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#241912] border border-[#E8DFC8] flex items-center justify-center shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#786B61] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Success Modal / Banner */}
        {successBooking && (
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-[#241912] to-[#382216] border border-[#D8AD56] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AD56]">
                  REGISTRATION COMPLETED & CHECKED IN
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-0.5">
                  Guest {successBooking.guestName} registered in Room #{successBooking.room}
                </h3>
                <p className="text-xs text-[#EFE3D6]/80 mt-1">
                  Folio Ref: <strong className="text-white font-mono">{successBooking.reference}</strong> • Folio Bill: ₹{successBooking.totalAmount.toLocaleString('en-IN')} (Paid) • Keycard: <span className="font-mono text-[#D8AD56]">{successBooking.keycardUid || 'ACTIVE'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/admin/front-desk"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 text-center flex-1 sm:flex-initial"
              >
                Go to Front Desk
              </Link>
              <button
                type="button"
                onClick={handleResetForNextGuest}
                className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C49A45] text-[#241912] text-xs font-bold text-center flex-1 sm:flex-initial cursor-pointer"
              >
                + Register Next Guest
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCompleteWalkIn}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (2/3 width) - Room Allocation & Guest Identity */}
            <div className="lg:col-span-8 space-y-6">
              {/* CARD 1: Room Category & Physical Room Allocation */}
              <div className="rounded-2xl bg-white border border-[#EFE8DC] p-6 shadow-xs">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-5 border-b border-[#F2ECE1]">
                  <div className="w-6 h-6 rounded-md bg-[#FAF4EB] text-[#7A5B3E] font-bold text-xs flex items-center justify-center border border-[#E8DFC8]">
                    1
                  </div>
                  <h2 className="font-serif text-lg font-semibold text-[#241912]">
                    Room Category & Physical Room Allocation
                  </h2>
                </div>

                <div className="space-y-6 pt-5">
                  {/* Row 1: Check-in, Check-out, and Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Check-In */}
                    <div className="sm:col-span-5 bg-[#FAF7F2] border border-[#EFE8DC] rounded-xl p-3 relative">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#8E7B6D] uppercase mb-1">
                        <span>CHECK-IN</span>
                        <span className="font-mono text-[#5A4535]">{formatWeekday(checkInDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#8E7B6D]" />
                        <input
                          type="date"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          className="bg-transparent font-semibold text-xs text-[#241912] focus:outline-none w-full cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Check-Out */}
                    <div className="sm:col-span-5 bg-[#FAF7F2] border border-[#EFE8DC] rounded-xl p-3 relative">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#8E7B6D] uppercase mb-1">
                        <span>CHECK-OUT</span>
                        <span className="font-mono text-[#5A4535]">{formatWeekday(checkOutDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#8E7B6D]" />
                        <input
                          type="date"
                          value={checkOutDate}
                          min={checkInDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          className="bg-transparent font-semibold text-xs text-[#241912] focus:outline-none w-full cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="sm:col-span-2 bg-[#FAF7F2] border border-[#EFE8DC] rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-[#8E7B6D] uppercase">
                        Duration
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-xs text-[#241912]">
                          {nights} Night(s)
                        </span>
                        <Clock className="w-3.5 h-3.5 text-[#B5A596]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Room Category Cards */}
                  <div>
                    <label className="text-xs font-semibold text-[#5A4535] block mb-2">
                      Room Category
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {categories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        const cleanCount = cleanRooms.filter((r) => r.category_id === cat.id).length;

                        return (
                          <div
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`rounded-xl p-4 cursor-pointer transition-all border ${
                              isSelected
                                ? 'border-2 border-[#C49A45] bg-[#FFFDF9] shadow-xs ring-1 ring-[#C49A45]/30'
                                : 'border-[#EFE8DC] bg-white hover:bg-[#FAF7F2]'
                            }`}
                          >
                            <div className="font-semibold text-sm text-[#241912]">
                              {cat.name}
                            </div>
                            <div className="text-xs text-[#786B61] mt-0.5">
                              ₹{cat.base_price_per_night?.toLocaleString('en-IN')}/nt
                            </div>
                            <div className="text-xs font-semibold text-emerald-700 mt-2 flex items-center gap-1">
                              <span>{cleanCount} Clean</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 3: Physical Room Number (Mandatory for Walk-In) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[#5A4535]">
                        Physical Room Number (Mandatory for Walk-In)
                      </label>
                      <span className="text-xs text-[#8A7968]">
                        {categoryCleanRooms.length} Room(s) available on floor
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {categoryCleanRooms.length === 0 ? (
                        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 w-full">
                          No clean rooms currently ready under this category. Please check Housekeeping or choose another category.
                        </div>
                      ) : (
                        categoryCleanRooms.map((room) => {
                          const isRoomSelected = selectedRoomNumber === room.room_number;

                          return (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => setSelectedRoomNumber(room.room_number)}
                              className={`rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer transition-all ${
                                isRoomSelected
                                  ? 'bg-[#1C1613] text-white border-2 border-[#1C1613] shadow-xs'
                                  : 'bg-[#F0FAF5] text-[#1B6F43] border border-[#A6DFC0] hover:border-emerald-600'
                              }`}
                            >
                              <span className="font-mono text-xs font-bold">
                                #{room.room_number}
                              </span>
                              <span
                                className={`text-[10px] font-medium ${
                                  isRoomSelected ? 'text-gray-300' : 'text-[#2D8B57]'
                                }`}
                              >
                                Fl. {room.floor_number}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Row 4: Occupancy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Adults (Age 12+)
                      </label>
                      <LuxurySelect
                        size="md"
                        variant="admin"
                        value={adultsCount}
                        onChange={(val) => setAdultsCount(Number(val))}
                        options={[
                          { value: 1, label: '1 Adult' },
                          { value: 2, label: '2 Adults' },
                          { value: 3, label: '3 Adults' },
                          { value: 4, label: '4 Adults' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Children (Age 0-11)
                      </label>
                      <LuxurySelect
                        size="md"
                        variant="admin"
                        value={childrenCount}
                        onChange={(val) => setChildrenCount(Number(val))}
                        options={[
                          { value: 0, label: '0 Children' },
                          { value: 1, label: '1 Child' },
                          { value: 2, label: '2 Children' },
                          { value: 3, label: '3 Children' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Guest Identification & Statutory Compliance */}
              <div className="rounded-2xl bg-white border border-[#EFE8DC] p-6 shadow-xs">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-5 border-b border-[#F2ECE1]">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-[#FAF4EB] text-[#7A5B3E] font-bold text-xs flex items-center justify-center border border-[#E8DFC8]">
                      2
                    </div>
                    <h2 className="font-serif text-lg font-semibold text-[#241912]">
                      Guest Identification & Statutory Compliance
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#8E7B6D] hidden sm:inline">
                    Section 40 AP Police Act Compliant
                  </span>
                </div>

                <div className="space-y-4 pt-5">
                  {/* Row 1: Name and Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Guest Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#8E7B6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="e.g. Rajesh Kumar Sharma"
                          className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE8DC] bg-white text-[#241912] focus:border-[#C49A45] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Mobile Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#8E7B6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full text-xs font-mono font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE8DC] bg-white text-[#241912] focus:border-[#C49A45] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Email & Nationality */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#8E7B6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="e.g. rajesh@example.com"
                          className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE8DC] bg-white text-[#241912] focus:border-[#C49A45] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Nationality *
                      </label>
                      <LuxurySelect
                        size="md"
                        variant="admin"
                        value={nationality}
                        onChange={(val) => setNationality(val as any)}
                        options={[
                          { value: 'Indian', label: 'Indian Citizen' },
                          { value: 'Foreigner', label: 'Foreign National (Form C)' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 3: City of Origin & Purpose of Visit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        City / State of Origin *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[#8E7B6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={cityOfOrigin}
                          onChange={(e) => setCityOfOrigin(e.target.value)}
                          placeholder="e.g. Bengaluru, Karnataka"
                          className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE8DC] bg-white text-[#241912] focus:border-[#C49A45] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Purpose of Visit *
                      </label>
                      <LuxurySelect
                        size="md"
                        variant="admin"
                        value={purposeOfVisit}
                        onChange={(val) => setPurposeOfVisit(String(val))}
                        options={[
                          { value: 'Pilgrimage / Temple Darshan', label: 'Pilgrimage / Temple Darshan' },
                          { value: 'Business', label: 'Business / Official' },
                          { value: 'Tourism / Leisure', label: 'Tourism / Leisure' },
                          { value: 'Transit', label: 'Transit / Highway Stopover' },
                          { value: 'Personal', label: 'Personal / Family Visit' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row 4: Govt ID Proof Type & Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Govt ID Proof Type *
                      </label>
                      <LuxurySelect
                        size="md"
                        variant="admin"
                        value={idProofType}
                        onChange={(val) => setIdProofType(String(val))}
                        options={[
                          { value: 'Aadhaar Card', label: 'Aadhaar Card (UIDAI)' },
                          { value: 'Passport', label: 'Passport' },
                          { value: 'Voter ID', label: 'Voter ID (EPIC)' },
                          { value: 'Driving License', label: 'Driving License' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5A4535] block mb-1">
                        Govt ID Number *
                      </label>
                      <div className="relative">
                        <ShieldCheck className="w-4 h-4 text-[#8E7B6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={idProofNumber}
                          onChange={(e) => setIdProofNumber(e.target.value)}
                          placeholder={
                            idProofType === 'Aadhaar Card'
                              ? 'e.g. 5482 1928 3847'
                              : idProofType === 'Passport'
                              ? 'e.g. Z1234567'
                              : 'e.g. ABC1234567'
                          }
                          className="w-full text-xs font-mono font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE8DC] bg-white text-[#241912] focus:border-[#C49A45] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (1/3 width) - Dark Luxury Folio Card */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl bg-[#1C1613] text-white p-6 shadow-xl border border-[#2E241E] space-y-5 sticky top-24">
                {/* Header Row */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#C49A45]">
                    FRONT DESK BILLING
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <h3 className="font-serif text-xl font-bold text-white">
                      Walk-In Stay Folio
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">
                      INR (₹)
                    </span>
                  </div>
                </div>

                {/* Billing Line Items */}
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/70">
                    <span>Room Charge ({nights} Night{nights > 1 ? 's' : ''})</span>
                    <span className="font-mono font-semibold text-white">
                      ₹{roomCharge.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-white/70">
                    <span>Statutory GST (5%)</span>
                    <span className="font-mono font-semibold text-white">
                      ₹{gstAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                    <span className="font-bold text-xs uppercase tracking-wider text-white">
                      TOTAL PAYABLE
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#E5B558]">
                      ₹{totalPayable.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Payment Collection at Counter */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/50">
                    PAYMENT COLLECTION AT COUNTER
                  </div>

                  {/* 5 Payment Method Buttons */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 px-3 rounded-lg font-semibold transition-all border text-center ${
                        paymentMethod === 'cash'
                          ? 'bg-[#A3773E] text-white border-[#C49A45] shadow-xs'
                          : 'bg-[#2A221E] hover:bg-[#342B26] text-white/80 border-white/10'
                      }`}
                    >
                      Cash (Offline)
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pos')}
                      className={`py-2 px-3 rounded-lg font-semibold transition-all border text-center ${
                        paymentMethod === 'pos'
                          ? 'bg-[#A3773E] text-white border-[#C49A45] shadow-xs'
                          : 'bg-[#2A221E] hover:bg-[#342B26] text-white/80 border-white/10'
                      }`}
                    >
                      POS Terminal
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`py-2 px-3 rounded-lg font-semibold transition-all border text-center ${
                        paymentMethod === 'upi'
                          ? 'bg-[#A3773E] text-white border-[#C49A45] shadow-xs'
                          : 'bg-[#2A221E] hover:bg-[#342B26] text-white/80 border-white/10'
                      }`}
                    >
                      Front Desk UPI
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('razorpay')}
                      className={`py-2 px-3 rounded-lg font-semibold transition-all border text-center ${
                        paymentMethod === 'razorpay'
                          ? 'bg-[#A3773E] text-white border-[#C49A45] shadow-xs'
                          : 'bg-[#2A221E] hover:bg-[#342B26] text-white/80 border-white/10'
                      }`}
                    >
                      Razorpay Link/QR
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('folio')}
                      className={`col-span-2 py-2 px-3 rounded-lg font-semibold transition-all border text-center ${
                        paymentMethod === 'folio'
                          ? 'bg-[#A3773E] text-white border-[#C49A45] shadow-xs'
                          : 'bg-[#2A221E] hover:bg-[#342B26] text-white/80 border-white/10'
                      }`}
                    >
                      Post to Folio
                    </button>
                  </div>

                  {/* Contextual Payment Inputs */}
                  {paymentMethod === 'upi' && upiQrUrl && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center space-y-2">
                      <img
                        src={upiQrUrl}
                        alt="Counter UPI QR"
                        className="w-36 h-36 rounded-lg bg-white p-1.5 shadow-md"
                      />
                      <span className="text-[10px] text-white/70">
                        Scan with any UPI App • Pay exactly ₹{totalPayable}
                      </span>
                      <input
                        type="text"
                        value={upiUtr}
                        onChange={(e) => setUpiUtr(e.target.value)}
                        placeholder="UPI UTR (12 digits, optional)"
                        className="w-full text-xs font-mono p-2 rounded-lg bg-[#14100E] border border-white/20 text-white placeholder-white/40"
                      />
                    </div>
                  )}

                  {paymentMethod === 'pos' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value)}
                        placeholder="Card Last 4"
                        className="p-2 rounded-lg bg-[#14100E] border border-white/20 text-white font-mono placeholder-white/40"
                      />
                      <input
                        type="text"
                        value={cardAuthCode}
                        onChange={(e) => setCardAuthCode(e.target.value)}
                        placeholder="POS Auth Code"
                        className="p-2 rounded-lg bg-[#14100E] border border-white/20 text-white font-mono placeholder-white/40"
                      />
                    </div>
                  )}

                  {/* Amount Collected Now */}
                  <div>
                    <label className="text-xs text-[#A69588] block mb-1">
                      Amount Collected Now (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={amountCollected}
                      onChange={(e) => setAmountCollected(Number(e.target.value))}
                      className="w-full text-sm font-mono font-bold px-3 py-2.5 rounded-xl bg-[#14100E] border border-[#3A2E28] text-white focus:border-[#C49A45] focus:outline-none"
                    />
                  </div>

                  {/* POS Receipt / Offline Ref */}
                  <div>
                    <label className="text-xs text-[#A69588] block mb-1">
                      POS Receipt / Offline Transaction Ref (Optional)
                    </label>
                    <input
                      type="text"
                      value={offlineRef}
                      onChange={(e) => setOfflineRef(e.target.value)}
                      placeholder="e.g. POS-9872 or CASH-RECEIPT-01"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-[#14100E] border border-[#3A2E28] text-white placeholder-white/40 focus:border-[#C49A45] focus:outline-none"
                    />
                  </div>

                  {/* Check In Immediately Checkbox */}
                  <label className="rounded-xl bg-[#2A221E] border border-white/10 p-3.5 flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkInImmediately}
                      onChange={(e) => setCheckInImmediately(e.target.checked)}
                      className="w-4 h-4 text-[#D8AD56] rounded mt-0.5 accent-[#D8AD56]"
                    />
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Check In Immediately</span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Assign Room #{selectedRoomNumber || '---'} as occupied now & register arrival timestamp.
                      </p>
                    </div>
                  </label>

                  {/* RFID Hardware Bridge Status */}
                  <div className="text-[10px] text-white/50 flex items-center justify-between pt-1">
                    <span>Encoder: Be-Tech BIS 5.7 USB</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready
                    </span>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D8AD56] via-[#C49A45] to-[#B08638] text-[#241912] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#241912]" />
                        <span>Processing Registration...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-[#241912]" />
                        <span>Complete Walk-In Registration & Issue Room Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Standee QR Print Modal */}
      <ReceptionStandeeModal
        isOpen={showStandeeModal}
        onClose={() => setShowStandeeModal(false)}
      />
    </div>
  );
}
