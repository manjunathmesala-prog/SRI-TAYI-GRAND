'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  Clock,
  Wifi,
  Phone,
  MapPin,
  ShieldCheck,
  Copy,
  RefreshCw,
  Home,
  Check,
} from 'lucide-react';

interface PickupData {
  success: boolean;
  bookingReference: string;
  booking_reference?: string;
  pickupCode: string;
  pickup_code?: string;
  guestName: string;
  guest_name?: string;
  guestPhone: string;
  guest_phone?: string;
  roomTypeName: string;
  category_name?: string;
  assignedRoomNumber?: string;
  assigned_room_number?: string;
  isKeyHandedOver: boolean;
  is_key_issued?: boolean;
  status: string;
  paymentStatus: string;
  payment_status?: string;
  paymentMethod: string;
  payment_method?: string;
  totalAmountInr: number;
  total_amount?: number;
  amountPaidInr: number;
  paid_amount?: number;
  checkInDate: string;
  check_in_date?: string;
  checkOutDate: string;
  check_out_date?: string;
  wifiSsid: string;
  wifi_ssid?: string;
  wifiPassword: string;
  wifi_password?: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
}

export default function WalkInPickupPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const pickupCode = decodeURIComponent(resolvedParams.code);
  const searchParams = useSearchParams();
  const bookingRef = searchParams.get('ref') || '';

  const [data, setData] = useState<PickupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wifiCopied, setWifiCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/walk-in/pickup-status?code=${encodeURIComponent(pickupCode)}&ref=${encodeURIComponent(
          bookingRef
        )}`
      );
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setError(null);
      } else {
        const d = await res.json();
        setError(d.error || 'Could not locate pickup pass.');
      }
    } catch {
      setError('Connection interrupted. Retrying...');
    } finally {
      setIsLoading(false);
    }
  }, [pickupCode, bookingRef]);

  useEffect(() => {
    fetchStatus();
    // Real-time polling every 3.5 seconds until key is handed over
    const interval = setInterval(() => {
      fetchStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  const copyWifiPassword = () => {
    const pwd = data?.wifiPassword || data?.wifi_password;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setWifiCopied(true);
    setTimeout(() => setWifiCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#21180F] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-12 h-12 rounded-full border-2 border-[#D8AD56] border-t-transparent animate-spin mb-4" />
        <h2 className="font-serif text-lg font-bold">Verifying Room Key Pass...</h2>
        <p className="text-stone-400 text-xs mt-1">Connecting to Sri Tayi Grand Reception</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#21180F] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-12 h-12 rounded-full bg-rose-900/40 text-rose-400 flex items-center justify-center mb-4 text-xl font-bold">
          !
        </div>
        <h1 className="font-serif text-xl font-bold">Key Pass Not Found</h1>
        <p className="text-stone-400 text-xs mt-2 max-w-sm">{error || 'Invalid pickup code.'}</p>
        <Link
          href="/walk-in"
          className="mt-6 px-5 py-2.5 rounded-xl bg-[#8D672F] text-white text-xs font-semibold hover:bg-[#6D4E21] transition-all"
        >
          Return to Express Check-In
        </Link>
      </div>
    );
  }

  const isCheckedIn =
    data.isKeyHandedOver ||
    data.is_key_issued ||
    data.status === 'checked_in';

  const guestName = data.guestName || data.guest_name || 'Guest';
  const bookingReference = data.bookingReference || data.booking_reference || '';
  const code = data.pickupCode || data.pickup_code || pickupCode;
  const roomTypeName = data.roomTypeName || data.category_name || 'Room';
  const assignedRoomNumber = data.assignedRoomNumber || data.assigned_room_number;
  const checkInDate = data.checkInDate || data.check_in_date || '';
  const checkOutDate = data.checkOutDate || data.check_out_date || '';
  const totalAmount = data.totalAmountInr ?? data.total_amount ?? 0;
  const paymentStatus = data.paymentStatus || data.payment_status || 'unpaid';
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'successful';
  const wifiSsid = data.wifiSsid || data.wifi_ssid || 'SriTayiGrand_Guest';
  const wifiPassword = data.wifiPassword || data.wifi_password || 'TayiGrand@2026';
  const hotelAddress = data.hotelAddress || 'Main Road, Kadiri, Andhra Pradesh 515591';
  const hotelPhone = data.hotelPhone || '+91 85002 23344';

  return (
    <div className="min-h-screen bg-[#F8F3E9] text-[#33271D] pb-16">
      {/* Top Banner */}
      <div className="bg-[#21180F] text-white px-4 py-3.5 border-b border-[#8D672F]/40 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-full border border-[#D8AD56]/80 p-1 bg-[#33271D] shadow-xs flex items-center justify-center shrink-0">
              <Image
                src="/images/hotel/tayi-grand-logo.png"
                alt="Sri Tayi Grand Hotel Logo"
                width={26}
                height={26}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-serif font-bold text-sm block leading-tight text-white">
                Sri Tayi Grand Hotel
              </span>
              <span className="text-[10px] text-[#D8AD56] font-medium">
                Official Room Key Pass &bull; Reception Counter
              </span>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[10px]">Refresh</span>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Status Hero Card */}
        <div
          className={`rounded-3xl p-6 text-center border shadow-xl relative overflow-hidden ${
            isCheckedIn
              ? 'bg-gradient-to-b from-[#1C2C1D] to-[#121B13] text-white border-emerald-500/40'
              : 'bg-[#21180F] text-white border-[#8D672F]/50'
          }`}
        >
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D8AD56]">
              {isCheckedIn ? 'Key Handed Over • Checked In' : 'Step 3: Collect Key at Reception'}
            </span>

            {isCheckedIn ? (
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-white pt-1">
                  Welcome to Room {assignedRoomNumber}
                </h1>
                <p className="text-stone-300 text-xs">
                  Your physical room key has been handed over. Enjoy your stay!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#8D672F]/20 text-[#D8AD56] flex items-center justify-center mx-auto border border-[#8D672F] animate-pulse">
                  <Clock className="w-6 h-6" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-white">
                  Show Code to Receptionist
                </h1>
                <p className="text-stone-300 text-xs max-w-xs mx-auto">
                  Show this pass code to the receptionist standing at the counter to collect your physical room key.
                </p>

                {/* Pickup Code Badge */}
                <div className="bg-white/10 border-2 border-dashed border-[#D8AD56] rounded-2xl py-3 px-6 inline-block my-2">
                  <span className="text-[10px] uppercase tracking-widest text-stone-300 block">
                    Pickup Pass Code
                  </span>
                  <span className="font-mono text-3xl font-bold tracking-wider text-[#D8AD56]">
                    {code}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Guest Wi-Fi Delivery Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6D9C5]">
            <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#33271D] flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#8D672F]" />
              <span>Complimentary Guest Wi-Fi</span>
            </h3>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              High Speed Fiber
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#F8F3E9] p-3 rounded-xl">
              <span className="text-[10px] text-[#786A5B] block font-semibold uppercase">Network Name (SSID)</span>
              <span className="font-mono font-bold text-[#33271D] text-xs mt-0.5 block truncate">
                {wifiSsid}
              </span>
            </div>

            <div className="bg-[#F8F3E9] p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#786A5B] block font-semibold uppercase">Password</span>
                <span className="font-mono font-bold text-[#8D672F] text-xs mt-0.5 block">
                  {wifiPassword}
                </span>
              </div>
              <button
                type="button"
                onClick={copyWifiPassword}
                className="p-2 rounded-lg bg-white border border-[#E6D9C5] text-[#8D672F] hover:bg-stone-50 cursor-pointer transition-all active:scale-95"
                title="Copy Password"
              >
                {wifiCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Stay Summary */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-xs space-y-3 text-xs">
          <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#786A5B] pb-2 border-b border-[#E6D9C5]">
            Reservation Folio Details
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#786A5B]">Booking Reference:</span>
              <span className="font-mono font-bold text-[#33271D]">{bookingReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#786A5B]">Primary Guest:</span>
              <span className="font-bold text-[#33271D]">{guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#786A5B]">Room Category:</span>
              <span className="font-bold text-[#8D672F]">{roomTypeName}</span>
            </div>
            {assignedRoomNumber && (
              <div className="flex justify-between bg-emerald-50 p-2 rounded-xl text-emerald-900 font-bold">
                <span>Assigned Room:</span>
                <span>Room {assignedRoomNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#786A5B]">Check-In / Out:</span>
              <span>{checkInDate} &rarr; {checkOutDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#786A5B]">Total Amount (Inc. 5% GST):</span>
              <span className="font-bold text-[#33271D]">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#786A5B]">Payment Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isPaid ? 'Paid Online' : 'Pay at Reception Desk'}
              </span>
            </div>
          </div>
        </div>

        {/* Front Desk Assistance Footer */}
        <div className="p-4 rounded-2xl bg-white border border-[#E6D9C5] text-center space-y-2 text-xs shadow-xs">
          <p className="font-bold text-[#33271D]">Need front desk assistance?</p>
          <p className="text-[11px] text-[#786A5B]">
            {hotelAddress}
          </p>
          <a
            href={`tel:${hotelPhone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs font-semibold mt-1 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Front Desk: {hotelPhone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
