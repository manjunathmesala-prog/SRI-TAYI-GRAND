'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';

interface CelebrityPhoto {
  id: number;
  src: string;
  alt: string;
  caption: string;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
}

const CELEBRITY_PHOTOS: CelebrityPhoto[] = [
  {
    id: 1,
    src: '/images/celebrity/celebrity-guest-1.jpg',
    alt: 'Distinguished guest welcomed at Sri Tayi Grand Hotel',
    caption: 'Warm reception with our esteemed guest at Sri Tayi Grand',
    orientation: 'portrait',
    width: 960,
    height: 1280,
  },
  {
    id: 2,
    src: '/images/celebrity/celebrity-guest-2.jpg',
    alt: 'Celebrity guest posing in front of Sri Tayi Grand',
    caption: 'Honoured arrival at the hotel entrance',
    orientation: 'portrait',
    width: 720,
    height: 1280,
  },
  {
    id: 3,
    src: '/images/celebrity/celebrity-guest-3.jpg',
    alt: 'Memorable hospitality moment with guest at Sri Tayi Grand',
    caption: 'Cherished memories of gracious hospitality',
    orientation: 'portrait',
    width: 720,
    height: 1280,
  },
  {
    id: 4,
    src: '/images/celebrity/celebrity-guest-4.jpg',
    alt: 'Celebrity guest with Sri Tayi Grand team and hosts',
    caption: 'Moments of celebration with our hotel team',
    orientation: 'landscape',
    width: 1040,
    height: 780,
  },
  {
    id: 5,
    src: '/images/celebrity/celebrity-guest-5.jpg',
    alt: 'Guest experience and stay at Sri Tayi Grand Kadiri',
    caption: 'Celebrating authentic South Indian hospitality',
    orientation: 'landscape',
    width: 1040,
    height: 780,
  },
  {
    id: 6,
    src: '/images/celebrity/celebrity-guest-6.jpg',
    alt: 'Distinguished gathering at Sri Tayi Grand Hotel',
    caption: 'Gatherings of distinction and memorable stays',
    orientation: 'landscape',
    width: 1280,
    height: 720,
  },
  {
    id: 7,
    src: '/images/celebrity/celebrity-guest-7.jpg',
    alt: 'Special visitor interaction at Sri Tayi Grand',
    caption: 'Welcoming cultural icons to Kadiri corridor',
    orientation: 'landscape',
    width: 1206,
    height: 690,
  },
  {
    id: 8,
    src: '/images/celebrity/celebrity-guest-8.jpg',
    alt: 'Cherished moments with guest at Sri Tayi Grand',
    caption: 'Lasting friendships and unforgettable visits',
    orientation: 'landscape',
    width: 1024,
    height: 682,
  },
];

