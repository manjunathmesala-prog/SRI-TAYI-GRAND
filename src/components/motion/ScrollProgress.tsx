'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 300,
    damping: 35,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#D8AD56] via-[#F8F1E9] to-[#C69940] origin-left z-[90] pointer-events-none shadow-[0_0_12px_rgba(216,173,86,0.5)]"
      style={{ scaleX }}
    />
  );
}
