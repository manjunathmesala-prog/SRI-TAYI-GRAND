'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, ArrowRight, Minus, Plus } from 'lucide-react';

interface BookingWidgetProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialRooms?: number;
  className?: string;
}

export function BookingWidget({
  initialCheckIn,
  initialCheckOut,
  initialAdults = 1,
  initialChildren = 0,
  initialRooms = 1,
  className = '',
}: BookingWidgetProps) {
  const router = useRouter();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || '');
  const [checkOut, setCheckOut] = useState(initialCheckOut || '');
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [rooms, setRooms] = useState(initialRooms);
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCheckIn = checkIn || formatDate(today);
    const effectiveCheckOut = checkOut || formatDate(tomorrow);

    const query = new URLSearchParams({
      checkIn: effectiveCheckIn,
      checkOut: effectiveCheckOut,
      adults: adults.toString(),
      children: children.toString(),
      rooms: rooms.toString(),
    });

    router.push(`/availability?${query.toString()}`);
  };

  const totalGuests = adults + children;

  return (
    <div
      className={`bg-white rounded-2xl md:rounded-full shadow-2xl border border-[#D8AD56]/30 p-2 md:p-2.5 text-[#241912] transition-shadow duration-300 hover:shadow-luxuryHover ${className}`}
    >
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch md:items-center">
        {/* Check in (No hyphens per B1 copy rules) */}
        <div
          className="relative flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F2] rounded-lg md:rounded-full transition-colors cursor-pointer group"
        >
          <Calendar className="w-4 h-4 text-[#D8AD56] shrink-0" strokeWidth={1.75} />
          <div className="flex-1 min-w-0">
            <span className="block caption-4 uppercase tracking-[0.2em] font-semibold text-[#786B61]">
              Check in
            </span>
            <input
              type="date"
              value={checkIn}
              min={formatDate(today)}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && new Date(e.target.value) >= new Date(checkOut)) {
                  const nextDay = new Date(e.target.value);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setCheckOut(formatDate(nextDay));
                }
              }}
              className="body-5 font-medium text-[#241912] bg-transparent focus:outline-none w-full cursor-pointer"
              placeholder="Select date"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-[1px] h-8 bg-[#EFE3D6]" />

        {/* Check out (No hyphens per B1 copy rules) */}
        <div
          className="relative flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F2] rounded-lg md:rounded-full transition-colors cursor-pointer group"
        >
          <Calendar className="w-4 h-4 text-[#D8AD56] shrink-0" strokeWidth={1.75} />
          <div className="flex-1 min-w-0">
            <span className="block caption-4 uppercase tracking-[0.2em] font-semibold text-[#786B61]">
              Check out
            </span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || formatDate(today)}
              onChange={(e) => setCheckOut(e.target.value)}
              className="body-5 font-medium text-[#241912] bg-transparent focus:outline-none w-full cursor-pointer"
              placeholder="Select date"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-[1px] h-8 bg-[#EFE3D6]" />

        {/* Guests Popover */}
        <div className="relative flex-1">
          <div
            onClick={() => setGuestDropdownOpen(!guestDropdownOpen)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF7F2] rounded-lg md:rounded-full transition-colors cursor-pointer group"
          >
            <User className="w-4 h-4 text-[#D8AD56] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <span className="block caption-4 uppercase tracking-[0.2em] font-semibold text-[#786B61]">
                Guests and rooms
              </span>
              <span className="block body-5 font-medium text-[#241912] truncate">
                {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'} • {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
              </span>
            </div>
          </div>

          {/* Guest Count Popover */}
          {guestDropdownOpen && (
            <div className="absolute top-full mt-3 left-0 right-0 md:left-auto md:w-72 bg-white border border-[#D8AD56]/30 rounded-2xl shadow-2xl p-5 z-50 space-y-4 animate-in fade-in duration-150">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="body-5 font-medium text-[#241912]">Adults</div>
                  <div className="caption-5 text-[#786B61]">Age 12 and above</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                    className="w-7 h-7 rounded-full border border-[#D8AD56]/40 flex items-center justify-center text-[#241912] hover:bg-[#FAF7F2] disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="body-4 font-semibold w-5 text-center">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(Math.min(8, adults + 1))}
                    className="w-7 h-7 rounded-full border border-[#D8AD56]/40 flex items-center justify-center text-[#241912] hover:bg-[#FAF7F2] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="body-5 font-medium text-[#241912]">Children</div>
                  <div className="caption-5 text-[#786B61]">Age 0 to 11</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    disabled={children <= 0}
                    className="w-7 h-7 rounded-full border border-[#D8AD56]/40 flex items-center justify-center text-[#241912] hover:bg-[#FAF7F2] disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="body-4 font-semibold w-5 text-center">{children}</span>
                  <button
                    type="button"
                    onClick={() => setChildren(Math.min(4, children + 1))}
                    className="w-7 h-7 rounded-full border border-[#D8AD56]/40 flex items-center justify-center text-[#241912] hover:bg-[#FAF7F2] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Rooms */}
              <div className="flex items-center justify-between pt-3 border-t border-[#EFE3D6]/70">
                <div>
                  <div className="body-5 font-medium text-[#241912]">Rooms</div>
                  <div className="caption-5 text-[#786B61]">Rooms needed</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRooms(Math.max(1, rooms - 1))}
                    disabled={rooms <= 1}
                    className="w-7 h-7 rounded-full border border-[#D8AD56]/40 flex items-center justify-center text-[#241912] hover:bg-[#FAF7F2] disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="body-4 font-semibold w-5 text-center">{rooms}</span>
                  <button
                    type="button"
                    onClick={() => setRooms(Math.min(5, rooms + 1))}
                    className="w-7 h-7 rounded-full border border-[#D8AD56]/40 flex items-center justify-center text-[#241912] hover:bg-[#FAF7F2] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGuestDropdownOpen(false)}
                className="w-full mt-2 py-2 button-xsm rounded-lg bg-[#D8AD56] text-[#241912] hover:bg-[#C69940] transition-colors focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
              >
                Apply selection
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button (Sentence case, B1 button-sm token, B2 8px vertical padding) */}
        <div className="mt-2 md:mt-0 md:ml-2">
          <button
            type="submit"
            className="w-full md:w-auto py-2.5 px-6 rounded-lg md:rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#241912] button-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-goldGlow hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
          >
            <span>Check availability</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
