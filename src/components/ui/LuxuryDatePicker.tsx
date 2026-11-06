'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface LuxuryDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  rangeStart?: string; // YYYY-MM-DD, for range highlighting
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  displayFormat?: 'DD-MM-YYYY' | 'DD MMM YYYY';
  align?: 'left' | 'right';
  id?: string;
  name?: string;
  customTrigger?: (formattedDate: string, open: () => void, isOpen: boolean) => React.ReactNode;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseYMD(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplay(dateStr: string, format: 'DD-MM-YYYY' | 'DD MMM YYYY' = 'DD-MM-YYYY'): string {
  if (!dateStr) return '';
  const d = parseYMD(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());

  if (format === 'DD-MM-YYYY') {
    return `${day}-${monthNum}-${year}`;
  }

  const monthShort = d.toLocaleString('en-US', { month: 'short' });
  return `${day} ${monthShort} ${year}`;
}

export function LuxuryDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  rangeStart,
  placeholder = 'Select date',
  label,
  className = '',
  inputClassName = '',
  displayFormat = 'DD-MM-YYYY',
  align = 'left',
  id,
  name,
  customTrigger,
}: LuxuryDatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const initialDate = value ? parseYMD(value) : (minDate ? parseYMD(minDate) : new Date());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');

  // Update calendar view when value changes
  useEffect(() => {
    if (value) {
      const d = parseYMD(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Position popover (up or down depending on viewport)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 380 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

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

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = formatYMD(new Date());

  const handleSelectDay = (dayNum: number) => {
    const selected = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (minDate && selected < minDate) return;
    if (maxDate && selected > maxDate) return;
    onChange(selected);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (minDate && todayStr < minDate) return;
    onChange(todayStr);
    setViewYear(new Date().getFullYear());
    setViewMonth(new Date().getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const formattedDisplay = value ? formatDisplay(value, displayFormat) : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#786A5B] mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Field */}
      {customTrigger ? (
        customTrigger(formattedDisplay, () => setIsOpen(!isOpen), isOpen)
      ) : (
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-xs font-semibold p-3 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer text-left ${
            isOpen
              ? 'border-[#43001F] bg-[#FAF6EE] ring-2 ring-[#43001F]/20 shadow-sm'
              : 'border-[#E6D9C5] bg-[#FAF6EE] hover:border-[#43001F]/50 text-[#33271D]'
          } ${inputClassName}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span className={formattedDisplay ? 'text-[#33271D]' : 'text-stone-400 font-normal'}>
            {formattedDisplay || placeholder}
          </span>
          <CalendarIcon className="w-4 h-4 text-[#B18A4A] shrink-0 ml-2" />
        </button>
      )}

      {/* Hidden input for HTML form compatibility if needed */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Luxury Popover */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[99] sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className={`fixed inset-x-4 bottom-6 z-[100] sm:absolute sm:inset-auto ${
              openDirection === 'up' ? 'sm:bottom-full sm:mb-2' : 'sm:top-full sm:mt-2'
            } ${
              align === 'right' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'
            } w-auto sm:w-[320px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(40,25,12,0.25)] border border-[#E6D9C5] p-4 text-[#33271D] animate-in fade-in zoom-in-95 duration-150 select-none`}
            style={{ backdropFilter: 'blur(16px)' }}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#33271D] border border-transparent hover:border-[#E6D9C5] transition-all cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-sm font-serif font-bold text-[#33271D] tracking-wide">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#33271D] border border-transparent hover:border-[#E6D9C5] transition-all cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_OF_WEEK.map((d, i) => (
                <div
                  key={d}
                  className={`text-[10px] uppercase font-semibold tracking-wider py-1 ${
                    i === 0 || i === 6 ? 'text-[#43001F]' : 'text-[#8C7A6B]'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Prev month fill */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const dayNum = daysInPrevMonth - firstDayOfWeek + 1 + i;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-8 flex items-center justify-center text-[11px] text-stone-300 pointer-events-none"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isDisabled = Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate));
                const isSelected = dateStr === value;
                const isToday = dateStr === todayStr;

                const inRange = Boolean(
                  rangeStart &&
                  value &&
                  dateStr > rangeStart &&
                  dateStr < value
                );

                return (
                  <div key={dateStr} className="h-8 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelectDay(dayNum)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all relative cursor-pointer ${
                        isDisabled
                          ? 'text-stone-300 cursor-not-allowed hover:bg-transparent'
                          : isSelected
                          ? 'bg-[#43001F] text-white font-bold shadow-md scale-105'
                          : inRange
                          ? 'bg-[#FAF6EE] text-[#43001F] font-semibold'
                          : 'text-[#33271D] hover:bg-[#FAF6EE] hover:text-[#43001F]'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#B18A4A]" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="mt-3 pt-2.5 border-t border-[#E6D9C5]/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                disabled={Boolean(minDate && todayStr < minDate)}
                className="text-[11px] font-semibold text-[#43001F] hover:underline disabled:opacity-30 disabled:no-underline cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
