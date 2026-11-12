'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { 
  User, 
  CreditCard, 
  Building, 
  ArrowRight, 
  AlertCircle, 
  Lock,
  ShieldCheck,
  CheckCircle2,
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
      if (categoryId === 'cat-single-04' || categoryId === 'single-room') {
        setErrorMessage('The Single Room (Room #107) is available for front-desk walk-in reservations only and cannot be booked online.');
        return;
      }
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
              taxPercentage: typeof match.taxPercentage === 'number' ? match.taxPercentage : 5,
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
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_Ty3N7lQ7MDxqRm',
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency || 'INR',
          name: 'SRI TAYI GRAND',
          description: `Reservation: ${pricing?.categoryName || 'Room Stay'}`,
          order_id: razorpayOrder.id,
          image: '/images/hotel/tayi-grand-logo.png',
          prefill: {
            name: guestName,
            email: guestEmail,
            contact: guestPhone,
          },
          notes: {
            booking_reference: bookingReference,
          },
          theme: {
            color: '#43001F',
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/bookings/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bookingReference,
                  razorpayOrderId: response.razorpay_order_id || razorpayOrder.id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                router.push(`/booking/confirmation/${bookingReference}`);
              } else {
                setErrorMessage(verifyData.error || 'Payment signature verification failed. Please contact front desk.');
                setIsSubmitting(false);
              }
            } catch (vErr: any) {
              setErrorMessage('Network error verifying payment. Please contact reception with reference: ' + bookingReference);
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setErrorMessage('Payment window was closed. You can retry payment anytime.');
            },
            escape: true,
            backdropclose: false,
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setIsSubmitting(false);
          setErrorMessage(resp.error?.description || 'Your payment attempt was declined. Please try with another card or UPI.');
        });
        rzp.open();
      } else {
        setErrorMessage('Unable to initialize Razorpay payment gateway. Please verify your internet connection or choose Pay at Hotel.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during reservation');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="mb-10 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <TayiBrandIcon size={18} />
          <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#43001F]">
            RESERVATION &amp; STAY DETAILS
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#33271D]">
          Guest Details &amp; Confirmation
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
          <div className="bg-white rounded-3xl border border-[#E6D9C5] p-7 sm:p-8 shadow-luxury">
            <h2 className="font-serif text-xl font-bold text-[#33271D] mb-5 flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#43001F]" />
              <span>Primary Guest Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786A5B] mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="As per Government ID"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:outline-none focus:border-[#43001F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786A5B] mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="For confirmation SMS & WhatsApp"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:outline-none focus:border-[#43001F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786A5B] mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="For receipt & digital key access"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:outline-none focus:border-[#43001F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786A5B] mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru / Hyderabad / Kadiri"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:outline-none focus:border-[#43001F]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786A5B] mb-1.5">
                  State / Region
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:outline-none focus:border-[#43001F]"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-3xl border border-[#E6D9C5] p-7 sm:p-8 shadow-luxury">
            <h2 className="font-serif text-xl font-bold text-[#33271D] mb-4 flex items-center gap-2.5">
              <Building className="w-4 h-4 text-[#43001F]" />
              <span>Stay Preferences (Optional)</span>
            </h2>

            <div className="flex flex-wrap gap-5 mb-4">
              <label className="flex items-center gap-2 text-xs text-[#33271D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={earlyCheckIn}
                  onChange={(e) => setEarlyCheckIn(e.target.checked)}
                  className="w-4 h-4 rounded text-[#43001F] focus:ring-[#43001F]"
                />
                <span className="font-light">Early Check-in request (Before 12:00 PM)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#33271D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateCheckOut}
                  onChange={(e) => setLateCheckOut(e.target.checked)}
                  className="w-4 h-4 rounded text-[#43001F] focus:ring-[#43001F]"
                />
                <span className="font-light">Late Check-out request (After 11:00 AM)</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786A5B] mb-1.5">
                Special Requests or Notes
              </label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Quiet floor, travel details, or extra bedding..."
                className="w-full text-xs font-medium p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:outline-none focus:border-[#43001F]"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-3xl border border-[#E6D9C5] p-7 sm:p-8 shadow-luxury">
            <h2 className="font-serif text-xl font-bold text-[#33271D] mb-4 flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#43001F]" />
              <span>Payment Option</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'pay_at_hotel'
                    ? 'border-[#43001F] bg-[#FAF6EE] shadow-sm ring-1 ring-[#43001F]/30'
                    : 'border-[#E6D9C5] hover:border-[#43001F]/50 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pay_at_hotel"
                  checked={paymentMethod === 'pay_at_hotel'}
                  onChange={() => setPaymentMethod('pay_at_hotel')}
                  className="mt-1 text-[#43001F] focus:ring-[#43001F]"
                />
                <div>
                  <div className="font-bold text-xs text-[#33271D]">Pay upon Arrival</div>
                  <div className="text-[11px] text-[#786A5B] mt-0.5 font-light">
                    Settle bill via Cash or UPI at front desk.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'online'
                    ? 'border-[#43001F] bg-[#FAF6EE] shadow-sm ring-1 ring-[#43001F]/30'
                    : 'border-[#E6D9C5] hover:border-[#43001F]/50 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="mt-1 text-[#43001F] focus:ring-[#43001F]"
                />
                <div>
                  <div className="font-bold text-xs text-[#33271D]">Pay Online Now</div>
                  <div className="text-[11px] text-[#786A5B] mt-0.5 font-light">
                    Instant UPI, Cards & NetBanking via Razorpay.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-[#E6D9C5] p-7 sm:p-8 shadow-luxury sticky top-28 space-y-6">
            <h3 className="font-serif text-xl font-bold text-[#33271D] border-b border-[#E6D9C5]/80 pb-3">
              Reservation Summary
            </h3>

            {pricing && (
              <div className="flex gap-4 items-center">
                <div className="relative w-20 h-16 rounded-2xl overflow-hidden shrink-0 bg-[#21180F]/10 border border-[#E6D9C5]">
                  <Image src={pricing.coverImage} alt={pricing.categoryName} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#33271D]">{pricing.categoryName}</h4>
                  <div className="text-xs text-[#786A5B] font-light mt-0.5">
                    {roomsCount} {roomsCount === 1 ? 'Room' : 'Rooms'} • {adults} Guests
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 text-xs py-3.5 border-y border-[#E6D9C5]/80 text-[#33271D]">
              <div>
                <span className="text-[10px] text-[#786A5B] uppercase tracking-wider font-semibold block">Check-in</span>
                <span className="font-bold">{checkIn}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#786A5B] uppercase tracking-wider font-semibold block">Check-out</span>
                <span className="font-bold">{checkOut}</span>
              </div>
            </div>

            {/* Pricing */}
            {pricing && (
              <div className="space-y-2.5 text-xs text-[#786A5B] font-light">
                <div className="flex justify-between">
                  <span>Room Charges ({roomsCount} {roomsCount === 1 ? 'room' : 'rooms'} × {pricing.nights} {pricing.nights === 1 ? 'night' : 'nights'})</span>
                  <span className="text-[#33271D] font-bold">₹{pricing.roomCharges.toLocaleString('en-IN')}</span>
                </div>
                {pricing.extraPersonsCount > 0 && (
                  <div className="flex justify-between text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/50">
                    <span>Extra Person ({pricing.extraPersonsCount} guests × ₹300 × {pricing.nights} {pricing.nights === 1 ? 'night' : 'nights'})</span>
                    <span className="font-bold">₹{pricing.extraPersonCharges.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {pricing.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Statutory GST ({pricing.taxPercentage || 5}%):</span>
                    <span className="text-[#33271D] font-bold">₹{pricing.tax.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#E6D9C5]/80 flex justify-between text-base font-bold text-[#33271D]">
                  <span>Total Payable</span>
                  <span className="font-serif text-xl text-[#43001F]">₹{pricing.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-[#786A5B] font-light">
              <Lock className="w-3.5 h-3.5 text-[#43001F]" />
              <span>Instant confirmation &amp; 256-bit encrypted checkout</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-full bg-[#43001F] hover:bg-[#2E0015] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />
      <div className="flex-grow pt-10 sm:pt-14 pb-24">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-light">Preparing checkout...</div>}>
          <CheckoutContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
