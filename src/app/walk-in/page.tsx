'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  CreditCard,
  Banknote,
  ArrowRight,
  Clock,
  MapPin,
  Wifi,
  Coffee,
  Tv,
  Wind,
  Phone,
  User,
  FileText,
  Calendar,
  Lock,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  base_price_per_night: number;
  cover_image_url: string;
  amenities: string[];
  clean_rooms_available: number;
  is_available_now: boolean;
}

function WalkInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || searchParams.get('kiosk_token') || 'STG_RECEPT_DESK_SEC_7749';

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hotelInfo, setHotelInfo] = useState<{
    kiosk_name: string;
    hotel_name: string;
    hotel_address: string;
    total_clean_rooms: number;
  } | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Selected Category & Booking Modal Form
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [idType, setIdType] = useState('aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [nights, setNights] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_hotel' | 'upi'>('upi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAndLoad() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/walk-in/verify-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.valid) {
          setIsValidToken(true);
          setHotelInfo({
            kiosk_name: data.kiosk_name,
            hotel_name: data.hotel_name,
            hotel_address: data.hotel_address,
            total_clean_rooms: data.total_clean_rooms,
          });
          setCategories(data.available_categories || []);
        } else {
          setIsValidToken(false);
          setErrorMessage(data.error || 'Invalid or missing QR kiosk token.');
        }
      } catch (err: unknown) {
        setIsValidToken(false);
        setErrorMessage(err instanceof Error ? err.message : 'Network error verifying kiosk');
      } finally {
        setIsLoading(false);
      }
    }

    verifyAndLoad();
  }, [token]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;
    if (!guestName.trim() || !guestPhone.trim()) {
      setFormError('Please enter your full name and 10-digit mobile number.');
      return;
    }
    if (guestPhone.replace(/\D/g, '').length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/walk-in/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          categoryId: selectedCat.id,
          guestName,
          guestPhone,
          guestEmail: guestEmail.trim() || undefined,
          idProofType: idType,
          idProofNumber: idNumber.trim() || undefined,
          numberOfNights: parseInt(nights, 10) || 1,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success && data.pickup_code) {
        // Redirect to digital pickup pass screen
        router.push(`/booking/pickup/${encodeURIComponent(data.pickup_code)}?ref=${encodeURIComponent(data.booking_reference)}`);
      } else {
        setFormError(data.error || 'Failed to complete walk-in reservation.');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Connection error submitting booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    if (!selectedCat) return 0;
    const n = parseInt(nights, 10) || 1;
    return selectedCat.base_price_per_night * n;
  };

  const calculateTax = () => 0; // Configured tax only; no fabricated GST percentage
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-[#D8AD56] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-xl font-bold text-[#241912]">Welcome to Sri Tayi Grand</h2>
        <p className="text-xs text-[#786B61] mt-1">Verifying reception kiosk authorization...</p>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4 shadow-sm">
          <QrCode className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-xl font-bold text-[#241912]">Reception QR Required</h2>
        <p className="text-xs text-[#786B61] mt-2 leading-relaxed">
          {errorMessage || 'To use Express Check-In, please scan the official acrylic QR code located on the front desk counter at Sri Tayi Grand.'}
        </p>
        <div className="mt-6 p-4 rounded-xl bg-[#F6EFE6] border border-[#EFE3D6] text-left text-xs text-[#382216]">
          <p className="font-bold flex items-center gap-1.5 text-[#D8AD56]">
            <MapPin className="w-4 h-4 text-[#D8AD56]" />
            <span>Sri Tayi Grand Reception</span>
          </p>
          <p className="text-[11px] text-[#786B61] mt-1">
            Main Road, Kadiri &bull; 24/7 Front Desk
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#241912] pb-16">
      {/* Top Gold Header */}
      <header className="bg-[#241912] text-white border-b border-[#382216] sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#382216] border border-[#D8AD56]/40 flex items-center justify-center text-[#D8AD56]">
              <Sparkles className="w-5 h-5 text-[#D8AD56]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base font-bold tracking-wide text-white">SRI TAYI GRAND</h1>
                <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold bg-[#D8AD56] text-[#241912]">
                  Walk-In
                </span>
              </div>
              <p className="text-[11px] text-[#D8AD56] font-medium flex items-center gap-1">
                <span>âš¡ Express Self Check-In</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-semibold">{hotelInfo?.total_clean_rooms || 0} Clean Rooms Ready</span>
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-[#EFE3D6]/70">Desk Standee</p>
            <p className="text-xs text-[#D8AD56] font-bold">Counter #1</p>
          </div>
        </div>
      </header>

      {/* Main Flow Container */}
      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Step Indicator Banner */}
        <div className="bg-gradient-to-r from-[#382216] to-[#25150F] text-white rounded-2xl p-4 shadow-sm border border-[#D8AD56]/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8AD56]">
                3-Step Express Check-In
              </span>
              <h2 className="font-serif text-lg font-bold text-white mt-0.5">
                Pick Your Room & Collect Keycard
              </h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#D8AD56]">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center text-[10px]">
            <div className="flex items-center justify-center gap-1 font-bold text-[#D8AD56]">
              <span className="w-4 h-4 rounded-full bg-[#D8AD56] text-[#25150F] flex items-center justify-center text-[9px]">1</span>
              <span>Select Category</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-[#EFE3D6]/70">
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px]">2</span>
              <span>Guest KYC</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-[#EFE3D6]/70">
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px]">3</span>
              <span>Pickup Key</span>
            </div>
          </div>
        </div>

        {/* Live Available Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#241912] flex items-center gap-2">
              <span>Available Room Categories Today</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-sans font-semibold bg-emerald-100 text-emerald-800">
                Immediate Check-in
              </span>
            </h3>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => cat.is_available_now && setSelectedCat(cat)}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  cat.is_available_now
                    ? 'border-[#EFE3D6] bg-white hover:border-[#D8AD56] shadow-sm cursor-pointer hover:shadow-md'
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="relative h-36 w-full bg-[#241912]/10">
                    <Image
                      src={cat.cover_image_url || '/images/deluxe-room.jpg'}
                      alt={cat.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      {cat.is_available_now ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{cat.clean_rooms_available} Clean Ready</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-sm">
                          Turnover In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5">
                    <div className="flex items-baseline justify-between">
                      <h4 className="font-serif font-bold text-base text-[#241912]">{cat.name}</h4>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#241912]">â‚¹{cat.base_price_per_night}</span>
                        <span className="text-[10px] text-[#786B61]">/night</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#786B61] mt-1 line-clamp-2">{cat.short_description}</p>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {cat.amenities.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-[#F6EFE6] text-[#382216] font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 pt-0">
                  <button
                    type="button"
                    disabled={!cat.is_available_now}
                    onClick={() => setSelectedCat(cat)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <span>{cat.is_available_now ? 'Select for Immediate Check-In' : 'Currently Fully Booked'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Express Booking & KYC Modal */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto border border-[#EFE3D6] p-5 sm:p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8AD56]">
                  Immediate Walk-In Check-In
                </span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">{selectedCat.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCat(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold cursor-pointer"
              >
                âœ•
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs">
              {/* Stay Duration Selector */}
              <div className="p-3 rounded-xl bg-[#F6EFE6]/60 border border-[#EFE3D6] space-y-2">
                <label className="font-bold text-[#382216] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#D8AD56]" />
                  <span>Number of Nights</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '2', '3', '4'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNights(n)}
                      className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        nights === n
                          ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
                          : 'bg-white border border-[#EFE3D6] text-[#382216] hover:bg-gray-50'
                      }`}
                    >
                      {n} {n === '1' ? 'Night' : 'Nights'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#786B61]">
                  Check-in: <b>Today (Now)</b> &bull; Checkout: <b>Tomorrow 11:00 AM</b>
                </p>
              </div>

              {/* Guest KYC Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#241912] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#D8AD56]" />
                  <span>Guest Details</span>
                </h4>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#786B61]">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-xs text-[#241912] focus:border-[#D8AD56] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#786B61]">Mobile Number (10 digits) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-xs text-[#241912] focus:border-[#D8AD56] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#786B61]">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="guest@gmail.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-xs text-[#241912] focus:border-[#D8AD56] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#786B61]">ID Proof Type</label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-xs text-[#241912] outline-none"
                    >
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="driving_license">Driving License</option>
                      <option value="passport">Passport</option>
                      <option value="voter_id">Voter ID</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#786B61]">ID Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="XXXX-XXXX-XXXX"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-xs text-[#241912] focus:border-[#D8AD56] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2 pt-2 border-t border-[#EFE3D6]">
                <h4 className="font-bold text-[#241912] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#D8AD56]" />
                  <span>Choose Payment Method</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-[#D8AD56] bg-amber-50/50 text-[#382216]'
                        : 'border-[#EFE3D6] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="radio" checked={paymentMethod === 'upi'} readOnly />
                      <span className="font-bold">UPI / Instant Online</span>
                    </div>
                    <p className="text-[10px] text-[#786B61] mt-1 pl-5">GPay, PhonePe, Paytm, Card</p>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('pay_at_hotel')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'pay_at_hotel'
                        ? 'border-[#D8AD56] bg-amber-50/50 text-[#382216]'
                        : 'border-[#EFE3D6] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="radio" checked={paymentMethod === 'pay_at_hotel'} readOnly />
                      <span className="font-bold">Pay at Front Desk</span>
                    </div>
                    <p className="text-[10px] text-[#786B61] mt-1 pl-5">Cash or Card at Counter</p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-3.5 rounded-xl bg-[#F6EFE6] border border-[#EFE3D6] space-y-1.5">
                <div className="flex justify-between text-[#786B61]">
                  <span>Room Charge ({nights} {nights === '1' ? 'Night' : 'Nights'})</span>
                  <span>₹{calculateSubtotal().toLocaleString('en-IN')}</span>
                </div>
                {calculateTax() > 0 && (
                  <div className="flex justify-between text-[#786B61]">
                    <span>Configured Tax</span>
                    <span>₹{calculateTax().toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#241912] pt-1.5 border-t border-[#EFE3D6]">
                  <span>Total Payable</span>
                  <span className="text-[#D8AD56]">₹{calculateTotal().toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#D8AD56] border-t-transparent rounded-full animate-spin" />
                    <span>Reserving Your Room...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-[#D8AD56]" />
                    <span>Confirm & Get Keycard Pickup Code</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalkInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-[#D8AD56] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WalkInContent />
    </Suspense>
  );
}
