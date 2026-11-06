'use client';

import React from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';

type AnimationPreset = 'fade-up' | 'fade-down' | 'fade' | 'scale-up' | 'slide-left' | 'slide-right';

interface ScrollRevealProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  preset?: AnimationPreset;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  distance?: number;
}

const luxuryEase = [0.16, 1, 0.3, 1] as const;

export function ScrollReveal({
  children,
  preset = 'fade-up',
  delay = 0,
  duration = 0.75,
  className = '',
  once = true,
  distance = 32,
  ...props
}: ScrollRevealProps) {
  const getInitial = () => {
    switch (preset) {
      case 'fade-up':
        return { opacity: 0, y: distance };
      case 'fade-down':
        return { opacity: 0, y: -distance };
      case 'scale-up':
        return { opacity: 0, scale: 0.95 };
      case 'slide-left':
        return { opacity: 0, x: distance };
      case 'slide-right':
        return { opacity: 0, x: -distance };
      case 'fade':
      default:
        return { opacity: 0 };
    }
  };

  const getAnimate = () => {
    switch (preset) {
      case 'fade-up':
      case 'fade-down':
        return { opacity: 1, y: 0 };
      case 'scale-up':
        return { opacity: 1, scale: 1 };
      case 'slide-left':
      case 'slide-right':
        return { opacity: 1, x: 0 };
      case 'fade':
      default:
        return { opacity: 1 };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={getAnimate()}
      viewport={{ once, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: luxuryEase,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { stagger?: number; delayChildren?: number } = {}) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.stagger ?? 0.12,
      delayChildren: custom.delayChildren ?? 0.05,
    },
  }),
};

export function StaggerContainer({
  children,
  stagger = 0.12,
  delayChildren = 0.05,
  className = '',
  once = true,
  ...props
}: {
  children: React.ReactNode;
  stagger?: number;
  delayChildren?: number;
  className?: string;
  once?: boolean;
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-40px' }}
      custom={{ stagger, delayChildren }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function StaggerItem({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={staggerItemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}
