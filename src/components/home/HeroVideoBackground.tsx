'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    // Defer video playback until after the critical frame to prioritize LCP image rendering
    const rafId = requestAnimationFrame(() => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoLoaded(true);
          })
          .catch(() => {
            // Autoplay fallback to poster
          });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#20120B] pointer-events-none select-none">
      {/* Fallback Static Poster Image for instant LCP and low-power devices */}
      <Image
        src="/images/hotel/hotel-exterior-hero-clean.jpg"
        alt="Sri Tayi Grand Hotel Facade"
        fill
        priority
        className={`object-cover object-center transition-opacity duration-1000 ${
          isVideoLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        sizes="100vw"
      />

      {/* Cinematic Responsive Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        poster="/images/hotel/hotel-exterior-hero-clean.jpg"
        onPlaying={() => setIsVideoLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
          isVideoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src="/videos/hotel-hero.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Cinematic Luxury Gradient Overlays for High Legibility & Depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#20120B] via-transparent to-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/15 to-black/60" />
    </div>
  );
}

export default HeroVideoBackground;
