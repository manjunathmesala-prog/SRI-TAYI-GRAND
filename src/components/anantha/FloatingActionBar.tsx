'use client';

import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, ArrowRight, ChevronUp, MapPin } from 'lucide-react';
import TayiBrandIcon from './TayiBrandIcon';

export default function FloatingActionBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isPastHero = window.scrollY > 450;
      setIsVisible(isPastHero);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsappMessage = encodeURIComponent(
    'Hello Sri Tayi Grand, I would like to inquire about room availability and reservations in Kadiri.'
  );
  const whatsappUrl = `https://wa.me/918494223379?text=${whatsappMessage}`;

  return (
    <aside
      aria-label="Quick Action Bar"
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl transition-all duration-500 ease-out hidden sm:block ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-[#21180F]/95 backdrop-blur-xl border border-[#B18A4A]/40 rounded-full px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] text-white flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Brand Identity & Live Rate */}
        <div className="flex items-center gap-3 pl-1 pr-3 border-r border-white/10 shrink-0">
          <TayiBrandIcon size={28} />
          <div className="text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-serif tracking-wider uppercase font-semibold text-white">
                Sri Tayi Grand
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-300 font-medium tracking-wide">Kadiri</span>
            </div>
            <p className="text-[11px] text-[#E6D9C5]/80 font-sans">
              Rooms from <strong className="font-bold text-white tabular-nums">₹1,800</strong> / night
            </p>
          </div>
        </div>

        {/* Center: High-Intent Communication Channels */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href="tel:08494223379"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#FAF6EE] text-xs font-medium transition-all duration-200 border border-white/10 group"
            title="Call Front Desk (084942 23379)"
          >
            <Phone className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>Call Reception</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/25 hover:bg-emerald-600/40 active:scale-95 text-emerald-200 text-xs font-medium transition-all duration-200 border border-emerald-500/30 group"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>WhatsApp</span>
          </a>

          <a
            href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#FAF6EE] text-xs font-medium transition-all duration-200 border border-white/10 group"
            title="Directions on Google Maps"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>Directions</span>
          </a>
        </div>

        {/* Right: Scroll to top */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <button
            onClick={scrollToTop}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 flex items-center justify-center transition-colors"
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </aside>
  );
}
