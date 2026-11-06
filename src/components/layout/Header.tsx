'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, Phone, MapPin, Calendar } from 'lucide-react';

interface HeaderProps {
  transparentInitially?: boolean;
}

export function Header({ transparentInitially = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const allLinks = [
    { label: 'HOME', href: '/' },
    { label: 'ROOMS & SUITES', href: '/rooms' },
    { label: 'CONVENTION HALL', href: '/convention-hall' },
    { label: 'FACILITIES & AMENITIES', href: '/amenities' },
    { label: 'PHOTO GALLERY', href: '/gallery' },
    { label: 'ABOUT HOTEL', href: '/about' },
    { label: 'GUEST REVIEWS', href: '/testimonials' },
    { label: 'CONTACT & LOCATION', href: '/contact' },
  ];

  const isTransparent = transparentInitially && !isScrolled;

  const headerContainerClass = transparentInitially
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent
          ? 'bg-gradient-to-b from-black/85 via-black/45 to-transparent border-b border-white/10 shadow-none py-1 sm:py-2'
          : 'bg-[#F8F3E9]/95 backdrop-blur-md border-b border-[#E6D9C5]/80 shadow-[0_2px_12px_rgba(66,43,25,0.06)] py-0'
      }`
    : 'w-full bg-[#F8F3E9]/95 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 border-b border-[#E6D9C5]/80 shadow-[0_2px_12px_rgba(66,43,25,0.04)]';

  const linkTextColor = isTransparent
    ? 'text-white/80 hover:text-white'
    : 'text-[#786A5B] hover:text-[#33271D]';

  const activeLinkTextColor = isTransparent
    ? 'text-[#D8AD56] font-semibold'
    : 'text-[#33271D] font-semibold';

  const brandTitleColor = isTransparent
    ? 'text-white group-hover:text-[#D8AD56]'
    : 'text-[#33271D] group-hover:text-[#43001F]';

  const brandSubtitleColor = isTransparent
    ? 'text-[#D8AD56]/90'
    : 'text-[#43001F]';

  return (
    <header className={headerContainerClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between">
        
        {/* Left Desktop Links */}
        <nav className="hidden lg:flex items-center space-x-7 xl:space-x-8">
          {leftNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <NextLink
                key={link.label}
                href={link.href}
                className={`text-[13px] tracking-[0.16em] uppercase font-medium transition-colors duration-200 relative py-1 ${
                  isActive ? activeLinkTextColor : linkTextColor
                }`}
              >
                {link.label}
                {isActive && (
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${
                      isTransparent ? 'bg-[#D8AD56]' : 'bg-[#43001F]'
                    }`}
                  />
                )}
              </NextLink>
            );
          })}
        </nav>

        {/* Center Brand Identity (Sri Tayi Grand Official Emblem + Wordmark) */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <NextLink
            href="/"
            className="flex flex-col items-center justify-center group focus:outline-none"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[#D8AD56]/80 overflow-hidden flex items-center justify-center bg-[#43001F] shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0">
                <Image
                  src="/images/hotel/tayi-grand-logo.png"
                  alt="Sri Tayi Grand Hotel Official Emblem"
                  fill
                  sizes="44px"
                  className="object-contain p-0.5"
                  priority
                />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className={`font-serif text-lg sm:text-2xl font-bold tracking-[0.1em] transition-colors uppercase ${brandTitleColor}`}>
                  Sri Tayi Grand
                </span>
                <span className={`text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-medium mt-0.5 ${brandSubtitleColor}`}>
                  Hotel • Kadiri
                </span>
              </div>
            </div>
          </NextLink>
        </div>

        {/* Right Desktop Links & CTA */}
        <div className="hidden lg:flex items-center space-x-7 xl:space-x-8">
          <nav className="flex items-center space-x-6 xl:space-x-7">
            {rightNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.label}
                  href={link.href}
                  className={`text-[13px] tracking-[0.16em] uppercase font-medium transition-colors duration-200 relative py-1 ${
                    isActive ? activeLinkTextColor : linkTextColor
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${
                        isTransparent ? 'bg-[#D8AD56]' : 'bg-[#43001F]'
                      }`}
                    />
                  )}
                </NextLink>
              );
            })}
          </nav>

          <NextLink
            href="/rooms"
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[12.5px] uppercase tracking-[0.14em] font-medium shadow-md transition-all duration-300 group hover:scale-105 active:scale-[0.98] ${
              isTransparent
                ? 'bg-[#43001F] hover:bg-[#2E0015] text-white border border-[#D8AD56]/40'
                : 'bg-[#43001F] hover:bg-[#2E0015] text-white'
            }`}
          >
            <span>Book Your Stay</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </NextLink>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden items-center space-x-3">
          <NextLink
            href="/rooms"
            className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-wider font-medium shadow-sm transition-all active:scale-95 ${
              isTransparent
                ? 'bg-[#43001F] hover:bg-[#2E0015] text-white border border-[#D8AD56]/40'
                : 'bg-[#43001F] hover:bg-[#2E0015] text-white'
            }`}
          >
            Book
          </NextLink>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
              isTransparent
                ? 'text-white hover:bg-white/10 active:bg-white/20'
                : 'text-[#33271D] hover:bg-black/5 active:bg-black/10'
            }`}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer & Backdrop */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-20 sm:top-24 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`relative z-50 lg:hidden px-6 py-6 space-y-5 shadow-2xl animate-fade-in-down max-h-[calc(100vh-5rem)] overflow-y-auto ${
              isTransparent
                ? 'bg-[#20120B]/98 text-white border-b border-[#D8AD56]/30'
                : 'bg-[#F8F3E9] text-[#33271D] border-b border-[#E6D9C5]'
            }`}
          >
            <div className="flex flex-col space-y-1">
              {allLinks.map((link) => (
                <NextLink
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-[14px] tracking-wider min-h-[46px] py-3 border-b flex items-center justify-between transition-colors ${
                    isTransparent
                      ? `border-white/10 ${pathname === link.href ? 'text-[#D8AD56] font-bold pl-1' : 'text-white/80 hover:text-[#D8AD56]'}`
                      : `border-[#E6D9C5]/50 ${pathname === link.href ? 'text-[#43001F] font-bold pl-1' : 'text-[#33271D] hover:text-[#43001F]'}`
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 opacity-40" />
                </NextLink>
              ))}
            </div>

            {/* Quick Mobile Contact Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href="tel:08494223379"
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold ${
                  isTransparent
                    ? 'bg-white/10 border border-white/20 text-white active:bg-white/20'
                    : 'bg-[#F0E6D8] border border-[#E6D9C5] text-[#33271D] active:bg-[#E6D9C5]'
                }`}
              >
                <Phone className={`w-3.5 h-3.5 ${isTransparent ? 'text-[#D8AD56]' : 'text-[#43001F]'}`} />
                <span>Call Hotel</span>
              </a>
              <a
                href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold ${
                  isTransparent
                    ? 'bg-white/10 border border-white/20 text-white active:bg-white/20'
                    : 'bg-[#F0E6D8] border border-[#E6D9C5] text-[#33271D] active:bg-[#E6D9C5]'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isTransparent ? 'text-[#D8AD56]' : 'text-[#43001F]'}`} />
                <span>Directions</span>
              </a>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
