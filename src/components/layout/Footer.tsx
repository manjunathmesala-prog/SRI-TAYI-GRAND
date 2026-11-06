'use client';

import React from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { ArrowUp, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';

export function Footer() {
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full bg-[#21180F] text-[#F8F3E9] pt-16 sm:pt-20 pb-28 sm:pb-12 safe-area-bottom border-t border-[#3a2c1f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14 border-b border-[#3a2c1f]/80">
          
          {/* Column 1: Brand (4 cols) */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <NextLink href="/" className="inline-block focus:outline-none">
              <div className="flex flex-col items-start space-y-2">
                <div className="relative w-12 h-12 rounded-full border border-[#D8AD56]/80 overflow-hidden flex items-center justify-center bg-[#43001F] shadow-sm shrink-0">
                  <Image
                    src="/images/hotel/tayi-grand-logo.png"
                    alt="Sri Tayi Grand Official Emblem"
                    fill
                    sizes="48px"
                    className="object-contain p-0.5"
                  />
                </div>
                <div className="tracking-[0.22em] text-xl font-serif text-[#B18A4A] uppercase font-semibold">
                  SRI TAYI GRAND
                </div>
                <div className="tracking-[0.3em] text-[10px] text-[#E6D9C5]/80 uppercase -mt-1 font-medium">
                  HOTEL • KADIRI
                </div>
              </div>
            </NextLink>
            <p className="text-sm text-[#E6D9C5]/70 leading-relaxed max-w-sm pt-2 font-serif italic">
              A sanctuary of comfort, heartfelt hospitality and modern convenience on Bypass Road, Kadiri.
            </p>
            <div className="pt-2 flex items-center gap-2.5 flex-wrap">
              <NextLink
                href="/admin"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2D2218] hover:bg-[#43001F] text-[#E6D9C5] hover:text-white border border-[#B18A4A]/40 hover:border-[#B18A4A] text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm group"
              >
                <ShieldCheck className="w-4 h-4 text-[#B18A4A] group-hover:text-white transition-colors" />
                <span>Admin Panel</span>
                <span className="text-[10px] text-[#B18A4A] group-hover:text-white/80 font-normal transition-transform group-hover:translate-x-0.5">→</span>
              </NextLink>
            </div>
          </div>

          {/* Column 2: Quick Links (2.5 cols) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-[#B18A4A] mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3 text-sm text-[#E6D9C5]/80">
              <li>
                <NextLink href="/" className="hover:text-[#B18A4A] transition-colors">
                  Home
                </NextLink>
              </li>
              <li>
                <NextLink href="/rooms" className="hover:text-[#B18A4A] transition-colors">
                  Rooms & Suites
                </NextLink>
              </li>
              <li>
                <NextLink href="/convention-hall" className="hover:text-[#B18A4A] transition-colors">
                  Convention Hall
                </NextLink>
              </li>
              <li>
                <NextLink href="/amenities" className="hover:text-[#B18A4A] transition-colors">
                  Facilities & Amenities
                </NextLink>
              </li>
              <li>
                <NextLink href="/gallery" className="hover:text-[#B18A4A] transition-colors">
                  Photo Gallery
                </NextLink>
              </li>
              <li>
                <NextLink href="/about" className="hover:text-[#B18A4A] transition-colors">
                  About Hotel
                </NextLink>
              </li>
              <li>
                <NextLink href="/testimonials" className="hover:text-[#B18A4A] transition-colors">
                  Guest Reviews
                </NextLink>
              </li>
              <li>
                <NextLink href="/contact" className="hover:text-[#B18A4A] transition-colors">
                  Contact Us
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Column 3: Our Rooms & Venue (2.5 cols) */}
          <div className="lg:col-span-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-[#B18A4A] mb-5">
              Rooms & Venue
            </h4>
            <ul className="space-y-3 text-sm text-[#E6D9C5]/80">
              <li>
                <NextLink href="/rooms/suite-room" className="hover:text-[#B18A4A] transition-colors">
                  Executive Suite Room
                </NextLink>
              </li>
              <li>
                <NextLink href="/rooms/four-bed-room" className="hover:text-[#B18A4A] transition-colors">
                  Deluxe Four Bed Room
                </NextLink>
              </li>
              <li>
                <NextLink href="/rooms/double-room" className="hover:text-[#B18A4A] transition-colors">
                  Deluxe Double Room
                </NextLink>
              </li>
              <li>
                <NextLink href="/convention-hall" className="hover:text-[#B18A4A] transition-colors">
                  Grand Convention Hall (800 Guests)
                </NextLink>
              </li>
              <li>
                <NextLink href="/amenities" className="hover:text-[#B18A4A] transition-colors">
                  Car Parking & Wi-Fi
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us (3 cols) */}
          <div className="lg:col-span-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-[#B18A4A] mb-5">
              Contact Us
            </h4>
            <div className="space-y-3.5 text-sm text-[#E6D9C5]/80">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#B18A4A] shrink-0 mt-1" />
                <a
                  href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leading-snug hover:text-[#B18A4A] transition-colors"
                >
                  Opp. Girls High School, Bypass Road, Tadipatri – Pulivendula – Kadiri Road, Kadiri – 515591, AP
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#B18A4A] shrink-0" />
                <a
                  href="tel:08494223379"
                  className="hover:text-[#B18A4A] transition-colors"
                >
                  084942 23379 (24/7 Front Desk)
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#B18A4A] shrink-0" />
                <a
                  href="mailto:contact@sritayigrand.com"
                  className="hover:text-[#B18A4A] transition-colors"
                >
                  contact@sritayigrand.com
                </a>
              </div>

              <div className="pt-2 text-xs text-[#E6D9C5]/60 font-light">
                Check-in: 12:00 PM • Check-out: 11:00 AM
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#E6D9C5]/60 gap-4">
          <p>© {new Date().getFullYear()} Sri Tayi Grand Hotel. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <NextLink href="/policies" className="hover:text-[#B18A4A] transition-colors">
              Hotel Policies
            </NextLink>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-[#B18A4A] hover:text-white transition-colors"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
