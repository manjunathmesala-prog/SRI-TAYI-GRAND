import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { ArrowRight, Check, ShieldCheck, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Sri Tayi Grand Hotel Kadiri',
  description: 'Learn about Sri Tayi Grand in Kadiri, Andhra Pradesh. Dedicated to modern luxury, warm Indian hospitality, and spacious event hosting on Bypass Road.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Hero Header */}
      <section className="relative z-20 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/hotel-exterior-night-enhanced.png"
            alt="Sri Tayi Grand Hospitality & Heritage"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#21180F]/75 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 pt-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A]">
            <TayiBrandIcon size={18} />
            <span>OUR STORY &amp; HERITAGE</span>
            <TayiBrandIcon size={18} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-tight">
            Hospitality &amp; Heritage
          </h1>
          <p className="text-sm sm:text-base text-[#F8F3E9]/85 font-serif italic max-w-lg mx-auto">
            Crafting an oasis of refined comfort, impeccable cleanliness, and heartfelt hospitality on Bypass Road, Kadiri.
          </p>
        </div>
      </section>

      {/* Narrative & Visual Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          {/* Visual (6 cols) */}
          <div className="lg:col-span-6 relative aspect-[4/3] rounded-3xl overflow-hidden shadow-luxury border border-[#E6D9C5] group reveal-scale">
            <Image
              src="/images/hotel/hotel-exterior-night-enhanced.png"
              alt="Sri Tayi Grand Illuminated Night Facade"
              fill
              priority
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
              <span className="text-xs font-serif text-[#D8AD56] tracking-wide">
                Grand Entrance &amp; Night Architecture
              </span>
            </div>
          </div>

          {/* Story (6 cols) */}
          <div className="lg:col-span-6 space-y-6 reveal-on-scroll">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] block">
              THE TAYI GRAND PHILOSOPHY
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#33271D] leading-tight">
              A Landmark of Care &amp; Serenity
            </h2>
            <p className="text-sm text-[#786A5B] leading-relaxed font-light">
              Conveniently situated on Bypass Road in Kadiri, Sri Tayi Grand was born from a desire to elevate hospitality in the Rayalaseema region. We believe that true luxury lies in thoughtful simplicity, spotless hygiene, and heartfelt attention to every guest.
            </p>
            <p className="text-sm text-[#786A5B] leading-relaxed font-light">
              Whether staying in our tranquil suites for religious pilgrimage to Sri Kadiri Lakshmi Narasimha Swamy Temple, or hosting hundreds of loved ones in our Grand Convention Hall, our dedicated team is committed to making your stay effortless and memorable.
            </p>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#33271D]">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E6D9C5] shadow-xs">
                <Check className="w-4 h-4 text-[#43001F] shrink-0" />
                <span className="font-medium">Climate-controlled AC rooms</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E6D9C5] shadow-xs">
                <Check className="w-4 h-4 text-[#43001F] shrink-0" />
                <span className="font-medium">Grand Hall for 800 guests</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E6D9C5] shadow-xs">
                <Check className="w-4 h-4 text-[#43001F] shrink-0" />
                <span className="font-medium">Secure on-site parking bays</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#E6D9C5] shadow-xs">
                <Check className="w-4 h-4 text-[#43001F] shrink-0" />
                <span className="font-medium">24-hour concierge assistance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Authentic Spaces Trio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 reveal-stagger">
          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] bg-[#21180F] luxury-card-hover">
            <Image
              src="/images/hotel/reception-desk-photo-enhanced.png"
              alt="Reception & Concierge Desk"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>

          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] bg-[#21180F] luxury-card-hover">
            <Image
              src="/images/hotel/room-suite-bed-photo-enhanced.png"
              alt="Executive Suite Bedding"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>

          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury border border-[#E6D9C5] bg-[#21180F] luxury-card-hover">
            <Image
              src="/images/hotel/convention-hall-grand-stage.jpg"
              alt="Grand Convention Banquet Hall & Celebration Stage"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8">
          <NextLink
            href="/rooms"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
          >
            <span>Plan Your Stay Today</span>
            <ArrowRight className="w-4 h-4" />
          </NextLink>
        </div>
      </section>

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}
