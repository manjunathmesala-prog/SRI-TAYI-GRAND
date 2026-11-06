import React from 'react';
import Image from 'next/image';

export interface TayiBrandIconProps {
  className?: string;
  variant?: 'gold' | 'white' | 'emblem';
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * Sri Tayi Grand Official Emblem Icon
 * Renders the authentic laurel wreath and gold monogram transparent PNG
 */
export default function TayiBrandIcon({
  className = 'inline-block',
  size = 20,
  alt = 'Sri Tayi Grand Emblem',
  style,
}: TayiBrandIconProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    >
      <Image
        src="/images/hotel/tayi-grand-logo.png"
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-contain drop-shadow-[0_1px_2px_rgba(46,0,21,0.25)]"
        priority
      />
    </span>
  );
}

export { TayiBrandIcon as LotusIcon, TayiBrandIcon as LotusBrandIcon };
