'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Minus, Plus } from 'lucide-react';
import LuxuryDateRangePicker from './LuxuryDateRangePicker';

interface HorizonBookingBarProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialRooms?: number;
  initialAdults?: number;
  initialChildren?: number;
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

export default function HorizonBookingBar({
  initialCheckIn,
  initialCheckOut,
  initialRooms = 1,
  initialAdults = 2,
  initialChildren = 0,
  buttonText = 'FIND YOUR STAY',
  className = '',
  onSearch,
}: HorizonBookingBarProps) {
  const router = useRouter();

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getDefaultOutStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const [checkInDate, setCheckInDate] = useState(initialCheckIn || getTodayStr());
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut || getDefaultOutStr());
  const [numRooms, setNumRooms] = useState(initialRooms);
  const [numAdults, setNumAdults] = useState(initialAdults);
  const [numChildren, setNumChildren] = useState(initialChildren);

  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const totalGuests = numAdults + numChildren;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkOutDate <= checkInDate) {
      setDateError('Check-out date must be later than check-in date.');
      return;
    }

    if (onSearch) {
      onSearch({ checkInDate, checkOutDate, numRooms, numAdults, numChildren });
    } else {
      const q = new URLSearchParams({
        checkIn: checkInDate,
        checkOut: checkOutDate,
        rooms: String(numRooms),
        adults: String(numAdults),
        children: String(numChildren),
      });
      router.push(`/rooms?${q.toString()}`);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(40,25,12,0.12)] border border-[#E6D9C5] p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center text-left relative z-20"
      >
        {/* Custom Luxury Date Range Picker */}
        <div className="lg:col-span-6 relative z-30">
          <LuxuryDateRangePicker
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            onChange={(inDate, outDate) => {
              setCheckInDate(inDate);
              setCheckOutDate(outDate);
              setDateError(null);
            }}
          />
        </div>

        {/* Guests & Rooms */}
        <div className="lg:col-span-3 relative px-3 py-2.5 bg-[#FAF6EE] hover:bg-[#F2E8D8]/50 rounded-2xl transition-all border border-[#E6D9C5]/80 hover:border-[#8D672F]/50 cursor-pointer">
          <div onClick={() => setGuestPickerOpen(!guestPickerOpen)}>
            <label className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#786A5B] font-semibold block">
              GUESTS & ROOMS
            </label>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-[#8D672F] shrink-0" strokeWidth={1.75} />
              <span className="text-xs sm:text-sm font-semibold text-[#33271D] truncate">
                {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'} · {numRooms} {numRooms === 1 ? 'Room' : 'Rooms'}
              </span>
            </div>
          </div>

          {/* Guest selector popover */}
          {guestPickerOpen && (
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
                    disabled={numRooms <= 1}
                    onClick={() => setNumRooms(Math.max(1, numRooms - 1))}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center disabled:opacity-30 hover:bg-[#FAF6EE] text-[#33271D] transition-colors"
                  >
                    <Minus className="w-3 h-3 text-[#33271D]" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-[#33271D]">{numRooms}</span>
                  <button
                    type="button"
                    disabled={numRooms >= 5}
                    onClick={() => setNumRooms(Math.min(5, numRooms + 1))}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center disabled:opacity-30 hover:bg-[#FAF6EE] text-[#33271D] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[#33271D]" />
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
                    disabled={numAdults <= 1}
                    onClick={() => setNumAdults(Math.max(1, numAdults - 1))}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center disabled:opacity-30 hover:bg-[#FAF6EE] text-[#33271D] transition-colors"
                  >
                    <Minus className="w-3 h-3 text-[#33271D]" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-[#33271D]">{numAdults}</span>
                  <button
                    type="button"
                    disabled={numAdults >= 10}
                    onClick={() => setNumAdults(Math.min(10, numAdults + 1))}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center disabled:opacity-30 hover:bg-[#FAF6EE] text-[#33271D] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[#33271D]" />
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
                    disabled={numChildren <= 0}
                    onClick={() => setNumChildren(Math.max(0, numChildren - 1))}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center disabled:opacity-30 hover:bg-[#FAF6EE] text-[#33271D] transition-colors"
                  >
                    <Minus className="w-3 h-3 text-[#33271D]" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-[#33271D]">{numChildren}</span>
                  <button
                    type="button"
                    disabled={numChildren >= 6}
                    onClick={() => setNumChildren(Math.min(6, numChildren + 1))}
                    className="w-7 h-7 rounded-full border border-[#E6D9C5] flex items-center justify-center disabled:opacity-30 hover:bg-[#FAF6EE] text-[#33271D] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[#33271D]" />
                  </button>
                </div>
              </div>

              {/* Close */}
              <div className="pt-2 border-t border-[#E6D9C5]/60 text-right">
                <button
                  type="button"
                  onClick={() => setGuestPickerOpen(false)}
                  className="w-full py-2 bg-[#8D672F] text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#745322] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="lg:col-span-3">
          <button
            type="submit"
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#8D672F] hover:bg-[#745322] active:scale-[0.99] text-white text-xs sm:text-sm uppercase tracking-[0.14em] font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {dateError && (
          <div className="lg:col-span-12 text-xs text-rose-600 font-medium px-2">
            {dateError}
          </div>
        )}
      </form>
    </div>
  );
}
