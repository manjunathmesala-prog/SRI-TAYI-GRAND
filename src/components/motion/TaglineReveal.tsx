'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface TaglineRevealProps {
  text?: string;
  className?: string;
}

const baseCurve = [0.22, 1, 0.36, 1] as const;

export function TaglineReveal({
  text = 'Spacious climate controlled rooms and a grand hall for your most cherished family occasions in Kadiri.',
  className = '',
}: TaglineRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-80px' });

  const words = text.split(' ');

  return (
    <section className="py-20 sm:py-28 bg-[#F8F1E9] border-b border-[#D8AD56]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={containerRef} className={`max-w-[680px] mx-auto text-center ${className}`}>
          {/* Subtle Lead Label */}
          <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-4">
            The Tayi Grand Promise
          </div>

          {/* Heading 3 with Word-by-Word Scroll Color Reveal */}
          <h2 className="heading-3 sm:heading-2 text-[#241912] font-semibold tracking-tight text-wrap-balance leading-tight">
            {words.map((word, index) => (
              <motion.span
                key={index}
                className="inline-block mr-[0.28em] transition-colors"
                initial={{ opacity: 0.28, y: 8 }}
                animate={
                  isInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0.28, y: 8 }
                }
                transition={{
                  duration: 0.6,
                  delay: index * 0.045,
                  ease: baseCurve,
                }}
              >
                {word}
              </motion.span>
            ))}
          </h2>

          <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto mt-6" />
        </div>
      </div>
    </section>
  );
}
