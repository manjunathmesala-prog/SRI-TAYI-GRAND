'use client';

import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface LuxurySelectOption<T extends string | number = string | number> {
  value: T;
  label: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface LuxurySelectProps<T extends string | number = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: (LuxurySelectOption<T> | string | number)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  variant?: 'default' | 'white' | 'dark' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  menuWidth?: string;
  name?: string;
  id?: string;
  'aria-label'?: string;
}

export default function LuxurySelect<T extends string | number = string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  variant = 'default',
  size = 'md',
  icon,
  align = 'left',
  menuWidth = 'w-full',
  name,
  id,
  'aria-label': ariaLabel,
}: LuxurySelectProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Normalize options array
  const normalizedOptions: LuxurySelectOption<T>[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: opt as T,
          label: String(opt),
        };
      }
      return opt as LuxurySelectOption<T>;
    });
  }, [options]);

  // Find currently selected option
  const selectedIndex = normalizedOptions.findIndex(
    (opt) => String(opt.value) === String(value)
  );
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  // Smart vertical space detection (flips upward if near bottom of viewport)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset highlighted index on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listboxRef.current && highlightedIndex >= 0) {
      const items = listboxRef.current.querySelectorAll('[role="option"]');
      const target = items[highlightedIndex] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, highlightedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < normalizedOptions.length && normalizedOptions[next].disabled) {
            next++;
          }
          return next < normalizedOptions.length ? next : prev;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && normalizedOptions[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < normalizedOptions.length &&
          !normalizedOptions[highlightedIndex].disabled
        ) {
          onChange(normalizedOptions[highlightedIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      }
      case 'Tab': {
        setIsOpen(false);
        break;
      }
    }
  };

  const handleSelect = (option: LuxurySelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const sizeStyles = {
    sm: 'py-1.5 px-2.5 text-xs',
    md: 'py-2.5 px-3 text-xs sm:text-sm',
    lg: 'py-3 px-3.5 text-sm sm:text-base',
  }[size];

  let triggerBaseStyle = '';
  let chevronColor = 'text-[#8D672F]';
  let menuThemeStyle = 'bg-white border-[#E6D9C5] text-[#33271D]';
  let optionActiveStyle = 'bg-[#FAF6EE] text-[#8D672F] font-semibold';
  let optionHoverStyle = 'hover:bg-[#FAF6EE] hover:text-[#8D672F] text-[#33271D]';

  if (variant === 'dark') {
    triggerBaseStyle = isOpen
      ? 'bg-[#2D2218] border-[#B18A4A] ring-1 ring-[#B18A4A]/40 text-white'
      : 'bg-[#21180F]/90 hover:bg-[#2D2218] border-[#B18A4A]/40 text-[#E6D9C5] hover:text-white';
    chevronColor = 'text-[#B18A4A]';
    menuThemeStyle = 'bg-[#21180F] border-[#B18A4A]/40 text-[#F8F3E9] shadow-2xl';
    optionActiveStyle = 'bg-[#2D2218] text-[#B18A4A] font-semibold';
    optionHoverStyle = 'hover:bg-[#2D2218] hover:text-[#B18A4A] text-[#E6D9C5]';
  } else if (variant === 'white') {
    triggerBaseStyle = isOpen
      ? 'bg-white border-[#8D672F] ring-1 ring-[#8D672F]/30 text-[#33271D]'
      : 'bg-white hover:bg-[#FAF6EE]/50 border-[#E6D9C5] hover:border-[#8D672F]/50 text-[#33271D]';
    chevronColor = 'text-[#8D672F]';
    menuThemeStyle = 'bg-white border-[#E6D9C5] text-[#33271D] shadow-[0_18px_45px_-10px_rgba(40,25,12,0.2)]';
  } else if (variant === 'minimal') {
    triggerBaseStyle = isOpen
      ? 'bg-white border-[#8D672F] ring-1 ring-[#8D672F]/30 text-[#33271D]'
      : 'bg-white/80 hover:bg-white border-[#E6D9C5] hover:border-[#8D672F]/60 text-[#33271D] font-semibold';
    chevronColor = 'text-[#8D672F]';
    menuThemeStyle = 'bg-white border-[#E6D9C5] text-[#33271D] shadow-[0_16px_36px_-8px_rgba(40,25,12,0.18)]';
  } else {
    triggerBaseStyle = isOpen
      ? 'bg-[#FAF6EE] border-[#8D672F] ring-1 ring-[#8D672F]/30 text-[#33271D]'
      : 'bg-[#F8F3E9]/35 hover:bg-[#F2E8D8]/50 border-[#E6D9C5] hover:border-[#8D672F]/50 text-[#33271D]';
    chevronColor = 'text-[#8D672F]';
    menuThemeStyle = 'bg-white border-[#E6D9C5] text-[#33271D] shadow-[0_20px_48px_-10px_rgba(40,25,12,0.22)]';
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={String(value)}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border transition-all duration-150 cursor-pointer text-left select-none outline-none ${sizeStyles} ${triggerBaseStyle} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-stone-400 truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${chevronColor} ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={selectId}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${selectId}-opt-${highlightedIndex}` : undefined
          }
          className={`absolute z-[100] ${menuWidth} ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } rounded-2xl border p-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 focus:outline-none ${menuThemeStyle} ${menuClassName}`}
          style={{ backdropFilter: 'blur(20px)' }}
        >
          {normalizedOptions.map((opt, index) => {
            const isSelected = String(opt.value) === String(value);
            const isHighlighted = highlightedIndex === index;

            return (
              <div
                key={String(opt.value)}
                id={`${selectId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => !opt.disabled && setHighlightedIndex(index)}
                className={`relative px-3 py-2 rounded-xl cursor-pointer select-none transition-colors duration-150 flex items-center justify-between gap-2 text-xs sm:text-sm ${
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isSelected
                    ? optionActiveStyle
                    : isHighlighted
                    ? optionHoverStyle
                    : 'text-[#33271D]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{opt.label}</div>
                    {opt.description && (
                      <div className="text-[11px] opacity-70 truncate font-normal">
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 shrink-0 ${
                      variant === 'dark' ? 'text-[#B18A4A]' : 'text-[#8D672F]'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { LuxurySelect };
