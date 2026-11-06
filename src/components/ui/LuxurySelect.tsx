'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

export interface LuxurySelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: (SelectOption | string | number)[];
  label?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  align?: 'left' | 'right';
}

export function LuxurySelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  id,
  name,
  align = 'left',
}: LuxurySelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');

  // Normalize options to { value, label }
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return opt as SelectOption;
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Auto detect up or down placement
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const idx = normalizedOptions.findIndex((opt) => String(opt.value) === String(value));
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < normalizedOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : normalizedOptions.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          onChange(normalizedOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#786A5B] mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-xs font-semibold p-3 rounded-xl border transition-all duration-200 flex items-center justify-between text-left cursor-pointer ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
            : isOpen
            ? 'border-[#43001F] bg-[#FAF6EE] ring-2 ring-[#43001F]/20 shadow-sm'
            : 'border-[#E6D9C5] bg-[#FAF6EE] hover:border-[#43001F]/50 text-[#33271D]'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#B18A4A] shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Hidden input for form support */}
      {name && <input type="hidden" name={name} value={String(value)} />}

      {/* Custom Luxury Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-full min-w-[140px] z-50 bg-white rounded-xl shadow-[0_16px_40px_rgba(40,25,12,0.22)] border border-[#E6D9C5] py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 select-none ${dropdownClassName}`}
          style={{ backdropFilter: 'blur(16px)' }}
        >
          {normalizedOptions.map((opt, index) => {
            const isSelected = String(opt.value) === String(value);
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#43001F] text-white font-semibold'
                    : isHighlighted
                    ? 'bg-[#FAF6EE] text-[#43001F]'
                    : 'text-[#33271D] hover:bg-[#FAF6EE]'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span
                      className={`text-[10px] ${
                        isSelected ? 'text-white/80' : 'text-[#786A5B]'
                      }`}
                    >
                      {opt.sublabel}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.5} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
