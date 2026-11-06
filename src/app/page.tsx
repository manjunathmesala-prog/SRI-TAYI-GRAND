import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { TestimonialsSection } from '@/components/testimonials/TestimonialsSection';
import { repo } from '@/lib/db/repository';
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion/ScrollReveal';
import { AtmosphericGlow } from '@/components/motion/AtmosphericGlow';
import { MobileStickyBookingBar } from '@/components/motion/MobileStickyBookingBar';
import {
  Snowflake,
  Car,
  Users,
  Wifi,
  Bell,
  ArrowRight,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const categories = repo.getCategories();

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden">
      <Header transparentInitially={true} />

      <main className="flex-grow">
        {/* =========================================================================
            HERO SECTION — EXACT LUXURY MATCH WITH SEMANTIC SCROLL & BLURS
            ========================================================================= */}
        <section className="relative min-h-[620px] sm:min-h-[720px] lg:min-h-[820px] flex flex-col justify-between pt-32 sm:pt-40 pb-10 sm:pb-14 overflow-hidden bg-[#20120B]">
          {/* Authentic Hotel Exterior Background Image with Ambient Zoom */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/hotel-exterior-hero-clean.jpg"
              alt="Sri Tayi Grand Hotel Facade"
              fill
              priority
              className="object-cover object-[70%_center] sm:object-center transform scale-100 hover:scale-[1.02] transition-transform duration-1000 ease-out"
              sizes="100vw"
            />
            {/* Subtle atmospheric vignette & blur overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#20120B] via-transparent to-black/30" />
          </div>

          {/* Atmospheric Glow Orbs in Hero */}
          <AtmosphericGlow position="top-right" color="gold" size="lg" className="opacity-40" />
          <AtmosphericGlow position="bottom-left" color="champagne" size="md" className="opacity-30" />

          {/* Hero Left Content: Gold Dash, Title & Tagline with Semantic Stagger */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
            <ScrollReveal preset="fade-up" duration={0.9} distance={40} className="max-w-xl">
              {/* Gold horizontal accent bar */}
              <div className="w-12 h-[2px] bg-[#D8AD56] mb-5 sm:mb-6 shadow-[0_0_8px_rgba(216,173,86,0.5)]" />

              {/* Title: 2 lines in serif font */}
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal text-white leading-[1.06] tracking-normal drop-shadow-md">
                Tayi Grand<br />
                Hotel
              </h1>

              {/* Subtitle: Stay · Host · Celebrate */}
              <p className="mt-4 sm:mt-5 text-lg sm:text-xl md:text-2xl text-[#EFE3D6] font-light tracking-wide">
                Stay · Host · Celebrate
              </p>

              {/* General Starting Price Badge with Soft Shimmer */}
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-[#D8AD56]/40 text-xs text-[#EFE3D6] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#D8AD56] animate-pulse" />
                <span className="font-medium text-white">Rooms from ₹1,800</span>
                <span className="text-[11px] text-[#EFE3D6]/70">• Kadiri, AP</span>
              </div>
            </ScrollReveal>
          </div>

          {/* Centered Floating Booking Widget Bar */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6">
            <ScrollReveal preset="fade-up" delay={0.2} duration={0.85} distance={30}>
              <BookingWidget />
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            ROOMS SECTION — "OUR ROOMS — Comfort for Every Stay" (RICH CARDS)
            ========================================================================= */}
        <section className="relative py-20 sm:py-28 bg-[#F8F1E9] overflow-hidden">
          {/* Subtle Ambient Glow */}
          <AtmosphericGlow position="center" color="gold" size="lg" className="opacity-25" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
                <span>OUR ROOMS • FROM ₹1,800</span>
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#241912]">
                Comfort for Every Stay
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto my-3.5 shadow-sm" />
              <p className="text-xs sm:text-sm text-[#786B61] mt-2 leading-relaxed">
                Spacious, fully air-conditioned rooms designed for restful relaxation and ultimate convenience. Starting from ₹1,800 per night (subject to availability).
              </p>
            </ScrollReveal>

            {/* Room Cards: Horizontal Snap Carousel on Mobile, Responsive Grid on Desktop */}
            <StaggerContainer
              stagger={0.14}
              className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((room) => (
                <StaggerItem
                  key={room.id}
                  className="min-w-[82vw] sm:min-w-[320px] md:min-w-0 snap-center flex flex-col"
                >
                  <div
                    data-cursor-hover
                    className="bg-white rounded-2xl overflow-hidden border border-[#D8AD56]/25 shadow-luxury hover:shadow-luxuryHover hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full group"
                  >
                    {/* Room Cover Photo with Price Badge */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#382216]/10">
                      <Image
                        src={room.cover_image_url}
                        alt={room.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        sizes="(max-width: 768px) 85vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#25150F]/85 backdrop-blur-md text-[#D8AD56] text-xs font-semibold shadow-md border border-[#D8AD56]/30">
                        ₹ {room.base_price_per_night.toLocaleString('en-IN')}{' '}
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
                          data-cursor-hover
                          className="text-xs font-semibold text-[#382216] hover:text-[#D8AD56] transition-colors flex items-center gap-1 group/link"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                        </NextLink>

                        <NextLink
                          href={`/rooms/${room.slug}`}
                          data-cursor-hover
                          className="px-4 py-2 rounded-lg bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-semibold transition-all duration-300 shadow-sm hover:shadow-goldGlow active:scale-95"
                        >
                          Book Now
                        </NextLink>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Bottom link with smooth reveal */}
            <ScrollReveal preset="fade-up" delay={0.2} className="text-center mt-12">
              <NextLink
                href="/rooms"
                data-cursor-hover
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#382216] hover:text-[#D8AD56] transition-colors group"
              >
                <span>View all room configurations & live availability</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </NextLink>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            CONVENTION HALL BANNER — "Host Your Special Occasions"
            ========================================================================= */}
        <section className="relative py-24 sm:py-32 bg-[#20120B] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/convention-hall-wide.jpg"
              alt="Sri Tayi Grand Convention Hall"
              fill
              className="object-cover opacity-35 object-center transform scale-100 hover:scale-105 transition-transform duration-1000 ease-out"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#20120B] via-[#20120B]/85 to-transparent" />
          </div>

          <AtmosphericGlow position="top-right" color="gold" size="lg" className="opacity-30" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" duration={0.85} className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-3">
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
                <span>CONVENTION HALL</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl font-normal leading-tight text-white">
                Host Your <br />
                <span className="text-[#D8AD56]">Special Occasions</span>
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] my-4 shadow-sm" />
              <p className="text-xs sm:text-sm text-[#EFE3D6]/90 leading-relaxed font-light">
                A spacious and elegant air-conditioned venue with royal chandelier lighting, grand stage, dedicated dining facilities, and ample parking. Ideal for weddings, receptions, and corporate conferences in Kadiri.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <NextLink
                  href="/convention-hall"
                  data-cursor-hover
                  className="px-6 py-3 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs sm:text-sm font-semibold hover:bg-[#C69940] transition-all duration-300 shadow-luxury hover:shadow-goldGlow hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Book the Hall</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="tel:08494223379"
                  data-cursor-hover
                  className="px-5 py-3 rounded-xl border border-white/30 text-white text-xs sm:text-sm font-medium hover:bg-white/10 hover:border-white/50 transition-colors"
                >
                  Direct Inquiry: 084942 23379
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            GUEST EXPERIENCES & TESTIMONIALS SECTION (GOOGLE REVIEWS)
            ========================================================================= */}
        <ScrollReveal preset="fade-up" duration={0.8} once={true}>
          <TestimonialsSection />
        </ScrollReveal>

        {/* =========================================================================
            AMENITIES SECTION — "Everything You Need for a Perfect Stay"
            ========================================================================= */}
        <section className="relative py-20 sm:py-24 bg-[#FAF7F2] overflow-hidden">
          <AtmosphericGlow position="bottom-left" color="champagne" size="lg" className="opacity-40" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
                <span>AMENITIES</span>
                <span className="w-6 h-[1px] bg-[#D8AD56]" />
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#241912]">
                Everything You Need <br />
                for a Perfect Stay
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto my-3.5 shadow-sm" />
              <p className="text-xs sm:text-sm text-[#786B61]">
                Thoughtful facilities designed to make your stay effortless, comfortable, and secure.
              </p>
            </ScrollReveal>

            {/* Pill cards with Stagger Entrance and Micro-Lift Hover */}
            <StaggerContainer
              stagger={0.08}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4"
            >
              <StaggerItem>
                <div
                  data-cursor-hover
                  className="bg-white rounded-2xl border border-[#D8AD56]/20 p-5 sm:p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#D8AD56]/10 transition-transform duration-300">
                    <Snowflake className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="text-xs font-semibold text-[#241912]">Fully AC Rooms</h4>
                  <p className="text-[11px] text-[#786B61] mt-1 font-light">Individual climate control</p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  data-cursor-hover
                  className="bg-white rounded-2xl border border-[#D8AD56]/20 p-5 sm:p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#D8AD56]/10 transition-transform duration-300">
                    <Car className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="text-xs font-semibold text-[#241912]">Car Parking</h4>
                  <p className="text-[11px] text-[#786B61] mt-1 font-light">Secure on-site parking</p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  data-cursor-hover
                  className="bg-white rounded-2xl border border-[#D8AD56]/20 p-5 sm:p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#D8AD56]/10 transition-transform duration-300">
                    <Users className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="text-xs font-semibold text-[#241912]">Convention Hall</h4>
                  <p className="text-[11px] text-[#786B61] mt-1 font-light">Up to 800 guests capacity</p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  data-cursor-hover
                  className="bg-white rounded-2xl border border-[#D8AD56]/20 p-5 sm:p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#D8AD56]/10 transition-transform duration-300">
                    <Wifi className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="text-xs font-semibold text-[#241912]">High-Speed Wi-Fi</h4>
                  <p className="text-[11px] text-[#786B61] mt-1 font-light">Complimentary internet access</p>
                </div>
              </StaggerItem>

              <StaggerItem className="col-span-2 sm:col-span-1">
                <div
                  data-cursor-hover
                  className="bg-white rounded-2xl border border-[#D8AD56]/20 p-5 sm:p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#D8AD56]/10 transition-transform duration-300">
                    <Bell className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="text-xs font-semibold text-[#241912]">Room Service</h4>
                  <p className="text-[11px] text-[#786B61] mt-1 font-light">Attentive stay assistance</p>
                </div>
              </StaggerItem>
            </StaggerContainer>

            <ScrollReveal preset="fade-up" delay={0.2} className="mt-8 text-center">
              <NextLink
                href="/amenities"
                data-cursor-hover
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D8AD56] hover:text-[#C69940] transition-colors group"
              >
                <span>View all verified facilities</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </NextLink>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            EXPERIENCE TAYI GRAND — GALLERY PREVIEW
            ========================================================================= */}
        <section className="relative py-20 sm:py-24 bg-[#F8F1E9] overflow-hidden">
          <AtmosphericGlow position="top-right" color="gold" size="md" className="opacity-30" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
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
                data-cursor-hover
                className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs font-semibold hover:bg-[#C69940] transition-all duration-300 shadow-sm hover:shadow-goldGlow hover:-translate-y-0.5"
              >
                <span>View Full Gallery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </ScrollReveal>

            {/* Visual Highlights Grid with Stagger Entrance and Smooth Zoom */}
            <StaggerContainer
              stagger={0.1}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
            >
              <StaggerItem>
                <div
                  data-cursor-hover
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]"
                >
                  <Image
                    src="/images/hotel/hotel-exterior-night-enhanced.png"
                    alt="Sri Tayi Grand Night Architecture"
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Architecture</span>
                      <span className="text-sm font-serif font-medium text-white tracking-wide">Illuminated Facade</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  data-cursor-hover
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]"
                >
                  <Image
                    src="/images/hotel/reception-desk-photo-enhanced.png"
                    alt="Front Desk & Reception Concierge"
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Hospitality</span>
                      <span className="text-sm font-serif font-medium text-white tracking-wide">Welcome Concierge</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  data-cursor-hover
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]"
                >
                  <Image
                    src="/images/hotel/room-suite-bed-photo-enhanced.png"
                    alt="Executive Master Suite Bed"
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Suites</span>
                      <span className="text-sm font-serif font-medium text-white tracking-wide">Plush Master Bedding</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  data-cursor-hover
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]"
                >
                  <Image
                    src="/images/hotel/suite-seating-photo-enhanced.png"
                    alt="Suite Private Seating Lounge"
                    fill
                    className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Living Lounge</span>
                      <span className="text-sm font-serif font-medium text-white tracking-wide">Private Suite Living</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* =========================================================================
            LOCATION & ACCESSIBILITY SECTION
            ========================================================================= */}
        <section className="py-16 sm:py-20 bg-white border-y border-[#D8AD56]/20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <ScrollReveal preset="slide-right" duration={0.8}>
                <div className="inline-block text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
                  ACCESSIBILITY
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#241912]">
                  Conveniently Situated in Kadiri
                </h2>
                <div className="w-12 h-0.5 bg-[#D8AD56] my-3 shadow-sm" />
                <p className="text-xs sm:text-sm text-[#786B61] leading-relaxed font-light">
                  Located strategically on the Bypass Road opposite Girls High School, Sri Tayi Grand provides seamless road connectivity along the Tadipatri – Pulivendula – Kadiri corridor with hassle-free vehicle parking and quick access to local landmarks.
                </p>

                <div className="mt-6 space-y-3 text-xs text-[#241912]">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#D8AD56] shrink-0 mt-0.5" />
                    <span>4585+F8J, Opp. Girls High School, Bypass Road, Kadiri – 515591, AP</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#D8AD56] shrink-0" />
                    <span>084942 23379 (24/7 Front Desk)</span>
                  </div>
                </div>

                <div className="mt-6">
                  <NextLink
                    href="/contact"
                    data-cursor-hover
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#382216] text-[#EFE3D6] text-xs font-semibold hover:bg-[#20120B] transition-all duration-300 hover:shadow-luxury hover:-translate-y-0.5"
                  >
                    <span>View Map & Driving Directions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </NextLink>
                </div>
              </ScrollReveal>

              {/* Map Card */}
              <ScrollReveal preset="slide-left" duration={0.8}>
                <div
                  data-cursor-hover
                  className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[#D8AD56]/30 shadow-luxury bg-[#FAF7F2] flex items-center justify-center p-6 text-center hover:shadow-luxuryHover transition-shadow duration-300"
                >
                  <div>
                    <div className="w-12 h-12 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif font-bold text-base text-[#241912]">Google Maps Directions</h4>
                    <p className="text-xs text-[#786B61] mt-1 max-w-sm mx-auto font-light">
                      Revenue Colony, Tadipatri – Pulivendula – Kadiri Road, Kadiri
                    </p>
                    <a
                      href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cursor-hover
                      className="mt-4 inline-block px-5 py-2 rounded-xl bg-[#D8AD56] text-[#20120B] text-xs font-semibold hover:bg-[#C69940] transition-all duration-300 shadow-sm hover:shadow-goldGlow hover:-translate-y-0.5"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FINAL CALL TO ACTION BANNER — SERVICE BELL
            ========================================================================= */}
        <section className="relative py-20 bg-[#20120B] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/bell-cta-banner.jpg"
              alt="Sri Tayi Grand Service Bell"
              fill
              className="object-cover opacity-50 object-center transform scale-100 hover:scale-105 transition-transform duration-1000 ease-out"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#20120B] via-[#20120B]/85 to-transparent" />
          </div>

          <AtmosphericGlow position="top-right" color="gold" size="lg" className="opacity-30" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" duration={0.8} className="max-w-xl">
              <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#D8AD56] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D8AD56]" />
                <span>Tayi Grand Hotel</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-white">
                Plan Your Stay <br />
                at Tayi Grand Hotel
              </h2>
              <div className="w-12 h-0.5 bg-[#D8AD56] my-3 shadow-sm" />
              <p className="mt-3 text-xs sm:text-sm text-[#EFE3D6]/90 font-light leading-relaxed">
                Premium rooms, modern amenities, and a warm hospitality experience awaits you at Sri Tayi Grand.
              </p>

              <div className="mt-6 flex items-center gap-4">
                <NextLink
                  href="/rooms"
                  data-cursor-hover
                  className="px-6 py-3 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs sm:text-sm font-semibold hover:bg-[#C69940] transition-all duration-300 shadow-luxury hover:shadow-goldGlow hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="tel:08494223379"
                  data-cursor-hover
                  className="text-xs text-[#EFE3D6] hover:text-[#D8AD56] underline transition-colors"
                >
                  Call 084942 23379
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* Floating Bottom Sticky Bar for Mobile Screens */}
      <MobileStickyBookingBar />

      <Footer />
    </div>
  );
}
