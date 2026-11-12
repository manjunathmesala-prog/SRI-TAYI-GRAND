'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MobileStickyBookingBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled past hero section (~420px)
      if (window.scrollY > 420) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#20120B]/95 backdrop-blur-xl border-t border-[#D8AD56]/30 shadow-[0_-10px_25px_rgba(0,0,0,0.4)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8AD56] animate-pulse" />
                <span className="font-serif text-sm font-semibold text-white tracking-wide truncate">
                  Sri Tayi Grand
                </span>
              </div>
              <span className="text-[11px] text-[#D8AD56] font-medium tracking-tight">
                From ₹1,800 <span className="text-white/60 font-light">/ night + 5% GST</span>
              </span>
            </div>

            <NextLink
              href="/rooms"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold tracking-wider transition-colors shadow-luxury active:scale-95 shrink-0 border border-[#D8AD56]/40"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Stay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NextLink>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
