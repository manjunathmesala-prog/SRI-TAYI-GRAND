'use client';

import React, { useState, use } from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { LuxuryDatePicker } from '@/components/ui/LuxuryDatePicker';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { repo } from '@/lib/db/repository';
import { calculateBookingTariff } from '@/lib/pricing';
import {
  Users,
  Bed,
  Maximize2,
  Check,
  Clock,
  Wind,
  Wifi,
  Tv,
  Coffee,
  Droplets,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface RoomDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function RoomDetailsPage({ params }: RoomDetailsPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const room = repo.getCategoryBySlug(resolvedParams.slug);
  if (!room) {
    notFound();
  }

  const allCategories = repo.getCategories();
  const otherRooms = allCategories.filter((c) => c.slug !== room.slug).slice(0, 3);

  const galleryImages = room.gallery_images && room.gallery_images.length > 0 
    ? room.gallery_images 
    : [room.cover_image_url];
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(formatDate(today));
  const [checkOut, setCheckOut] = useState(formatDate(tomorrow));
  const [adults, setAdults] = useState(Math.min(2, room.max_adults));
  const [children, setChildren] = useState(0);
  const [roomsCount, setRoomsCount] = useState(1);

  const tariffCalc = calculateBookingTariff({
    categoryId: room.id,
    checkIn,
    checkOut,
    roomsCount,
    adultsCount: adults,
    childrenCount: children,
    customRatePaise: room.base_tariff_paise,
    taxPercentage: 0,
  });

  const nights = tariffCalc.billingPeriods;
  const total = tariffCalc.totalRupees;

  const handleProceedBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams({
      categoryId: room.id,
      slug: room.slug,
      checkIn,
      checkOut,
      adults: adults.toString(),
      children: children.toString(),
      roomsCount: roomsCount.toString(),
    });

    router.push(`/booking/checkout?${query.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      <div className="flex-grow pt-8 sm:pt-12 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-[#786A5B] mb-8">
            <TayiBrandIcon size={16} />
            <NextLink href="/" className="hover:text-[#43001F] transition-colors">Home</NextLink>
            <span>/</span>
            <NextLink href="/rooms" className="hover:text-[#43001F] transition-colors">Rooms &amp; Suites</NextLink>
            <span>/</span>
            <span className="text-[#33271D] font-semibold">{room.name}</span>
          </nav>

          {/* Primary Suite Showcase & Reservation Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mb-20">
            {/* Gallery (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[16/10] w-full rounded-3xl overflow-hidden shadow-luxury border border-[#E6D9C5] bg-[#21180F]">
                <Image
                  src={galleryImages[activeImageIdx]}
                  alt={`${room.name} - View ${activeImageIdx + 1}`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />

                <div className="absolute bottom-4 left-4 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                  {activeImageIdx + 1} of {galleryImages.length}
                </div>

                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIdx((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                  {galleryImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIdx === i ? 'border-[#43001F] scale-102 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Full Description & Inclusions */}
              <div className="bg-white rounded-3xl border border-[#E6D9C5] p-6 sm:p-8 shadow-luxury space-y-6 mt-6">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#33271D]">
                    About This Room
                  </h2>
                  <p className="text-sm text-[#786A5B] mt-3 leading-relaxed font-light">
                    {room.full_description || room.short_description}
                  </p>
                </div>

                <div className="pt-6 border-t border-[#E6D9C5]/60">
                  <h3 className="font-serif text-lg font-bold text-[#33271D] mb-4">
                    Included Amenities &amp; Features
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#33271D]">
                    {(room.amenities || []).map((amenity, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAF6EE] border border-[#E6D9C5]">
                        <Check className="w-4 h-4 text-[#43001F] shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#E6D9C5]/60">
                  <h3 className="font-serif text-lg font-bold text-[#33271D] mb-3">
                    Stay Policies
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#786A5B]">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-[#43001F] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#33271D] block">Check-in / Check-out:</strong>
                        Check-in 12:00 PM • Check-out 11:00 AM
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#43001F] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#33271D] block">Govt. ID Requirement:</strong>
                        Valid photo ID required for all adult guests at check-in.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reservation Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl border border-[#E6D9C5] p-7 sm:p-8 shadow-luxury sticky top-28">
                {/* Header */}
                <div className="border-b border-[#E6D9C5]/80 pb-5 mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#43001F] block">
                      SELECTED ROOM
                    </span>
                    <TayiBrandIcon size={20} />
                  </div>
                  <h1 className="font-serif text-3xl font-bold text-[#33271D]">
                    {room.name}
                  </h1>
                  <p className="text-xs text-[#786A5B] mt-1.5 font-light leading-relaxed">
                    {room.short_description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#33271D] mt-4 pt-3 border-t border-[#E6D9C5]/60">
                    <div className="flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-[#43001F]" />
                      <span>{room.bed_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#43001F]" />
                      <span>Included: {room.included_occupancy || 2} Persons</span>
                    </div>
                    {room.room_size_sqft && (
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-[#43001F]" />
                        <span>{room.room_size_sqft} sq.ft</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rate */}
                <div className="flex items-baseline justify-between mb-5">
                  <div>
                    <span className="font-serif text-3xl font-bold text-[#33271D]">
                      ₹{room.base_price_per_night.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-[#786A5B] ml-1 font-light">/ night</span>
                  </div>
                  <span className="text-xs text-[#43001F] font-semibold">Includes Free Wi-Fi</span>
                </div>

                {/* Reservation Form */}
                <form onSubmit={handleProceedBooking} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <LuxuryDatePicker
                      label="Check-in"
                      value={checkIn}
                      minDate={formatDate(today)}
                      onChange={(val) => {
                        setCheckIn(val);
                        if (val && checkOut && new Date(val) >= new Date(checkOut)) {
                          const next = new Date(val);
                          next.setDate(next.getDate() + 1);
                          setCheckOut(formatDate(next));
                        }
                      }}
                    />

                    <LuxuryDatePicker
                      label="Check-out"
                      value={checkOut}
                      minDate={checkIn || formatDate(today)}
                      rangeStart={checkIn}
                      onChange={(val) => setCheckOut(val)}
                      align="right"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <LuxurySelect
                      label="Rooms"
                      value={roomsCount}
                      onChange={(val) => setRoomsCount(Number(val))}
                      options={[1, 2, 3, 4, 5].map((n) => ({
                        value: n,
                        label: `${n} ${n === 1 ? 'Room' : 'Rooms'}`,
                      }))}
                    />

                    <LuxurySelect
                      label="Adults"
                      value={adults}
                      onChange={(val) => setAdults(Number(val))}
                      options={Array.from({ length: room.max_adults || 4 }, (_, i) => i + 1).map((n) => ({
                        value: n,
                        label: `${n} ${n === 1 ? 'Adult' : 'Adults'}`,
                      }))}
                    />

                    <LuxurySelect
                      label="Children"
                      value={children}
                      onChange={(val) => setChildren(Number(val))}
                      options={[0, 1, 2, 3].map((n) => ({
                        value: n,
                        label: `${n} ${n === 1 ? 'Child' : 'Children'}`,
                      }))}
                      align="right"
                    />
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E6D9C5] space-y-2 text-xs">
                    <div className="flex justify-between text-[#786A5B]">
                      <span>{nights} {nights === 1 ? 'Night' : 'Nights'} × {roomsCount} {roomsCount === 1 ? 'Room' : 'Rooms'}</span>
                      <span className="font-semibold text-[#33271D]">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E6D9C5]/80 flex justify-between text-sm font-serif font-bold text-[#33271D]">
                      <span>Estimated Total</span>
                      <span className="text-[#43001F]">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-full bg-[#43001F] hover:bg-[#2E0015] active:scale-[0.98] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Reserve Room</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <a
                    href="tel:08494223379"
                    className="text-xs text-[#43001F] hover:underline"
                  >
                    Questions? Call Front Desk: 084942 23379
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Other Rooms You May Like */}
          <div className="pt-16 border-t border-[#E6D9C5]">
            <h2 className="font-serif text-2xl font-bold text-[#33271D] text-center mb-8">
              Explore Other Accommodations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherRooms.map((other) => (
                <div
                  key={other.id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#E6D9C5] shadow-luxury luxury-card-hover group flex flex-col justify-between"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-[#21180F]">
                    <Image
                      src={other.cover_image_url}
                      alt={other.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-[#F8F3E9]/95 px-3 py-1 rounded-full text-[10px] font-semibold text-[#43001F] border border-[#E6D9C5]">
                      ₹ {other.base_price_per_night.toLocaleString('en-IN')} / night
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-serif font-bold text-[#33271D] group-hover:text-[#43001F] transition-colors">
                      {other.name}
                    </h3>
                    <p className="text-xs text-[#786A5B] line-clamp-2">
                      {other.short_description}
                    </p>
                    <div className="pt-3">
                      <NextLink
                        href={`/rooms/${other.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[#43001F] hover:text-[#2E0015]"
                      >
                        <span>View Room</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </NextLink>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}
