'use client';

import { useState, use } from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { repo } from '@/lib/db/repository';
import { calculateBookingTariff, getAuthoritativeTariff } from '@/lib/pricing';
import {
  Users,
  Bed,
  Maximize2,
  Check,
  Clock,
  Snowflake,
  Wifi,
  Tv,
  Coffee,
  Droplets,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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

  // Gallery
  const galleryImages = room.gallery_images && room.gallery_images.length > 0 
    ? room.gallery_images 
    : [room.cover_image_url];
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Booking state
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
    taxPercentage: 0, // No fabricated tax; configured only
  });

  const nights = tariffCalc.billingPeriods;
  const subtotal = tariffCalc.subtotalRupees;
  const tax = tariffCalc.taxAmountRupees;
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
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Minimal Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-[#8C7A6B] mb-8">
            <NextLink href="/" className="hover:text-[#D8AD56]">Home</NextLink>
            <span>/</span>
            <NextLink href="/rooms" className="hover:text-[#D8AD56]">Accommodations</NextLink>
            <span>/</span>
            <span className="text-[#241912] font-medium">{room.name}</span>
          </nav>

          {/* Primary Suite Showcase & Reservation Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mb-20">
            {/* Gallery (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/20 bg-[#20120B]/10">
                <Image
                  src={galleryImages[activeImageIdx]}
                  alt={`${room.name} - View ${activeImageIdx + 1}`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />

                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-light">
                  {activeImageIdx + 1} of {galleryImages.length}
                </div>

                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIdx((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
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
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                        activeImageIdx === i ? 'border-[#D8AD56] scale-102 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reservation Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-8 shadow-luxury sticky top-28">
                {/* Header */}
                <div className="border-b border-[#F8F1E9] pb-5 mb-5">
                  <h1 className="font-serif text-3xl font-medium text-[#241912]">
                    {room.name}
                  </h1>
                  <p className="text-xs text-[#786B61] mt-1.5 font-light leading-relaxed">
                    {room.short_description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#241912] mt-4 pt-3 border-t border-[#F8F1E9]">
                    <div className="flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-[#D8AD56]" />
                      <span>{room.bed_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#D8AD56]" />
                      <span>Included: {room.included_occupancy || 2} Persons</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#D8AD56] font-bold">Extra:</span>
                      <span>₹300/person (Max {room.max_occupancy})</span>
                    </div>
                    {room.room_size_sqft && (
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>{room.room_size_sqft} sq.ft</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rate */}
                <div className="flex items-baseline justify-between mb-5">
                  <div>
                    <span className="font-serif text-3xl text-[#241912]">
                      ₹{room.base_price_per_night.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-[#786B61] ml-1 font-light">/ night</span>
                  </div>
                  <span className="text-xs text-[#8C7A6B] font-light">Includes high-speed Wi-Fi</span>
                </div>

                {/* Reservation Form */}
                <form onSubmit={handleProceedBooking} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        min={formatDate(today)}
                        onChange={(e) => {
                          setCheckIn(e.target.value);
                          if (new Date(e.target.value) >= new Date(checkOut)) {
                            const next = new Date(e.target.value);
                            next.setDate(next.getDate() + 1);
                            setCheckOut(formatDate(next));
                          }
                        }}
                        required
                        className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        min={checkIn}
                        onChange={(e) => setCheckOut(e.target.value)}
                        required
                        className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                        Guests
                      </label>
                      <select
                        value={adults}
                        onChange={(e) => setAdults(Number(e.target.value))}
                        className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                      >
                        {[...Array(room.max_occupancy)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                        Rooms
                      </label>
                      <select
                        value={roomsCount}
                        onChange={(e) => setRoomsCount(Number(e.target.value))}
                        className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                      >
                        <option value={1}>1 Room</option>
                        <option value={2}>2 Rooms</option>
                        <option value={3}>3 Rooms</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary Breakdown */}
                  <div className="pt-4 border-t border-[#F8F1E9] text-xs space-y-2 text-[#786B61] font-light">
                    <div className="flex justify-between">
                      <span>Room Charges ({roomsCount} {roomsCount === 1 ? 'room' : 'rooms'} × {nights} {nights === 1 ? 'night' : 'nights'})</span>
                      <span className="text-[#241912] font-medium">₹{tariffCalc.roomChargesRupees.toLocaleString('en-IN')}</span>
                    </div>

                    {tariffCalc.extraPersonsCount > 0 && (
                      <div className="flex justify-between text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50">
                        <span>Extra Person Charge ({tariffCalc.extraPersonsCount} additional {tariffCalc.extraPersonsCount === 1 ? 'guest' : 'guests'} × ₹300 × {nights} {nights === 1 ? 'night' : 'nights'})</span>
                        <span className="font-medium">₹{tariffCalc.extraPersonChargesRupees.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {tariffCalc.taxAmountRupees > 0 && (
                      <div className="flex justify-between">
                        <span>Configured Tax ({tariffCalc.taxPercentage}%)</span>
                        <span className="text-[#241912] font-medium">₹{tariffCalc.taxAmountRupees.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {!tariffCalc.isValid && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] leading-tight font-normal">
                        {tariffCalc.errorMessage}
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-medium text-[#241912] pt-2 border-t border-[#F8F1E9]">
                      <span>Total Payable</span>
                      <span className="font-serif text-base text-[#241912]">₹{tariffCalc.totalRupees.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!tariffCalc.isValid}
                    className="w-full py-3.5 px-4 rounded-full bg-[#D8AD56] hover:bg-[#C69940] disabled:bg-gray-300 disabled:cursor-not-allowed text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-goldGlow hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Proceed to Reservation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Room Details & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
            <div className="lg:col-span-8 space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#241912] mb-3">
                  About the Sanctuary
                </h2>
                <p className="text-sm text-[#786B61] leading-relaxed font-light">
                  {room.full_description}
                </p>
              </div>

              {/* Room Features */}
              <div className="pt-6 border-t border-[#EFE3D6]/70">
                <h3 className="font-serif text-lg font-medium text-[#241912] mb-4">
                  Signature Inclusions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#241912]">
                  {(room.features || [
                    'Spacious living lounge with comfortable armchairs',
                    'Premium king-size bed with orthopedic mattress',
                    'Private outdoor balcony with peaceful view',
                    'Dedicated work desk and illumination',
                    'Ample wardrobe and luggage storage space',
                  ]).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <Check className="w-3.5 h-3.5 text-[#D8AD56] shrink-0 mt-0.5" />
                      <span className="font-light">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Details */}
              <div className="pt-6 border-t border-[#EFE3D6]/70 flex flex-wrap gap-8 text-xs text-[#786B61]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D8AD56]" />
                  <span>Check-in: <strong>2:00 PM</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D8AD56]" />
                  <span>Check-out: <strong>11:00 AM</strong></span>
                </div>
              </div>
            </div>

            {/* Scenic Photo Banner */}
            <div className="lg:col-span-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/20">
                <Image
                  src="/images/hotel/suite-balcony-seating.jpg"
                  alt="Suite Balcony"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Other Accommodations */}
          <div className="pt-14 border-t border-[#D8AD56]/20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-1">
                  Explore More
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#241912]">
                  Other Sanctuaries
                </h3>
              </div>
              <NextLink href="/rooms" className="text-xs uppercase tracking-wider text-[#8C7A6B] hover:text-[#D8AD56] font-medium">
                View All
              </NextLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {otherRooms.map((oth) => (
                <NextLink
                  key={oth.id}
                  href={`/rooms/${oth.slug}`}
                  className="bg-white rounded-2xl overflow-hidden border border-[#D8AD56]/20 shadow-luxury hover:shadow-luxuryHover hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#20120B]/10">
                    <Image
                      src={oth.cover_image_url}
                      alt={oth.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-medium text-base text-[#241912] group-hover:text-[#D8AD56] transition-colors">
                        {oth.name}
                      </h4>
                      <p className="text-xs text-[#786B61] mt-1 font-light line-clamp-1">
                        {oth.short_description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F8F1E9] flex items-center justify-between text-xs">
                      <span className="font-serif text-sm text-[#241912]">
                        ₹{oth.base_price_per_night.toLocaleString('en-IN')} <span className="text-[10px] text-[#786B61] font-light">/ night</span>
                      </span>
                      <span className="text-[#D8AD56] font-medium flex items-center gap-1">
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </NextLink>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
