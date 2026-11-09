'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PhysicalRoom, Booking, RoomCategory } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BedDouble,
  User,
  Phone,
  Mail,
  CreditCard,
  Building,
  KeyRound,
  Key,
  RefreshCw,
  Plus,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Check,
} from 'lucide-react';
import { RfidHistoryTable } from '@/components/admin/RfidHistoryTable';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

export default function RoomTapeChartPage() {
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rfidAuditRoom, setRfidAuditRoom] = useState<string | null>(null);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // 14-day timeline start date (defaults to 2 days before today to show current stays)
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  });

  // Filters
  const [floorFilter, setFloorFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [quickRoomModal, setQuickRoomModal] = useState<{
    room: PhysicalRoom;
    dateStr: string;
  } | null>(null);

  // New reservation form in modal
  const [newResGuestName, setNewResGuestName] = useState('');
  const [newResPhone, setNewResPhone] = useState('');
  const [newResEmail, setNewResEmail] = useState('');
  const [newResCheckIn, setNewResCheckIn] = useState('');
  const [newResCheckOut, setNewResCheckOut] = useState('');
  const [newResAdults, setNewResAdults] = useState(2);
  const [newResChildren, setNewResChildren] = useState(0);
  const [newResSubmitting, setNewResSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Real-time hook for live tape chart updates
  const { isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'booking_created' ||
        event.eventType === 'booking_updated' ||
        event.eventType === 'room_assigned' ||
        event.eventType === 'check_in' ||
        event.eventType === 'check_out' ||
        event.eventType === 'housekeeping_updated' ||
        event.eventType === 'rfid_event' ||
        event.eventType === 'maintenance_ticket_created' ||
        event.eventType === 'maintenance_ticket_updated' ||
        event.eventType === 'channel_synced' ||
        event.eventType === 'full_sync'
      ) {
        fetchData(false);
      }
    },
  });

  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch('/api/admin/operations', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms || []);
        setBookings(data.bookings || []);
        setCategories(data.categories || []);
      }
    } catch {
      // Gracefully handle network interruptions
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Generate array of 14 consecutive calendar dates
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const base = new Date(`${startDateStr}T12:00:00`);
    for (let i = 0; i < 14; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      dates.push(current);
    }
    return dates;
  }, [startDateStr]);

  // Timeline Navigation helpers
  const handleShiftDays = (days: number) => {
    const current = new Date(`${startDateStr}T12:00:00`);
    current.setDate(current.getDate() + days);
    setStartDateStr(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    setStartDateStr(d.toISOString().split('T')[0]);
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (floorFilter !== 'all' && String(room.floor_number) !== floorFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && room.category_id !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && room.operational_status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRoom = room.room_number.includes(q);
        const matchesCategory = room.category_name?.toLowerCase().includes(q);
        const matchesGuest = room.current_guest_name?.toLowerCase().includes(q);
        if (!matchesRoom && !matchesCategory && !matchesGuest) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, floorFilter, categoryFilter, statusFilter, searchQuery]);

  // Group rooms by floor (1, 2, 3)
  const floorGroups = useMemo(() => {
    const groups: { floor: number; rooms: PhysicalRoom[] }[] = [];
    [1, 2, 3].forEach((f) => {
      const floorRooms = filteredRooms.filter((r) => r.floor_number === f);
      if (floorRooms.length > 0) {
        groups.push({ floor: f, rooms: floorRooms });
      }
    });
    return groups;
  }, [filteredRooms]);

  // Find booking active for a given room on a given calendar day
  const getBookingForRoomDate = (room: PhysicalRoom, date: Date) => {
    const dateIso = date.toISOString().split('T')[0];
    return bookings.find((b) => {
      if (b.status === 'cancelled') return false;
      const isAssigned =
        b.assigned_room_id === room.id ||
        b.assigned_room_number === room.room_number ||
        b.room_number === room.room_number;
      if (!isAssigned) return false;

      // Active stay covers check_in_date <= dateIso < check_out_date
      return b.check_in_date <= dateIso && b.check_out_date > dateIso;
    });
  };

  // Update room operational or housekeeping status
  const handleUpdateRoomStatus = async (
    roomId: string,
    operationalStatus: string,
    housekeepingStatus: string
  ) => {
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'housekeeping',
          roomId,
          operationalStatus,
          housekeepingStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData(false);
        setModalFeedback('Room status updated successfully.');
        setTimeout(() => setModalFeedback(null), 3000);
      }
    } catch (err: any) {
      setModalFeedback(`Error: ${err.message}`);
    }
  };

  // Open Quick Modal
  const openQuickModal = (room: PhysicalRoom, dateStr: string) => {
    setQuickRoomModal({ room, dateStr });
    setNewResCheckIn(dateStr);
    const nextDay = new Date(`${dateStr}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    setNewResCheckOut(nextDay.toISOString().split('T')[0]);
    setNewResGuestName('');
    setNewResPhone('');
    setNewResEmail('');
    setModalFeedback(null);
  };

  // Submit new quick reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRoomModal) return;

    setNewResSubmitting(true);
    setModalFeedback(null);

    try {
      const room = quickRoomModal.room;
      const category = categories.find((c) => c.id === room.category_id);
      const basePrice = category ? category.base_price_per_night : 2500;

      const checkInDate = new Date(newResCheckIn);
      const checkOutDate = new Date(newResCheckOut);
      const nights = Math.max(
        1,
        Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      const subtotal = basePrice * nights;
      const taxAmount = Math.round(subtotal * 0.12 * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'create_booking',
          bookingData: {
            guest_name: newResGuestName,
            guest_phone: newResPhone,
            guest_email: newResEmail || `${newResGuestName.toLowerCase().replace(/\s+/g, '')}@guest.com`,
            category_id: room.category_id,
            category_name: room.category_name || category?.name || 'Standard Room',
            assigned_room_id: room.id,
            assigned_room_number: room.room_number,
            check_in_date: newResCheckIn,
            check_out_date: newResCheckOut,
            adults_count: Number(newResAdults),
            children_count: Number(newResChildren),
            rooms_count: 1,
            status: 'confirmed',
            payment_status: 'pay_at_hotel',
            payment_method: 'pay_at_hotel',
            subtotal_amount: subtotal,
            tax_amount: taxAmount,
            additional_charges_amount: 0,
            total_amount: totalAmount,
            paid_amount: 0,
            special_requests: `Created from Interactive Tape Chart Matrix for Room ${room.room_number}.`,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setModalFeedback(`Reservation ${data.booking?.booking_reference} confirmed!`);
        fetchData(false);
        setTimeout(() => {
          setQuickRoomModal(null);
        }, 1500);
      } else {
        setModalFeedback(`Error: ${data.error || 'Failed to create reservation'}`);
      }
    } catch (err: any) {
      setModalFeedback(`Error: ${err.message}`);
    } finally {
      setNewResSubmitting(false);
    }
  };

  // Status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            Available
          </span>
        );
      case 'occupied':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
            Occupied
          </span>
        );
      case 'reserved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            Reserved
          </span>
        );
      case 'cleaning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-300">
            Cleaning
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
            OOO Maint.
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
            {status}
          </span>
        );
    }
  };

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-[#241912] text-[#FAF7F2] rounded-2xl p-6 md:p-8 border border-[#D8AD56]/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-[#382216]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40">
                Front Office Operations
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isConnected
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'Real-Time Sync Active' : 'Connecting Stream...'}
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide">
              Visual Room Tape Chart & Dynamic Matrix
            </h1>
            <p className="text-[#FAF7F2]/70 text-sm mt-1 max-w-2xl leading-relaxed">
              14-Day Gantt-style timeline across all 25 physical rooms and 3 floors. Manage room locks,
              guest check-ins, cleaning schedules, and maintenance OOO blocks.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#D8AD56]/30 bg-[#382216]/70 hover:bg-[#382216] text-[#D8AD56] font-medium text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Timeline Navigation & Filters */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 14-Day Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShiftDays(-7)}
              className="p-2 rounded-xl border border-stone-200 hover:border-[#D8AD56] hover:bg-[#FAF7F2] text-stone-700 transition-colors"
              title="Previous 7 Days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleSetToday}
              className="px-3 py-2 rounded-xl border border-[#D8AD56]/40 bg-[#FAF7F2] hover:bg-[#FAF7F2]/80 text-[#8A5A2B] font-semibold text-xs transition-colors"
            >
              Today
            </button>

            <button
              onClick={() => handleShiftDays(7)}
              className="p-2 rounded-xl border border-stone-200 hover:border-[#D8AD56] hover:bg-[#FAF7F2] text-stone-700 transition-colors"
              title="Next 7 Days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-stone-200">
              <span className="text-xs text-stone-500 font-medium">Jump to Date:</span>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
              />
            </div>

            <div className="ml-2 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D8AD56]/20 text-xs font-mono font-semibold text-[#241912]">
              {timelineDates[0]?.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} –{' '}
              {timelineDates[13]?.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Quick Status Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-stone-400 text-[11px] uppercase font-mono">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-stone-600">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-stone-600">Occupied (Checked In)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <span className="text-stone-600">Reserved (Confirmed)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-stone-600">Housekeeping</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span className="text-stone-600">Maintenance OOO</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100 text-xs">
          {/* Floor Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium">Floor:</span>
            {(['all', '1', '2', '3'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFloorFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  floorFilter === f
                    ? 'bg-[#382216] text-[#D8AD56] font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f === 'all' ? 'All Floors' : `Floor ${f}`}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-stone-500 font-medium">Category:</span>
            <div className="min-w-[140px]">
              <LuxurySelect
                size="sm"
                variant="admin"
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(String(val))}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-stone-500 font-medium">Status:</span>
            <div className="min-w-[130px]">
              <LuxurySelect
                size="sm"
                variant="admin"
                value={statusFilter}
                onChange={(val) => setStatusFilter(String(val))}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'available', label: 'Available' },
                  { value: 'occupied', label: 'Occupied' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'cleaning', label: 'Cleaning' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
              />
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] ml-auto">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Room Number or Guest Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-[#D8AD56]"
            />
          </div>
        </div>
      </div>

      {/* 2D Interactive Room Tape Chart Matrix */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {/* Table Header: Dates Row */}
            <thead>
              <tr className="bg-[#241912] text-[#FAF7F2] border-b border-[#D8AD56]/30">
                {/* Fixed Room Column */}
                <th className="sticky left-0 z-20 bg-[#241912] w-52 min-w-[208px] p-3 text-left font-serif font-bold text-sm tracking-wide border-r border-[#D8AD56]/30">
                  <div className="flex items-center justify-between">
                    <span>Rooms ({filteredRooms.length})</span>
                    <Layers className="w-4 h-4 text-[#D8AD56]" />
                  </div>
                </th>

                {/* 14 Calendar Date Columns */}
                {timelineDates.map((date, idx) => {
                  const dateIso = date.toISOString().split('T')[0];
                  const isToday = dateIso === todayIso;
                  const dayOfWeek = date.getDay();
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday, Saturday

                  return (
                    <th
                      key={idx}
                      className={`min-w-[96px] w-24 p-2 text-center border-r border-[#382216] transition-colors ${
                        isToday
                          ? 'bg-[#382216] text-[#D8AD56] font-bold'
                          : isWeekend
                          ? 'bg-[#2e1d14] text-amber-200'
                          : ''
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono tracking-wider opacity-80">
                        {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </div>
                      <div className="text-sm font-bold mt-0.5">
                        {date.getDate()} {date.toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                      {isToday && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wider font-bold bg-[#D8AD56] text-[#241912]">
                          Today
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body: Rooms grouped by Floor */}
            <tbody className="divide-y divide-stone-100">
              {floorGroups.map(({ floor, rooms: floorRooms }) => (
                <div key={floor} className="contents">
                  {/* Floor Header Bar */}
                  <tr className="bg-[#FAF7F2] font-semibold text-[#8A5A2B] border-y border-[#D8AD56]/20">
                    <td
                      colSpan={15}
                      className="sticky left-0 px-4 py-2 text-xs font-serif font-bold tracking-wide flex items-center gap-2"
                    >
                      <Building className="w-3.5 h-3.5 text-[#8A5A2B]" />
                      <span>
                        FLOOR {floor} ({floorRooms.length} Rooms)
                      </span>
                    </td>
                  </tr>

                  {/* Rooms on this Floor */}
                  {floorRooms.map((room) => {
                    return (
                      <tr key={room.id} className="hover:bg-amber-50/20 transition-colors group">
                        {/* Room Meta Left Column (Sticky) */}
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-[#FDFBF7] p-2.5 border-r border-stone-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-sm text-[#241912]">
                                Room {room.room_number}
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono">
                                {room.category_name?.replace('Room', '').trim()}
                              </span>
                            </div>

                            <button
                              onClick={() => openQuickModal(room, startDateStr)}
                              className="text-stone-400 hover:text-[#D8AD56] p-1 rounded hover:bg-stone-100"
                              title="Room Details & New Reservation"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            {getStatusBadge(room.operational_status)}
                            <span className="text-[9px] text-stone-400 font-mono">
                              HK: {room.housekeeping_status}
                            </span>
                          </div>
                        </td>

                        {/* 14 Timeline Day Cells */}
                        {timelineDates.map((date, dateIdx) => {
                          const dateIso = date.toISOString().split('T')[0];
                          const isToday = dateIso === todayIso;
                          const dayOfWeek = date.getDay();
                          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                          const booking = getBookingForRoomDate(room, date);

                          // Check if booking starts today
                          const isStart = booking && booking.check_in_date === dateIso;
                          const isEnd = booking && booking.check_out_date === dateIso;

                          return (
                            <td
                              key={dateIdx}
                              onClick={() => {
                                if (booking) {
                                  setSelectedBooking(booking);
                                } else {
                                  openQuickModal(room, dateIso);
                                }
                              }}
                              className={`h-14 p-1 border-r border-b border-stone-100 text-center relative cursor-pointer transition-all ${
                                isToday ? 'bg-amber-50/40' : isWeekend ? 'bg-stone-50/40' : ''
                              } hover:bg-amber-100/50`}
                            >
                              {booking ? (
                                <div
                                  className={`w-full h-full rounded-md p-1.5 flex flex-col justify-between text-left text-[11px] shadow-sm transition-transform hover:scale-[1.02] ${
                                    booking.status === 'checked_in'
                                      ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white border-l-4 border-l-emerald-400'
                                      : booking.status === 'confirmed'
                                      ? 'bg-gradient-to-r from-blue-800 to-indigo-900 text-white border-l-4 border-l-blue-400'
                                      : 'bg-gradient-to-r from-[#382216] to-[#5a3622] text-[#D8AD56] border-l-4 border-l-[#D8AD56]'
                                  }`}
                                  title={`${booking.guest_name} (${booking.booking_reference}) - ${booking.check_in_date} to ${booking.check_out_date}`}
                                >
                                  <div className="font-bold truncate text-[10px] leading-tight">
                                    {booking.guest_name}
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] opacity-80 font-mono">
                                    <span>
                                      {booking.status === 'checked_in'
                                        ? 'In-House'
                                        : booking.status === 'confirmed'
                                        ? 'Confirmed'
                                        : 'Reserved'}
                                    </span>
                                    <span>{booking.adults_count}A</span>
                                  </div>
                                </div>
                              ) : room.operational_status === 'maintenance' ? (
                                <div className="w-full h-full rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center text-[10px] font-semibold gap-1">
                                  <Wrench className="w-3 h-3" />
                                  <span>OOO</span>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 text-stone-400 transition-opacity">
                                  <Plus className="w-3.5 h-3.5 text-[#D8AD56]" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#241912] text-[#FAF7F2] p-5 flex items-center justify-between border-b border-[#D8AD56]/30">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#D8AD56]">
                  Reservation Overview
                </span>
                <h3 className="font-serif font-bold text-lg text-white">
                  {selectedBooking.guest_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/20">
                <div>
                  <span className="text-stone-500 font-medium block">Booking Reference:</span>
                  <span className="font-mono font-bold text-[#241912] text-sm">
                    {selectedBooking.booking_reference}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Status:</span>
                  <span className="font-semibold text-emerald-800">
                    {selectedBooking.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Room Number:</span>
                  <span className="font-mono font-bold text-[#241912]">
                    Room {selectedBooking.assigned_room_number || selectedBooking.room_number || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Category:</span>
                  <span className="font-medium text-stone-700">
                    {selectedBooking.category_name}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-stone-700">
                  <Phone className="w-3.5 h-3.5 text-[#8A5A2B]" />
                  <span>{selectedBooking.guest_phone}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <Mail className="w-3.5 h-3.5 text-[#8A5A2B]" />
                  <span>{selectedBooking.guest_email}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <CalendarRange className="w-3.5 h-3.5 text-[#8A5A2B]" />
                  <span>
                    {selectedBooking.check_in_date} ➔ {selectedBooking.check_out_date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <CreditCard className="w-3.5 h-3.5 text-[#8A5A2B]" />
                  <span>
                    Total: ₹{selectedBooking.total_amount.toLocaleString('en-IN')} (
                    {selectedBooking.payment_status.toUpperCase()})
                  </span>
                </div>
              </div>

              {selectedBooking.special_requests && (
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="font-medium text-stone-600 block mb-1">Special Instructions:</span>
                  <p className="text-stone-800 italic">{selectedBooking.special_requests}</p>
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const b = selectedBooking;
                    setSelectedBooking(null);
                    setRfidAuditRoom(b.assigned_room_number || b.room_number || null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#D8AD56]/60 bg-[#FAF5EB] text-[#8a6a2a] text-xs font-bold hover:bg-[#E2D5BE]/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-[#9b7a3e]" />
                  <span>RFID Tap History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Room Details & New Reservation Modal */}
      {quickRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-[#241912] text-[#FAF7F2] p-5 flex items-center justify-between border-b border-[#D8AD56]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#382216] border border-[#D8AD56]/30 flex items-center justify-center font-bold font-serif text-[#D8AD56]">
                  {quickRoomModal.room.room_number}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-white">
                    Room {quickRoomModal.room.room_number} Management
                  </h3>
                  <span className="text-[11px] text-[#FAF7F2]/70 font-mono">
                    Floor {quickRoomModal.room.floor_number} • {quickRoomModal.room.category_name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setQuickRoomModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Feedback Alert */}
              {modalFeedback && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  {modalFeedback}
                </div>
              )}

              {/* Status Action Buttons */}
              <div>
                <label className="block text-stone-500 font-semibold mb-2">
                  Update Operational Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateRoomStatus(quickRoomModal.room.id, 'available', 'clean')
                    }
                    className="py-2 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Set Clean</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateRoomStatus(quickRoomModal.room.id, 'cleaning', 'dirty')
                    }
                    className="py-2 px-2.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 font-semibold hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Set Dirty</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateRoomStatus(quickRoomModal.room.id, 'maintenance', 'dirty')
                    }
                    className="py-2 px-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Mark OOO</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const rNum = quickRoomModal.room.room_number;
                    setQuickRoomModal(null);
                    setRfidAuditRoom(rNum);
                  }}
                  className="w-full mt-2.5 py-2 px-3 rounded-lg border border-[#D8AD56]/60 bg-[#FAF5EB] text-[#8a6a2a] text-xs font-bold hover:bg-[#E2D5BE]/60 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Key className="w-3.5 h-3.5 text-[#9b7a3e]" />
                  <span>View Room {quickRoomModal.room.room_number} RFID Tap History</span>
                </button>
              </div>

              {/* Direct Reservation Form */}
              <div className="pt-3 border-t border-stone-200">
                <h4 className="font-serif font-bold text-sm text-[#241912] mb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#8A5A2B]" />
                  <span>Quick Walk-In / Front Desk Booking</span>
                </h4>

                <form onSubmit={handleCreateReservation} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Guest Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={newResGuestName}
                        onChange={(e) => setNewResGuestName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9848012345"
                        value={newResPhone}
                        onChange={(e) => setNewResPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Check-in Date</label>
                      <input
                        type="date"
                        required
                        value={newResCheckIn}
                        onChange={(e) => setNewResCheckIn(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Check-out Date</label>
                      <input
                        type="date"
                        required
                        value={newResCheckOut}
                        onChange={(e) => setNewResCheckOut(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Adults</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={newResAdults}
                        onChange={(e) => setNewResAdults(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Children</label>
                      <input
                        type="number"
                        min="0"
                        max="3"
                        value={newResChildren}
                        onChange={(e) => setNewResChildren(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={newResSubmitting}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D8AD56] to-[#b3883b] hover:from-[#e0b761] hover:to-[#c49744] text-[#241912] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Check className={`w-3.5 h-3.5 ${newResSubmitting ? 'animate-spin' : ''}`} />
                    <span>
                      {newResSubmitting ? 'Confirming Reservation...' : 'Confirm Room Reservation'}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFID TAP HISTORY MODAL FOR ROOM */}
      {rfidAuditRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-4 sm:p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] border border-[#E2D5BE] flex items-center justify-center text-[#9b7a3e]">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9b7a3e] block">
                    Forensic Door Lock Audit Trail
                  </span>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900">
                    Room {rfidAuditRoom} Access History
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setRfidAuditRoom(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                title="Close Audit Trail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RfidHistoryTable roomNumber={rfidAuditRoom} />
          </div>
        </div>
      )}
    </div>
  );
}
