'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';

export default function MobileStickyBookingBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsVisible(window.scrollY > 360);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#21180F]/95 backdrop-blur-xl border-t border-[#43001F]/60 shadow-[0_-8px_25px_rgba(0,0,0,0.5)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all animate-fadeIn">
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <Link href="/rooms" className="flex flex-col min-w-0 cursor-pointer">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-serif text-sm font-bold text-white tracking-wide truncate">
              Sri Tayi Grand
            </span>
          </div>
          <span className="text-[11px] text-[#D8AD56] font-medium tracking-tight">
            From ₹1,800 <span className="text-white/60 font-light">/ night + 5% GST</span>
          </span>
        </Link>

        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-serif font-bold tracking-wider transition-all shadow-lg active:scale-95 shrink-0 border border-[#D8AD56]/40"
        >
          <Calendar className="w-3.5 h-3.5 text-[#D8AD56]" />
          <span>Book Stay</span>
          <ArrowRight className="w-3 h-3 text-[#D8AD56]" />
        </Link>
      </div>
    </div>
  );
}
