import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { repo } from '@/lib/db/repository';
import {
  Wind,
  Car,
  Users,
  Wifi,
  Bell,
  ArrowUpDown,
  Tv,
  Coffee,
  Droplets,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hotel Amenities & Facilities | Sri Tayi Grand Kadiri',
  description: 'Explore the full range of amenities at Sri Tayi Grand, Kadiri: fully air-conditioned rooms, ample on-site car parking, grand convention hall, high-speed Wi-Fi, 24/7 front desk, elevator lift access, and prompt room service.',
};

const iconMap: Record<string, any> = {
  Snowflake: Wind,
  Wind,
  Car,
  Users,
  Wifi,
  Bell,
  ArrowUpDown,
  ShieldCheck,
  Tv,
  Coffee,
  Droplets,
  Clock,
};

export default function AmenitiesPage() {
  const amenities = repo.getAmenities().filter((a) => a.is_active);

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Hero Header */}
      <section className="relative z-20 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/reception-desk-photo-enhanced.png"
            alt="Sri Tayi Grand Amenities Concierge"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#21180F]/75 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 pt-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A]">
            <TayiBrandIcon size={18} />
            <span>SERVICES &amp; COMFORTS</span>
            <TayiBrandIcon size={18} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-tight">
            Hotel Amenities
          </h1>
          <p className="text-sm sm:text-base text-[#F8F3E9]/85 font-serif italic max-w-lg mx-auto">
            Carefully curated to ensure effortless comfort, modern convenience, and genuine warmth throughout your stay.
          </p>
        </div>
      </section>

      {/* Amenities Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
          {amenities.map((amenity) => {
            const IconComponent = iconMap[amenity.icon_name] || Wind;
            return (
              <div
                key={amenity.id}
                className="bg-white rounded-2xl border border-[#E6D9C5] p-6 sm:p-7 shadow-luxury luxury-card-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-13 h-13 rounded-2xl bg-[#F8F3E9] text-[#43001F] border border-[#E6D9C5]/80 flex items-center justify-center mb-5">
                    <IconComponent className="w-6 h-6 stroke-[1.6]" />
                  </div>
                  <h2 className="font-serif text-lg font-bold text-[#33271D]">
                    {amenity.name}
                  </h2>
                  <p className="text-xs text-[#786A5B] mt-2 leading-relaxed font-light">
                    {amenity.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* In-Room Luxury Comfort Showcase */}
        <div className="mt-20 pt-16 border-t border-[#E6D9C5]">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] block mb-2">
              IN-ROOM ELEGANCE
            </span>
            <h2 className="font-serif text-3xl font-normal text-[#33271D]">
              Crafted for Restful Stays
            </h2>
            <p className="text-xs text-[#786A5B] mt-1 font-light">
              Every detail is tailored for maximum peace, privacy, and well-being.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal-stagger">
            <div className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] group bg-[#21180F] luxury-card-hover">
              <Image
                src="/images/hotel/room-suite-bed-photo-enhanced.png"
                alt="Plush King Bedding"
                fill
                className="object-cover group-hover:scale-108 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <div>
                  <span className="text-[10px] text-[#D8AD56] font-semibold uppercase tracking-wider block">Sleep Quality</span>
                  <span className="text-sm font-serif font-medium text-white">Plush Master Bedding</span>
                </div>
              </div>
            </div>

            <div className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] group bg-[#21180F] luxury-card-hover">
              <Image
                src="/images/hotel/suite-seating-photo-enhanced.png"
                alt="Executive Suite Living Lounge"
                fill
                className="object-cover group-hover:scale-108 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <div>
                  <span className="text-[10px] text-[#D8AD56] font-semibold uppercase tracking-wider block">Spaciousness</span>
                  <span className="text-sm font-serif font-medium text-white">Dedicated Living Area</span>
                </div>
              </div>
            </div>

            <div className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] group bg-[#21180F] luxury-card-hover">
              <Image
                src="/images/hotel/reception-desk-photo-enhanced.png"
                alt="Reception & Attentive Concierge"
                fill
                className="object-cover group-hover:scale-108 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <div>
                  <span className="text-[10px] text-[#D8AD56] font-semibold uppercase tracking-wider block">Assistance</span>
                  <span className="text-sm font-serif font-medium text-white">24/7 Front Desk</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <NextLink
              href="/rooms"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <span>Book Your Room Now</span>
              <ArrowRight className="w-4 h-4" />
            </NextLink>
          </div>
        </div>
      </section>

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}
