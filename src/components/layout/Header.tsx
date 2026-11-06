'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const baseCurve = [0.22, 1, 0.36, 1] as const;

interface HeaderProps {
  transparentInitially?: boolean;
}

export function Header({ transparentInitially = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Rooms', href: '/rooms' },
    { label: 'Convention hall', href: '/convention-hall' },
    { label: 'Amenities', href: '/amenities' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="fixed top-3 sm:top-4 left-3 right-3 sm:left-6 sm:right-6 max-w-6xl mx-auto z-50">
      {/* B7. Floating translucent navigation bar */}
      <div className="bg-[#131209]/92 backdrop-blur-xl border border-[#D8AD56]/30 rounded-2xl md:rounded-full shadow-2xl py-2.5 px-4 sm:px-6 transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Brand Monogram & Name */}
          <NextLink
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] rounded-full"
          >
            <div className="w-9 h-9 rounded-full border border-[#D8AD56]/80 flex items-center justify-center bg-black/50 transition-transform duration-300 group-hover:scale-105">
              <span className="font-sans font-bold text-xs text-[#D8AD56] tracking-wider">
                TG
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-base sm:text-lg font-semibold tracking-wide text-white group-hover:text-[#D8AD56] transition-colors leading-none">
                Tayi Grand
              </span>
              <span className="caption-5 uppercase tracking-[0.25em] text-[#D8AD56]/90 mt-1">
                Hotel Kadiri
              </span>
            </div>
          </NextLink>

          {/* Desktop Navigation Links (Sentence case, B1 text style title-5) */}
          <nav className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  className={`title-5 transition-colors duration-200 relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] rounded ${
                    isActive
                      ? 'text-[#D8AD56] font-semibold'
                      : 'text-white/80 hover:text-[#D8AD56] font-medium'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavPill"
                      className="absolute -bottom-1 left-0 w-full h-[1.5px] bg-[#D8AD56] rounded-full"
                      transition={{ duration: 0.35, ease: baseCurve }}
                    />
                  )}
                </NextLink>
              );
            })}
          </nav>

          {/* Right Action: Button-sm token, B2 padding (8px v, 12px h) */}
          <div className="hidden sm:flex items-center">
            <NextLink
              href="/rooms"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#131209] button-sm transition-all duration-300 shadow-md hover:shadow-goldGlow hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book now</span>
            </NextLink>
          </div>

          {/* Mobile Menu Button with Animated Toggle (B7) */}
          <div className="flex items-center gap-2 lg:hidden">
            <NextLink
              href="/rooms"
              className="py-1.5 px-3 rounded-full bg-[#D8AD56] text-[#131209] button-xsm flex items-center gap-1 shadow-sm active:scale-95"
            >
              <Calendar className="w-3 h-3" />
              <span>Book</span>
            </NextLink>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-white/90 hover:text-[#D8AD56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* B7. Mobile Menu Panel with Staggered Link Entrance */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: baseCurve }}
            className="lg:hidden mt-2 bg-[#131209]/96 backdrop-blur-2xl border border-[#D8AD56]/30 rounded-2xl p-6 shadow-2xl space-y-3"
          >
            {navLinks.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(index * 0.06, 0.4),
                  ease: baseCurve,
                }}
              >
                <NextLink
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 title-4 transition-colors ${
                    pathname === link.href
                      ? 'text-[#D8AD56] font-semibold'
                      : 'text-white/80 hover:text-[#D8AD56]'
                  }`}
                >
                  {link.label}
                </NextLink>
              </motion.div>
            ))}

            <div className="pt-3 border-t border-white/10 flex items-center justify-between caption-2 text-[#EFE3D6]/70">
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
