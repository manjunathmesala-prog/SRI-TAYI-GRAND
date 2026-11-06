import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { TestimonialsSection } from '@/components/testimonials/TestimonialsSection';
import { repo } from '@/lib/db/repository';
import { 
  Snowflake, 
  Car, 
  Users, 
  Wifi, 
  Bell, 
  ArrowRight, 
  MapPin, 
  Phone, 
  Calendar 
} from 'lucide-react';

export default function HomePage() {
  const categories = repo.getCategories();

  return (
    <div className="flex flex-col min-h-screen">
      <Header transparentInitially={true} />

      <main className="flex-grow">
        {/* =========================================================================
            HERO SECTION â€” EXACT MATCH TO DESIGN MOCKUP
            ========================================================================= */}
        <section className="relative min-h-[620px] sm:min-h-[720px] lg:min-h-[820px] flex flex-col justify-between pt-32 sm:pt-40 pb-8 sm:pb-12 overflow-hidden bg-[#25150F]">
          {/* Authentic Hotel Exterior Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/hotel-exterior-hero-clean.jpg"
              alt="Tayi Grand Hotel Facade"
              fill
              priority
              className="object-cover object-[70%_center] sm:object-center"
              sizes="100vw"
            />
            {/* Subtle atmospheric vignette */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          </div>

          {/* Hero Left Content: Gold Dash, Title & Tagline */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
            <div className="max-w-xl">
              {/* Gold horizontal accent bar */}
              <div className="w-12 h-[2px] bg-[#D8AD56] mb-5 sm:mb-6" />

              {/* Title: 2 lines in serif font */}
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal text-white leading-[1.06] tracking-normal drop-shadow-sm">
                Tayi Grand<br />
                Hotel
              </h1>

              {/* Subtitle: Stay · Host · Celebrate */}
              <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-[#EFE3D6] font-light tracking-wide">
                Stay · Host · Celebrate
              </p>

              {/* General Starting Price Badge */}
              <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D8AD56]/40 text-xs text-[#EFE3D6]">
                <span className="w-2 h-2 rounded-full bg-[#D8AD56]" />
                <span className="font-medium text-white">Rooms from ₹1,800</span>
                <span className="text-[11px] text-[#EFE3D6]/70">• Subject to availability</span>
              </div>
            </div>
          </div>

          {/* Centered Floating Booking Widget Bar */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <BookingWidget />
          </div>
        </section>

        {/* =========================================================================
            ROOMS SECTION â€” "OUR ROOMS â€” Comfort for Every Stay" (RICH CARDS)
            ========================================================================= */}
        <section className="py-20 sm:py-28 bg-[#F8F1E9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
                <span>OUR ROOMS • FROM ₹1,800</span>
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#241912]">
                Comfort for Every Stay
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto my-3.5" />
              <p className="text-sm text-[#786B61] mt-2">
                Spacious, fully air-conditioned rooms designed for restful relaxation and ultimate convenience. Starting from ₹1,800 per night (subject to availability).
              </p>
            </div>

            {/* 3 Rich Room Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#D8AD56]/25 shadow-luxury hover:shadow-luxuryHover transition-all duration-300 flex flex-col group"
                >
                  {/* Room Cover Photo with Price Badge */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#382216]/10">
                    <Image
                      src={room.cover_image_url}
                      alt={room.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#25150F]/85 backdrop-blur-sm text-[#D8AD56] text-xs font-semibold shadow-md">
                      â‚¹ {room.base_price_per_night.toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] text-white/75 font-normal">/ night</span>
                    </div>
                  </div>

                  {/* Room Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#241912] group-hover:text-[#D8AD56] transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-xs text-[#786B61] mt-1.5 line-clamp-2 leading-relaxed font-light">
                        {room.short_description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#EFE3D6] grid grid-cols-2 gap-2 text-xs text-[#786B61]">
                        <div>Bed: <strong className="text-[#241912] font-medium block truncate">{room.bed_type}</strong></div>
                        <div>Included: <strong className="text-[#241912] font-medium block">{room.included_occupancy || 2} Persons</strong></div>
                      </div>
                      <div className="mt-2 text-[11px] text-[#8C7A6B]">
                        <span>Extra Person: <strong className="text-[#241912] font-medium">₹300</strong></span>
                        <span className="text-[#786B61]/70"> (Max {room.max_occupancy} guests)</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#FAF7F2] flex items-center justify-between gap-2">
                      <NextLink
                        href={`/rooms/${room.slug}`}
                        className="text-xs font-semibold text-[#382216] hover:text-[#D8AD56] transition-colors flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </NextLink>

                      <NextLink
                        href={`/rooms/${room.slug}`}
                        className="px-3.5 py-1.5 rounded-lg bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-semibold transition-colors shadow-sm"
                      >
                        Book Now
                      </NextLink>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <NextLink
                href="/rooms"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#382216] hover:text-[#D8AD56] transition-colors"
              >
                <span>View all room configurations & live availability</span>
                <ArrowRight className="w-4 h-4" />
              </NextLink>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CONVENTION HALL BANNER â€” "Host Your Special Occasions"
            ========================================================================= */}
        <section className="relative py-24 sm:py-32 bg-[#25150F] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/convention-hall-wide.jpg"
              alt="Sri Tayi Grand Convention Hall"
              fill
              className="object-cover opacity-35 object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#25150F] via-[#25150F]/85 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-3">
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
                <span>CONVENTION HALL</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl font-normal leading-tight text-white">
                Host Your <br />
                <span className="text-[#D8AD56]">Special Occasions</span>
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] my-4" />
              <p className="text-xs sm:text-sm text-[#EFE3D6]/90 leading-relaxed font-light">
                A spacious and elegant air-conditioned venue with royal chandelier lighting, grand stage, dedicated dining facilities, and ample parking. Ideal for weddings, receptions, and corporate conferences in Kadiri.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <NextLink
                  href="/convention-hall"
                  className="px-6 py-3 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs sm:text-sm font-semibold hover:bg-[#C69940] transition-colors shadow-lg flex items-center gap-2"
                >
                  <span>Book the Hall</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="tel:08494223379"
                  className="px-5 py-3 rounded-xl border border-white/30 text-white text-xs sm:text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Direct Inquiry: 084942 23379
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            GUEST EXPERIENCES & TESTIMONIALS SECTION (GOOGLE REVIEWS)
            ========================================================================= */}
        <TestimonialsSection />

        {/* =========================================================================
            AMENITIES SECTION â€” "Everything You Need for a Perfect Stay"
            ========================================================================= */}
        <section className="py-20 sm:py-24 bg-[#FAF7F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
                <span>AMENITIES</span>
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#241912]">
                Everything You Need <br />
                for a Perfect Stay
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto my-3.5" />
              <p className="text-xs sm:text-sm text-[#786B61]">
                Thoughtful facilities designed to make your stay effortless, comfortable, and secure.
              </p>
            </div>

            {/* Pill cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl border border-[#D8AD56]/15 p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3">
                  <Snowflake className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h4 className="text-xs font-semibold text-[#241912]">Fully AC Rooms</h4>
                <p className="text-[11px] text-[#786B61] mt-1 font-light">Individual climate control</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#D8AD56]/15 p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3">
                  <Car className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h4 className="text-xs font-semibold text-[#241912]">Car Parking</h4>
                <p className="text-[11px] text-[#786B61] mt-1 font-light">Secure on-site parking</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#D8AD56]/15 p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3">
                  <Users className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h4 className="text-xs font-semibold text-[#241912]">Convention Hall</h4>
                <p className="text-[11px] text-[#786B61] mt-1 font-light">Up to 800 guests capacity</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#D8AD56]/15 p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3">
                  <Wifi className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h4 className="text-xs font-semibold text-[#241912]">High-Speed Wi-Fi</h4>
                <p className="text-[11px] text-[#786B61] mt-1 font-light">Complimentary internet access</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#D8AD56]/15 p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h4 className="text-xs font-semibold text-[#241912]">Room Service</h4>
                <p className="text-[11px] text-[#786B61] mt-1 font-light">Attentive stay assistance</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <NextLink
                href="/amenities"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D8AD56] hover:text-[#C69940]"
              >
                <span>View all verified facilities</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </div>
          </div>
        </section>

        {/* =========================================================================
            EXPERIENCE TAYI GRAND â€” GALLERY PREVIEW
            ========================================================================= */}
        <section className="py-20 sm:py-24 bg-[#F8F1E9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <div className="inline-block text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                  GALLERY
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#241912]">
                  Experience Tayi Grand
                </h2>
                <p className="text-xs sm:text-sm text-[#786B61] mt-1 font-light">
                  A glimpse of our authentic rooms, grand convention hall, and guest spaces.
                </p>
              </div>

              <NextLink
                href="/gallery"
                className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs font-semibold hover:bg-[#C69940] transition-colors shadow-sm"
              >
                <span>View Full Gallery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </div>

            {/* Enhanced Visual Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
                <Image
                  src="/images/hotel/hotel-exterior-night-enhanced.png"
                  alt="Sri Tayi Grand Night Architecture"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Architecture</span>
                    <span className="text-sm font-serif font-medium text-white tracking-wide">Illuminated Facade</span>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
                <Image
                  src="/images/hotel/reception-desk-photo-enhanced.png"
                  alt="Front Desk & Reception Concierge"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Hospitality</span>
                    <span className="text-sm font-serif font-medium text-white tracking-wide">Welcome Concierge</span>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
                <Image
                  src="/images/hotel/room-suite-bed-photo-enhanced.png"
                  alt="Executive Master Suite Bed"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Suites</span>
                    <span className="text-sm font-serif font-medium text-white tracking-wide">Plush Master Bedding</span>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
                <Image
                  src="/images/hotel/suite-seating-photo-enhanced.png"
                  alt="Suite Private Seating Lounge"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Living Lounge</span>
                    <span className="text-sm font-serif font-medium text-white tracking-wide">Private Suite Living</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            LOCATION & ACCESSIBILITY SECTION
            ========================================================================= */}
        <section className="py-16 sm:py-20 bg-white border-y border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-block text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                  ACCESSIBILITY
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#241912]">
                  Conveniently Situated in Kadiri
                </h2>
                <div className="w-12 h-0.5 bg-[#D8AD56] my-3" />
                <p className="text-xs sm:text-sm text-[#786B61] leading-relaxed font-light">
                  Located strategically on the Bypass Road opposite Girls High School, Sri Tayi Grand provides seamless road connectivity along the Tadipatri â€“ Pulivendula â€“ Kadiri corridor with hassle-free vehicle parking and quick access to local landmarks.
                </p>

                <div className="mt-6 space-y-3 text-xs text-[#241912]">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#D8AD56] shrink-0 mt-0.5" />
                    <span>4585+F8J, Opp. Girls High School, Bypass Road, Kadiri â€“ 515591, AP</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#D8AD56] shrink-0" />
                    <span>084942 23379 (24/7 Front Desk)</span>
                  </div>
                </div>

                <div className="mt-6">
                  <NextLink
                    href="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#382216] text-[#EFE3D6] text-xs font-semibold hover:bg-[#25150F] transition-colors"
                  >
                    <span>View Map & Driving Directions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </NextLink>
                </div>
              </div>

              {/* Map Card */}
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[#D8AD56]/30 shadow-luxury bg-[#FAF7F2] flex items-center justify-center p-6 text-center">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#241912]">Google Maps Directions</h4>
                  <p className="text-xs text-[#786B61] mt-1 max-w-sm mx-auto font-light">
                    Revenue Colony, Tadipatri â€“ Pulivendula â€“ Kadiri Road, Kadiri
                  </p>
                  <a
                    href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block px-5 py-2 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs font-semibold hover:bg-[#C69940] transition-colors shadow-sm"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FINAL CALL TO ACTION BANNER â€” SERVICE BELL
            ========================================================================= */}
        <section className="relative py-20 bg-[#25150F] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/bell-cta-banner.jpg"
              alt="Sri Tayi Grand Service Bell"
              fill
              className="object-cover opacity-50 object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#25150F] via-[#25150F]/80 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#D8AD56] mb-2">
                Tayi Grand Hotel
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-white">
                Plan Your Stay <br />
                at Tayi Grand Hotel
              </h2>
              <div className="w-12 h-0.5 bg-[#D8AD56] my-3" />
              <p className="mt-3 text-xs sm:text-sm text-[#EFE3D6]/90 font-light">
                Premium rooms, modern amenities, and a warm hospitality experience awaits you at Sri Tayi Grand.
              </p>

              <div className="mt-6 flex items-center gap-4">
                <NextLink
                  href="/rooms"
                  className="px-6 py-3 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs sm:text-sm font-semibold hover:bg-[#C69940] transition-colors shadow-lg flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="tel:08494223379"
                  className="text-xs text-[#EFE3D6] hover:text-[#D8AD56] underline transition-colors"
                >
                  Call 084942 23379
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