export function CelebrityShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Check scroll position to enable/disable controls and update progress bar
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev === 0 ? CELEBRITY_PHOTOS.length - 1 : prev - 1) : null
        );
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev === CELEBRITY_PHOTOS.length - 1 ? 0 : prev + 1) : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxIndex]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollAmount = direction === 'left' ? -420 : 420;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="w-full py-16 sm:py-24 bg-[#FAF5EB] border-t border-[#E6D9C5] relative overflow-hidden">
      {/* Background ambient luxury glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#D8AD56]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#43001F]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header: Title, Subtitle, and Desktop Navigation Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
          <div className="max-w-2xl text-left">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] inline-flex items-center gap-2 mb-3">
              <TayiBrandIcon size={18} />
              DISTINGUISHED MOMENTS
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#33271D] font-normal tracking-tight leading-[1.15]">
              Celebrated Guests at Sri Tayi Grand
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#786A5B] font-light leading-relaxed">
              Moments of warmth and authentic hospitality shared with cherished visitors and esteemed cultural personalities who made Sri Tayi Grand their home in Kadiri.
            </p>
          </div>

          {/* Navigation Arrows (Desktop / Tablet) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="w-12 h-12 rounded-full border border-[#E6D9C5] bg-white/90 hover:bg-[#43001F] text-[#43001F] hover:text-white disabled:opacity-30 disabled:pointer-events-none shadow-xs transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="w-12 h-12 rounded-full border border-[#E6D9C5] bg-white/90 hover:bg-[#43001F] text-[#43001F] hover:text-white disabled:opacity-30 disabled:pointer-events-none shadow-xs transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Scrollable Gallery Track */}
      <div className="w-full relative">
        <div
          ref={scrollRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar touch-scroll snap-x snap-mandatory py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-smooth"
        >
          {CELEBRITY_PHOTOS.map((photo, index) => {
            const isLandscape = photo.orientation === 'landscape';

            return (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(index)}
                className={`group relative shrink-0 snap-start cursor-pointer rounded-3xl sm:rounded-[32px] overflow-hidden border border-[#E6D9C5] bg-[#21180F] shadow-[0_12px_36px_-12px_rgba(51,39,29,0.14)] hover:shadow-[0_20px_48px_-10px_rgba(67,0,31,0.25)] hover:border-[#B18A4A] transition-all duration-500 transform hover:-translate-y-1 h-[380px] sm:h-[460px] md:h-[480px] ${
                  isLandscape
                    ? 'w-[320px] sm:w-[480px] md:w-[540px] max-w-[85vw]'
                    : 'w-[260px] sm:w-[320px] md:w-[340px] max-w-[78vw]'
                }`}
              >
                {/* Image */}
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={
                    isLandscape
                      ? '(max-width: 640px) 85vw, (max-width: 1024px) 500px, 540px'
                      : '(max-width: 640px) 78vw, (max-width: 1024px) 320px, 340px'
                  }
                  className="object-cover object-center group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                />

                {/* Subtle vignette gradient & hover expand button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                {/* Top-right subtle zoom icon badge */}
                <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75">
                  <Maximize2 className="w-4 h-4" />
                </div>

                {/* Bottom caption bar */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white flex flex-col justify-end">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] mb-1">
                    Sri Tayi Grand Guest
                  </span>
                  <p className="text-sm sm:text-base font-serif font-normal text-white/95 line-clamp-2 leading-snug">
                    {photo.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Progress Track & Mobile Scroll Hint */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center justify-between sm:justify-center gap-4">
          {/* Scroll progress bar */}
          <div className="w-36 sm:w-48 h-1 bg-[#E6D9C5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#43001F] rounded-full transition-all duration-200"
              style={{ width: `${Math.max(12, scrollProgress)}%` }}
            />
          </div>

          {/* Mobile Swipe Indicator */}
          <span className="sm:hidden text-[11px] uppercase tracking-wider text-[#786A5B] font-medium">
            Swipe to explore →
          </span>
        </div>
      </div>

      {/* Fullscreen Interactive Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fadeIn select-none"
        >
          {/* Modal Top Bar */}
          <div className="flex items-center justify-between text-white max-w-6xl mx-auto w-full z-10 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-[#D8AD56] font-medium">
                Distinguished Guest
              </span>
              <span className="text-xs text-white/50">|</span>
              <span className="text-xs text-white/70">
                {lightboxIndex + 1} of {CELEBRITY_PHOTOS.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Center Image */}
          <div className="relative flex-1 flex items-center justify-center my-4 max-w-5xl mx-auto w-full">
            <div className="relative w-full h-[65vh] sm:h-[75vh] flex items-center justify-center">
              <Image
                src={CELEBRITY_PHOTOS[lightboxIndex].src}
                alt={CELEBRITY_PHOTOS[lightboxIndex].alt}
                fill
                priority
                className="object-contain rounded-2xl drop-shadow-2xl"
                sizes="(max-width: 1200px) 95vw, 1200px"
              />
            </div>

            {/* Previous Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) =>
                  prev !== null ? (prev === 0 ? CELEBRITY_PHOTOS.length - 1 : prev - 1) : null
                );
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-[#43001F] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-sm shadow-xl active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) =>
                  prev !== null ? (prev === CELEBRITY_PHOTOS.length - 1 ? 0 : prev + 1) : null
                );
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-[#43001F] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-sm shadow-xl active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Bottom Caption */}
          <div className="max-w-2xl mx-auto w-full text-center pb-2">
            <p className="text-white/90 font-serif text-base sm:text-lg">
              {CELEBRITY_PHOTOS[lightboxIndex].caption}
            </p>
            <span className="text-[11px] text-white/50 block mt-1 tracking-wider uppercase">
              Sri Tayi Grand · Kadiri
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default CelebrityShowcase;
