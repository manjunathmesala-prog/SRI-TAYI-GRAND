'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LuxuryDateRangePickerProps {
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  onChange: (checkIn: string, checkOut: string) => void;
  minDate?: string; // YYYY-MM-DD, defaults to today
  className?: string;
  isCompact?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): { day: string; monthShort: string; year: string; weekday: string } {
  if (!dateStr) return { day: '--', monthShort: '---', year: '----', weekday: '---' };
  const d = parseYMD(dateStr);
  if (isNaN(d.getTime())) return { day: '--', monthShort: '---', year: '----', weekday: '---' };

  const day = String(d.getDate()).padStart(2, '0');
  const monthShort = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear());
  const weekday = d.toLocaleString('en-US', { weekday: 'short' });

  return { day, monthShort, year, weekday };
}

function getTodayYMD(): string {
  const now = new Date();
  return formatYMD(now);
}

export default function LuxuryDateRangePicker({
  checkInDate,
  checkOutDate,
  onChange,
  minDate,
  className = '',
}: LuxuryDateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<'checkIn' | 'checkOut'>('checkIn');

  const initialDate = checkInDate ? parseYMD(checkInDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');

  const effectiveMinDate = minDate || getTodayYMD();

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 440 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const handleDayClick = (dateStr: string) => {
    if (dateStr < effectiveMinDate) return;

    if (activeField === 'checkIn') {
      const checkInD = parseYMD(dateStr);
      const nextDay = new Date(checkInD);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatYMD(nextDay);

      if (!checkOutDate || checkOutDate <= dateStr) {
        onChange(dateStr, nextDayStr);
      } else {
        onChange(dateStr, checkOutDate);
      }
      setActiveField('checkOut');
    } else {
      if (dateStr <= checkInDate) {
        const checkInD = parseYMD(dateStr);
        const nextDay = new Date(checkInD);
        nextDay.setDate(nextDay.getDate() + 1);
        onChange(dateStr, formatYMD(nextDay));
        setActiveField('checkOut');
      } else {
        onChange(checkInDate, dateStr);
        setIsOpen(false);
      }
    }
  };

  const applyPreset = (nights: number) => {
    const today = parseYMD(effectiveMinDate);
    const end = new Date(today);
    end.setDate(end.getDate() + nights);
    onChange(formatYMD(today), formatYMD(end));
    setIsOpen(false);
  };

  const applyThisWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    const diffToFri = (5 - day + 7) % 7;
    const friday = new Date(d);
    friday.setDate(d.getDate() + (diffToFri === 0 ? 7 : diffToFri));
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);

    onChange(formatYMD(friday), formatYMD(sunday));
    setIsOpen(false);
  };

  let numNights = 1;
  if (checkInDate && checkOutDate) {
    const inD = parseYMD(checkInDate);
    const outD = parseYMD(checkOutDate);
    const diff = Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
    numNights = diff > 0 ? diff : 1;
  }

  const checkInFormatted = formatDisplayDate(checkInDate);
  const checkOutFormatted = formatDisplayDate(checkOutDate);

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      {/* TRIGGER BAR */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Check-In Trigger */}
        <div
          onClick={() => {
            setActiveField('checkIn');
            setIsOpen(true);
          }}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer border ${
            isOpen && activeField === 'checkIn'
              ? 'bg-[#FAF6EE] border-[#8D672F] shadow-sm ring-1 ring-[#8D672F]/40'
              : 'bg-[#F8F3E9]/50 hover:bg-[#F2E8D8]/50 border-transparent hover:border-[#E6D9C5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#786A5B] font-semibold">
              Check-In
            </span>
            <span className="text-[10px] text-[#8D672F] font-medium hidden sm:inline">
              {checkInFormatted.weekday}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8D672F] shrink-0" />
            <div className="text-xs sm:text-sm font-semibold text-[#33271D] truncate">
              {checkInFormatted.day} {checkInFormatted.monthShort} {checkInFormatted.year}
            </div>
          </div>
        </div>

        {/* Check-Out Trigger */}
        <div
          onClick={() => {
            setActiveField('checkOut');
            setIsOpen(true);
          }}
          className={`px-3 py-2 rounded-xl transition-all cursor-pointer border ${
            isOpen && activeField === 'checkOut'
              ? 'bg-[#FAF6EE] border-[#8D672F] shadow-sm ring-1 ring-[#8D672F]/40'
              : 'bg-[#F8F3E9]/50 hover:bg-[#F2E8D8]/50 border-transparent hover:border-[#E6D9C5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#786A5B] font-semibold">
              Check-Out
            </span>
            <span className="text-[10px] text-[#8D672F] font-medium hidden sm:inline">
              {checkOutFormatted.weekday}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8D672F] shrink-0" />
            <div className="text-xs sm:text-sm font-semibold text-[#33271D] truncate">
              {checkOutFormatted.day} {checkOutFormatted.monthShort} {checkOutFormatted.year}
            </div>
          </div>
        </div>
      </div>

      {/* LUXURY BESPOKE CALENDAR POPOVER / MOBILE BOTTOM SHEET */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99] sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl sm:rounded-3xl sm:inset-auto sm:absolute ${
              openDirection === 'up' ? 'sm:bottom-full sm:mb-3' : 'sm:top-full sm:mt-3'
            } bg-white shadow-[0_28px_70px_-10px_rgba(40,25,12,0.28)] border border-[#E6D9C5] p-4 sm:p-5 w-full sm:w-[390px] max-w-full sm:max-w-[390px] max-h-[85vh] overflow-y-auto sm:left-1/2 sm:-translate-x-1/2 md:translate-x-0 md:left-0 safe-area-bottom animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200`}
            style={{ backdropFilter: 'blur(20px)' }}
          >
            {/* Top Bar: Active Step Indicator */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E6D9C5]/60 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#8D672F] animate-pulse" />
                <span className="text-xs font-semibold text-[#33271D]">
                  {activeField === 'checkIn' ? 'Select Check-In Date' : 'Select Check-Out Date'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-[#8D672F] bg-[#FAF6EE] px-2 py-0.5 rounded-full border border-[#8D672F]/20">
                  {numNights} {numNights === 1 ? 'Night' : 'Nights'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
                  aria-label="Close calendar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Month / Year Navigator */}
            <div className="flex items-center justify-between mb-4 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#33271D] border border-transparent hover:border-[#E6D9C5] transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-sm sm:text-base font-serif font-bold text-[#33271D] tracking-wide">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#33271D] border border-transparent hover:border-[#E6D9C5] transition-all"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_OF_WEEK.map((d, i) => (
                <div
                  key={d}
                  className={`text-[10px] font-semibold tracking-wider py-1 ${
                    i === 0 || i === 6 ? 'text-[#8D672F]' : 'text-[#786A5B]'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center" onMouseLeave={() => setHoveredDate(null)}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const dayNum = daysInPrevMonth - firstDayOfWeek + 1 + i;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-9 flex items-center justify-center text-[11px] text-stone-300 font-normal select-none"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isDisabled = dateStr < effectiveMinDate;

                const isCheckIn = dateStr === checkInDate;
                const isCheckOut = dateStr === checkOutDate;
                const isToday = dateStr === getTodayYMD();

                const inRange =
                  checkInDate &&
                  checkOutDate &&
                  dateStr > checkInDate &&
                  dateStr < checkOutDate;

                const isHoverRange =
                  activeField === 'checkOut' &&
                  hoveredDate &&
                  checkInDate &&
                  dateStr > checkInDate &&
                  dateStr <= hoveredDate;

                let btnClass = 'text-[#33271D] hover:bg-[#FAF6EE]';
                let containerClass = '';

                if (isDisabled) {
                  btnClass = 'text-stone-300 cursor-not-allowed hover:bg-transparent';
                } else if (isCheckIn || isCheckOut) {
                  btnClass = 'bg-[#8D672F] text-white font-bold shadow-md scale-105';
                } else if (inRange || isHoverRange) {
                  btnClass = 'bg-[#FAF6EE] text-[#8D672F] font-semibold';
                }

                if (inRange || isHoverRange) {
                  containerClass = 'bg-[#FAF6EE]/80';
                }

                return (
                  <div
                    key={dateStr}
                    className={`h-9 flex items-center justify-center relative ${containerClass} transition-colors`}
                    onMouseEnter={() => {
                      if (!isDisabled && activeField === 'checkOut') {
                        setHoveredDate(dateStr);
                      }
                    }}
                  >
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDayClick(dateStr)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all relative ${btnClass}`}
                    >
                      <span>{dayNum}</span>
                      {isToday && !isCheckIn && !isCheckOut && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#8D672F]" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Presets Bar */}
            <div className="mt-4 pt-3 border-t border-[#E6D9C5]/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset(1)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#F2E8D8] text-[#8D672F] font-medium text-[11px] transition-colors"
                >
                  1 Night
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(2)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#F2E8D8] text-[#8D672F] font-medium text-[11px] transition-colors"
                >
                  2 Nights
                </button>
                <button
                  type="button"
                  onClick={applyThisWeekend}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#F2E8D8] text-[#8D672F] font-medium text-[11px] transition-colors"
                >
                  Weekend
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1 rounded-lg bg-[#8D672F] hover:bg-[#6D4E21] text-white font-semibold text-xs shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function LuxurySingleDatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select date',
  className = '',
}: {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  placeholder?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const initialDate = value ? parseYMD(value) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');

  const effectiveMinDate = minDate || getTodayYMD();

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const formatted = value ? formatDisplayDate(value) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
          isOpen
            ? 'border-[#8D672F] bg-[#FAF6EE] ring-1 ring-[#8D672F]/30'
            : 'border-[#E6D9C5] bg-[#F8F3E9]/40 hover:bg-[#F2E8D8]/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#8D672F] shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-[#33271D]">
            {formatted
              ? `${formatted.weekday}, ${formatted.day} ${formatted.monthShort} ${formatted.year}`
              : placeholder}
          </span>
        </div>
        <span className="text-[10px] text-[#8D672F] font-semibold uppercase tracking-wider">
          Change
        </span>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99] sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl sm:rounded-3xl sm:inset-auto sm:absolute ${
              openDirection === 'up' ? 'sm:bottom-full sm:mb-3' : 'sm:top-full sm:mt-3'
            } bg-white shadow-[0_28px_70px_-10px_rgba(40,25,12,0.28)] border border-[#E6D9C5] p-5 w-full sm:w-[340px] max-w-full sm:max-w-[340px] max-h-[85vh] overflow-y-auto sm:left-1/2 sm:-translate-x-1/2 md:translate-x-0 md:left-0 safe-area-bottom animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200`}
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#33271D] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-serif font-bold text-[#33271D]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#33271D] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-[10px] font-semibold text-[#786A5B] py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`prev-${i}`}
                  className="h-8 flex items-center justify-center text-[11px] text-stone-300 select-none"
                >
                  {daysInPrevMonth - firstDayOfWeek + 1 + i}
                </div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isDisabled = dateStr < effectiveMinDate;
                const isSelected = dateStr === value;
                const isToday = dateStr === getTodayYMD();

                return (
                  <div key={dateStr} className="h-8 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onChange(dateStr);
                        setIsOpen(false);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                        isDisabled
                          ? 'text-stone-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#8D672F] text-white font-bold shadow-md'
                          : 'text-[#33271D] hover:bg-[#FAF6EE]'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isToday && !isSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#8D672F]" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
