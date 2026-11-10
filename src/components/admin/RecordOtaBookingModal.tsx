'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Calendar,
  User,
  Phone,
  Mail,
  DoorOpen,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { adminOperations } from '@/lib/realtime-client';

interface RoomTypeOption {
  id: string;
  name: string;
  basePriceInr: number;
}

interface PhysicalRoomOption {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  status: string;
}

interface RecordOtaBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (res: any) => void;
  defaultRoomTypeId?: string;
  defaultCheckInDate?: string;
  defaultCheckOutDate?: string;
}

const OTA_CHANNELS = [
  { id: 'makemytrip', name: 'MakeMyTrip', badge: 'MMT', color: '#E41D2E', bg: '#FDF2F2' },
  { id: 'goibibo', name: 'Goibibo', badge: 'Goibibo', color: '#EC5B24', bg: '#FFF5F2' },
  { id: 'booking_com', name: 'Booking.com', badge: 'Booking.com', color: '#003580', bg: '#F0F4FA' },
  { id: 'agoda', name: 'Agoda', badge: 'Agoda', color: '#10B981', bg: '#F0FDF4' },
  { id: 'airbnb', name: 'Airbnb', badge: 'Airbnb', color: '#FF5A5F', bg: '#FFF1F2' },
  { id: 'expedia', name: 'Expedia', badge: 'Expedia', color: '#D97706', bg: '#FFFBEB' },
  { id: 'other_ota', name: 'Other OTA / Agent', badge: 'OTA', color: '#7C3AED', bg: '#F5F3FF' },
];

