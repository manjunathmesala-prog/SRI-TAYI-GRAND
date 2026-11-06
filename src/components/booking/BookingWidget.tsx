'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, ArrowRight, Minus, Plus } from 'lucide-react';
import { LuxuryDatePicker } from '@/components/ui/LuxuryDatePicker';

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
      className={`bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-full shadow-2xl border border-[#D8AD56]/25 p-2 md:p-2.5 text-[#241912] transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(56,34,22,0.18)] ${className}`}
    >
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch md:items-center">
        {/* Check-In */}
        <div className="relative flex-1">
          <LuxuryDatePicker
            value={checkIn}
            minDate={formatDate(today)}
            onChange={(val) => {
              setCheckIn(val);
              if (val && checkOut && new Date(val) >= new Date(checkOut)) {
                const nextDay = new Date(val);
                nextDay.setDate(nextDay.getDate() + 1);
                setCheckOut(formatDate(nextDay));
              }
            }}
            customTrigger={(formattedDisplay, open) => (
              <div
                data-cursor-hover
                onClick={open}
                className="relative flex-1 flex items-center gap-3.5 px-5 py-3 hover:bg-[#FAF7F2] rounded-xl md:rounded-full transition-colors cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-[#D8AD56] shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B]">
                    Check-In
                  </span>
                  <span className="block text-xs sm:text-sm font-medium text-[#241912] truncate">
                    {formattedDisplay || 'Select date'}
                  </span>
                </div>
              </div>
            )}
          />
        </div>

        {/* Delicate Divider */}
        <div className="hidden md:block w-[1px] h-8 bg-[#EFE3D6]" />

        {/* Check-Out */}
        <div className="relative flex-1">
          <LuxuryDatePicker
            value={checkOut}
            minDate={checkIn || formatDate(today)}
            rangeStart={checkIn}
            onChange={(val) => setCheckOut(val)}
            customTrigger={(formattedDisplay, open) => (
              <div
                data-cursor-hover
                onClick={open}
                className="relative flex-1 flex items-center gap-3.5 px-5 py-3 hover:bg-[#FAF7F2] rounded-xl md:rounded-full transition-colors cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-[#D8AD56] shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B]">
                    Check-Out
                  </span>
                  <span className="block text-xs sm:text-sm font-medium text-[#241912] truncate">
                    {formattedDisplay || 'Select date'}
                  </span>
                </div>
              </div>
            )}
          />
        </div>

        {/* Delicate Divider */}
        <div className="hidden md:block w-[1px] h-8 bg-[#EFE3D6]" />

        {/* Guests Popover */}
        <div className="relative flex-1">
          <div
            data-cursor-hover
            onClick={() => setGuestDropdownOpen(!guestDropdownOpen)}
            className="flex items-center gap-3.5 px-5 py-3 hover:bg-[#FAF7F2] rounded-xl md:rounded-full transition-colors cursor-pointer group"
          >
            <User className="w-4 h-4 text-[#D8AD56] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B]">
                Guests & Rooms
              </span>
              <span className="block text-xs sm:text-sm font-medium text-[#241912] truncate">
                {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'} • {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
              </span>
            </div>
          </div>

          {/* Guest Count Popover */}
          {guestDropdownOpen && (
            <div className="absolute top-full mt-3 left-0 right-0 md:left-auto md:w-72 bg-white border border-[#D8AD56]/30 rounded-2xl shadow-2xl p-5 z-50 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#241912]">Adults</div>
                  <div className="text-[10px] text-[#786B61]">Age 12+</div>
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
                  <span className="text-xs font-semibold w-5 text-center">{adults}</span>
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
                  <div className="text-xs font-medium text-[#241912]">Children</div>
                  <div className="text-[10px] text-[#786B61]">Age 0–11</div>
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
                  <span className="text-xs font-semibold w-5 text-center">{children}</span>
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
                  <div className="text-xs font-medium text-[#241912]">Rooms</div>
                  <div className="text-[10px] text-[#786B61]">Rooms needed</div>
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
                  <span className="text-xs font-semibold w-5 text-center">{rooms}</span>
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
                className="w-full mt-2 py-2 text-xs font-medium uppercase tracking-wider rounded-xl bg-[#43001F] text-white hover:bg-[#2E0015] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-2 md:mt-0 md:ml-2">
          <button
            type="submit"
            data-cursor-hover
            className="w-full md:w-auto py-3.5 px-7 rounded-xl md:rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap cursor-pointer border border-[#D8AD56]/40"
          >
            <span>Check Availability</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
