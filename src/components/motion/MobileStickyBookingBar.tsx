'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const baseCurve = [0.22, 1, 0.36, 1] as const;

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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: baseCurve }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#131209]/95 backdrop-blur-xl border-t border-[#D8AD56]/30 shadow-2xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8AD56]" />
                <span className="title-4 font-semibold text-white tracking-wide truncate">
                  Tayi Grand Hotel
                </span>
              </div>
              <span className="caption-3 text-[#D8AD56]">
                From ₹1,800 <span className="text-white/60 font-normal">/ night</span>
              </span>
            </div>

            <NextLink
              href="/rooms"
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#131209] button-xsm shadow-md active:scale-[0.98] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book stay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NextLink>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
