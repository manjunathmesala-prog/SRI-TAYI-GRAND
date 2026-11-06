'use client';

interface AtmosphericGlowProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  color?: 'gold' | 'espresso' | 'champagne';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AtmosphericGlow({
  position = 'top-right',
  color = 'gold',
  size = 'md',
  className = '',
}: AtmosphericGlowProps) {
  const positionClasses = {
    'top-left': 'top-0 left-0 -translate-x-1/3 -translate-y-1/3',
    'top-right': 'top-0 right-0 translate-x-1/3 -translate-y-1/3',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/3 translate-y-1/3',
    'bottom-right': 'bottom-0 right-0 translate-x-1/3 translate-y-1/3',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }[position];

  const colorStyles = {
    gold: 'bg-gradient-to-br from-[#D8AD56]/20 via-[#C69940]/10 to-transparent',
    espresso: 'bg-gradient-to-br from-[#382216]/30 via-[#25150F]/20 to-transparent',
    champagne: 'bg-gradient-to-br from-[#EFE3D6]/40 via-[#D8AD56]/15 to-transparent',
  }[color];

  const sizeClasses = {
    sm: 'w-[280px] h-[280px]',
    md: 'w-[450px] h-[450px]',
    lg: 'w-[650px] h-[650px]',
  }[size];

  return (
    <div
      aria-hidden="true"
      className={`absolute ${positionClasses} ${sizeClasses} rounded-full blur-[90px] pointer-events-none opacity-70 animate-pulse-slow mix-blend-screen transition-opacity ${colorStyles} ${className}`}
    />
  );
}
