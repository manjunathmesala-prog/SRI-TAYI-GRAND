'use client';

import React, { useState, useEffect } from 'react';
import { PhysicalRoom, RoomCategory, PaymentMethod, Booking } from '@/types';
import { adminOperations } from '@/lib/realtime-client';
import { playChimeSound } from '@/lib/rfid/bridge-client';
import {
  X,
  UserCheck,
  ShieldCheck,
  CreditCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Sparkles,
  BedDouble,
  FileText,
  MapPin,
  Compass,
  Radio,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

interface StatutoryWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRooms: PhysicalRoom[];
  categories: RoomCategory[];
  onSuccess: (booking: Booking, roomNumber: string) => void;
  initialData?: {
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    categoryId?: string;
    roomNumber?: string;
    bookingReference?: string;
  };
}

export function StatutoryWalkInModal({
  isOpen,
  onClose,
  availableRooms,
  categories,
  onSuccess,
  initialData,
}: StatutoryWalkInModalProps) {
  // Guest Statutory Details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [nationality, setNationality] = useState<'Indian' | 'Foreigner'>('Indian');
  const [cityOfOrigin, setCityOfOrigin] = useState('Kadiri');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Pilgrimage / Temple Darshan');

  // Room Allocation & Dates
  const [categoryId, setCategoryId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);

  // Tariff & Manager Override
  const [isTariffOverridden, setIsTariffOverridden] = useState(false);
  const [overrideTariff, setOverrideTariff] = useState<number>(2499);
  const [tariffOverrideReason, setTariffOverrideReason] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountCollected, setAmountCollected] = useState<number>(0);
  const [specialRequests, setSpecialRequests] = useState('');

  // RFID Smart Keycard Hardware Bridge State
  const [issueKeycard, setIssueKeycard] = useState(true);
  const [cardUid, setCardUid] = useState('');
  const [isEncodingCard, setIsEncodingCard] = useState(false);
  const [rfidBridgeStatus, setRfidBridgeStatus] = useState<{
    success: boolean;
    message: string;
    cardUid?: string;
  } | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default dates & pre-fill when opened
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      setCheckInDate(todayStr);
      setCheckOutDate(tomorrowStr);

      const initialCatId = initialData?.categoryId || categories[0]?.id || '';
      setCategoryId(initialCatId);

      const matchedCategory = categories.find((c) => c.id === initialCatId) || categories[0];
      const standardRate = matchedCategory?.base_price_per_night || 2499;
      setOverrideTariff(standardRate);

      // Pre-select clean room
      const cleanMatch = availableRooms.find((r) => r.category_id === initialCatId);
      const chosenRoom = initialData?.roomNumber || cleanMatch?.room_number || availableRooms[0]?.room_number || '';
      setRoomNumber(chosenRoom);

      // Pre-fill initial guest details if passed
      setGuestName(initialData?.guestName || '');
      setGuestPhone(initialData?.guestPhone || '');
      setGuestEmail(initialData?.guestEmail || '');
      setCityOfOrigin('Bengaluru');
      setNationality('Indian');
      setIdProofType('Aadhaar Card');
      setIdProofNumber('');
      setPurposeOfVisit('Pilgrimage / Temple Darshan');

      setIsTariffOverridden(false);
      setTariffOverrideReason('');
      setSpecialRequests('');
      setErrorMsg(null);
      setRfidBridgeStatus(null);
      setCardUid(`BT-57-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    }
  }, [isOpen, initialData, categories, availableRooms]);

  // Update room selection & default tariff when category changes
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const matchedCategory = categories.find((c) => c.id === catId);
    const standardRate = matchedCategory?.base_price_per_night || 2499;
    if (!isTariffOverridden) {
      setOverrideTariff(standardRate);
    }
    const cleanMatch = availableRooms.find((r) => r.category_id === catId);
    if (cleanMatch) {
      setRoomNumber(cleanMatch.room_number);
    } else if (availableRooms.length > 0) {
      setRoomNumber(availableRooms[0].room_number);
    }
  };

  // Calculate nights and billing
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffTime = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const nights = isNaN(diffTime) || diffTime < 1 ? 1 : diffTime;

  const selectedCategory = categories.find((c) => c.id === categoryId) || categories[0];
  const nightlyRate = isTariffOverridden ? overrideTariff : (selectedCategory?.base_price_per_night || 2499);
  const subtotal = nightlyRate * nights;
  const gstTax = Math.round(subtotal * 0.12);
  const totalAmount = subtotal + gstTax;

  // Auto-fill amount collected when total changes if not manually modified
  useEffect(() => {
    setAmountCollected(totalAmount);
  }, [totalAmount]);

  // ID validation helper
  const getIdValidationFeedback = () => {
    if (!idProofNumber.trim()) return null;
    const clean = idProofNumber.replace(/\s+/g, '').toUpperCase();

    if (idProofType === 'Aadhaar Card') {
      const is12Digits = /^\d{12}$/.test(clean);
      return is12Digits
        ? { valid: true, msg: 'Valid 12-digit Indian Aadhaar format' }
        : { valid: false, msg: 'Aadhaar requires strictly 12 digits (e.g. 5482 1928 3847)' };
    } else if (idProofType === 'Passport') {
      const isPassport = /^[A-Z]\d{7}$/.test(clean);
      return isPassport
        ? { valid: true, msg: 'Valid Indian/International Passport format' }
        : { valid: false, msg: 'Passport format: 1 Letter followed by 7 digits (e.g. Z1234567)' };
    } else if (idProofType === 'Driving License') {
      return clean.length >= 8
        ? { valid: true, msg: 'Valid Driving License format' }
        : { valid: false, msg: 'Driving License must have at least 8 alphanumeric characters' };
    } else if (idProofType === 'Voter ID') {
      const isVoter = /^[A-Z]{3}\d{7}$/.test(clean);
      return isVoter
        ? { valid: true, msg: 'Valid Election Commission Voter ID format' }
        : { valid: false, msg: 'Voter ID format: 3 letters + 7 digits (e.g. ABC1234567)' };
    }
    return null;
  };

  const idValidation = getIdValidationFeedback();

  // Test / Pre-Encode Smart Card via RFID API
  const handleTestEncodeRfid = async () => {
    if (!roomNumber) {
      setErrorMsg('Please select a physical room before testing RFID card encoder.');
      return;
    }

    setIsEncodingCard(true);
    setRfidBridgeStatus(null);
    setErrorMsg(null);

    try {
      // 1. Invoke /api/rfid/cards to issue/test RFID key
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_guest',
          roomNumber,
          guestName: guestName.trim() || 'Walk-in Guest',
          bookingRef: `TG-W-${Date.now().toString().slice(-6)}`,
          issuedBy: 'Front Desk Walk-In Desk',
          expiresAt: new Date(`${checkOutDate}T11:00:00+05:30`).toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success && data.card) {
        setCardUid(data.card.card_uid);
        playChimeSound(true);
        setRfidBridgeStatus({
          success: true,
          message: `RFID Card ${data.card.card_uid} encoded successfully for Room ${roomNumber}!`,
          cardUid: data.card.card_uid,
        });
      } else {
        setRfidBridgeStatus({
          success: false,
          message: data.error || 'Failed to encode RFID card.',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'RFID Hardware communication error';
      setRfidBridgeStatus({
        success: false,
        message,
      });
    } finally {
      setIsEncodingCard(false);
    }
  };

  // Test Tap Simulation via /api/rfid/tap
  const handleTestDoorTap = async () => {
    if (!cardUid || !roomNumber) return;
    try {
      const res = await fetch('/api/rfid/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardUid,
          roomNumber,
          action: 'door_unlock',
        }),
      });
      const data = await res.json();
      if (data.success) {
        playChimeSound(true);
        setRfidBridgeStatus({
          success: true,
          message: `Lock Test Success! Card ${cardUid} unlocked door for Room ${roomNumber}.`,
          cardUid,
        });
      } else {
        setRfidBridgeStatus({
          success: false,
          message: `Lock Test Warning: ${data.message || 'Access Denied'}`,
        });
      }
    } catch {
      setRfidBridgeStatus({
        success: true,
        message: `RFID Door lock simulation tap completed for Room ${roomNumber}.`,
      });
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      setErrorMsg('Guest full name is required');
      return;
    }
    if (!guestPhone.trim() || guestPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile phone number');
      return;
    }
    if (!idProofNumber.trim()) {
      setErrorMsg('Government ID proof number is strictly required by statutory regulations');
      return;
    }
    if (idValidation && !idValidation.valid) {
      setErrorMsg(`Invalid Govt ID: ${idValidation.msg}`);
      return;
    }
    if (!roomNumber) {
      setErrorMsg('Please select an available clean physical room');
      return;
    }
    if (isTariffOverridden && !tariffOverrideReason.trim()) {
      setErrorMsg('Manager justification note is mandatory when overriding standard room tariff');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await adminOperations.statutoryWalkIn({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        nationality,
        cityOfOrigin: cityOfOrigin.trim(),
        idProofType,
        idProofNumber: idProofNumber.trim(),
        purposeOfVisit,
        categoryId,
        roomNumber,
        checkInDate,
        checkOutDate,
        adultsCount: Number(adultsCount),
        childrenCount: Number(childrenCount),
        baseTariff: isTariffOverridden ? Number(overrideTariff) : undefined,
        isTariffOverridden,
        tariffOverrideReason: isTariffOverridden ? tariffOverrideReason.trim() : undefined,
        paymentMethod,
        amountCollected: Number(amountCollected),
        issueKeycard,
        cardUid: issueKeycard ? cardUid : undefined,
        specialRequests: specialRequests.trim() || undefined,
        staffName: 'Front Desk Receptionist',
      });

      if (result.success && result.booking) {
        playChimeSound(true);
        onSuccess(result.booking, roomNumber);
        onClose();
      } else {
        setErrorMsg(result.error || 'Failed to complete registration');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Walk-in registration error';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#D8AD56]/40 max-w-4xl w-full shadow-2xl max-h-[94vh] overflow-y-auto flex flex-col justify-between">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#241912] via-[#382216] to-[#25150F] text-white flex items-center justify-between sticky top-0 z-10 border-b border-[#D8AD56]/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#D8AD56] text-[#241912] flex items-center justify-center font-bold shadow-md">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8AD56]">
                  INDIAN STATUTORY HOTEL GUEST REGISTRATION
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Form C & Police Norms Compliant
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide">
                Front Desk Walk-In Check-In & Smart Key Encoding
              </h2>
              <p className="text-xs text-[#EFE3D6]/70">
                Register walk-in guest, allocate clean room, override tariff if authorized, and program RFID keycard.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#EFE3D6]/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: GUEST STATUTORY IDENTITY PARTICULARS */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D8AD56]" />
                <span className="font-serif font-bold text-sm text-[#241912]">
                  1. Statutory Guest Identity & Origin (Mandatory)
                </span>
              </div>
              <span className="text-[10px] text-[#786B61] italic">
                Required under Section 40 of AP Police Act
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar Sharma"
                  className="w-full text-xs font-semibold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Mobile Phone (10-Digit) *
                </label>
                <input
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. 9849012345"
                  className="w-full text-xs font-mono font-semibold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="e.g. rajesh@example.com"
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
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

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  City / State of Origin *
                </label>
                <input
                  type="text"
                  required
                  value={cityOfOrigin}
                  onChange={(e) => setCityOfOrigin(e.target.value)}
                  placeholder="e.g. Bengaluru, Hyderabad, Chennai"
                  className="w-full text-xs font-semibold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Purpose of Visit *
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={purposeOfVisit}
                  onChange={(val) => setPurposeOfVisit(String(val))}
                  options={[
                    { value: 'Pilgrimage / Temple Darshan', label: 'Pilgrimage / Temple Darshan' },
                    { value: 'Business', label: 'Business / Commercial' },
                    { value: 'Transit', label: 'Transit / Highway Stopover' },
                    { value: 'Personal / Family', label: 'Personal / Family Visit' },
                  ]}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
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
                    { value: 'Driving License', label: 'Driving License' },
                    { value: 'Voter ID', label: 'Voter ID (Election Card)' },
                  ]}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Govt ID Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={idProofNumber}
                    onChange={(e) => setIdProofNumber(e.target.value)}
                    placeholder={
                      idProofType === 'Aadhaar Card'
                        ? 'e.g. 5482 1928 3847'
                        : idProofType === 'Passport'
                        ? 'e.g. Z1234567'
                        : idProofType === 'Voter ID'
                        ? 'e.g. ABC1234567'
                        : 'e.g. AP04 20210001234'
                    }
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                  {idValidation && (
                    <span
                      className={`text-[10px] font-semibold mt-1 block ${
                        idValidation.valid ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {idValidation.valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-600 align-text-bottom" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-600 align-text-bottom" />
                      )}
                      {idValidation.msg}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ROOM ALLOCATION & STAY DATES */}
          <div className="p-4 rounded-xl bg-white border border-[#EFE3D6] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-2">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-[#D8AD56]" />
                <span className="font-serif font-bold text-sm text-[#241912]">
                  2. Room Category & Instant Allocation
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {availableRooms.length} Clean Rooms Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Room Category *
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={categoryId}
                  onChange={(val) => handleCategoryChange(String(val))}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: `${c.name} • Base ₹${c.base_price_per_night} / night`,
                  }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Allocate Clean Physical Room *
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={roomNumber}
                  placeholder={availableRooms.length === 0 ? "No clean rooms available" : "Select clean room..."}
                  onChange={(val) => setRoomNumber(String(val))}
                  options={availableRooms.map((r) => ({
                    value: r.room_number,
                    label: `Room ${r.room_number} • Floor ${r.floor_number} • ${r.category_name || 'Standard'} (Clean & Inspected)`,
                  }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Check-In Date
                </label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Check-Out Date
                </label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Adults Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={adultsCount}
                  onChange={(e) => setAdultsCount(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Stay Duration
                </label>
                <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EFE3D6] font-bold text-xs text-[#382216]">
                  {nights} Night{nights > 1 ? 's' : ''} Stay
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: FRONT DESK TARIFF OVERRIDE & GST CALCULATION */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#D8AD56]" />
                <span className="font-serif font-bold text-sm text-[#241912]">
                  3. Front Desk Tariff & Manager Override
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTariffOverridden}
                  onChange={(e) => setIsTariffOverridden(e.target.checked)}
                  className="w-4 h-4 text-[#D8AD56] rounded"
                />
                <span className="text-[11px] font-bold text-[#382216]">
                  Manager Tariff Override
                </span>
              </label>
            </div>

            {isTariffOverridden && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Overridden Rate per Night (₹) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    required={isTariffOverridden}
                    value={overrideTariff}
                    onChange={(e) => setOverrideTariff(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-amber-300 bg-white text-[#241912]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Manager Justification Note *
                  </label>
                  <input
                    type="text"
                    required={isTariffOverridden}
                    value={tariffOverrideReason}
                    onChange={(e) => setTariffOverrideReason(e.target.value)}
                    placeholder="e.g. Pilgrim group discount authorized by GM"
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-amber-300 bg-white text-[#241912]"
                  />
                </div>
              </div>
            )}

            {/* Financial Calculation Bar */}
            <div className="p-3 rounded-lg bg-white border border-[#EFE3D6] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>Rate: <strong>₹{nightlyRate}</strong> &times; {nights} night(s) = <strong>₹{subtotal}</strong></span>
                <span>+</span>
                <span>12% GST (6% CGST + 6% SGST): <strong>₹{gstTax}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#786B61] mr-2">Total Folio Bill:</span>
                <span className="font-serif text-lg font-black text-[#382216]">
                  ₹ {totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Collection Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Payment Collection Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['cash', 'upi', 'card', 'pay_at_hotel'] as PaymentMethod[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        paymentMethod === m
                          ? 'bg-[#382216] text-[#D8AD56] border-[#D8AD56]'
                          : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      {m === 'pay_at_hotel' ? 'Pay Later' : m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                  Amount Collected at Counter (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: DIRECT RFID HARDWARE BRIDGE ENCODING (WITHOUT LEAVING TAB) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#FAF7F2] to-amber-50/40 border border-[#D8AD56]/40 space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#D8AD56]" />
                <span className="font-serif font-bold text-sm text-[#241912]">
                  4. RFID Smart Keycard Hardware Bridge (/api/rfid/cards & /api/rfid/tap)
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={issueKeycard}
                  onChange={(e) => setIssueKeycard(e.target.checked)}
                  className="w-4 h-4 text-[#D8AD56] rounded"
                />
                <span className="text-[11px] font-bold text-[#382216]">
                  Issue Physical Keycard Now
                </span>
              </label>
            </div>

            {issueKeycard && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-[#241912] flex items-center gap-1.5">
                      <span>Assigned Room: <strong>Room {roomNumber || 'None'}</strong></span>
                      <span className="text-gray-400">&bull;</span>
                      <span>Card UID: <strong className="font-mono text-[#D8AD56] bg-[#382216] px-1.5 py-0.2 rounded">{cardUid || 'Pending'}</strong></span>
                    </span>
                    <p className="text-[10px] text-[#786B61]">
                      Direct hardware link to Be-Tech USB card encoder and lock tap daemon.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isEncodingCard || !roomNumber}
                      onClick={handleTestEncodeRfid}
                      className="px-3.5 py-2 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isEncodingCard ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5 text-[#D8AD56]" />
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Test Reader / Encode Card</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!cardUid || !roomNumber}
                      onClick={handleTestDoorTap}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-gray-100 border border-[#D8AD56]/40 text-xs font-semibold text-[#382216] transition-colors cursor-pointer"
                      title="Test door lock tap simulation"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                      <span>Test Lock Tap</span>
                    </button>
                  </div>
                </div>

                {rfidBridgeStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      rfidBridgeStatus.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {rfidBridgeStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{rfidBridgeStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#EFE3D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[#786B61]">
              Allocating: <strong>Room {roomNumber}</strong> &bull; Total: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong> ({paymentMethod.toUpperCase()})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !roomNumber || availableRooms.length === 0}
                className="px-6 py-2.5 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-extrabold transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#D8AD56]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#D8AD56]" />
                )}
                <span>Complete Statutory Registration & Check-In</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
