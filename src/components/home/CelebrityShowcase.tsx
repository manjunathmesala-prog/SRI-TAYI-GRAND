'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CelebrityPhoto {
  id: number;
  src: string;
  alt: string;
}

const CELEBRITY_PHOTOS: CelebrityPhoto[] = [
  {
    id: 1,
    src: '/images/celebrity/celebrity-guest-1.jpg',
    alt: 'Distinguished guest welcomed at Sri Tayi Grand Hotel',
  },
  {
    id: 2,
    src: '/images/celebrity/celebrity-guest-2.jpg',
    alt: 'Celebrity guest at Sri Tayi Grand facade',
  },
  {
    id: 3,
    src: '/images/celebrity/celebrity-guest-3.jpg',
    alt: 'Memorable hospitality moment with guest at Sri Tayi Grand',
  },
  {
    id: 4,
    src: '/images/celebrity/celebrity-guest-4.jpg',
    alt: 'Celebrity guest with Sri Tayi Grand hosts',
  },
  {
    id: 5,
    src: '/images/celebrity/celebrity-guest-5.jpg',
    alt: 'Guest experience and stay at Sri Tayi Grand Kadiri',
  },
  {
    id: 6,
    src: '/images/celebrity/celebrity-guest-6.jpg',
    alt: 'Distinguished gathering at Sri Tayi Grand Hotel',
  },
  {
    id: 7,
    src: '/images/celebrity/celebrity-guest-7.jpg',
    alt: 'Special visitor interaction at Sri Tayi Grand',
  },
  {
    id: 8,
    src: '/images/celebrity/celebrity-guest-8.jpg',
    alt: 'Cherished moments with guest at Sri Tayi Grand',
  },
];

// 14 slots around 360 degrees matching Framer Studio Gallery formula exactly:
// k = 2 * atan((tileWidth + gap) / (2 * radius)), slots = round(2*PI/k) = 14, step = 360/14 = 25.714°
const SLOTS_COUNT = 14;
const STEP_ANGLE = 360 / SLOTS_COUNT; // 25.714285714285715 degrees

