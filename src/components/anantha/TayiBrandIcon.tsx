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
 * Renders the authentic circular laurel wreath and 3D gold monogram
 */
export default function TayiBrandIcon({
  className = 'w-5 h-5 inline-block',
  size = 20,
  alt = 'Sri Tayi Grand Emblem',
  style,
}: TayiBrandIconProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-[#D8AD56]/80 bg-black/40 shadow-xs align-middle ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    >
      <Image
        src="/images/hotel/tayi-grand-logo.jpg"
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        priority
      />
    </span>
  );
}

export { TayiBrandIcon as LotusIcon, TayiBrandIcon as LotusBrandIcon };
