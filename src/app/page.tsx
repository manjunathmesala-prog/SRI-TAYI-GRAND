import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import HorizonBookingBar from '@/components/anantha/HorizonBookingBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import { TestimonialsSection } from '@/components/testimonials/TestimonialsSection';
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
      <Header transparentInitially={false} />

      {/* =========================================================================
          HERO SECTION — EXACT ANANTHA HORIZON LUXURY FRAME
          ========================================================================= */}
      <section id="home" className="relative w-full pt-4 sm:pt-6 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Hero Media Frame */}
          <div className="relative w-full rounded-[24px] sm:rounded-[36px] overflow-hidden min-h-[560px] sm:min-h-[640px] lg:min-h-[700px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-stone-200/40 flex flex-col justify-between p-5 sm:p-10 lg:p-14">
            {/* Background Hotel Exterior with Ambient Atmosphere */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-[#21180F]">
              <Image
                src="/images/hotel/hotel-exterior-hero-clean.jpg"
                alt="Sri Tayi Grand Hotel Exterior Facade"
                fill
                priority
                className="object-cover object-center scale-[1.01] hover:scale-105 transition-transform duration-1000 ease-out"
                sizes="100vw"
              />
              {/* Subtle luxury ambient gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/40" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-black/40" />
            </div>

            {/* Top content area inside hero */}
            <div className="relative z-10 w-full flex flex-col lg:flex-row items-start justify-between gap-6 sm:gap-8 pt-2">
              {/* Left Glassmorphism Hero Card */}
              <div className="backdrop-blur-md bg-black/45 sm:bg-black/40 border border-white/20 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 lg:p-10 max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-white">
                <div className="flex items-center gap-2 mb-3">
                  <TayiBrandIcon size={24} />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#E0C184] font-semibold">
                    KADIRI • ANDHRA PRADESH
                  </span>
                </div>

                <h1 className="text-xl sm:text-3xl lg:text-[34px] font-sans font-bold tracking-tight uppercase leading-[1.25]">
                  EXPERIENCE{' '}
                  <span className="font-serif italic capitalize font-normal text-[#E0C184] tracking-normal inline-block text-2xl sm:text-4xl lg:text-[42px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                    Luxury
                  </span>
                  <span className="block mt-1 font-serif tracking-[0.16em] font-bold text-lg sm:text-2xl lg:text-[26px] text-stone-100">
                    AT SRI TAYI GRAND
                  </span>
                </h1>

                <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-stone-200/90 leading-relaxed font-normal">
                  Experience comfortable AC accommodations, grand banquet celebrations, exceptional hospitality, and peaceful tranquility on Bypass Road, Kadiri.
                </p>

                {/* Action Buttons */}
                <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-3">
                  <NextLink
                    href="/rooms"
                    className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#8D672F] hover:bg-[#6D4E21] active:scale-[0.98] text-white text-xs sm:text-[13.5px] font-semibold tracking-wide shadow-lg hover:shadow-xl transition-all duration-200 uppercase flex items-center gap-2"
                  >
                    <span>Book Your Stay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </NextLink>

                  <NextLink
                    href="/rooms"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white/15 hover:bg-white/25 active:scale-[0.98] backdrop-blur-sm border border-white/30 text-white text-xs sm:text-[13.5px] font-medium flex items-center gap-2 transition-all duration-200"
                  >
                    <span>Explore Rooms</span>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-stone-900 flex items-center justify-center">
                      <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                    </div>
                  </NextLink>
                </div>

                {/* Rating Section */}
                <div className="mt-7 pt-5 border-t border-white/15">
                  <div className="flex items-center gap-1.5 text-white">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-[#e0c184] fill-[#e0c184] stroke-none"
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-stone-300 font-medium tracking-wide">
                    Rated 5 Stars by Guests across Andhra Pradesh • Verified Hospitality
                  </p>
                </div>
              </div>

              {/* Right Glass Trust Badge */}
              <div className="backdrop-blur-md bg-black/45 border border-white/20 rounded-[24px] p-5 sm:p-6 max-w-xs shadow-xl text-white self-start lg:self-center lg:mt-32">
                <div className="flex items-center gap-2 text-[#E0C184] text-xs font-semibold tracking-wider uppercase mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#E0C184]" />
                  <span>Strategic Location</span>
                </div>
                <p className="text-xs sm:text-[13px] text-stone-200 font-medium leading-snug">
                  Minutes from Sri Kadiri Lakshmi Narasimha Swamy Temple &amp; Railway Station with hassle-free parking.
                </p>

                {/* Feature Chips */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-white/15 text-[10.5px] font-medium text-stone-100 border border-white/20">
                    24/7 Front Desk
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/15 text-[10.5px] font-medium text-stone-100 border border-white/20">
                    Secure Parking
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/15 text-[10.5px] font-medium text-stone-100 border border-white/20">
                    800+ Hall
                  </span>
                </div>
              </div>
            </div>

            <div className="h-6 sm:h-8" />
          </div>

          {/* Floating Booking Search Bar (overlapping hero bottom) */}
          <div className="relative -mt-10 sm:-mt-12 z-30 px-2 sm:px-6">
            <HorizonBookingBar buttonText="FIND YOUR STAY" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: ROOMS FOR EVERY JOURNEY (COMFORT FOR EVERY STAY)
          ========================================================================= */}
      <section id="rooms" className="relative z-10 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-12 reveal-on-scroll">
          <div className="flex items-center justify-center gap-2 text-[#8D672F]">
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
                <div className="relative h-56 w-full overflow-hidden bg-[#21180F]/10">
                  <Image
                    src={room.cover_image_url}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3 bg-[#F8F3E9]/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold text-[#8D672F] border border-[#E6D9C5] shadow-xs">
                    ₹ {room.base_price_per_night.toLocaleString('en-IN')} / night
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <h3 className="text-xl font-serif text-[#33271D] group-hover:text-[#8D672F] transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-xs text-[#786A5B] line-clamp-2 leading-relaxed">
                    {room.short_description}
                  </p>

                  <div className="pt-2 border-t border-[#E6D9C5]/60 grid grid-cols-2 gap-2 text-xs text-[#786A5B]">
                    <div className="flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-[#8D672F]" />
                      <span className="truncate">{room.bed_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#8D672F]" />
                      <span>{room.included_occupancy || 2} Persons</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#8D672F] font-medium">
                    Extra Person: ₹300 <span className="text-[#786A5B]/70 font-normal">(Max {room.max_occupancy} guests)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-2.5 border-t border-[#E6D9C5]/60 pt-3.5">
                <NextLink
                  href={`/rooms/${room.slug}`}
                  className="w-full py-2.5 px-4 rounded-full bg-[#8D672F] hover:bg-[#6D4E21] active:scale-[0.98] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn"
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
                    className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#8D672F] hover:text-[#5E3F17] transition-colors py-1 group/det"
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
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-[0.18em] font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
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
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8D672F] inline-flex items-center gap-2">
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
              <div className="p-3 bg-white rounded-xl border border-[#E6D9C5] shadow-xs">
                <div className="text-xs font-bold text-[#8D672F]">Up to 800 Guests</div>
                <span className="text-[11px] text-[#786A5B] block mt-0.5">Spacious Seating</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E6D9C5] shadow-xs">
                <div className="text-xs font-bold text-[#8D672F]">Dedicated Dining</div>
                <span className="text-[11px] text-[#786A5B] block mt-0.5">Modern Kitchen Area</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NextLink
                href="/convention-hall"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md transition-all hover:translate-x-1"
              >
                <span>Enquire &amp; Book Convention Hall</span>
                <ArrowRight className="w-4 h-4" />
              </NextLink>

              <a
                href="tel:08494223379"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-[#FAF6EE] text-[#33271D] border border-[#E6D9C5] text-xs uppercase tracking-[0.14em] font-semibold shadow-sm transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-[#8D672F]" />
                <span>084942 23379</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 reveal-scale">
            <div className="relative h-72 sm:h-96 lg:h-[440px] rounded-3xl overflow-hidden shadow-luxury border border-[#E6D9C5] group bg-[#21180F]">
              <Image
                src="/images/hotel/convention-hall-wide.jpg"
                alt="Grand Convention Hall Banquet at Sri Tayi Grand Kadiri"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>
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
            <span className="text-xs uppercase tracking-[0.28em] font-semibold text-[#8D672F] inline-flex items-center justify-center gap-2">
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
              },
              {
                label: 'Convention Hall',
                subtitle: '800-capacity grand celebration venue',
                icon: Building,
              },
              {
                label: 'Car Parking',
                subtitle: 'Ample secure on-premises parking bays',
                icon: Car,
              },
              {
                label: 'High-Speed Wi-Fi',
                subtitle: 'Seamless wireless internet connection',
                icon: Wifi,
              },
              {
                label: '24/7 Hot Water',
                subtitle: 'Continuous geyser supply in all rooms',
                icon: Sparkles,
              },
              {
                label: '24/7 Front Desk',
                subtitle: 'Continuous dedicated reception & assistance',
                icon: Clock,
              },
            ].map((fac, idx) => {
              const Icon = fac.icon;
              return (
                <div
                  key={idx}
                  className="group bg-white rounded-2xl sm:rounded-[22px] p-5 sm:p-6 border border-[#E8DEC9] shadow-[0_4px_24px_-4px_rgba(66,43,25,0.05)] luxury-card-hover transition-all duration-300 flex flex-col items-center justify-between text-center min-h-[190px] sm:min-h-[220px]"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F8F3E9] border border-[#E6D9C5]/70 flex items-center justify-center text-[#8D672F] group-hover:scale-110 group-hover:bg-[#8D672F] group-hover:text-white transition-all duration-300 mb-4 shadow-[0_2px_8px_-2px_rgba(66,43,25,0.06)]">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.6]" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-[#33271D] tracking-tight mb-1">
                      {fac.label}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-[#786A5B] font-serif leading-tight">
                      {fac.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <NextLink
              href="/amenities"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8D672F] hover:text-[#5E3F17] transition-colors group"
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
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#8D672F] mb-2">
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md transition-all self-start sm:self-auto hover:-translate-y-0.5"
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
              <div
                key={idx}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-luxury group border border-[#E6D9C5] bg-[#21180F] luxury-card-hover"
              >
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">
                      {item.category}
                    </span>
                    <span className="text-sm font-serif font-medium text-white tracking-wide">
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8D672F] inline-flex items-center gap-2">
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
                <div className="p-3 bg-white rounded-xl border border-[#E6D9C5] luxury-card-hover shadow-xs">
                  <div className="text-xs font-bold text-[#8D672F]">1.5 km (4 min)</div>
                  <span className="text-[11px] font-semibold text-[#33271D] block mt-1">Kadiri Temple</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E6D9C5] luxury-card-hover shadow-xs">
                  <div className="text-xs font-bold text-[#8D672F]">2.0 km (5 min)</div>
                  <span className="text-[11px] font-semibold text-[#33271D] block mt-1">Railway Station</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E6D9C5] luxury-card-hover shadow-xs">
                  <div className="text-xs font-bold text-[#8D672F]">Direct Access</div>
                  <span className="text-[11px] font-semibold text-[#33271D] block mt-1">Bypass Road</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md transition-all hover:translate-x-1"
                >
                  <span>Get Directions</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <NextLink
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#FAF6EE] text-[#33271D] border border-[#E6D9C5] text-xs uppercase tracking-[0.16em] font-semibold shadow-sm transition-all"
                >
                  <MapPin className="w-4 h-4 text-[#8D672F]" />
                  <span>Contact &amp; Map</span>
                </NextLink>
              </div>
            </div>

            <div className="lg:col-span-6 reveal-scale">
              <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden border border-[#E6D9C5] shadow-luxury bg-white flex flex-col items-center justify-center p-6 text-center group">
                <div className="w-14 h-14 rounded-full bg-[#F8F3E9] text-[#8D672F] border border-[#E6D9C5] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <MapPin className="w-7 h-7" />
                </div>
                <h4 className="font-serif font-bold text-lg text-[#33271D]">
                  Sri Tayi Grand Hotel Kadiri
                </h4>
                <p className="text-xs text-[#786A5B] mt-1.5 max-w-sm mx-auto leading-relaxed">
                  4585+F8J, Opp. Girls High School, Bypass Road, Tadipatri – Pulivendula – Kadiri Road, Revenue Colony, Kadiri, Andhra Pradesh 515591
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <a
                    href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8D672F] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md hover:bg-[#6D4E21] transition-all"
                  >
                    <span>Open in Google Maps</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
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
                className="px-7 py-3.5 rounded-full bg-[#8D672F] text-white text-xs uppercase tracking-[0.16em] font-semibold hover:bg-[#6D4E21] transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 hover:translate-x-1"
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
