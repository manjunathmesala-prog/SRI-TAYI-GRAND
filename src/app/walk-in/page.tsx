'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from '@/components/ui/Toast';
import {
  Sparkles,
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
  Calendar,
  Lock,
  ChevronRight,
  BedDouble,
  Loader2,
  Images,
  ChevronLeft,
  X,
  Eye,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  base_price_per_night: number;
  tax_percentage: number;
  bed_type: string;
  cover_image_url: string;
  gallery_images?: string[];
  amenities: string[];
  clean_rooms_available: number;
  is_available_now: boolean;
}

function WalkInKioskContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token =
    searchParams.get('token') ||
    searchParams.get('kiosk_token') ||
    'STG_RECEPT_DESK_SEC_7749';

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hotelInfo, setHotelInfo] = useState<{
    hotel_name: string;
    hotel_address: string;
    wifi_ssid: string;
    total_clean_rooms: number;
  } | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Selected Category & Booking Form
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);
  const [galleryCat, setGalleryCat] = useState<CategoryItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const openGallery = (cat: CategoryItem) => {
    setGalleryCat(cat);
    setActiveImageIdx(0);
  };

  const closeGallery = () => {
    setGalleryCat(null);
    setActiveImageIdx(0);
  };

  const galleryImages =
    galleryCat?.gallery_images && galleryCat.gallery_images.length > 0
      ? galleryCat.gallery_images
      : [galleryCat?.cover_image_url || '/images/hotel/room-suite-large.jpg'];

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIdx((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIdx((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation & body scroll lock for image gallery modal
  useEffect(() => {
    if (!galleryCat) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeGallery();
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIdx((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIdx((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [galleryCat, galleryImages.length]);

  // Form states
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [idProofType, setIdProofType] = useState('aadhaar');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [numNights, setNumNights] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dynamically load Razorpay Checkout SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Verify Kiosk Token & Load Categories
  useEffect(() => {
    async function verifyAndLoad() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/walk-in/verify-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setIsValidToken(true);
          setHotelInfo({
            hotel_name: data.hotel_name || 'Sri Tayi Grand',
            hotel_address: data.hotel_address || 'Main Road, Kadiri, Andhra Pradesh 515591',
            wifi_ssid: data.wifi_ssid || 'SriTayiGrand_Guest',
            total_clean_rooms: data.total_clean_rooms || 0,
          });
          const catList = data.categories || data.available_categories || [];
          setCategories(catList);
          if (catList.length > 0) {
            setSelectedCat(catList[0]);
          }
        } else {
          setIsValidToken(false);
          setErrorMessage(
            data.error || 'Invalid or expired reception QR token. Please ask the front desk.'
          );
        }
      } catch {
        setIsValidToken(false);
        setErrorMessage('Failed to connect to hotel front desk server.');
      } finally {
        setIsLoading(false);
      }
    }

    verifyAndLoad();
  }, [token]);

  // Handle Form Submission with Cash or Razorpay Online Payment
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;

    if (!guestName.trim() || !guestPhone.trim()) {
      toast.warning('Please enter your full name and 10-digit mobile number.');
      return;
    }

    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.warning('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/walk-in/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          categoryId: selectedCat.id,
          guestName: guestName.trim(),
          guestPhone: cleanPhone,
          guestEmail: guestEmail.trim() || undefined,
          idProofType,
          idProofNumber: idProofNumber.trim() || undefined,
          paymentMethod,
          numNights,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Could not complete walk-in booking.');
        setSubmitting(false);
        return;
      }

      const { bookingReference, pickupCode, razorpayOrder } = data;

      // Case A: Online Payment via Razorpay
      if (paymentMethod === 'online' && razorpayOrder) {
        if (typeof window !== 'undefined' && window.Razorpay) {
          const razorpayKey =
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_Ty3N7lQ7MDxqRm';

          const options = {
            key: razorpayKey,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency || 'INR',
            name: 'SRI TAYI GRAND',
            description: `Walk-In Booking: ${selectedCat.name} (${numNights} Night${numNights > 1 ? 's' : ''})`,
            image: '/images/hotel/tayi-grand-logo.png',
            order_id: razorpayOrder.id,
            prefill: {
              name: guestName.trim(),
              email: guestEmail.trim() || `${cleanPhone}@guest.sritayigrand.com`,
              contact: cleanPhone,
            },
            theme: {
              color: '#382216',
            },
            handler: async function (response: any) {
              try {
                // Verify cryptographic payment signature
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
                  toast.success('Payment verified! Redirecting to your digital key pass...');
                  router.push(
                    `/booking/pickup/${encodeURIComponent(pickupCode)}?ref=${encodeURIComponent(
                      bookingReference
                    )}`
                  );
                } else {
                  toast.warning('Payment received, confirming reservation at desk...');
                  router.push(
                    `/booking/pickup/${encodeURIComponent(pickupCode)}?ref=${encodeURIComponent(
                      bookingReference
                    )}`
                  );
                }
              } catch {
                toast.success('Payment processed! Loading key pickup pass...');
                router.push(
                  `/booking/pickup/${encodeURIComponent(pickupCode)}?ref=${encodeURIComponent(
                    bookingReference
                  )}`
                );
              }
            },
            modal: {
              ondismiss: function () {
                setSubmitting(false);
                toast.info('Payment window closed. You can retry or pay at the counter.');
              },
            },
          };

          const rzpInstance = new window.Razorpay(options);
          rzpInstance.on('payment.failed', function (err: any) {
            setSubmitting(false);
            toast.error(err.error?.description || 'Online payment failed. Please pay at counter.');
          });
          rzpInstance.open();
          return;
        } else {
          // Fallback if Razorpay SDK failed to load
          toast.info('Directing to counter payment pass...');
          router.push(
            `/booking/pickup/${encodeURIComponent(pickupCode)}?ref=${encodeURIComponent(
              bookingReference
            )}`
          );
        }
      } else {
        // Case B: Cash/Counter Payment
        toast.success('Room reserved successfully! Redirecting to key pickup pass...');
        router.push(
          `/booking/pickup/${encodeURIComponent(pickupCode)}?ref=${encodeURIComponent(
            bookingReference
          )}`
        );
      }
    } catch {
      toast.error('Network error. Please inform reception staff.');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#21180F] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#D8AD56] border-t-transparent animate-spin mb-4" />
        <h2 className="text-white font-serif text-lg font-bold">Connecting to Sri Tayi Grand Front Desk...</h2>
        <p className="text-stone-400 text-xs mt-1">Verifying counter token and room inventory</p>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-[#21180F] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-900/30 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-white font-serif text-xl font-bold">QR Token Expired or Invalid</h1>
        <p className="text-stone-400 text-xs mt-2 max-w-sm">{errorMessage}</p>
        <p className="text-amber-400/80 text-[11px] mt-4">
          Please ask the receptionist at the front desk for an updated QR code.
        </p>
      </div>
    );
  }

  const roomSubtotal = (selectedCat?.base_price_per_night || 1800) * numNights;
  const taxesInr = Math.round(roomSubtotal * 0.05);
  const totalInr = roomSubtotal + taxesInr;

  return (
    <div className="min-h-screen bg-[#F8F3E9] text-[#33271D] pb-16">
      {/* Website Hero Section Header */}
      <section className="relative z-20 w-full flex flex-col justify-center items-center text-center px-4 pt-10 sm:pt-14 pb-8 sm:pb-12 overflow-hidden bg-[#21180F]">
        {/* Background Cinematic Video with fallback poster and gradient */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#21180F]">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/images/hotel/hotel-exterior-hero.jpg"
            className="w-full h-full object-cover object-center scale-[1.02]"
          >
            <source src="/videos/hotel-hero.mp4" type="video/mp4" />
          </video>
          {/* Ambient gradient overlay transitioning to page background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#21180F]/85 via-[#21180F]/60 to-[#F8F3E9]" />
        </div>

        {/* Hero Title & Subtitle */}
        <div className="relative z-10 max-w-md mx-auto space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center animate-bounce duration-1000">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-2xl">
              <Image
                src="/images/hotel/tayi-grand-logo.png"
                alt="Sri Tayi Grand Hotel Emblem"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-[0.14em] uppercase drop-shadow-lg leading-tight">
              Sri Tayi Grand
            </h1>
            <p className="text-xs sm:text-sm font-serif tracking-[0.32em] uppercase text-[#D8AD56] drop-shadow-md font-semibold">
              HOTEL &bull; CONVENTION HALL &bull; KADIRI
            </p>
          </div>
          <p className="text-xs sm:text-sm text-[#F8F3E9]/95 font-serif italic max-w-sm mx-auto drop-shadow-md leading-relaxed">
            Comfortable AC rooms &amp; authentic hospitality on Main Road, Kadiri.
          </p>

          <div className="pt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-[#D8AD56]/40 text-[10px] sm:text-[11px] text-[#F8F3E9] uppercase tracking-wider font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Express Digital Front Desk &bull; Instant Check-In</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-md mx-auto px-4 py-5 space-y-6">
        {/* Welcome Pill */}
        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8D672F]/10 text-[#8D672F] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xs text-[#33271D]">Welcome to Sri Tayi Grand Hotel</h2>
              <p className="text-[10px] text-[#786A5B] leading-tight">
                Select your room & collect your physical key at the desk in 1 minute.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Select Room Category */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#786A5B]">
              Step 1: Choose Your Room
            </h3>
            <span className="text-[10px] text-[#8D672F] font-semibold">
              All Rooms Fully Air-Conditioned
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCat?.id === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-[#8D672F] ring-2 ring-[#8D672F]/30 shadow-md'
                      : 'bg-white/80 border-[#E6D9C5] hover:border-[#8D672F]/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Clickable Room Image */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openGallery(cat);
                        }}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 relative cursor-pointer group shadow-xs hover:ring-2 hover:ring-[#8D672F] transition-all"
                        title="Click to view room photos"
                      >
                        <Image
                          src={cat.cover_image_url || '/images/hotel/room-suite-large.jpg'}
                          alt={cat.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4 drop-shadow" />
                        </div>
                      </div>

                      {/* Room Details */}
                      <div className="min-w-0">
                        {/* Clickable Room Title */}
                        <h4
                          onClick={(e) => {
                            e.stopPropagation();
                            openGallery(cat);
                          }}
                          className="font-serif font-bold text-sm text-[#33271D] leading-tight cursor-pointer hover:text-[#8D672F] transition-colors flex items-center gap-1"
                          title="Click to view room photos"
                        >
                          <span className="truncate">{cat.name}</span>
                        </h4>
                        {cat.bed_type && !cat.name.toLowerCase().includes(cat.bed_type.toLowerCase()) && (
                          <span className="text-[10px] text-[#786A5B] block mt-0.5">{cat.bed_type}</span>
                        )}

                        {/* 'View Room Images' Button + Confirmation Pill */}
                        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openGallery(cat);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#8D672F]/10 hover:bg-[#8D672F]/20 text-[10px] font-semibold text-[#8D672F] active:scale-95 transition-all cursor-pointer"
                          >
                            <Images className="w-3 h-3 text-[#8D672F]" />
                            <span>View Room Images</span>
                          </button>

                          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sanitized AC</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-serif font-bold text-sm text-[#8D672F]">
                        ₹{cat.base_price_per_night.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#786A5B] block">/ night + 5% GST</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Guest Details Form */}
        <form onSubmit={handleBookingSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#786A5B] pb-2 border-b border-[#E6D9C5]">
              Step 2: Guest Information (Government ID)
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-[#33271D] mb-1">
                Full Name (as per Govt ID) *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#786A5B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Naidu"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#33271D] mb-1">
                Mobile Number (for digital key & Wi-Fi) *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-[#786A5B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#33271D] mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="name@example.com (for digital tax invoice)"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#33271D] mb-1">ID Type</label>
                <select
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] bg-white focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                >
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="driving_licence">Driving Licence</option>
                  <option value="passport">Passport</option>
                  <option value="voter_id">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#33271D] mb-1">Last 4 Digits / Number</label>
                <input
                  type="text"
                  placeholder="e.g. 8921"
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#33271D] mb-1">Stay Duration</label>
                <select
                  value={numNights}
                  onChange={(e) => setNumNights(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] bg-white focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                >
                  <option value={1}>1 Night</option>
                  <option value={2}>2 Nights</option>
                  <option value={3}>3 Nights</option>
                  <option value={5}>5 Nights</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#33271D] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#E6D9C5] text-xs text-[#33271D] bg-white focus:outline-none focus:ring-1 focus:ring-[#8D672F]"
                >
                  <option value="cash">Pay Cash/UPI at Counter</option>
                  <option value="online">Pay Online (Instant UPI/Cards)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5] shadow-xs space-y-2 text-xs">
            <div className="flex justify-between text-[#786A5B]">
              <span>Room Tariff ({selectedCat?.name} &times; {numNights} Night{numNights > 1 ? 's' : ''}):</span>
              <span>₹{roomSubtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[#786A5B]">
              <span>Statutory GST (5%):</span>
              <span>₹{taxesInr.toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-2 border-t border-[#E6D9C5] flex justify-between font-bold text-[#33271D] text-sm">
              <span>Total Payable Amount:</span>
              <span className="text-[#8D672F]">₹{totalInr.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#8D672F] hover:bg-[#6D4E21] text-white font-serif font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {paymentMethod === 'online'
                    ? 'Initializing Secure Payment Gateway...'
                    : 'Generating Your Room Key Pass...'}
                </span>
              </>
            ) : paymentMethod === 'online' ? (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay Online ₹{totalInr.toLocaleString('en-IN')} &amp; Get Key Pass</span>
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Confirm Check-In &amp; Get Key Pass</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-center text-[#786A5B]">
          Official Sri Tayi Grand Hotel Reception Terminal &bull; Main Road, Kadiri 515591
        </p>
      </div>

      {/* =========================================================================
          ROOM IMAGES LIGHTBOX & GALLERY MODAL
          ========================================================================= */}
      {galleryCat && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${galleryCat.name} Photo Gallery`}
          onClick={closeGallery}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#21180F] rounded-3xl overflow-hidden border border-[#D8AD56]/40 shadow-2xl flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#2A1F13] text-white">
              <div>
                <h3 className="font-serif font-bold text-base text-white tracking-wide flex items-center gap-2">
                  <span>{galleryCat.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8D672F]/30 text-[#D8AD56] font-sans font-semibold uppercase tracking-wider">
                    Photos
                  </span>
                </h3>
                <span className="text-[11px] text-[#D8AD56] font-medium block">
                  {galleryCat.bed_type && !galleryCat.name.toLowerCase().includes(galleryCat.bed_type.toLowerCase()) ? `${galleryCat.bed_type} • ` : ''}₹{galleryCat.base_price_per_night.toLocaleString('en-IN')} / night
                </span>
              </div>

              <button
                type="button"
                onClick={closeGallery}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-stone-300 hover:text-white transition-all cursor-pointer"
                title="Close gallery (Esc)"
                aria-label="Close gallery"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Gallery Body */}
            <div className="overflow-y-auto flex-1 no-scrollbar space-y-3 p-4">
              {/* Main Image Stage */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/50 shadow-inner group">
                <Image
                  src={galleryImages[activeImageIdx]}
                  alt={`${galleryCat.name} photo ${activeImageIdx + 1}`}
                  fill
                  className="object-cover transition-opacity duration-300"
                  priority
                />

                {/* Photo Counter Pill */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-medium shadow-md">
                  Photo {activeImageIdx + 1} of {galleryImages.length}
                </div>

                {/* Left Navigation Arrow */}
                {galleryImages.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center shadow-lg transition-all active:scale-90 border border-white/20 cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* Right Navigation Arrow */}
                {galleryImages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center shadow-lg transition-all active:scale-90 border border-white/20 cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Thumbnail Strip */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {galleryImages.map((img, idx) => {
                    const isActive = activeImageIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          isActive
                            ? 'border-[#D8AD56] ring-2 ring-[#D8AD56]/40 scale-105'
                            : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${galleryCat.name} thumb ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Room Description & Highlights */}
              <div className="bg-[#2A1F13] rounded-2xl p-3.5 border border-white/10 text-xs text-stone-300 space-y-2">
                <p className="text-[11px] text-stone-300 leading-relaxed font-sans">
                  {galleryCat.short_description}
                </p>

                {galleryCat.amenities && galleryCat.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {galleryCat.amenities.map((amenity, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-[#D8AD56]"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-[#2A1F13] border-t border-white/10 flex items-center gap-2.5">
              <button
                type="button"
                onClick={closeGallery}
                className="px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCat(galleryCat);
                  closeGallery();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8D672F] to-[#B18A4A] hover:brightness-110 active:scale-[0.98] text-white font-serif font-bold text-xs tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Select This Room</span>
              </button>
            </div>
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
        <div className="min-h-screen bg-[#21180F] flex items-center justify-center text-white text-xs">
          Loading Sri Tayi Grand Front Desk Kiosk...
        </div>
      }
    >
      <WalkInKioskContent />
    </Suspense>
  );
}
