'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function LuxuryCursor() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Raw mouse coordinates
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics for luxury trailing ring
  const springConfig = { damping: 28, stiffness: 320, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Check if the device has a fine pointer (mouse/trackpad) and is NOT a touch-primary screen
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isFinePointer || isTouch) {
      return;
    }

    setIsEnabled(true);
    document.body.classList.add('has-custom-cursor');

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // Delegate hover detection for interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'a, button, input, textarea, select, [role="button"], [data-cursor-hover], [data-cursor-magnetic]'
      );

      setIsHovered(!!interactive);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Central Precision Gold Dot (instant tracking) */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 pointer-events-none z-[99999] rounded-full bg-[#D8AD56]"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovered ? 6 : 7,
          height: isHovered ? 6 : 7,
          opacity: isVisible ? (isHovered ? 0.9 : 1) : 0,
          scale: isPressed ? 0.6 : 1,
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />

      {/* Trailing Luxury Halo Ring (smooth spring tracking) */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 pointer-events-none z-[99998] rounded-full border border-[#D8AD56]/60 backdrop-blur-[0.5px]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovered ? 52 : 32,
          height: isHovered ? 52 : 32,
          borderColor: isHovered ? 'rgba(216, 173, 86, 0.85)' : 'rgba(216, 173, 86, 0.45)',
          backgroundColor: isHovered ? 'rgba(216, 173, 86, 0.12)' : 'rgba(216, 173, 86, 0.02)',
          boxShadow: isHovered
            ? '0 0 20px rgba(216, 173, 86, 0.35)'
            : '0 0 8px rgba(216, 173, 86, 0.15)',
          opacity: isVisible ? 1 : 0,
          scale: isPressed ? 0.85 : 1,
        }}
        transition={{
          width: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
          height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
          borderColor: { duration: 0.2 },
          backgroundColor: { duration: 0.2 },
          boxShadow: { duration: 0.2 },
          scale: { duration: 0.12, ease: 'easeOut' },
          opacity: { duration: 0.2 },
        }}
      />
    </>
  );
}