export function CelebrityShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Exact 3D Geometry derived from Framer Studio Gallery specifications
  const [dimensions, setDimensions] = useState({
    radius: 530,
    perspective: 1325,
    cardWidth: 221.6,
    cardHeight: 277,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Animation & physics state refs (direct DOM manipulation for butter-smooth 60-120fps)
  const currentRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const isHoveredRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const pointerLastRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });

  // Responsive dimensions matching Framer geometry ratios
  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 640) {
        // Mobile
        const radius = 330;
        const cardHeight = 185;
        const cardWidth = cardHeight * 0.8; // 148px (4:5 aspect)
        const perspective = 2.5 * radius; // 825px
        setDimensions({ radius, perspective, cardWidth, cardHeight });
      } else if (width < 1024) {
        // Tablet
        const radius = 440;
        const cardHeight = 230;
        const cardWidth = cardHeight * 0.8; // 184px (4:5 aspect)
        const perspective = 2.5 * radius; // 1100px
        setDimensions({ radius, perspective, cardWidth, cardHeight });
      } else {
        // Desktop (Exact Framer Studio Gallery numbers: height 277, width 221.6, radius 530, perspective 1325)
        const radius = 530;
        const cardHeight = 277;
        const cardWidth = 221.6;
        const perspective = 1325;
        setDimensions({ radius, perspective, cardWidth, cardHeight });
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update card visibility matching Framer cutoff: Se = 100 degrees
  const updateCardsPresentation = useCallback(
    (rotation: number) => {
      let minDistance = Infinity;
      let closestSlot = 0;

      for (let i = 0; i < SLOTS_COUNT; i++) {
        const cardEl = cardRefs.current[i];
        if (!cardEl) continue;

        let relAngle = (i * STEP_ANGLE + rotation) % 360;
        if (relAngle > 180) relAngle -= 360;
        if (relAngle < -180) relAngle += 360;

        const absAngle = Math.abs(relAngle);
        if (absAngle < minDistance) {
          minDistance = absAngle;
          closestSlot = i;
        }

        // Visible within 100 degrees of viewer (Framer exact Se = 100)
        // No dimming or opacity falloff, 100% bright photography
        const isVisible = absAngle <= 100;
        cardEl.style.visibility = isVisible ? 'visible' : 'hidden';
      }

      const activePhotoIdx = closestSlot % CELEBRITY_PHOTOS.length;
      setActiveIndex(activePhotoIdx);
    },
    []
  );

  // Main 60fps RequestAnimationFrame loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      // Autoplay drift / inertia decay
      if (!isPointerDownRef.current && !isHoveredRef.current) {
        if (Math.abs(velocityRef.current) > 0.002) {
          targetRotationRef.current += velocityRef.current;
          velocityRef.current *= 0.94; // Framer exact inertia decay friction
        } else {
          // Slow continuous gentle float (Studio Gallery signature float)
          targetRotationRef.current += 0.035;
        }
      }

      // Smooth spring interpolation toward target rotation
      const diff = targetRotationRef.current - currentRotationRef.current;
      if (Math.abs(diff) > 0.001) {
        currentRotationRef.current += diff * 0.12;
      }

      // Direct DOM update on the 3D hub
      if (hubRef.current) {
        hubRef.current.style.transform = `translateZ(${dimensions.radius}px) rotateY(${currentRotationRef.current}deg)`;
      }

      updateCardsPresentation(currentRotationRef.current);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions.radius, updateCardsPresentation]);

  // Page scroll synchronization (Framer signature: scrolling page rotates the cylinder)
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (isHoveredRef.current || isPointerDownRef.current) return;
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const degPerPx = 180 / (Math.PI * dimensions.radius);
          targetRotationRef.current += scrollDiff * degPerPx * 0.45;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dimensions.radius]);

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    velocityRef.current = 0;

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: e.timeStamp,
    };
    pointerLastRef.current = {
      x: e.clientX,
      time: e.timeStamp,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isDraggingRef.current = true;
        setIsDragging(true);
      } else {
        return;
      }
    }

    const moveStep = e.clientX - pointerLastRef.current.x;
    const timeDelta = Math.max(1, e.timeStamp - pointerLastRef.current.time);

    // Degree per pixel based on cylinder radius
    const degPerPx = 180 / (Math.PI * dimensions.radius);
    const angleDelta = -moveStep * degPerPx * 1.1;

    targetRotationRef.current += angleDelta;

    // Smoothed velocity computation for inertia
    const instVelocity = angleDelta / (timeDelta / 16.667);
    velocityRef.current = velocityRef.current * 0.45 + instVelocity * 0.55;

    pointerLastRef.current = {
      x: e.clientX,
      time: e.timeStamp,
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    setTimeout(() => {
      isDraggingRef.current = false;
      setIsDragging(false);
    }, 60);
  };

  // Wheel / trackpad horizontal rotation
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const degPerPx = 180 / (Math.PI * dimensions.radius);
      targetRotationRef.current += e.deltaX * degPerPx * 0.7;
    }
  };

  // Step button navigation (Left / Right)
  const handleStep = (direction: 'left' | 'right') => {
    const delta = direction === 'left' ? STEP_ANGLE : -STEP_ANGLE;
    targetRotationRef.current += delta;
  };

  // Card click: open modal only if it wasn't a drag gesture
  const handleCardClick = (photoIndex: number) => {
    if (isDraggingRef.current) return;
    setLightboxIndex(photoIndex);
  };

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

  return (
    <section className="w-full py-14 sm:py-20 bg-[#FAF5EB] border-t border-[#E6D9C5] relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-[#D8AD56]/10 via-[#8D672F]/5 to-[#D8AD56]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header: Clean Title, Subtitle, and Stepper Nav Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-10 gap-6">
          <div className="max-w-2xl text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#33271D] font-normal tracking-tight leading-[1.15]">
              Celebrated Guests at Sri Tayi Grand
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#786A5B] font-light leading-relaxed">
              Moments of warmth and authentic hospitality shared with cherished visitors and esteemed cultural personalities who made Sri Tayi Grand their home in Kadiri.
            </p>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleStep('left')}
              aria-label="Rotate previous"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[#E6D9C5] bg-white/90 hover:bg-[#8D672F] text-[#8D672F] hover:text-white shadow-xs transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleStep('right')}
              aria-label="Rotate next"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[#E6D9C5] bg-white/90 hover:bg-[#8D672F] text-[#8D672F] hover:text-white shadow-xs transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3D STUDIO GALLERY CYLINDER VIEWPORT — EXACT 100% VISUAL & SPACING
          ========================================================================= */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
        }}
        style={{
          perspective: `${dimensions.perspective}px`,
          perspectiveOrigin: '50% 50%',
        }}
        className={`relative w-full h-[380px] sm:h-[440px] md:h-[480px] overflow-hidden touch-pan-y select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Center 3D Hub */}
        <div
          ref={hubRef}
          style={{
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
          className="absolute left-1/2 top-1/2 w-0 h-0"
        >
          {Array.from({ length: SLOTS_COUNT }).map((_, slotIndex) => {
            const photoIndex = slotIndex % CELEBRITY_PHOTOS.length;
            const photo = CELEBRITY_PHOTOS[photoIndex];
            const slotAngle = slotIndex * STEP_ANGLE;

            return (
              <div
                key={slotIndex}
                ref={(el) => {
                  cardRefs.current[slotIndex] = el;
                }}
                onClick={() => handleCardClick(photoIndex)}
                style={{
                  position: 'absolute',
                  left: -dimensions.cardWidth / 2,
                  top: -dimensions.cardHeight / 2,
                  width: dimensions.cardWidth,
                  height: dimensions.cardHeight,
                  transform: `rotateY(${slotAngle}deg) translateZ(-${dimensions.radius}px)`,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  boxShadow: '0 12px 32px -4px rgba(40, 25, 15, 0.16), 0 4px 12px rgba(0, 0, 0, 0.06)',
                  willChange: 'transform',
                }}
                className="group relative select-none transition-shadow duration-300 hover:shadow-2xl"
              >
                {/* Pure Clean Photography */}
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
                  className="object-cover object-center pointer-events-none select-none transition-transform duration-500 ease-out group-hover:scale-105"
                  draggable={false}
                  priority={slotIndex < 8}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          BOTTOM MINIMAL INDICATOR DOTS
          ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        <div className="flex items-center justify-center gap-2">
          {CELEBRITY_PHOTOS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                targetRotationRef.current = -idx * STEP_ANGLE;
              }}
              aria-label={`Jump to photo ${idx + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                activeIndex === idx
                  ? 'w-7 h-2 bg-[#8D672F] shadow-xs'
                  : 'w-2 h-2 bg-[#E6D9C5] hover:bg-[#8D672F]/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          FULLSCREEN LIGHTBOX MODAL (PURE CLEAN IMAGE VIEW)
          ========================================================================= */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fadeIn select-none"
        >
          {/* Modal Top Bar */}
          <div className="flex items-center justify-end text-white max-w-6xl mx-auto w-full z-10 pt-2">
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
            <div className="relative w-full h-[75vh] sm:h-[82vh] flex items-center justify-center">
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
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-[#8D672F] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-sm shadow-xl active:scale-95"
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
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-[#8D672F] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-sm shadow-xl active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CelebrityShowcase;
