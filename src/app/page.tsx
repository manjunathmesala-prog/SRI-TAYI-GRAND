import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { TestimonialsSection } from '@/components/testimonials/TestimonialsSection';
import { TaglineReveal } from '@/components/motion/TaglineReveal';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { FaqSection } from '@/components/home/FaqSection';
import { MobileStickyBookingBar } from '@/components/motion/MobileStickyBookingBar';
import { repo } from '@/lib/db/repository';
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion/ScrollReveal';
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
  ShieldCheck,
} from 'lucide-react';

export default function HomePage() {
  const categories = repo.getCategories();

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden bg-[#F8F1E9]">
      <Header transparentInitially={true} />

      <main className="flex-grow">
        {/* =========================================================================
            1. HERO SECTION (B5 Visual System & A2 Page Structure)
            ========================================================================= */}
        <section className="relative min-h-[640px] sm:min-h-[720px] lg:min-h-[820px] flex flex-col justify-between pt-32 sm:pt-40 pb-12 sm:pb-16 overflow-hidden bg-[#131209]">
          {/* Authentic Hotel Exterior Background with Flat Dark Overlay (B4) */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <Image
              src="/images/hotel/hotel-exterior-hero-clean.jpg"
              alt="Sri Tayi Grand Hotel facade at night"
              fill
              priority
              className="object-cover object-[70%_center] sm:object-center opacity-45"
              sizes="100vw"
            />
            {/* Flat dark scrim overlay per B4 (no gradient) */}
            <div className="absolute inset-0 bg-[#131209]/60" />
          </div>

          {/* Hero Content (Capped at 680px per B5) */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
            <ScrollReveal preset="fade-up" duration={0.7} distance={32} className="max-w-[680px]">
              {/* Gold horizontal accent bar */}
              <div className="w-12 h-[2px] bg-[#D8AD56] mb-5" />

              {/* B5. Heading color gradient: #FFFFFF to #9B9B9B, capped at 680px with meaningful break */}
              <h1 className="heading-1 sm:text-7xl font-semibold tracking-tight max-w-[680px] bg-gradient-to-r from-white via-white/95 to-[#9B9B9B] bg-clip-text text-transparent text-wrap-balance leading-none">
                Comfort and celebration<br />
                in Kadiri
              </h1>

              {/* Subheadline: Clarifies how and adds specificity (A2 #2 & B5) */}
              <p className="mt-4 body-1 text-[#EFE3D6] max-w-[680px] text-wrap-pretty font-normal">
                Spacious climate controlled rooms starting at ₹1,800 per night and a grand convention hall for weddings and family gatherings.
              </p>

              {/* A2 #4. Proof Signal: Rating and guest count */}
              <div className="mt-5 inline-flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D8AD56]/40 caption-3 text-[#EFE3D6]">
                <span className="w-2 h-2 rounded-full bg-[#D8AD56]" />
                <span className="font-semibold text-white">4.8 of 5 stars on Google Reviews</span>
                <span className="text-[#EFE3D6]/70">• Over 500 guest stays</span>
              </div>
            </ScrollReveal>
          </div>

          {/* Centered Floating Booking Bar (Primary CTA container) */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6">
            <ScrollReveal preset="fade-up" delay={0.15} duration={0.7} distance={24}>
              <BookingWidget />
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            2. MANDATORY TAGLINE REVEAL SECTION (B11)
            ========================================================================= */}
        <TaglineReveal text="Spacious climate controlled rooms and a grand hall for your most cherished family occasions in Kadiri." />

        {/* =========================================================================
            3. ROOMS SECTION (A2 #7 Benefits: Comfort for Every Stay)
            ========================================================================= */}
        <section className="py-20 sm:py-28 bg-[#F8F1E9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" className="text-center max-w-[680px] mx-auto mb-12 sm:mb-16">
              <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-2">
                Our Rooms • From ₹1,800
              </div>
              <h2 className="heading-3 sm:heading-2 text-[#241912] font-semibold tracking-tight text-wrap-balance">
                Comfort for every stay
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto mt-4" />
              <p className="body-5 text-[#786B61] mt-3 text-wrap-pretty">
                Spacious climate controlled rooms designed for restful sleep and convenience. Starting from ₹1,800 per night with transparent pricing.
              </p>
            </ScrollReveal>

            {/* Room Cards: Mobile horizontal snap, Desktop 3-col grid */}
            <StaggerContainer
              stagger={0.1}
              className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((room) => (
                <StaggerItem
                  key={room.id}
                  className="min-w-[84vw] sm:min-w-[340px] md:min-w-0 snap-center flex flex-col"
                >
                  {/* B3. Nested Radius Formula: outer card rounded-2xl (16px), gap 8px -> inner rounded-lg (8px) */}
                  <div className="bg-white rounded-2xl border border-[#D8AD56]/25 shadow-luxury hover:shadow-luxuryHover hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full group overflow-hidden">
                    {/* Room Cover Photo with Price Tag */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#382216]/10">
                      <Image
                        src={room.cover_image_url}
                        alt={room.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        sizes="(max-width: 768px) 85vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute top-3 right-3 py-1 px-3 rounded-full bg-[#131209]/90 text-[#D8AD56] caption-4 font-semibold border border-[#D8AD56]/30">
                        ₹ {room.base_price_per_night.toLocaleString('en-IN')}{' '}
                        <span className="caption-5 text-white/70 font-normal">/ night</span>
                      </div>
                    </div>

                    {/* Room Details Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="title-2 font-semibold text-[#241912] group-hover:text-[#D8AD56] transition-colors text-wrap-balance">
                          {room.name}
                        </h3>
                        <p className="body-6 text-[#786B61] mt-2 line-clamp-2 leading-relaxed text-wrap-pretty">
                          {room.short_description}
                        </p>

                        <div className="mt-5 pt-3 border-t border-[#EFE3D6] grid grid-cols-2 gap-3 caption-2 text-[#786B61]">
                          <div>Bed type: <strong className="text-[#241912] font-medium block truncate">{room.bed_type}</strong></div>
                          <div>Included: <strong className="text-[#241912] font-medium block">{room.included_occupancy || 2} Persons</strong></div>
                        </div>
                        <div className="mt-2.5 caption-5 text-[#786B61]">
                          <span>Extra person: <strong className="text-[#241912] font-medium">₹300</strong></span>
                          <span> (Maximum {room.max_occupancy} guests)</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#FAF7F2] flex items-center justify-between gap-3">
                        <NextLink
                          href={`/rooms/${room.slug}`}
                          className="button-sm text-[#382216] hover:text-[#D8AD56] transition-colors flex items-center gap-1 group/link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] rounded"
                        >
                          <span>Room details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                        </NextLink>

                        <NextLink
                          href={`/rooms/${room.slug}`}
                          className="py-2 px-4 rounded-lg bg-[#D8AD56] hover:bg-[#C69940] text-[#131209] button-sm transition-all duration-300 shadow-sm hover:shadow-goldGlow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
                        >
                          Book now
                        </NextLink>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <ScrollReveal preset="fade-up" delay={0.15} className="text-center mt-12">
              <NextLink
                href="/rooms"
                className="inline-flex items-center gap-2 title-4 font-semibold text-[#382216] hover:text-[#D8AD56] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] rounded"
              >
                <span>View all room categories and live availability</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </NextLink>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            4. HOW IT WORKS SECTION (A2 #8: Three Outcome Steps)
            ========================================================================= */}
        <HowItWorksSection />

        {/* =========================================================================
            5. CONVENTION HALL SECTION (Mid Page Argument: A2 #6)
            ========================================================================= */}
        <section className="relative py-24 sm:py-32 bg-[#131209] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/convention-hall-wide.jpg"
              alt="Sri Tayi Grand Convention Hall"
              fill
              className="object-cover opacity-35 object-center"
              sizes="100vw"
            />
            {/* Flat dark scrim overlay per B4 (no gradient) */}
            <div className="absolute inset-0 bg-[#131209]/75" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" duration={0.7} className="max-w-[680px]">
              <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-3">
                Grand Convention Hall
              </div>
              <h2 className="heading-3 sm:heading-2 font-semibold leading-tight text-white text-wrap-balance">
                Host your special occasions with elegance
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] my-4" />
              <p className="body-4 text-[#EFE3D6]/90 leading-relaxed font-normal text-wrap-pretty">
                A spacious climate controlled venue featuring royal chandelier illumination, stage setup, dedicated dining hall, and guarded parking. Ideal for weddings, receptions, and family celebrations in Kadiri.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <NextLink
                  href="/convention-hall"
                  className="py-2.5 px-6 rounded-lg bg-[#D8AD56] text-[#131209] button-sm hover:bg-[#C69940] transition-all duration-300 shadow-luxury hover:shadow-goldGlow hover:-translate-y-0.5 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
                >
                  <span>Book the hall</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="tel:08494223379"
                  className="py-2.5 px-5 rounded-lg border border-white/30 text-white button-sm hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Direct inquiry: 084942 23379
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            6. AMENITIES SECTION (Outcome Driven Facilities)
            ========================================================================= */}
        <section className="py-20 sm:py-24 bg-[#FAF7F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" className="text-center max-w-[680px] mx-auto mb-14">
              <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-2">
                Verified Facilities
              </div>
              <h2 className="heading-3 sm:heading-2 text-[#241912] font-semibold tracking-tight text-wrap-balance">
                Everything you need for a restful stay
              </h2>
              <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto mt-4" />
              <p className="body-5 text-[#786B61] mt-3 text-wrap-pretty">
                Thoughtful facilities designed to make your stay comfortable, quiet, and secure.
              </p>
            </ScrollReveal>

            {/* 5 Pill Cards with Outcome Focus */}
            <StaggerContainer
              stagger={0.08}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            >
              <StaggerItem>
                <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Snowflake className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="title-4 font-semibold text-[#241912] text-wrap-balance">Full climate control</h4>
                  <p className="caption-5 text-[#786B61] mt-1">Individual AC in each room</p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Car className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="title-4 font-semibold text-[#241912] text-wrap-balance">Guarded parking</h4>
                  <p className="caption-5 text-[#786B61] mt-1">Secure parking on premises</p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Users className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="title-4 font-semibold text-[#241912] text-wrap-balance">Convention hall</h4>
                  <p className="caption-5 text-[#786B61] mt-1">Up to 800 guests capacity</p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Wifi className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="title-4 font-semibold text-[#241912] text-wrap-balance">High speed Wi Fi</h4>
                  <p className="caption-5 text-[#786B61] mt-1">Complimentary connectivity</p>
                </div>
              </StaggerItem>

              <StaggerItem className="col-span-2 sm:col-span-1">
                <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-6 text-center shadow-sm hover:shadow-luxury hover:border-[#D8AD56]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-center group h-full">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Bell className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="title-4 font-semibold text-[#241912] text-wrap-balance">Room assistance</h4>
                  <p className="caption-5 text-[#786B61] mt-1">Attentive stay service</p>
                </div>
              </StaggerItem>
            </StaggerContainer>

            <ScrollReveal preset="fade-up" delay={0.15} className="mt-8 text-center">
              <NextLink
                href="/amenities"
                className="inline-flex items-center gap-1.5 title-5 font-semibold text-[#D8AD56] hover:text-[#C69940] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] rounded"
              >
                <span>View all verified facilities</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </NextLink>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            7. SOCIAL PROOF SECTION (A2 #9: Google Reviews Testimonials)
            ========================================================================= */}
        <ScrollReveal preset="fade-up" duration={0.7} once={true}>
          <TestimonialsSection />
        </ScrollReveal>

        {/* =========================================================================
            8. PHOTO GALLERY PREVIEW
            ========================================================================= */}
        <section className="py-20 sm:py-24 bg-[#F8F1E9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-2">
                  Photo Gallery
                </div>
                <h2 className="heading-3 sm:heading-2 font-semibold text-[#241912] text-wrap-balance">
                  Experience Tayi Grand
                </h2>
                <p className="body-6 text-[#786B61] mt-1 text-wrap-pretty">
                  A glimpse of our authentic rooms, grand convention hall, and guest spaces in Kadiri.
                </p>
              </div>

              <NextLink
                href="/gallery"
                className="mt-4 sm:mt-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-[#D8AD56] text-[#131209] button-sm hover:bg-[#C69940] transition-all duration-300 shadow-sm hover:shadow-goldGlow hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
              >
                <span>View full gallery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </ScrollReveal>

            {/* Gallery Grid */}
            <StaggerContainer
              stagger={0.08}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <StaggerItem>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#131209]">
                  <Image
                    src="/images/hotel/hotel-exterior-night-enhanced.png"
                    alt="Sri Tayi Grand Night Architecture"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-[#131209]/60 flex items-end p-5">
                    <div>
                      <span className="caption-5 uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Architecture</span>
                      <span className="title-3 font-semibold text-white tracking-wide">Illuminated facade</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#131209]">
                  <Image
                    src="/images/hotel/reception-desk-photo-enhanced.png"
                    alt="Front Desk and Reception Concierge"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-[#131209]/60 flex items-end p-5">
                    <div>
                      <span className="caption-5 uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Hospitality</span>
                      <span className="title-3 font-semibold text-white tracking-wide">Welcome concierge</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#131209]">
                  <Image
                    src="/images/hotel/room-suite-bed-photo-enhanced.png"
                    alt="Executive Master Suite Bed"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-[#131209]/60 flex items-end p-5">
                    <div>
                      <span className="caption-5 uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Suites</span>
                      <span className="title-3 font-semibold text-white tracking-wide">Plush master bedding</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#131209]">
                  <Image
                    src="/images/hotel/suite-seating-photo-enhanced.png"
                    alt="Suite Private Seating Lounge"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-[#131209]/60 flex items-end p-5">
                    <div>
                      <span className="caption-5 uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Living lounge</span>
                      <span className="title-3 font-semibold text-white tracking-wide">Private suite living</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* =========================================================================
            9. LOCATION & ACCESSIBILITY SECTION
            ========================================================================= */}
        <section className="py-16 sm:py-20 bg-white border-y border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <ScrollReveal preset="slide-right" duration={0.7}>
                <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-2">
                  Accessibility
                </div>
                <h2 className="heading-3 sm:heading-2 font-semibold text-[#241912] text-wrap-balance">
                  Conveniently situated in Kadiri
                </h2>
                <div className="w-12 h-0.5 bg-[#D8AD56] my-3" />
                <p className="body-5 text-[#786B61] leading-relaxed text-wrap-pretty">
                  Located strategically on the Bypass Road opposite Girls High School, Sri Tayi Grand provides seamless road connectivity along the Tadipatri and Pulivendula corridor with guarded vehicle parking and quick access to local landmarks.
                </p>

                <div className="mt-6 space-y-3 body-5 text-[#241912]">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#D8AD56] shrink-0 mt-0.5" />
                    <span>Opposite Girls High School, Bypass Road, Kadiri 515591, Andhra Pradesh</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#D8AD56] shrink-0" />
                    <span>084942 23379 (24 hour front desk)</span>
                  </div>
                </div>

                <div className="mt-6">
                  <NextLink
                    href="/contact"
                    className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-[#382216] text-[#EFE3D6] button-sm hover:bg-[#20120B] transition-all duration-300 hover:shadow-luxury hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#382216]"
                  >
                    <span>View map and driving directions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </NextLink>
                </div>
              </ScrollReveal>

              {/* Map Card */}
              <ScrollReveal preset="slide-left" duration={0.7}>
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[#D8AD56]/30 shadow-luxury bg-[#FAF7F2] flex items-center justify-center p-6 text-center hover:shadow-luxuryHover transition-shadow duration-300">
                  <div>
                    <div className="w-12 h-12 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h4 className="title-3 font-semibold text-[#241912]">Google Maps directions</h4>
                    <p className="caption-2 text-[#786B61] mt-1 max-w-sm mx-auto text-wrap-pretty">
                      Revenue Colony, Tadipatri and Pulivendula Bypass Road, Kadiri
                    </p>
                    <a
                      href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block py-2 px-4 rounded-lg bg-[#D8AD56] text-[#131209] button-sm hover:bg-[#C69940] transition-all duration-300 shadow-sm hover:shadow-goldGlow hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
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
            10. FAQ SECTION (A2 #10 & A7 AEO Search Integration)
            ========================================================================= */}
        <FaqSection />

        {/* =========================================================================
            11. FINAL CALL TO ACTION (A2 #11 Risk Reversal & #12 Final CTA)
            ========================================================================= */}
        <section className="relative py-24 sm:py-28 bg-[#131209] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/bell-cta-banner.jpg"
              alt="Sri Tayi Grand service bell"
              fill
              className="object-cover opacity-45 object-center"
              sizes="100vw"
            />
            {/* Flat dark scrim overlay per B4 (no gradient) */}
            <div className="absolute inset-0 bg-[#131209]/80" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal preset="fade-up" duration={0.7} className="max-w-[680px]">
              <div className="caption-3 uppercase tracking-[0.2em] text-[#D8AD56] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D8AD56]" />
                <span>Tayi Grand Hotel</span>
              </div>
              <h2 className="heading-3 sm:heading-2 font-semibold leading-tight text-white text-wrap-balance">
                Plan your stay at Tayi Grand Hotel
              </h2>
              <div className="w-12 h-0.5 bg-[#D8AD56] my-3" />
              <p className="body-4 text-[#EFE3D6]/90 font-normal text-wrap-pretty leading-relaxed">
                Spacious climate controlled rooms, modern amenities, and warm hospitality await you in Kadiri.
              </p>

              {/* A2 #11. Risk Reversal: Clear assurance */}
              <div className="mt-4 flex flex-wrap items-center gap-3 caption-3 text-[#EFE3D6]/80">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D8AD56]" />
                  <span>No hidden booking fees</span>
                </div>
                <span>•</span>
                <div>24 hour front desk support</div>
                <span>•</span>
                <div>Guarded on premises parking</div>
              </div>

              {/* Primary Final CTA */}
              <div className="mt-6 flex items-center gap-4">
                <NextLink
                  href="/rooms"
                  className="py-2.5 px-6 rounded-lg bg-[#D8AD56] text-[#131209] button-sm hover:bg-[#C69940] transition-all duration-300 shadow-luxury hover:shadow-goldGlow hover:-translate-y-0.5 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book now</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
                <a
                  href="tel:08494223379"
                  className="body-5 text-[#EFE3D6] hover:text-[#D8AD56] underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
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
