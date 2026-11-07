'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Minus, Plus } from 'lucide-react';
import LuxuryDateRangePicker from '@/components/anantha/LuxuryDateRangePicker';

interface BookingWidgetProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialRooms?: number;
  buttonText?: string;
  className?: string;
  onSearch?: (params: {
    checkInDate: string;
    checkOutDate: string;
    numRooms: number;
    numAdults: number;
    numChildren: number;
  }) => void;
}

export function BookingWidget({
  initialCheckIn,
  initialCheckOut,
  initialAdults = 2,
  initialChildren = 0,
  initialRooms = 1,
  buttonText = 'FIND YOUR STAY',
  className = '',
  onSearch,
}: BookingWidgetProps) {
  const router = useRouter();

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDefaultOutStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [checkIn, setCheckIn] = useState(initialCheckIn || getTodayStr());
  const [checkOut, setCheckOut] = useState(initialCheckOut || getDefaultOutStr());
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [rooms, setRooms] = useState(initialRooms);
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const guestContainerRef = useRef<HTMLDivElement>(null);

  const totalGuests = adults + children;

  // Close guest dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        guestContainerRef.current &&
        !guestContainerRef.current.contains(event.target as Node)
      ) {
        setGuestDropdownOpen(false);
      }
    }
    if (guestDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [guestDropdownOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    let validCheckIn = checkIn || getTodayStr();
    let validCheckOut = checkOut;
    if (!validCheckOut || validCheckOut <= validCheckIn) {
      const inD = new Date(validCheckIn);
      inD.setDate(inD.getDate() + 1);
      const y = inD.getFullYear();
      const m = String(inD.getMonth() + 1).padStart(2, '0');
      const d = String(inD.getDate()).padStart(2, '0');
      validCheckOut = `${y}-${m}-${d}`;
    }

    if (onSearch) {
      onSearch({
        checkInDate: validCheckIn,
        checkOutDate: validCheckOut,
        numRooms: rooms,
        numAdults: adults,
        numChildren: children,
      });
    } else {
      const query = new URLSearchParams({
        checkIn: validCheckIn,
        checkOut: validCheckOut,
        adults: adults.toString(),
        children: children.toString(),
        rooms: rooms.toString(),
        roomsCount: rooms.toString(),
      });
      router.push(`/availability?${query.toString()}`);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(40,25,12,0.12)] border border-[#E6D9C5] p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center text-left relative z-20"
      >
        {/* Row 1: Check-In & Check-Out (2 columns) */}
        <div className="lg:col-span-6 relative z-30">
          <LuxuryDateRangePicker
            checkInDate={checkIn}
            checkOutDate={checkOut}
            onChange={(inDate, outDate) => {
              setCheckIn(inDate);
              setCheckOut(outDate);
            }}
          />
        </div>

        {/* Row 2: Guests & Rooms */}
        <div
          ref={guestContainerRef}
          className="lg:col-span-3 relative px-3 py-2.5 bg-[#FAF6EE] hover:bg-[#F2E8D8]/50 rounded-2xl transition-all border border-[#E6D9C5]/80 hover:border-[#8D672F]/50 cursor-pointer"
        >
          <div onClick={() => setGuestDropdownOpen(!guestDropdownOpen)}>
            <label className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#786A5B] font-semibold block cursor-pointer">
              GUESTS & ROOMS
            </label>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-[#8D672F] shrink-0" strokeWidth={1.75} />
              <span className="text-xs sm:text-sm font-semibold text-[#33271D] truncate">
                {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'} · {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
              </span>
            </div>
          </div>

          {/* Guest Count Popover */}
          {guestDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(40,25,12,0.22)] border border-[#E6D9C5] p-4 z-50 space-y-3 min-w-[260px] animate-in fade-in zoom-in-95 duration-150">
              {/* Rooms */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#33271D]">Rooms</div>
                  <div className="text-[10px] text-[#786A5B]">Number of rooms</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRooms(Math.max(1, rooms - 1))}
                    disabled={rooms <= 1}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center text-[#33271D] hover:bg-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-[#33271D]">{rooms}</span>
                  <button
                    type="button"
                    onClick={() => setRooms(Math.min(5, rooms + 1))}
                    disabled={rooms >= 5}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center text-[#33271D] hover:bg-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Adults */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#E6D9C5]/60">
                <div>
                  <div className="text-xs font-semibold text-[#33271D]">Adults</div>
                  <div className="text-[10px] text-[#786A5B]">Ages 12+</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center text-[#33271D] hover:bg-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-[#33271D]">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(Math.min(10, adults + 1))}
                    disabled={adults >= 10}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center text-[#33271D] hover:bg-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#E6D9C5]/60">
                <div>
                  <div className="text-xs font-semibold text-[#33271D]">Children</div>
                  <div className="text-[10px] text-[#786A5B]">Ages 0–11</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    disabled={children <= 0}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center text-[#33271D] hover:bg-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-[#33271D]">{children}</span>
                  <button
                    type="button"
                    onClick={() => setChildren(Math.min(6, children + 1))}
                    disabled={children >= 6}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center text-[#33271D] hover:bg-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Close */}
              <div className="pt-2 border-t border-[#E6D9C5]/60 text-right">
                <button
                  type="button"
                  onClick={() => setGuestDropdownOpen(false)}
                  className="w-full py-2 bg-[#8D672F] text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#745322] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Action Button */}
        <div className="lg:col-span-3">
          <button
            type="submit"
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#8D672F] hover:bg-[#745322] active:scale-[0.99] text-white text-xs sm:text-sm uppercase tracking-[0.14em] font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
}
