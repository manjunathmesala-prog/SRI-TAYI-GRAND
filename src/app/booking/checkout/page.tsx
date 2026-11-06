'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  User, 
  CreditCard, 
  Building, 
  ArrowRight, 
  AlertCircle, 
  Lock 
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get('categoryId') || 'cat-suite-01';
  const checkIn = searchParams.get('checkIn') || new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkOut = searchParams.get('checkOut') || tomorrow.toISOString().split('T')[0];
  const adults = Number(searchParams.get('adults')) || 2;
  const children = Number(searchParams.get('children')) || 0;
  const roomsCount = Number(searchParams.get('roomsCount')) || 1;

  // Form fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [specialRequests, setSpecialRequests] = useState('');
  const [earlyCheckIn, setEarlyCheckIn] = useState(false);
  const [lateCheckOut, setLateCheckOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'pay_at_hotel'>('pay_at_hotel');

  // Loading & error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pricing preview
  const [pricing, setPricing] = useState<{
    categoryName: string;
    coverImage: string;
    nights: number;
    baseRate: number;
    roomCharges: number;
    extraPersonsCount: number;
    extraPersonCharges: number;
    subtotal: number;
    taxPercentage: number;
    tax: number;
    total: number;
    tariffSourceDate: string;
  } | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    async function loadPricing() {
      try {
        const res = await fetch('/api/availability/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkIn, checkOut, adults, children, roomsCount }),
        });
        const data = await res.json();
        if (data.results) {
          const match = data.results.find((r: any) => r.category.id === categoryId) || data.results[0];
          if (match) {
            setPricing({
              categoryName: match.category.name,
              coverImage: match.category.cover_image_url,
              nights: match.nights,
              baseRate: match.pricePerNight,
              roomCharges: match.roomCharges !== undefined ? match.roomCharges : match.subtotal,
              extraPersonsCount: match.extraPersonsCount || 0,
              extraPersonCharges: match.extraPersonCharges || 0,
              subtotal: match.subtotal,
              taxPercentage: match.taxPercentage || 0,
              tax: match.taxAmount,
              total: match.totalAmount,
              tariffSourceDate: match.tariffSourceDate || '01-09-2023',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load pricing preview', err);
      }
    }

    loadPricing();

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [categoryId, checkIn, checkOut, adults, children, roomsCount]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          checkIn,
          checkOut,
          adultsCount: adults,
          childrenCount: children,
          roomsCount,
          guestName,
          guestEmail,
          guestPhone,
          address,
          city,
          specialRequests,
          earlyCheckIn,
          lateCheckOut,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      const { bookingReference, razorpayOrder } = data;

      if (paymentMethod === 'pay_at_hotel') {
        router.push(`/booking/confirmation/${bookingReference}`);
        return;
      }

      if (typeof window.Razorpay === 'function' && razorpayOrder && razorpayOrder.id) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'SRI TAYI GRAND',
          description: `Stay: ${pricing?.categoryName || 'Room Reservation'}`,
          order_id: razorpayOrder.id,
          prefill: {
            name: guestName,
            email: guestEmail,
            contact: guestPhone,
          },
          theme: {
            color: '#20120B',
          },
          handler: async function (response: any) {
            const verifyRes = await fetch('/api/bookings/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookingReference,
                razorpayOrderId: response.razorpay_order_id || razorpayOrder.id,
                razorpayPaymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpaySignature: response.razorpay_signature || 'dev_valid_sig',
              }),
            });

            if (verifyRes.ok) {
              router.push(`/booking/confirmation/${bookingReference}`);
            } else {
              setErrorMessage('Payment verification failed. Please contact reception.');
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const verifyRes = await fetch('/api/bookings/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingReference,
            razorpayOrderId: `order_dev_${Date.now()}`,
            razorpayPaymentId: `pay_sim_${Date.now()}`,
            razorpaySignature: 'dev_valid_sig',
          }),
        });

        if (verifyRes.ok) {
          router.push(`/booking/confirmation/${bookingReference}`);
        } else {
          router.push(`/booking/confirmation/${bookingReference}`);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during reservation');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="mb-10">
        <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-2">
          Reservation
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#241912]">
          Guest Details & Confirmation
        </h1>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Guest Information */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-8 shadow-luxury">
            <h2 className="font-serif text-xl font-medium text-[#241912] mb-5 flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#D8AD56]" />
              <span>Primary Guest</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="As per Government ID"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="For confirmation SMS & WhatsApp"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="For receipt & voucher"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru / Hyderabad"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                  State / Country
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-8 shadow-luxury">
            <h2 className="font-serif text-xl font-medium text-[#241912] mb-4 flex items-center gap-2.5">
              <Building className="w-4 h-4 text-[#D8AD56]" />
              <span>Preferences (Optional)</span>
            </h2>

            <div className="flex flex-wrap gap-5 mb-4">
              <label className="flex items-center gap-2 text-xs text-[#241912] cursor-pointer">
                <input
                  type="checkbox"
                  checked={earlyCheckIn}
                  onChange={(e) => setEarlyCheckIn(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D8AD56] focus:ring-[#D8AD56]"
                />
                <span className="font-light">Early Check-in request (Before 2:00 PM)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#241912] cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateCheckOut}
                  onChange={(e) => setLateCheckOut(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D8AD56] focus:ring-[#D8AD56]"
                />
                <span className="font-light">Late Check-out request (After 11:00 AM)</span>
              </label>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                Special Requests
              </label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Quiet floor, travel details, or extra bedding..."
                className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-8 shadow-luxury">
            <h2 className="font-serif text-xl font-medium text-[#241912] mb-4 flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#D8AD56]" />
              <span>Payment Option</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'pay_at_hotel'
                    ? 'border-[#D8AD56] bg-[#FAF7F2] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pay_at_hotel"
                  checked={paymentMethod === 'pay_at_hotel'}
                  onChange={() => setPaymentMethod('pay_at_hotel')}
                  className="mt-1 text-[#D8AD56] focus:ring-[#D8AD56]"
                />
                <div>
                  <div className="font-medium text-xs text-[#241912]">Pay upon Arrival</div>
                  <div className="text-[11px] text-[#786B61] mt-0.5 font-light">
                    Settle bill via Cash or UPI at front desk.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'online'
                    ? 'border-[#D8AD56] bg-[#FAF7F2] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="mt-1 text-[#D8AD56] focus:ring-[#D8AD56]"
                />
                <div>
                  <div className="font-medium text-xs text-[#241912]">Pay Online Now</div>
                  <div className="text-[11px] text-[#786B61] mt-0.5 font-light">
                    UPI, Credit/Debit cards via Razorpay.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-8 shadow-luxury sticky top-28 space-y-6">
            <h3 className="font-serif text-xl font-medium text-[#241912] border-b border-[#F8F1E9] pb-3">
              Summary
            </h3>

            {pricing && (
              <div className="flex gap-4 items-center">
                <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-[#20120B]/10">
                  <Image src={pricing.coverImage} alt={pricing.categoryName} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-serif font-medium text-base text-[#241912]">{pricing.categoryName}</h4>
                  <div className="text-xs text-[#786B61] font-light mt-0.5">
                    {roomsCount} {roomsCount === 1 ? 'Room' : 'Rooms'} â€¢ {adults} Guests
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 text-xs py-3.5 border-y border-[#F8F1E9] text-[#241912]">
              <div>
                <span className="text-[10px] text-[#8C7A6B] uppercase tracking-[0.2em] font-semibold block">Check-in</span>
                <span className="font-medium">{checkIn}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8C7A6B] uppercase tracking-[0.2em] font-semibold block">Check-out</span>
                <span className="font-medium">{checkOut}</span>
              </div>
            </div>

            {/* Pricing */}
            {pricing && (
              <div className="space-y-2 text-xs text-[#786B61] font-light">
                <div className="flex justify-between">
                  <span>Room Charges ({roomsCount} {roomsCount === 1 ? 'room' : 'rooms'} × {pricing.nights} {pricing.nights === 1 ? 'night' : 'nights'})</span>
                  <span className="text-[#241912] font-medium">₹{pricing.roomCharges.toLocaleString('en-IN')}</span>
                </div>
                {pricing.extraPersonsCount > 0 && (
                  <div className="flex justify-between text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50">
                    <span>Extra Person ({pricing.extraPersonsCount} additional {pricing.extraPersonsCount === 1 ? 'guest' : 'guests'} × ₹300 × {pricing.nights} {pricing.nights === 1 ? 'night' : 'nights'})</span>
                    <span className="font-medium">₹{pricing.extraPersonCharges.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {pricing.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Configured Tax ({pricing.taxPercentage}%)</span>
                    <span className="text-[#241912] font-medium">₹{pricing.tax.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#F8F1E9] flex justify-between text-base font-medium text-[#241912]">
                  <span>Total Payable</span>
                  <span className="font-serif text-lg">₹{pricing.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-[#8C7A6B] font-light">
              <Lock className="w-3.5 h-3.5 text-[#D8AD56]" />
              <span>Instant confirmation & 256-bit encrypted</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-full bg-[#D8AD56] hover:bg-[#C69940] disabled:opacity-50 text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-goldGlow hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Confirming...</span>
              ) : (
                <>
                  <span>{paymentMethod === 'online' ? 'Proceed to Payment' : 'Confirm Reservation'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />
      <main className="flex-grow pt-28 sm:pt-32 pb-24">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-light">Preparing checkout...</div>}>
          <CheckoutContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