export function RecordOtaBookingModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRoomTypeId,
  defaultCheckInDate,
  defaultCheckOutDate,
}: RecordOtaBookingModalProps) {
  const [selectedChannel, setSelectedChannel] = useState('makemytrip');
  const [customChannelName, setCustomChannelName] = useState('');
  const [otaReference, setOtaReference] = useState('');
  const [roomTypeId, setRoomTypeId] = useState(defaultRoomTypeId || '');
  const [assignedRoomNumber, setAssignedRoomNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState(defaultCheckInDate || new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    defaultCheckOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [totalAmountInr, setTotalAmountInr] = useState<number | ''>('');
  const [commissionPercent, setCommissionPercent] = useState<number>(18);
  const [paymentCollectionType, setPaymentCollectionType] = useState<'prepaid_by_ota' | 'pay_at_hotel'>('prepaid_by_ota');
  const [instantCheckIn, setInstantCheckIn] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');

  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [physicalRooms, setPhysicalRooms] = useState<PhysicalRoomOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load rooms and categories from adminOperations state
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    adminOperations.fetchFullState()
      .then((data) => {
        if (data.categories) {
          const mappedCats = data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            basePriceInr: c.base_price_per_night || 2000,
          }));
          setRoomTypes(mappedCats);
          if (!roomTypeId && mappedCats.length > 0) {
            setRoomTypeId(mappedCats[0].id);
          }
        }
        if (data.rooms) {
          setPhysicalRooms(
            data.rooms.map((r: any) => ({
              id: r.id,
              roomNumber: r.room_number,
              roomTypeId: r.category_id,
              status: r.operational_status,
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to load PMS state:', err));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, roomTypeId]);

  // Compute stay nights
  const numNights = React.useMemo(() => {
    try {
      const d1 = new Date(checkInDate + 'T00:00:00Z');
      const d2 = new Date(checkOutDate + 'T00:00:00Z');
      if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) return 1;
      return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Auto-fill suggested total amount when category or nights change
  useEffect(() => {
    if (totalAmountInr === '' && roomTypes.length > 0) {
      const rt = roomTypes.find((r) => r.id === roomTypeId);
      if (rt) {
        const subtotal = rt.basePriceInr * numNights;
        const total = Math.round(subtotal * 1.12);
        setTotalAmountInr(total);
      }
    }
  }, [roomTypeId, numNights, roomTypes, totalAmountInr]);

  // Financial calculations
  const grossAmount = typeof totalAmountInr === 'number' ? totalAmountInr : 0;
  const commissionInr = Math.round(grossAmount * (commissionPercent / 100));
  const netHotelPayoutInr = Math.max(0, grossAmount - commissionInr);

  // Available physical rooms for selected category
  const availablePhysicalRooms = physicalRooms.filter(
    (pr) => pr.roomTypeId === roomTypeId && pr.status === 'available'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otaReference.trim()) {
      setError('Please provide the OTA Voucher Reference ID (e.g. MMT-12345).');
      return;
    }
    if (!guestName.trim()) {
      setError('Please enter the guest full name.');
      return;
    }
    if (!guestPhone.trim()) {
      setError('Please enter the guest contact phone number.');
      return;
    }
    if (grossAmount <= 0) {
      setError('Please enter a valid gross booking amount.');
      return;
    }

    const activeChannel = OTA_CHANNELS.find((c) => c.id === selectedChannel);
    const channelName =
      selectedChannel === 'other_ota' && customChannelName.trim()
        ? customChannelName.trim()
        : activeChannel?.name || 'OTA Channel';

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/reservations/ota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel,
          channelName,
          otaBookingReference: otaReference.trim(),
          roomTypeId,
          assignedRoomNumber: assignedRoomNumber || undefined,
          checkInDate,
          checkOutDate,
          numAdults,
          numChildren,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim() || undefined,
          guestPhone: guestPhone.trim(),
          totalAmountInr: grossAmount,
          commissionPercent,
          commissionInr,
          netHotelPayoutInr,
          paymentCollectionType,
          instantCheckIn,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record OTA booking.');
      }

      onSuccess(data.reservation);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error recording OTA booking.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentChannelMeta = OTA_CHANNELS.find((c) => c.id === selectedChannel) || OTA_CHANNELS[0];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#FAF6EE] rounded-3xl shadow-2xl border border-[#E8DFD1] overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 bg-[#21180F] text-[#FAF6EE] flex items-center justify-between border-b border-[#3D2E20]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B18A4A]/20 border border-[#B18A4A]/40 flex items-center justify-center text-[#B18A4A]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold tracking-wide">
                Record Aggregator / OTA Booking
              </h2>
              <p className="text-[11px] text-[#C4B5A5]">
                Fast entry for MakeMyTrip, Goibibo, Booking.com vouchers. Automatically blocks room inventory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#C4B5A5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Aggregator Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#33271D] mb-2">
              Select Aggregator Platform <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OTA_CHANNELS.map((ch) => {
                const isSelected = selectedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannel(ch.id)}
                    style={{
                      borderColor: isSelected ? ch.color : '#E8DFD1',
                      backgroundColor: isSelected ? ch.bg : '#FFFFFF',
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected ? 'shadow-sm ring-1' : 'hover:bg-white/80 text-[#5C4A3A]'
                    }`}
                  >
                    <span style={{ color: isSelected ? ch.color : '#33271D' }}>{ch.name}</span>
                    <span
                      style={{ color: ch.color, borderColor: ch.color }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                    >
                      {ch.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedChannel === 'other_ota' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="Enter Travel Agent or Channel Name (e.g. Travelguru, EaseMyTrip)"
                  value={customChannelName}
                  onChange={(e) => setCustomChannelName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                />
              </div>
            )}
          </div>

          {/* 2. OTA Voucher Reference & Room Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#33271D] mb-1.5">
                OTA Booking Reference / Voucher ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-[#8D672F] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${currentChannelMeta.badge}-8942109`}
                  value={otaReference}
                  onChange={(e) => setOtaReference(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                />
              </div>
              <p className="text-[10px] text-[#786A5B] mt-1">
                Deduplication check: prevents entering the same voucher twice.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#33271D] mb-1.5">
                Room Category <span className="text-red-500">*</span>
              </label>
              <select
                value={roomTypeId}
                onChange={(e) => {
                  setRoomTypeId(e.target.value);
                  setAssignedRoomNumber('');
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] font-semibold focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} (Base: ₹{rt.basePriceInr.toLocaleString('en-IN')}/night)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Dates & Room Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-[#E8DFD1]">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#786A5B] mb-1">Check-In Date</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5C7B5] text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#786A5B] mb-1">Check-Out Date</label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5C7B5] text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
              />
              <span className="text-[10px] text-[#B18A4A] font-semibold">{numNights} Night{numNights > 1 ? 's' : ''} stay</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#786A5B] mb-1">Physical Room Number</label>
              <select
                value={assignedRoomNumber}
                onChange={(e) => setAssignedRoomNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5C7B5] text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
              >
                <option value="">Auto-Assign at Check-In</option>
                {availablePhysicalRooms.map((pr) => (
                  <option key={pr.id} value={pr.roomNumber}>
                    Room {pr.roomNumber} ({pr.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Guest Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#33271D] mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#8D672F]" />
              <span>Guest Details from Voucher</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Vardhan"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] font-mono focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="guest@example.com (optional)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#786A5B]">Adults:</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={numAdults}
                  onChange={(e) => setNumAdults(Number(e.target.value))}
                  className="w-14 px-2 py-1 text-xs text-center rounded-lg border border-[#D5C7B5] bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#786A5B]">Children:</span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={numChildren}
                  onChange={(e) => setNumChildren(Number(e.target.value))}
                  className="w-14 px-2 py-1 text-xs text-center rounded-lg border border-[#D5C7B5] bg-white"
                />
              </div>
            </div>
          </div>

          {/* 5. Financials, Commission & Payment Mode */}
          <div className="p-4 rounded-xl bg-[#F4EDE0] border border-[#E0D2C0] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#33271D] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#8D672F]" />
                <span>Financial Tariff & OTA Commission Breakdown</span>
              </span>
              <span className="text-[10px] text-[#8D672F] font-semibold">Taxes included</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">
                  Gross Booking Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Total on OTA Voucher"
                  value={totalAmountInr}
                  onChange={(e) => setTotalAmountInr(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">
                  OTA Commission (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] font-mono focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
                  />
                  <Percent className="w-3 h-3 text-[#786A5B] absolute right-3 top-3" />
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#D5C7B5] flex flex-col justify-center">
                <div className="text-[10px] text-[#786A5B] flex justify-between">
                  <span>OTA Commission:</span>
                  <span className="font-mono text-red-600 font-semibold">-₹{commissionInr.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-xs font-bold text-[#33271D] flex justify-between mt-1 pt-1 border-t border-[#E8DFD1]">
                  <span>Net Hotel Payout:</span>
                  <span className="font-mono text-emerald-700">₹{netHotelPayoutInr.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Payment Collection Type */}
            <div>
              <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1.5">Payment Collection Model</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                    paymentCollectionType === 'prepaid_by_ota'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300'
                      : 'bg-white border-[#D5C7B5] text-[#5C4A3A]'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionType"
                    checked={paymentCollectionType === 'prepaid_by_ota'}
                    onChange={() => setPaymentCollectionType('prepaid_by_ota')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold">Prepaid by OTA (Online)</div>
                    <div className="text-[10px] opacity-80">
                      Guest paid online on {currentChannelMeta.name}. Net payout (₹{netHotelPayoutInr.toLocaleString('en-IN')}) will be remitted to hotel bank.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                    paymentCollectionType === 'pay_at_hotel'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-300'
                      : 'bg-white border-[#D5C7B5] text-[#5C4A3A]'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionType"
                    checked={paymentCollectionType === 'pay_at_hotel'}
                    onChange={() => setPaymentCollectionType('pay_at_hotel')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-bold">Collect at Hotel (Pay at Desk)</div>
                    <div className="text-[10px] opacity-80">
                      Guest selected &quot;Pay at Hotel&quot;. Reception will collect ₹{grossAmount.toLocaleString('en-IN')} upon arrival.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 6. Instant Check-In & Notes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-white border border-[#E8DFD1]">
              <input
                type="checkbox"
                checked={instantCheckIn}
                onChange={(e) => setInstantCheckIn(e.target.checked)}
                className="w-4 h-4 rounded text-[#8D672F] focus:ring-[#8D672F]"
              />
              <span className="text-xs font-semibold text-[#33271D]">
                Guest has already arrived at front desk (Perform Instant Check-In)
              </span>
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C4A3A] mb-1">
                Special Requests or OTA Voucher Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Non-smoking room, extra towels requested on MakeMyTrip voucher"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5C7B5] bg-white text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#B18A4A]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E8DFD1] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-[#786A5B] hover:text-[#33271D] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-[#21180F] hover:bg-black text-[#FAF6EE] text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-[#B18A4A]" />
                  <span>Recording Booking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#B18A4A]" />
                  <span>Record & Block Inventory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordOtaBookingModal;
