import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { AtmosphericGlow } from '@/components/motion/AtmosphericGlow';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import { TestimonialsSection } from '@/components/testimonials/TestimonialsSection';
import { CelebrityShowcase } from '@/components/home/CelebrityShowcase';
import { HeroVideoBackground } from '@/components/home/HeroVideoBackground';
import { repo } from '@/lib/db/repository';
import {
  Wind,
  Building,
  Car,
  Wifi,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Phone,
  Calendar,
  Star,
  ShieldCheck,
  CheckCircle2,
  Bed,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sri Tayi Grand | Luxury AC Rooms & Convention Hall in Kadiri',
  description: 'Book comfortable AC rooms & luxury suites at Sri Tayi Grand, Kadiri. Located on Bypass Road opposite Girls High School, minutes from Sri Kadiri Lakshmi Narasimha Swamy Temple & Railway Station. 24/7 front desk, ample parking, free Wi-Fi & instant room booking.',
};

export default function HomePage() {
  const categories = repo.getCategories();

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      {/* Navigation */}
      <Header transparentInitially={true} />

      {/* =========================================================================
          HERO SECTION — EXACT CLASSIC LUXURY EXTERIOR & EMBEDDED SEARCH ENGINE
          ========================================================================= */}
      <section className="relative -mt-[106px] sm:-mt-[110px] min-h-[640px] sm:min-h-[720px] lg:min-h-[820px] flex flex-col justify-between pt-28 sm:pt-36 lg:pt-40 pb-10 sm:pb-14 overflow-hidden bg-[#20120B]">
        {/* Authentic Hotel Cinematic Background Video with Poster Fallback */}
        <HeroVideoBackground />

        {/* Atmospheric Glow Orbs in Hero */}
        <AtmosphericGlow position="top-right" color="gold" size="lg" className="opacity-40" />
        <AtmosphericGlow position="bottom-left" color="champagne" size="md" className="opacity-30" />

        {/* Hero Middle Content: Highlighting TAYI GRAND with Premium Font */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto text-center flex flex-col items-center">
          {/* Brand Emblem & Gold Accent */}
          <div className="inline-flex items-center justify-center gap-3 mb-3 sm:mb-4">
            <div className="w-8 sm:w-14 h-[1px] bg-gradient-to-r from-transparent to-[#D8AD56]" />
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
              <Image
                src="/images/hotel/tayi-grand-logo.png"
                alt="Sri Tayi Grand Official Emblem"
                fill
                sizes="32px"
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
            <div className="w-8 sm:w-14 h-[1px] bg-gradient-to-l from-transparent to-[#D8AD56]" />
          </div>

          {/* Highlighted Title: SRI TAYI GRAND with Premium Serif Font */}
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white uppercase tracking-[0.08em] sm:tracking-[0.14em] leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)] select-none whitespace-nowrap">
            Sri Tayi Grand
          </h1>

          {/* Subtitle: A UNIT OF SRI TAYI GROUP */}
          <p className="mt-2.5 sm:mt-3.5 text-xs sm:text-sm md:text-base text-[#F2E8D8]/90 font-serif uppercase tracking-[0.18em] sm:tracking-[0.24em] drop-shadow-md">
            A UNIT OF SRI TAYI GROUP
          </p>
        </div>

        {/* Centered Floating Booking Widget Bar */}
        <div className="relative z-30 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6">
          <BookingWidget />
        </div>
      </section>

      {/* =========================================================================
          SECTION: ROOMS FOR EVERY JOURNEY (COMFORT FOR EVERY STAY)
          ========================================================================= */}
      <section id="rooms" className="relative z-10 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-12 reveal-on-scroll">
          <div className="flex items-center justify-center gap-2 text-[#43001F]">
            <TayiBrandIcon size={18} />
            <span className="text-xs uppercase tracking-[0.25em] font-semibold">STAY • FROM ₹1,800</span>
            <TayiBrandIcon size={18} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#33271D]">
            Rooms for Every Journey
          </h2>
          <p className="text-sm text-[#786A5B] max-w-md mx-auto">
            Spacious, fully air-conditioned rooms designed for restful comfort and privacy.
          </p>
        </div>

        {/* Room Cards Grid - Symmetrically Balanced */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 reveal-stagger">
          {categories.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#E6D9C5] shadow-luxury group flex flex-col justify-between luxury-card-hover transition-all duration-300 hover:shadow-luxury-lg"
            >
              <div>
                <NextLink
                  href={`/rooms/${room.slug}`}
                  className="relative h-56 w-full overflow-hidden bg-[#21180F]/10 block cursor-pointer"
                  title={`View details for ${room.name}`}
                >
                  <Image
                    src={room.cover_image_url}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3 bg-[#F8F3E9]/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold text-[#43001F] border border-[#E6D9C5] shadow-xs">
                    ₹ {room.base_price_per_night.toLocaleString('en-IN')} / night
                  </div>
                </NextLink>

                <div className="p-5 space-y-2.5">
                  <NextLink href={`/rooms/${room.slug}`} className="block">
                    <h3 className="text-xl font-serif text-[#33271D] group-hover:text-[#43001F] transition-colors cursor-pointer">
                      {room.name}
                    </h3>
                  </NextLink>
                  <p className="text-xs text-[#786A5B] line-clamp-2 leading-relaxed">
                    {room.short_description}
                  </p>

                  <div className="pt-2 border-t border-[#E6D9C5]/60 grid grid-cols-2 gap-2 text-xs text-[#786A5B]">
                    <div className="flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-[#43001F]" />
                      <span className="truncate">{room.bed_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#43001F]" />
                      <span>{room.included_occupancy || 2} Persons</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#43001F] font-medium">
                    Extra Person: ₹300 <span className="text-[#786A5B]/70 font-normal">(Max {room.max_occupancy} guests)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-2.5 border-t border-[#E6D9C5]/60 pt-3.5">
                <NextLink
                  href={`/rooms/${room.slug}`}
                  className="w-full py-2.5 px-4 rounded-full bg-[#43001F] hover:bg-[#2E0015] active:scale-[0.98] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                >
                  <span>Book Now</span>
                  <span className="text-amber-200/70 font-normal">·</span>
                  <span className="font-sans font-bold text-sm tracking-tight tabular-nums">
                    ₹{room.base_price_per_night.toLocaleString('en-IN')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform ml-0.5" />
                </NextLink>

                <div className="text-center">
                  <NextLink
                    href={`/rooms/${room.slug}`}
                    className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#43001F] hover:text-[#2E0015] transition-colors py-1 group/det"
                  >
                    <span>View Room Details</span>
                    <ArrowRight className="w-3 h-3 group-hover/det:translate-x-1 transition-transform" />
                  </NextLink>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <NextLink
            href="/rooms"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-[0.18em] font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <span>Explore All Rooms & Suites</span>
            <ArrowRight className="w-4 h-4" />
          </NextLink>
        </div>
      </section>

      {/* =========================================================================
          SECTION: CONVENTION HALL FOR EVERY OCCASION
          ========================================================================= */}
      <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E6D9C5]/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-5 reveal-on-scroll">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] inline-flex items-center gap-2">
              <TayiBrandIcon size={18} />
              EVENTS &amp; CONVENTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#33271D] leading-tight">
              Convention Hall for Every Occasion
            </h2>
            <p className="text-sm text-[#786A5B] leading-relaxed">
              A grand air-conditioned venue with royal chandelier lighting, acoustic design, grand stage, dedicated dining facilities, and ample parking on Bypass Road, Kadiri. Accommodates up to 800 guests for weddings, grand receptions, and celebrations.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <NextLink
                href="/convention-hall"
                className="p-3 bg-white rounded-xl border border-[#E6D9C5] shadow-xs hover:border-[#43001F]/40 hover:shadow-sm transition-all block group"
              >
                <div className="text-xs font-bold text-[#43001F] group-hover:translate-x-0.5 transition-transform">Up to 800 Guests</div>
                <span className="text-[11px] text-[#786A5B] block mt-0.5">Spacious Seating</span>
              </NextLink>
              <NextLink
                href="/convention-hall"
                className="p-3 bg-white rounded-xl border border-[#E6D9C5] shadow-xs hover:border-[#43001F]/40 hover:shadow-sm transition-all block group"
              >
                <div className="text-xs font-bold text-[#43001F] group-hover:translate-x-0.5 transition-transform">Dedicated Dining</div>
                <span className="text-[11px] text-[#786A5B] block mt-0.5">Modern Kitchen Area</span>
              </NextLink>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NextLink
                href="/convention-hall"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md transition-all hover:translate-x-1"
              >
                <span>Enquire &amp; Book Convention Hall</span>
                <ArrowRight className="w-4 h-4" />
              </NextLink>

              <a
                href="tel:08494223379"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-[#FAF6EE] text-[#33271D] border border-[#E6D9C5] text-xs uppercase tracking-[0.14em] font-semibold shadow-sm transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-[#43001F]" />
                <span>084942 23379</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 reveal-scale">
            <NextLink
              href="/convention-hall"
              className="relative h-80 sm:h-[420px] lg:h-[480px] rounded-3xl overflow-hidden shadow-luxury border border-[#E6D9C5] group bg-[#21180F] block cursor-pointer"
              title="Explore Grand Convention Hall"
            >
              <Image
                src="/images/hotel/convention-hall-grand-stage.jpg"
                alt="Grand Convention Hall & Celebration Stage at Sri Tayi Grand Kadiri"
                fill
                priority
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </NextLink>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: FACILITIES & COMFORTS (EVERYTHING YOU NEED, ELEVATED)
          ========================================================================= */}
      <section className="relative w-full py-20 sm:py-28 bg-[#F8F3E9] overflow-hidden border-t border-[#E6D9C5]">
        {/* Large Faint Serif Background Watermark: COMFORT */}
        <div 
          aria-hidden="true" 
          className="absolute inset-x-0 top-1/2 -translate-y-[45%] flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
        >
          <span className="text-[130px] sm:text-[190px] md:text-[230px] lg:text-[270px] font-serif font-bold text-[#E6D9C5]/40 tracking-[0.18em] leading-none uppercase">
            COMFORT
          </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12 sm:mb-16 reveal-on-scroll">
            <span className="text-xs uppercase tracking-[0.28em] font-semibold text-[#43001F] inline-flex items-center justify-center gap-2">
              <TayiBrandIcon size={18} />
              FACILITIES &amp; COMFORTS
              <TayiBrandIcon size={18} />
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#33271D] font-normal tracking-tight">
              Everything You Need, Elevated
            </h2>
            <p className="text-xs sm:text-sm text-[#786A5B] font-serif max-w-xl mx-auto leading-relaxed">
              Every convenience has been carefully considered to ensure effortless tranquility throughout your time with us.
            </p>
          </div>

          {/* 6 Elevated Facility Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 reveal-stagger">
            {[
              {
                label: 'Fully AC Rooms',
                subtitle: 'Individual precision climate control',
                icon: Wind,
                href: '/rooms',
              },
              {
                label: 'Convention Hall',
                subtitle: '800-capacity grand celebration venue',
                icon: Building,
                href: '/convention-hall',
              },
              {
                label: 'Car Parking',
                subtitle: 'Ample secure on-premises parking bays',
                icon: Car,
                href: '/amenities',
              },
              {
                label: 'High-Speed Wi-Fi',
                subtitle: 'Seamless wireless internet connection',
                icon: Wifi,
                href: '/amenities',
              },
              {
                label: '24/7 Hot Water',
                subtitle: 'Continuous geyser supply in all rooms',
                icon: Sparkles,
                href: '/amenities',
              },
              {
                label: '24/7 Front Desk',
                subtitle: 'Continuous dedicated reception & assistance',
                icon: Clock,
                href: '/contact',
              },
            ].map((fac, idx) => {
              const Icon = fac.icon;
              return (
                <NextLink
                  key={idx}
                  href={fac.href}
                  className="group bg-white rounded-2xl sm:rounded-[22px] p-5 sm:p-6 border border-[#E8DEC9] shadow-[0_4px_24px_-4px_rgba(66,43,25,0.05)] luxury-card-hover transition-all duration-300 flex flex-col items-center justify-between text-center min-h-[190px] sm:min-h-[220px] hover:border-[#43001F]/40 cursor-pointer"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F8F3E9] border border-[#E6D9C5]/70 flex items-center justify-center text-[#43001F] group-hover:scale-110 group-hover:bg-[#43001F] group-hover:text-white transition-all duration-300 mb-4 shadow-[0_2px_8px_-2px_rgba(66,43,25,0.06)]">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.6]" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-[#33271D] group-hover:text-[#43001F] tracking-tight mb-1 transition-colors">
                      {fac.label}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-[#786A5B] font-serif leading-tight">
                      {fac.subtitle}
                    </p>
                  </div>
                </NextLink>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <NextLink
              href="/amenities"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#43001F] hover:text-[#2E0015] transition-colors group"
            >
              <span>View all verified hotel amenities &amp; services</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </NextLink>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: EXPERIENCE TAYI GRAND — GALLERY PREVIEW
          ========================================================================= */}
      <section className="relative py-20 sm:py-24 bg-[#FAF5EB] border-t border-[#E6D9C5] overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 reveal-on-scroll gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] mb-2">
                <TayiBrandIcon size={18} />
                <span>PHOTO GALLERY</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#33271D]">
                Experience Tayi Grand
              </h2>
              <p className="text-xs sm:text-sm text-[#786A5B] mt-1 font-light">
                A glimpse of our authentic rooms, grand convention hall, and hospitality spaces.
              </p>
            </div>

            <NextLink
              href="/gallery"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md transition-all self-start sm:self-auto hover:-translate-y-0.5"
            >
              <span>View Full Gallery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NextLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 reveal-stagger">
            {[
              {
                src: '/images/hotel/hotel-exterior-night-enhanced.png',
                category: 'Architecture',
                title: 'Illuminated Facade',
              },
              {
                src: '/images/hotel/reception-desk-photo-enhanced.png',
                category: 'Hospitality',
                title: 'Welcome Concierge',
              },
              {
                src: '/images/hotel/room-suite-bed-photo-enhanced.png',
                category: 'Suites',
                title: 'Plush Master Bedding',
              },
              {
                src: '/images/hotel/suite-seating-photo-enhanced.png',
                category: 'Living Lounge',
                title: 'Private Suite Living',
              },
            ].map((item, idx) => (
              <NextLink
                key={idx}
                href="/gallery"
                title={`View ${item.title} in Photo Gallery`}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#E6D9C5] bg-[#21180F] luxury-card-hover block cursor-pointer"
              >
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </NextLink>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: CELEBRATED GUESTS & DISTINGUISHED MOMENTS
          ========================================================================= */}
      <CelebrityShowcase />

      {/* =========================================================================
          SECTION: GUEST TESTIMONIALS (GOOGLE REVIEWS)
          ========================================================================= */}
      <TestimonialsSection />

      {/* =========================================================================
          SECTION: LOCATION & ACCESSIBILITY
          ========================================================================= */}
      <section className="w-full py-16 sm:py-24 bg-[#F2E8D8]/50 border-t border-[#E6D9C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-5 reveal-on-scroll">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] inline-flex items-center gap-2">
                <TayiBrandIcon size={18} />
                LOCATION &amp; PROXIMITY
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#33271D]">
                Convenient Location in Kadiri
              </h2>
              <p className="text-sm text-[#786A5B] leading-relaxed">
                Located on Bypass Road opposite Girls High School, Kadiri 515591 (Tadipatri – Pulivendula corridor). Enjoy effortless access, secure on-site parking, and proximity to major religious and transit landmarks.
              </p>

              {/* Transit & Landmark Distances */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center reveal-stagger">
                <a
                  href="https://maps.google.com/?q=Sri+Kadiri+Lakshmi+Narasimha+Swamy+Temple+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white rounded-xl border border-[#E6D9C5] luxury-card-hover shadow-xs block group hover:border-[#43001F]/50 transition-all cursor-pointer"
                  title="View Kadiri Lakshmi Narasimha Swamy Temple on Google Maps"
                >
                  <div className="text-xs font-bold text-[#43001F] group-hover:scale-105 transition-transform">1.5 km (4 min)</div>
                  <span className="text-[11px] font-semibold text-[#33271D] block mt-1">Kadiri Temple</span>
                </a>
                <a
                  href="https://maps.google.com/?q=Kadiri+Railway+Station+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white rounded-xl border border-[#E6D9C5] luxury-card-hover shadow-xs block group hover:border-[#43001F]/50 transition-all cursor-pointer"
                  title="View Kadiri Railway Station on Google Maps"
                >
                  <div className="text-xs font-bold text-[#43001F] group-hover:scale-105 transition-transform">2.0 km (5 min)</div>
                  <span className="text-[11px] font-semibold text-[#33271D] block mt-1">Railway Station</span>
                </a>
                <a
                  href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white rounded-xl border border-[#E6D9C5] luxury-card-hover shadow-xs block group hover:border-[#43001F]/50 transition-all cursor-pointer"
                  title="View Bypass Road location on Google Maps"
                >
                  <div className="text-xs font-bold text-[#43001F] group-hover:scale-105 transition-transform">Direct Access</div>
                  <span className="text-[11px] font-semibold text-[#33271D] block mt-1">Bypass Road</span>
                </a>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md transition-all hover:translate-x-1"
                >
                  <span>Get Directions</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <NextLink
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#FAF6EE] text-[#33271D] border border-[#E6D9C5] text-xs uppercase tracking-[0.16em] font-semibold shadow-sm transition-all"
                >
                  <MapPin className="w-4 h-4 text-[#43001F]" />
                  <span>Contact &amp; Map</span>
                </NextLink>
              </div>
            </div>

            <div className="lg:col-span-6 reveal-scale">
              <a
                href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                target="_blank"
                rel="noopener noreferrer"
                className="relative h-72 sm:h-96 rounded-3xl overflow-hidden border border-[#E6D9C5] shadow-luxury bg-white flex flex-col items-center justify-center p-6 text-center group block cursor-pointer hover:border-[#43001F]/40 transition-all"
                title="Open Sri Tayi Grand Hotel in Google Maps"
              >
                <div className="w-14 h-14 rounded-full bg-[#F8F3E9] text-[#43001F] border border-[#E6D9C5] flex items-center justify-center mx-auto mb-3 shadow-xs group-hover:scale-110 group-hover:bg-[#43001F] group-hover:text-white transition-all duration-300">
                  <MapPin className="w-7 h-7" />
                </div>
                <h4 className="font-serif font-bold text-lg text-[#33271D] group-hover:text-[#43001F] transition-colors">
                  Sri Tayi Grand Hotel Kadiri
                </h4>
                <p className="text-xs text-[#786A5B] mt-1.5 max-w-sm mx-auto leading-relaxed">
                  4585+F8J, Opp. Girls High School, Bypass Road, Tadipatri – Pulivendula – Kadiri Road, Revenue Colony, Kadiri, Andhra Pradesh 515591
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#43001F] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md group-hover:bg-[#2E0015] transition-all"
                  >
                    <span>Open in Google Maps</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: FINAL CALL TO ACTION BANNER
          ========================================================================= */}
      <section className="relative py-20 bg-[#21180F] text-white overflow-hidden border-t border-[#3a2c1f]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/bell-cta-banner.jpg"
            alt="Sri Tayi Grand Service Bell"
            fill
            className="object-cover opacity-35 object-center transform scale-100 hover:scale-105 transition-transform duration-1000 ease-out"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#21180F] via-[#21180F]/85 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl reveal-on-scroll">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#D8AD56] mb-2 flex items-center gap-1.5">
              <TayiBrandIcon size={18} />
              <span>Sri Tayi Grand Hotel</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-white">
              Plan Your Stay <br />
              at Sri Tayi Grand
            </h2>
            <div className="w-12 h-0.5 bg-[#D8AD56] my-3 shadow-sm" />
            <p className="mt-3 text-xs sm:text-sm text-[#EFE3D6]/90 font-light leading-relaxed">
              Premium air-conditioned rooms, modern amenities, and warm Indian hospitality awaits you in Kadiri.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <NextLink
                href="/rooms"
                className="px-7 py-3.5 rounded-full bg-[#43001F] text-white text-xs uppercase tracking-[0.16em] font-semibold hover:bg-[#2E0015] transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 hover:translate-x-1"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Now</span>
                <ArrowRight className="w-4 h-4" />
              </NextLink>
              <a
                href="tel:08494223379"
                className="text-xs text-[#EFE3D6] hover:text-[#D8AD56] underline transition-colors"
              >
                Call Front Desk: 084942 23379
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Bottom Sticky Bar for Mobile Screens */}
      <MobileStickyBookingBar />

      {/* Floating Action Bar for Desktops / Tablets */}
      <FloatingActionBar />

      {/* Footer */}
      <Footer />
    </main>
  );
}
