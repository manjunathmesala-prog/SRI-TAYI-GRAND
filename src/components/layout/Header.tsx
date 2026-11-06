'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  transparentInitially?: boolean;
}

export function Header({ transparentInitially = true }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Rooms', href: '/rooms' },
    { label: 'Convention Hall', href: '/convention-hall' },
    { label: 'Amenities', href: '/amenities' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Contact', href: '/contact' },
  ];

  const isTransparent = transparentInitially && !isScrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isTransparent
          ? 'bg-gradient-to-b from-black/75 via-black/35 to-transparent py-5 sm:py-6'
          : 'bg-[#20120B]/95 backdrop-blur-md shadow-2xl py-3.5 sm:py-4 border-b border-[#D8AD56]/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Monogram & Name */}
          <NextLink
            href="/"
            data-cursor-hover
            className="flex items-center gap-3 sm:gap-3.5 group focus:outline-none"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#D8AD56]/80 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 group-hover:border-[#D8AD56]">
              <span className="font-serif font-semibold text-xs sm:text-sm text-[#D8AD56] tracking-widest">
                TG
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg sm:text-2xl font-normal tracking-[0.08em] text-white group-hover:text-[#D8AD56] transition-colors leading-none">
                Tayi Grand
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] text-[#D8AD56]/90 font-light mt-1">
                HOTEL
              </span>
            </div>
          </NextLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-9">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  data-cursor-hover
                  className={`text-xs uppercase tracking-[0.18em] transition-all duration-300 relative py-1 ${
                    isActive
                      ? 'text-[#D8AD56] font-medium'
                      : 'text-white/80 hover:text-[#D8AD56] font-light'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="navIndicator"
                      className="absolute -bottom-1 left-0 w-full h-[1.5px] bg-[#D8AD56] rounded-full"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </NextLink>
              );
            })}
          </nav>

          {/* Right Action: Clean Book Now CTA */}
          <div className="hidden sm:flex items-center">
            <NextLink
              href="/rooms"
              data-cursor-hover
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-semibold tracking-wider transition-all duration-300 shadow-luxury hover:shadow-goldGlow hover:-translate-y-0.5 active:translate-y-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Now</span>
            </NextLink>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <NextLink
              href="/rooms"
              className="px-3 py-1.5 rounded-full bg-[#D8AD56] text-[#20120B] text-[11px] font-semibold tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Calendar className="w-3 h-3" />
              <span>Book</span>
            </NextLink>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-white/90 hover:text-[#D8AD56] hover:bg-white/5 focus:outline-none transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Animated Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden bg-[#20120B]/98 backdrop-blur-xl border-b border-[#D8AD56]/20 px-6 pt-4 pb-6 space-y-3.5 shadow-2xl overflow-hidden"
          >
            {navLinks.map((link) => (
              <NextLink
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm uppercase tracking-widest transition-colors ${
                  pathname === link.href ? 'text-[#D8AD56] font-medium' : 'text-white/80 hover:text-[#D8AD56]'
                }`}
              >
                {link.label}
              </NextLink>
            ))}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#EFE3D6]/70">
              <span>Kadiri, Andhra Pradesh</span>
              <a href="tel:08494223379" className="text-[#D8AD56] hover:underline font-medium">
                084942 23379
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
