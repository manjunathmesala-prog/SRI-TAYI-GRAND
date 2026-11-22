'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Booking, PhysicalRoom, PaymentMethod, PricingMode } from '@/types';
import { adminOperations } from '@/lib/realtime-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import {
  X,
  CalendarPlus,
  Calendar,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  QrCode,
  ShieldAlert,
  ArrowRightLeft,
  Info,
  Tag,
  Receipt,
  User,
  BedDouble,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

interface ExtendStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  rooms?: PhysicalRoom[];
  onStayExtended?: (result: {
    booking: Booking;
    extension: any;
    folioCharge: any;
    payment?: any;
  }) => void;
}

export function ExtendStayModal({
  isOpen,
  onClose,
  booking,
  rooms = [],
  onStayExtended,
}: ExtendStayModalProps) {
  const { isTelugu, formatCurrency } = useAdminLanguage();

  // Current stay reference dates
  const currentCheckIn = booking?.check_in_date ? booking.check_in_date.slice(0, 10) : '';
  const currentCheckOut = booking?.check_out_date ? booking.check_out_date.slice(0, 10) : '';

  // Extension duration state
  const [selectedQuickDays, setSelectedQuickDays] = useState<number>(1);
  const [newCheckOutDate, setNewCheckOutDate] = useState<string>('');
  const [dailyTariff, setDailyTariff] = useState<number>(1800);
  const [isCustomTariff, setIsCustomTariff] = useState<boolean>(false);
  const [tariffOverrideReason, setTariffOverrideReason] = useState<string>('');

  // Room availability check state
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean;
    message?: string;
    conflictBooking?: any;
    availableRooms?: PhysicalRoom[];
  } | null>(null);

  // Alternative room transfer state
  const [transferToRoom, setTransferToRoom] = useState<string>('');
  const [useRoomTransfer, setUseRoomTransfer] = useState<boolean>(false);

  // Payment collection state
  const [collectPaymentNow, setCollectPaymentNow] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Reason & Staff
  const [reason, setReason] = useState<string>('Guest requested stay extension');
  const [staffName, setStaffName] = useState<string>('Front Desk Staff');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Helper to calculate date string + N days
  const addDaysToDate = useCallback((baseDateStr: string, days: number): string => {
    if (!baseDateStr) return '';
    const date = new Date(baseDateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }, []);

  // Helper to calculate diff in days between two date strings
  const getDiffDays = useCallback((startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, []);

  // Initialize values when booking changes or modal opens
  useEffect(() => {
    if (isOpen && booking) {
      const defaultCheckOut = booking.check_out_date ? booking.check_out_date.slice(0, 10) : '';
      const initialNewDate = addDaysToDate(defaultCheckOut, 1);
      setNewCheckOutDate(initialNewDate);
      setSelectedQuickDays(1);

      // Determine default daily tariff from existing booking
      const originalNights = Math.max(
        1,
        getDiffDays(booking.check_in_date?.slice(0, 10) || '', defaultCheckOut)
      );
      const assignedRoomNum = booking.assigned_room_number || booking.room_number || '';
      const brItem = booking.booking_rooms?.find((br) => br.room_number === assignedRoomNum);
      const derivedRate = brItem?.price_per_night ||
        Math.round((booking.subtotal_amount || booking.total_amount || 1800) / originalNights);

      setDailyTariff(derivedRate > 0 ? derivedRate : 1800);
      setIsCustomTariff(false);
      setTariffOverrideReason('');
      setTransferToRoom('');
      setUseRoomTransfer(false);
      setCollectPaymentNow(false);
      setPaymentMethod('cash');
      setReason('Guest requested stay extension');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, booking, addDaysToDate, getDiffDays]);

  // Handle quick day button selection
  const handleQuickDaysSelect = (days: number) => {
    setSelectedQuickDays(days);
    if (currentCheckOut) {
      const nextDate = addDaysToDate(currentCheckOut, days);
      setNewCheckOutDate(nextDate);
    }
  };

  // Calculate actual additional nights based on currentCheckOut and newCheckOutDate
  const additionalNights = useMemo(() => {
    if (!currentCheckOut || !newCheckOutDate) return 1;
    return Math.max(1, getDiffDays(currentCheckOut, newCheckOutDate));
  }, [currentCheckOut, newCheckOutDate, getDiffDays]);

  // Availability validation callback
  const checkAvailability = useCallback(async () => {
    if (!booking || !newCheckOutDate || !currentCheckOut) return;
    if (newCheckOutDate <= currentCheckOut) {
      setAvailabilityResult({
        available: false,
        message: 'New checkout date must be after current checkout date.',
      });
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const targetRoom = useRoomTransfer && transferToRoom ? transferToRoom : undefined;
      const res = await adminOperations.checkExtensionAvailability({
        bookingReference: booking.booking_reference,
        newCheckOutDate,
        targetRoomNumber: targetRoom,
      });

      setAvailabilityResult({
        available: res.available,
        message: res.message,
        conflictBooking: res.conflictBooking,
        availableRooms: res.availableRooms,
      });
    } catch (err: any) {
      setAvailabilityResult({
        available: false,
        message: err.message || 'Availability check failed.',
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [booking, newCheckOutDate, currentCheckOut, useRoomTransfer, transferToRoom]);

  // Run availability check when dates or target room change
  useEffect(() => {
    if (isOpen && booking && newCheckOutDate && currentCheckOut) {
      checkAvailability();
    }
  }, [isOpen, booking, newCheckOutDate, currentCheckOut, useRoomTransfer, transferToRoom, checkAvailability]);

  // Financial Calculations
  const pricingMode: PricingMode = booking?.pricing_mode || 'gst_inclusive';
  const taxRate = booking?.subtotal_amount && booking?.tax_amount
    ? Math.round((booking.tax_amount / booking.subtotal_amount) * 100) / 100
    : 0.05;

  const { additionalRoomCharge, taxAmount, totalExtensionCharge, cgst, sgst } = useMemo(() => {
    const rawRate = Number(dailyTariff) || 1800;
    const nights = Number(additionalNights) || 1;

    if (pricingMode === 'gst_inclusive') {
      const grossTotal = Math.round(rawRate * nights);
      const baseCharge = taxRate > 0 ? Math.round(grossTotal / (1 + taxRate)) : grossTotal;
      const tax = grossTotal - baseCharge;
      const halfTax = Math.round((tax / 2) * 100) / 100;
      return {
        additionalRoomCharge: baseCharge,
        taxAmount: tax,
        totalExtensionCharge: grossTotal,
        cgst: halfTax,
        sgst: Math.round((tax - halfTax) * 100) / 100,
      };
    } else {
      const baseCharge = Math.round(rawRate * nights);
      const tax = Math.round(baseCharge * taxRate);
      const grossTotal = baseCharge + tax;
      const halfTax = Math.round((tax / 2) * 100) / 100;
      return {
        additionalRoomCharge: baseCharge,
        taxAmount: tax,
        totalExtensionCharge: grossTotal,
        cgst: halfTax,
        sgst: Math.round((tax - halfTax) * 100) / 100,
      };
    }
  }, [dailyTariff, additionalNights, pricingMode, taxRate]);

  // Keep payment amount synced with extension total when toggled
  useEffect(() => {
    if (collectPaymentNow) {
      setPaymentAmount(totalExtensionCharge);
    } else {
      setPaymentAmount(0);
    }
  }, [collectPaymentNow, totalExtensionCharge]);

  if (!isOpen || !booking) return null;

  const currentRoomNum = booking.assigned_room_number || booking.room_number || 'Unassigned';
  const currentPaid = booking.paid_amount || 0;
  const currentTotal = booking.total_amount || 0;
  const currentBalance = Math.max(0, currentTotal - currentPaid);

  // Form submission handler
  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (!newCheckOutDate || newCheckOutDate <= currentCheckOut) {
      setErrorMsg('Please select a valid future checkout date.');
      return;
    }

    if (availabilityResult && !availabilityResult.available && !useRoomTransfer) {
      setErrorMsg(
        availabilityResult.message ||
          'Room has conflicting bookings for extended dates. Please choose another date or transfer room.'
      );
      return;
    }

    if (useRoomTransfer && !transferToRoom) {
      setErrorMsg('Please select an alternative room to transfer the guest to.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        bookingReference: booking.booking_reference,
        newCheckOutDate,
        additionalNights,
        dailyRoomCharge: Number(dailyTariff),
        taxRate,
        pricingMode,
        reason: isCustomTariff && tariffOverrideReason
          ? `${reason} [Tariff Override: ${tariffOverrideReason}]`
          : reason,
        staffName,
        idempotencyKey: `ext-${booking.booking_reference}-${newCheckOutDate}-${Date.now()}`,
      };

      if (useRoomTransfer && transferToRoom) {
        payload.targetRoomNumber = transferToRoom;
      }

      if (collectPaymentNow && paymentAmount > 0) {
        payload.paidNow = Number(paymentAmount);
        payload.paymentMethod = paymentMethod;
      }

      const res = await adminOperations.extendStay(payload);

      if (res.success) {
        setSuccessMsg(
          `Stay extended successfully for ${booking.guest_name} until ${newCheckOutDate}.`
        );
        if (onStayExtended) {
          onStayExtended(res);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Failed to extend stay.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while extending stay.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#D8AD56]/40 max-w-2xl w-full shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#EFE3D6] bg-[#FAF7F2] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#382216] text-[#D8AD56] flex items-center justify-center font-bold shadow-md">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8AD56]">
                  {isTelugu ? 'శ్రీ తాయి గ్రాండ్ బస పొడిగింపు' : 'SRI TAYI GRAND &bull; PMS STAY EXTENSION'}
                </span>
                <span className="px-2 py-0.2 rounded-full font-mono text-[10px] font-extrabold bg-[#382216] text-[#D8AD56]">
                  {booking.booking_reference}
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#241912]">
                {isTelugu ? 'బస పొడిగింపు' : 'Extend Guest Stay'} &bull; {booking.guest_name}
              </h2>
              <p className="text-xs text-[#786B61] flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-[#382216]">Room #{currentRoomNum}</span>
                <span>&bull;</span>
                <span>{booking.category_name || 'Standard Room'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#EFE3D6] text-gray-500 hover:text-[#382216] flex items-center justify-center transition-colors cursor-pointer border border-[#EFE3D6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitExtension} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Current Stay & Billing Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EFE3D6]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">
                {isTelugu ? 'చేరిక తేదీ' : 'Original Check-In'}
              </span>
              <div className="font-semibold text-[#241912] font-mono mt-0.5">
                {currentCheckIn}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">
                {isTelugu ? 'ప్రస్తుత నిష్క్రమణ' : 'Current Check-Out'}
              </span>
              <div className="font-bold text-[#B18A4A] font-mono mt-0.5">
                {currentCheckOut}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">
                {isTelugu ? 'రోజువారీ టారిఫ్' : 'Base Tariff / Night'}
              </span>
              <div className="font-semibold text-[#241912] font-mono mt-0.5">
                ₹{dailyTariff.toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">
                {isTelugu ? 'బకాయి బ్యాలెన్స్' : 'Current Balance'}
              </span>
              <div className={`font-bold font-mono mt-0.5 ${currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ₹{currentBalance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Extension Duration Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#382216] uppercase tracking-wider block">
              1. {isTelugu ? 'పొడిగించాల్సిన రోజుల సంఖ్య' : 'Select Extension Duration'}
            </label>

            {/* Quick Days Pills */}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 5, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleQuickDaysSelect(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedQuickDays === days
                      ? 'bg-[#382216] text-[#D8AD56] border-[#382216] shadow-xs'
                      : 'bg-white hover:bg-[#FAF7F2] text-[#382216] border-[#EFE3D6]'
                  }`}
                >
                  +{days} {days === 1 ? 'Night' : 'Nights'}
                </button>
              ))}
            </div>

            {/* Custom Date Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-semibold text-[#786B61] block mb-1">
                  {isTelugu ? 'ప్రతిపాదిత కొత్త నిష్క్రమణ తేదీ' : 'Proposed New Check-Out Date'} *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={addDaysToDate(currentCheckOut, 1)}
                    value={newCheckOutDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewCheckOutDate(val);
                      setSelectedQuickDays(getDiffDays(currentCheckOut, val));
                    }}
                    required
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-hidden"
                  />
                  <Calendar className="w-4 h-4 text-[#D8AD56] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#786B61] block mb-1">
                  {isTelugu ? 'మొత్తం పొడిగించబడిన రాత్రులు' : 'Total Additional Nights'}
                </label>
                <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EFE3D6] font-bold text-xs text-[#382216] flex items-center justify-between">
                  <span>+{additionalNights} {additionalNights === 1 ? 'Night' : 'Nights'}</span>
                  <span className="text-[10px] font-mono text-[#786B61]">
                    ({currentCheckOut} ➔ {newCheckOutDate})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Room Availability & Conflict Detection Banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#382216] uppercase tracking-wider block">
                2. {isTelugu ? 'గది లభ్యత స్థితి' : 'Room Availability Verification'}
              </label>
              {isCheckingAvailability && (
                <span className="text-[10px] font-semibold text-[#786B61] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#D8AD56]" />
                  <span>Checking availability...</span>
                </span>
              )}
            </div>

            {availabilityResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                  availabilityResult.available
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50/90 border-amber-300 text-amber-900'
                }`}
              >
                {availabilityResult.available ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-xs">
                    {availabilityResult.available
                      ? `Room #${currentRoomNum} is Available for Extension`
                      : `Room #${currentRoomNum} is Conflict-Blocked`}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {availabilityResult.message}
                  </p>

                  {/* If room conflict detected, offer controlled room transfer option */}
                  {!availabilityResult.available && (
                    <div className="pt-2 border-t border-amber-200 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="transferToggle"
                          checked={useRoomTransfer}
                          onChange={(e) => setUseRoomTransfer(e.target.checked)}
                          className="w-3.5 h-3.5 text-[#382216] rounded border-[#D8AD56]"
                        />
                        <label
                          htmlFor="transferToggle"
                          className="text-xs font-bold text-[#382216] cursor-pointer flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-sky-700" />
                          <span>Transfer guest to an available alternative room for extension</span>
                        </label>
                      </div>

                      {useRoomTransfer && (
                        <div className="pt-1">
                          <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                            Select Alternative Room *
                          </label>
                          <LuxurySelect
                            size="md"
                            variant="admin"
                            value={transferToRoom}
                            onChange={(val) => setTransferToRoom(String(val))}
                            options={[
                              { value: '', label: '-- Select Available Alternative Room --' },
                              ...(availabilityResult.availableRooms || rooms)
                                .filter((r) => r.room_number !== currentRoomNum && r.operational_status !== 'out_of_service' && r.operational_status !== 'maintenance')
                                .map((r) => ({
                                  value: r.room_number,
                                  label: `Room #${r.room_number} &bull; ${r.category_name || 'Room'} &bull; Floor ${r.floor_number}`,
                                })),
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Daily Tariff & Financial Calculation Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#382216] uppercase tracking-wider block">
                3. {isTelugu ? 'టారిఫ్ & ఛార్జీల వివరాలు' : 'Tariff & Additional Charges'}
              </label>
              <button
                type="button"
                onClick={() => setIsCustomTariff(!isCustomTariff)}
                className="text-[10px] font-bold text-[#B18A4A] hover:underline cursor-pointer"
              >
                {isCustomTariff ? 'Reset to Default Tariff' : '+ Override Nightly Tariff'}
              </button>
            </div>

            {isCustomTariff && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                <div>
                  <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                    Custom Daily Tariff (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dailyTariff}
                    onChange={(e) => setDailyTariff(Number(e.target.value))}
                    required
                    className="w-full text-xs font-mono font-bold p-2 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                    Tariff Override Reason *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special VIP rate / Corporate stay"
                    value={tariffOverrideReason}
                    onChange={(e) => setTariffOverrideReason(e.target.value)}
                    required
                    className="w-full text-xs p-2 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>
              </div>
            )}

            {/* Financial Summary Breakdown Card */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-2 font-mono">
              <div className="flex items-center justify-between text-[#786B61] text-xs">
                <span>
                  Room Tariff ({additionalNights} Night{additionalNights > 1 ? 's' : ''} &times; ₹{dailyTariff.toLocaleString('en-IN')})
                </span>
                <span className="font-semibold text-[#241912]">
                  ₹{additionalRoomCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#786B61] text-xs">
                <span>
                  GST ({pricingMode === 'gst_inclusive' ? 'Included 5%' : 'Additional 5%'}) &bull; CGST 2.5% + SGST 2.5%
                </span>
                <span className="font-semibold text-[#241912]">
                  ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-[#EFE3D6] flex items-center justify-between text-sm font-bold text-[#382216]">
                <span className="font-sans font-bold">Total Stay Extension Amount</span>
                <span className="text-base text-[#B18A4A]">
                  ₹{totalExtensionCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Collection Option */}
          <div className="space-y-2 pt-1 border-t border-[#EFE3D6]">
            <label className="text-[11px] font-bold text-[#382216] uppercase tracking-wider block">
              4. {isTelugu ? 'చెల్లింపు సేకరణ' : 'Payment Collection Options'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCollectPaymentNow(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !collectPaymentNow
                    ? 'bg-[#382216] text-[#D8AD56] border-[#382216] shadow-xs'
                    : 'bg-white hover:bg-[#FAF7F2] text-[#382216] border-[#EFE3D6]'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Post to Folio Balance</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1">
                  Collect balance at final guest checkout
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCollectPaymentNow(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  collectPaymentNow
                    ? 'bg-[#382216] text-[#D8AD56] border-[#382216] shadow-xs'
                    : 'bg-white hover:bg-[#FAF7F2] text-[#382216] border-[#EFE3D6]'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Collect Payment Now</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1">
                  Settle extension charge at counter immediately
                </div>
              </button>
            </div>

            {/* If collect payment now is chosen */}
            {collectPaymentNow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#D8AD56] animate-fadeIn">
                <div>
                  <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                    Amount Collected (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalExtensionCharge}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    required
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                    Payment Channel *
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                    options={[
                      { value: 'cash', label: 'Cash (Physical Front Desk Drawer)' },
                      { value: 'upi', label: 'UPI / PhonePe / GPay' },
                      { value: 'card', label: 'Card (POS Terminal)' },
                    ]}
                  />
                </div>

                {paymentMethod === 'cash' && (
                  <div className="sm:col-span-2 text-[10px] font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    &bull; Physical Cash Note: Cash-In transaction of ₹{paymentAmount} will be automatically posted to the active cash drawer shift in the Cashbook.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks & Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#EFE3D6]">
            <div>
              <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                Extension Reason / Notes
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Extended business trip / Temple Darshan"
                className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                Authorized Staff / Manager
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#EFE3D6] hover:bg-gray-100 text-[#382216] font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                (availabilityResult !== null && !availabilityResult.available && !useRoomTransfer) ||
                (useRoomTransfer && !transferToRoom)
              }
              className="px-5 py-2.5 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] font-bold text-xs transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Stay Extension...</span>
                </>
              ) : (
                <>
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Confirm Stay Extension (+{additionalNights} Night{additionalNights > 1 ? 's' : ''})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
