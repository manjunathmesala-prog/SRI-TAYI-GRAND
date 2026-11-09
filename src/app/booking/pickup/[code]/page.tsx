'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  Clock,
  Wifi,
  Phone,
  MapPin,
  QrCode,
  ShieldCheck,
  CreditCard,
  Building,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface PickupData {
  success: boolean;
  booking_reference: string;
  pickup_code: string;
  guest_name: string;
  category_name: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  paid_amount: number;
  check_in_date: string;
  check_out_date: string;
  is_assigned: boolean;
  is_key_issued: boolean;
  assigned_room_number?: string;
  keycard_issued_at?: string;
  wifi_ssid: string;
  wifi_password: string;
}

export default function PickupPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const pickupCode = decodeURIComponent(resolvedParams.code);
  const searchParams = useSearchParams();
  const bookingRef = searchParams.get('ref') || '';

  const [data, setData] = useState<PickupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/walk-in/pickup-status?code=${encodeURIComponent(pickupCode)}&ref=${encodeURIComponent(bookingRef)}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setError(null);
      } else {
        const d = await res.json();
        setError(d.error || 'Pickup record not found');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error checking status');
    } finally {
      setIsLoading(false);
    }
  }, [pickupCode, bookingRef]);

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds to auto-update when receptionist issues keycard
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-[#D8AD56] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-lg font-bold text-[#241912]">Generating Keycard Pickup Pass...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <h2 className="font-serif text-xl font-bold text-red-700">Pickup Record Not Found</h2>
        <p className="text-xs text-[#786B61] mt-2">{error || 'Could not locate your reservation.'}</p>
        <NextLink
          href="/walk-in"
          className="mt-5 px-5 py-2.5 rounded-xl bg-[#382216] text-[#D8AD56] font-bold text-xs shadow-sm"
        >
          Return to Express Check-In
        </NextLink>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#241912] pb-16">
      {/* Top Header */}
      <header className="bg-[#241912] text-white border-b border-[#382216] py-3.5 px-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#382216] border border-[#D8AD56]/40 flex items-center justify-center text-[#D8AD56]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold tracking-wide">SRI TAYI GRAND</h1>
              <p className="text-[10px] text-[#D8AD56]">Keycard Pickup Pass</p>
            </div>
          </div>
          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold bg-[#D8AD56] text-[#241912]">
            {data.is_key_issued ? 'Checked In' : 'At Reception'}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Pass Card with Gold Crest */}
        <div className="bg-white rounded-3xl border border-[#EFE3D6] shadow-xl overflow-hidden text-center relative">
          <div className="bg-gradient-to-r from-[#382216] to-[#25150F] text-white p-5 space-y-1 relative">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D8AD56]">
              OFFICIAL RECEPTION PICKUP PASS
            </span>
            <h2 className="font-serif text-xl font-bold text-white">{data.guest_name}</h2>
            <p className="text-xs text-[#EFE3D6]/80">{data.category_name}</p>
          </div>

          <div className="p-6 space-y-5">
            {!data.is_key_issued ? (
              /* State A: Waiting for Keycard Handover */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 animate-pulse">
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                    Show this pickup code to Front Desk:
                  </p>
                  <div className="font-mono text-4xl sm:text-5xl font-black text-[#241912] tracking-wider py-1">
                    {data.pickup_code}
                  </div>
                  <p className="text-[10px] text-[#786B61]">Reference: {data.booking_reference}</p>
                </div>

                {/* Simulated Barcode */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-1 h-12 w-48 justify-center overflow-hidden">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-black h-full"
                        style={{ width: `${(i % 3) + 1.5}px`, marginRight: `${(i % 2) + 1}px` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] text-gray-500 tracking-widest">{data.pickup_code}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F6EFE6] border border-[#EFE3D6] text-left text-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#382216] font-bold">
                    <Clock className="w-4 h-4 text-[#D8AD56] animate-spin" />
                    <span>Receptionist is preparing your room keycard...</span>
                  </div>
                  <p className="text-[11px] text-[#786B61] leading-relaxed">
                    Staff is assigning an inspected physical room and programming your RFID card on the counter USB encoder right now. This screen will automatically refresh as soon as your key is ready.
                  </p>
                </div>
              </div>
            ) : (
              /* State B: Keycard Programmed & Room Ready! */
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    KEYCARD ACTIVATED & READY
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-[#241912] mt-0.5">
                    Welcome to Room {data.assigned_room_number}!
                  </h3>
                  <p className="text-xs text-[#786B61] mt-1">
                    Your Be-Tech RFID keycard has been authorized and handed to you.
                  </p>
                </div>

                {/* Room & Stay Details Card */}
                <div className="p-4 rounded-2xl bg-[#F6EFE6] border border-[#EFE3D6] text-left space-y-2.5 text-xs">
                  <div className="flex justify-between pb-2 border-b border-[#EFE3D6]">
                    <span className="text-[#786B61]">Assigned Room</span>
                    <span className="font-bold text-[#241912] text-sm">Room {data.assigned_room_number}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[#EFE3D6]">
                    <span className="text-[#786B61]">Floor Location</span>
                    <span className="font-bold text-[#241912]">
                      {data.assigned_room_number?.startsWith('3') ? 'Floor 3 (Take Lift)' : 'Floor 2 (Take Lift)'}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[#EFE3D6]">
                    <span className="text-[#786B61]">Standard Checkout</span>
                    <span className="font-bold text-[#241912]">11:00 AM, {data.check_out_date}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[#786B61] flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-[#D8AD56]" />
                      <span>Guest Wi-Fi</span>
                    </span>
                    <span className="font-mono font-bold text-[11px] text-[#241912]">
                      {data.wifi_password}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
                  <KeyRound className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Tap your physical card flat on your door lock to enter. Enjoy your stay at Sri Tayi Grand!
                  </span>
                </div>
              </div>
            )}

            {/* Payment Summary Footer */}
            <div className="pt-3 border-t border-[#EFE3D6] flex justify-between items-center text-xs">
              <span className="text-[#786B61]">Payment Status:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  data.payment_status === 'successful'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {data.payment_status === 'successful'
                  ? `PAID (₹${data.total_amount})`
                  : `COLLECT AT DESK (₹${data.total_amount})`}
              </span>
            </div>
          </div>
        </div>

        {/* Hotel Contact Help Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#EFE3D6] text-xs space-y-2 text-[#786B61]">
          <p className="font-bold text-[#241912] flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#D8AD56]" />
            <span>Sri Tayi Grand Front Desk Support</span>
          </p>
          <p className="text-[11px]">
            Need extra towels, room service, or late checkout? Dial <b>0</b> or <b>100</b> from your room intercom, or visit reception.
          </p>
        </div>
      </main>
    </div>
  );
}
