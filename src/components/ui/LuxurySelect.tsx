'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface LuxurySelectProps {
  value: string | number | null | undefined;
  onChange: (value: any) => void;
  options: (SelectOption | string | number)[];
  label?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'luxury' | 'admin' | 'outline';
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  align?: 'left' | 'right';
  required?: boolean;
}

export function LuxurySelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select option',
  size = 'md',
  variant = 'admin',
  searchable,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  id,
  name,
  align = 'left',
}: LuxurySelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return opt as SelectOption;
      }
      return { value: opt, label: String(opt) };
    });
  }, [options]);

  // Filter options if search is enabled
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Enable search automatically if there are many options (e.g. > 10)
  const isSearchEnabled = searchable ?? (normalizedOptions.length > 10);

  // Auto detect up or down placement based on viewport space
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, isSearchEnabled]);

  // Click outside listener
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
        const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
      case ' ':
        if (e.target === searchInputRef.current && e.key === ' ') {
          // Allow space in search input
          return;
        }
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            handleSelect(opt.value);
          }
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

  // Size configurations
  const sizeClasses = {
    sm: {
      button: 'text-xs px-2.5 py-1.5 rounded-lg min-h-[32px]',
      icon: 'w-3.5 h-3.5',
      option: 'px-3 py-1.5 text-xs',
      label: 'text-[10px] mb-1',
    },
    md: {
      button: 'text-xs sm:text-sm px-3.5 py-2 rounded-xl min-h-[38px]',
      icon: 'w-4 h-4',
      option: 'px-3.5 py-2 text-xs sm:text-sm',
      label: 'text-[10.5px] mb-1.5',
    },
    lg: {
      button: 'text-sm px-4 py-2.5 sm:py-3 rounded-xl min-h-[46px]',
      icon: 'w-4 h-4',
      option: 'px-4 py-2.5 text-sm',
      label: 'text-xs mb-1.5',
    },
  }[size];

  // Variant configurations
  const variantClasses = {
    admin: {
      buttonClosed: 'bg-white border-stone-200 hover:border-[#D8AD56] text-[#241912] shadow-2xs',
      buttonOpen: 'bg-white border-[#D8AD56] ring-2 ring-[#D8AD56]/20 shadow-sm text-[#241912]',
      popover: 'bg-white border-stone-200/90 shadow-[0_16px_36px_rgba(36,25,18,0.14)]',
      optionHover: 'bg-[#FAF7F2] text-[#43001F]',
      optionSelected: 'bg-[#43001F] text-white font-semibold',
      label: 'text-[#786B61]',
    },
    luxury: {
      buttonClosed: 'bg-[#FAF6EE] border-[#E6D9C5] hover:border-[#43001F]/50 text-[#33271D] shadow-2xs',
      buttonOpen: 'bg-[#FAF6EE] border-[#43001F] ring-2 ring-[#43001F]/20 shadow-sm text-[#33271D]',
      popover: 'bg-white border-[#E6D9C5] shadow-[0_18px_45px_rgba(40,25,12,0.20)]',
      optionHover: 'bg-[#FAF6EE] text-[#43001F]',
      optionSelected: 'bg-[#43001F] text-white font-semibold',
      label: 'text-[#786A5B]',
    },
    outline: {
      buttonClosed: 'bg-white border-stone-300 hover:border-[#D8AD56] text-stone-800',
      buttonOpen: 'bg-white border-[#D8AD56] ring-2 ring-[#D8AD56]/20 text-stone-900',
      popover: 'bg-white border-stone-200 shadow-[0_16px_36px_rgba(36,25,18,0.14)]',
      optionHover: 'bg-stone-50 text-stone-900',
      optionSelected: 'bg-[#43001F] text-white font-semibold',
      label: 'text-stone-600',
    },
  }[variant];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          className={`block uppercase tracking-[0.16em] font-bold ${variantClasses.label} ${sizeClasses.label}`}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full font-medium border transition-all duration-200 flex items-center justify-between text-left cursor-pointer select-none ${
          sizeClasses.button
        } ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
            : isOpen
            ? variantClasses.buttonOpen
            : variantClasses.buttonClosed
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate flex items-center gap-2 mr-1">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : (
              <span className="text-stone-400 font-normal">{placeholder}</span>
            )}
          </span>
          {selectedOption?.badge && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                selectedOption.badgeColor || 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={`${sizeClasses.icon} text-[#B18A4A] shrink-0 ml-1.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Hidden input for form support */}
      {name && <input type="hidden" name={name} value={value !== null && value !== undefined ? String(value) : ''} />}

      {/* Custom Luxury Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          ref={listRef}
          className={`absolute ${
            openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-full min-w-[170px] z-[70] rounded-xl border py-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 select-none ${
            variantClasses.popover
          } ${dropdownClassName}`}
          style={{ backdropFilter: 'blur(16px)' }}
        >
          {/* Search box if enabled */}
          {isSearchEnabled && (
            <div className="px-2 pb-1.5 pt-0.5 border-b border-stone-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-800 focus:bg-white focus:outline-none focus:border-[#D8AD56]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-stone-400">
              No matching options
            </div>
          ) : (
            filteredOptions.map((opt, index) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!opt.disabled) {
                      handleSelect(opt.value);
                    }
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`${sizeClasses.option} cursor-pointer transition-colors flex items-center justify-between ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed bg-stone-50 text-stone-400'
                      : isSelected
                      ? variantClasses.optionSelected
                      : isHighlighted
                      ? variantClasses.optionHover
                      : 'text-[#241912] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span
                          className={`text-[10px] leading-tight ${
                            isSelected ? 'text-white/80' : 'text-stone-400'
                          }`}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {opt.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : opt.badgeColor || 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
