'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, Phone, MapPin, Smartphone } from 'lucide-react';

interface HeaderProps {
  transparentInitially?: boolean;
}

export function Header({ transparentInitially = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const leftNavLinks = [
    { label: 'HOME', href: '/' },
    { label: 'ROOMS', href: '/rooms' },
    { label: 'CONVENTION', href: '/convention-hall' },
    { label: 'AMENITIES', href: '/amenities' },
  ];

  const rightNavLinks = [
    { label: 'GALLERY', href: '/gallery' },
    { label: 'ABOUT', href: '/about' },
    { label: 'CONTACT', href: '/contact' },
  ];

  const allNavLinks = [
    { label: 'HOME', href: '/' },
    { label: 'ABOUT HOTEL', href: '/about' },
    { label: 'SUITES & ROOMS', href: '/rooms' },
    { label: 'CONVENTION HALL', href: '/convention-hall' },
    { label: 'FACILITIES & AMENITIES', href: '/amenities' },
    { label: 'PHOTO GALLERY', href: '/gallery' },
    { label: 'GUEST REVIEWS', href: '/testimonials' },
    { label: 'CONTACT & LOCATION', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full select-none">
      {/* Container with architectural curved SVG parchment background */}
      <div className="relative w-full h-[106px] sm:h-[110px]">
        {/* SVG background creating the exact architectural curve dip framing the logo */}
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden drop-shadow-[0_5px_12px_rgba(28,24,20,0.12)]">
          <svg
            viewBox="0 0 1440 106"
            preserveAspectRatio="none"
            className="w-full h-full"
            aria-hidden="true"
          >
            {/* Parchment background fill */}
            <path
              d="M0,0 L1440,0 L1440,78 L1094,78 C960,78 855,106 720,106 C585,106 480,78 346,78 L0,78 Z"
              fill="#FAF5EB"
            />
            {/* Subtle architectural gold accent outline along the bottom curve */}
            <path
              d="M0,78 L346,78 C480,78 585,106 720,106 C855,106 960,78 1094,78 L1440,78"
              fill="none"
              stroke="#E2D5BE"
              strokeWidth="1.2"
              opacity="0.8"
            />
          </svg>
        </div>

        {/* Header content bar */}
        <div className="relative z-10 w-full h-[78px] max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between">
          
          {/* Mobile hamburger menu button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#3a3126] hover:text-[#9b7a3e] hover:bg-black/5 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Desktop Left Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 xl:gap-9">
            {leftNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.label}
                  href={link.href}
                  className={`font-serif text-[11.8px] xl:text-[12.8px] tracking-[0.16em] uppercase font-medium transition-colors relative py-1 ${
                    isActive
                      ? 'text-[#2b241c] font-semibold'
                      : 'text-[#483e33] hover:text-[#9b7a3e]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-6 h-[1.5px] bg-[#9b7a3e] rounded-full" />
                  )}
                </NextLink>
              );
            })}
          </nav>

          {/* Center Brand Identity (framed gracefully by the architectural curve dip) */}
          <NextLink
            href="/"
            className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group focus:outline-none"
            aria-label="Sri Tayi Grand Hotel — Return to Home"
          >
            <div className="relative transition-transform duration-300 group-hover:scale-105 flex flex-col items-center justify-center">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-1">
                <Image
                  src="/images/hotel/tayi-grand-logo.png"
                  alt="Sri Tayi Grand Official Emblem"
                  fill
                  priority
                  className="object-contain drop-shadow-[0_2px_4px_rgba(46,0,21,0.2)]"
                  sizes="(max-width: 640px) 32px, 40px"
                />
              </div>
              <span className="font-serif text-[10.5px] sm:text-[12px] font-bold tracking-[0.22em] text-[#2b241c] uppercase leading-none text-center whitespace-nowrap">
                Sri Tayi Grand
              </span>
            </div>
          </NextLink>

          {/* Desktop Right Navigation Links + CTA Button */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <nav className="flex items-center gap-6 xl:gap-8">
              {rightNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <NextLink
                    key={link.label}
                    href={link.href}
                    className={`font-serif text-[11.8px] xl:text-[12.8px] tracking-[0.16em] uppercase font-medium transition-colors relative py-1 ${
                      isActive
                        ? 'text-[#2b241c] font-semibold'
                        : 'text-[#483e33] hover:text-[#9b7a3e]'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-6 h-[1.5px] bg-[#9b7a3e] rounded-full" />
                    )}
                  </NextLink>
                );
              })}
            </nav>

            {/* Book Your Stay Button */}
            <NextLink
              href="/rooms"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-[3.5px] bg-gradient-to-b from-[#9d7a3d] to-[#89672d] hover:from-[#89672d] hover:to-[#765723] text-[#FFFDF9] font-serif text-[11px] sm:text-[11.8px] tracking-[0.15em] uppercase font-semibold shadow-[0_2px_6px_rgba(137,103,45,0.25)] whitespace-nowrap active:scale-[0.98] transition-all ml-1 group"
            >
              <span>BOOK YOUR STAY</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FFFDF9] group-hover:translate-x-1 transition-transform" strokeWidth={2.2} />
            </NextLink>
          </div>

          {/* Mobile Right CTA (compact on small screens) */}
          <div className="flex lg:hidden items-center">
            <NextLink
              href="/rooms"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[3.5px] bg-[#9b7a3e] text-white font-serif text-[10.5px] tracking-wider uppercase font-semibold shadow-sm active:scale-95"
            >
              <span>BOOK</span>
              <ArrowRight className="w-3 h-3" />
            </NextLink>
          </div>
        </div>
      </div>

      {/* Mobile Animated Luxury Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF5EB] border-b border-[#e2d5be] px-6 py-6 shadow-2xl animate-in slide-in-from-top-2">
          {/* Brand Logo Header in Mobile Drawer */}
          <div className="flex items-center gap-3 pb-4 mb-3 border-b border-[#e2d5be]/80">
            <div className="relative w-10 h-10 rounded-xl bg-white/80 border border-[#B18A4A]/30 p-1 flex items-center justify-center shadow-xs shrink-0">
              <Image
                src="/images/hotel/tayi-grand-logo.png"
                alt="Sri Tayi Grand Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <p className="font-serif text-sm font-bold tracking-wider text-[#2b241c] uppercase">Sri Tayi Grand</p>
              <p className="text-[10px] text-[#8a7b6a] font-medium tracking-wide">Kadiri, Andhra Pradesh</p>
            </div>
          </div>

          <div className="flex flex-col space-y-3.5">
            {allNavLinks.map((link) => (
              <NextLink
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-serif text-[13px] tracking-[0.16em] uppercase font-medium text-[#383129] hover:text-[#9b7a3e] py-2 border-b border-stone-200/60 flex items-center justify-between"
              >
                <span>{link.label}</span>
                <span className="text-xs text-[#9b7a3e]">&rsaquo;</span>
              </NextLink>
            ))}
          </div>

          <div className="pt-5 flex flex-col gap-3">
            <NextLink
              href="/rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-[4px] bg-gradient-to-b from-[#9d7a3d] to-[#89672d] text-[#FFFDF9] font-serif text-xs font-semibold tracking-[0.16em] uppercase shadow-md flex items-center justify-center gap-2"
            >
              <span>BOOK YOUR STAY</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NextLink>

            {/* Quick Actions (Call / Directions) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="tel:08494223379"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[3.5px] bg-[#F2E8D8] border border-[#E2D5BE] text-[#33271D] text-xs font-semibold hover:bg-[#EAE0CD]"
              >
                <Phone className="w-3.5 h-3.5 text-[#9b7a3e]" />
                <span>Call Hotel</span>
              </a>
              <a
                href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[3.5px] bg-[#F2E8D8] border border-[#E2D5BE] text-[#33271D] text-xs font-semibold hover:bg-[#EAE0CD]"
              >
                <MapPin className="w-3.5 h-3.5 text-[#9b7a3e]" />
                <span>Directions</span>
              </a>
            </div>

            {/* Install App CTA in Mobile Drawer */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-pwa-install'));
                }
              }}
              className="w-full py-2.5 px-3 rounded-[3.5px] bg-[#43001F] text-[#F8F3E9] text-xs font-medium hover:bg-[#5E002B] flex items-center justify-center gap-2 border border-[#B18A4A]/40 transition-colors shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#E2C785]" />
              <span>Install Official App (PWA)</span>
            </button>

            <p className="text-center font-serif text-[10.5px] tracking-widest text-[#8a7b6a] uppercase mt-2">
              Sri Tayi Grand &bull; Kadiri, Andhra Pradesh
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
