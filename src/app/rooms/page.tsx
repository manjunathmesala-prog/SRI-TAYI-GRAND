import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import HorizonBookingBar from '@/components/anantha/HorizonBookingBar';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { repo } from '@/lib/db/repository';
import {
  Bed,
  Users,
  Maximize2,
  Wind,
  Wifi,
  Tv,
  Bath,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AC Rooms & Suites | Sri Tayi Grand Hotel Kadiri',
  description: 'Explore comfortable air-conditioned accommodations at Sri Tayi Grand in Kadiri, Andhra Pradesh (Bypass Road). Executive Suite Rooms, Deluxe Four Bed Rooms, and Deluxe Double Bed Rooms with precision climate control, comfortable bedding, high-speed WiFi, and 24/7 front desk.',
};

export default function RoomsPage() {
  const categories = repo.getCategories();

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Hero Banner with Embedded Search */}
      <section className="relative z-20 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/room-suite-bed-photo-enhanced.png"
            alt="Sri Tayi Grand Rooms and Suites Header"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#21180F]/75 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 pt-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A]">
            <TayiBrandIcon size={18} />
            <span>STAY • KADIRI</span>
            <TayiBrandIcon size={18} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-tight">
            Rooms &amp; Suites
          </h1>
          <p className="text-sm sm:text-base text-[#F8F3E9]/85 font-serif italic max-w-xl mx-auto">
            Quiet sanctuaries crafted with plush bedding, precision climate control, and refined hospitality. Rooms from ₹1,800.
          </p>
        </div>

        <div className="relative z-30 max-w-4xl mx-auto mt-10 animate-fade-in-up delay-150">
          <HorizonBookingBar buttonText="CHECK AVAILABILITY" />
        </div>
      </section>

      {/* Room Listing Cards */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10 reveal-stagger">
        {categories.map((room, index) => {
          const isReversed = index % 2 === 1;

          const features = [
            room.bed_type,
            room.room_size_sqft ? `${room.room_size_sqft} sq. ft.` : 'Spacious Layout',
            'Fully AC',
            `Included: ${room.included_occupancy || 2} Persons`,
          ];

          return (
            <div
              key={room.id}
              className="w-full bg-[#FFFFFF]/85 backdrop-blur-sm rounded-3xl p-5 sm:p-7 lg:p-9 border border-[#E6D9C5] shadow-luxury luxury-card-hover reveal-on-scroll"
            >
              <div className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-center`}>
                {/* Photo Block */}
                <div className="w-full lg:w-1/2 relative h-64 sm:h-80 lg:h-[350px] rounded-2xl overflow-hidden shadow-luxury group bg-[#21180F]">
                  <Image
                    src={room.cover_image_url}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-4 left-4 bg-[#F8F3E9]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#43001F] tracking-wider uppercase border border-[#E6D9C5] shadow-xs flex items-center gap-1.5">
                    <span>₹ {room.base_price_per_night.toLocaleString('en-IN')} / night</span>
                    {room.walk_in_only && (
                      <span className="bg-amber-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                        Walk-In Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Block */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-4 px-2 sm:px-4">
                  <span className="text-[11px] tracking-[0.2em] font-semibold uppercase text-[#43001F] flex items-center gap-1.5">
                    <TayiBrandIcon size={14} />
                    <span>LUXURY STAY • KADIRI</span>
                  </span>

                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#33271D] font-normal leading-tight">
                    {room.name}
                  </h3>

                  <p className="text-sm sm:text-[14.5px] text-[#786A5B] leading-relaxed font-sans font-light">
                    {room.short_description || room.full_description}
                  </p>

                  {/* 4 Feature Badges Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8F3E9]/70 border border-[#E6D9C5]/70 text-xs font-medium text-[#33271D] truncate"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#43001F] shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-[#43001F] font-semibold pt-1">
                    Extra Person: ₹300 <span className="text-[#786A5B] font-light">(Max {room.max_occupancy} guests)</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3">
                    {room.walk_in_only ? (
                      <>
                        <div className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs uppercase tracking-[0.14em] font-semibold">
                          <span>Front Desk Walk-In Only</span>
                          <span className="text-amber-700">·</span>
                          <span className="font-sans font-bold text-sm tracking-tight tabular-nums">
                            ₹{room.base_price_per_night.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <a
                          href="tel:08494223379"
                          className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full border border-[#43001F]/30 hover:border-[#43001F] bg-[#FAF6EE]/80 hover:bg-[#F3EAD9] active:scale-[0.98] text-[#43001F] hover:text-[#2E0015] text-xs uppercase tracking-[0.14em] font-semibold transition-all duration-200"
                        >
                          <span>Call Desk: 084942 23379</span>
                        </a>
                      </>
                    ) : (
                      <>
                        <NextLink
                          href={`/rooms/${room.slug}`}
                          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 rounded-full bg-[#43001F] hover:bg-[#2E0015] active:scale-[0.98] text-white text-xs uppercase tracking-[0.14em] font-semibold shadow-md hover:shadow-lg transition-all duration-200 group/btn"
                        >
                          <span>Book Now</span>
                          <span className="text-amber-200/80 font-normal">·</span>
                          <span className="font-sans font-bold text-sm tracking-tight tabular-nums">
                            ₹{room.base_price_per_night.toLocaleString('en-IN')}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </NextLink>

                        <NextLink
                          href={`/rooms/${room.slug}`}
                          className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full border border-[#43001F]/30 hover:border-[#43001F] bg-[#FAF6EE]/80 hover:bg-[#F3EAD9] active:scale-[0.98] text-[#43001F] hover:text-[#2E0015] text-xs uppercase tracking-[0.14em] font-semibold transition-all duration-200 group/det"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/det:translate-x-0.5 transition-transform" />
                        </NextLink>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Section: All Rooms Include */}
      <section className="w-full py-16 bg-[#F2E8D8]/60 border-y border-[#E6D9C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] block mb-1">
              COMFORTS
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#33271D]">
              All Rooms Include
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            {[
              { label: 'Fully AC', icon: Wind },
              { label: 'High-Speed Wi-Fi', icon: Wifi },
              { label: 'Smart TV', icon: Tv },
              { label: 'Attached Bath', icon: Bath },
              { label: 'Daily Housekeeping', icon: Sparkles },
              { label: '24/7 Front Desk', icon: Clock },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-[#E6D9C5] shadow-xs flex flex-col items-center justify-center space-y-2.5 luxury-card-hover"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#F8F3E9] text-[#43001F] flex items-center justify-center">
                    <Icon className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <span className="text-xs font-semibold text-[#33271D]">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}
