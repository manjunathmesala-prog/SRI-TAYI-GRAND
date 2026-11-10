'use client';

import { useState, useEffect, useCallback } from 'react';
import NextLink from 'next/link';
import {
  Users,
  BedDouble,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  ConciergeBell,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { PhysicalRoom, Booking, PaymentRecord, HallEnquiry } from '@/types';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';

export default function AdminDashboardPage() {
  const [filterPeriod, setFilterPeriod] = useState('Today');
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const state = await adminOperations.fetchFullState();
      if (state.success) {
        setRooms(state.rooms || []);
        setBookings(state.bookings || []);
        setPayments(state.payments || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time synchronization
  const { isConnected, status } = useRealtimeSync({
    onRefresh: fetchDashboardData,
  });

  // Calculate Operational Metrics
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.operational_status === 'occupied').length;
  const reservedRooms = rooms.filter((r) => r.operational_status === 'reserved').length;
  const availableRooms = rooms.filter((r) => r.operational_status === 'available').length;
  const cleaningRooms = rooms.filter((r) => r.operational_status === 'cleaning').length;
  const maintenanceRooms = rooms.filter((r) => r.operational_status === 'maintenance').length;

  const occupancyRate =
    totalRooms > 0 ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) : 0;

  // Bookings breakdown
  const checkedInCount = bookings.filter((b) => b.status === 'checked_in').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingPaymentsCount = bookings.filter(
    (b) => b.payment_status === 'pending' || b.payment_status === 'pay_at_hotel'
  ).length;

  // Financials
  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.total_amount, 0);

  const collections = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Kadiri Hotel Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#8D672F] font-semibold mb-1">
              HOTEL OPERATIONS HQ
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected ? 'Real-Time Sync Active' : `Sync: ${status}`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#33271D]">
            Operational Overview
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            Live metrics for Sri Tayi Grand, Kadiri · Local Time:{' '}
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Quick Date Range Filter */}
        <div className="flex items-center gap-2">
          {['Today', 'Last 7 Days', 'This Month'].map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterPeriod === period
                  ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
                  : 'bg-white text-[#786A5B] hover:text-[#33271D] border border-[#E6D9C5]'
              }`}
            >
              {period}
            </button>
          ))}
          <button
            onClick={fetchDashboardData}
            className="p-1.5 rounded-lg bg-white border border-[#E6D9C5] text-[#786A5B] hover:bg-[#FAF7F2]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Occupancy Rate */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786A5B]">
              Occupancy Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#33271D]">{occupancyRate}%</span>
            <span className="text-xs text-[#2E7D32] font-semibold">
              {occupiedRooms + reservedRooms} / {totalRooms} Rooms
            </span>
          </div>
          <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#D8AD56] h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Card 2: Active Stays */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786A5B]">
              Checked-In Guests
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#1565C0] flex items-center justify-center">
              <ConciergeBell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#33271D]">{checkedInCount}</span>
            <span className="text-xs text-[#786A5B]">Rooms Occupied</span>
          </div>
          <p className="text-[11px] text-[#786A5B] mt-2">
            {confirmedCount} upcoming confirmed arrivals today
          </p>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786A5B]">
              Total Bookings Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#2E7D32] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#33271D]">
              ₹ {totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-[#2E7D32] mt-2 font-semibold">
            ₹ {collections.toLocaleString('en-IN', { maximumFractionDigits: 0 })} settled in ledger
          </p>
        </div>

        {/* Card 4: Housekeeping Status */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786A5B]">
              Room Inventory Ready
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#E65100] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#33271D]">{availableRooms}</span>
            <span className="text-xs text-[#786A5B]">Clean & Available</span>
          </div>
          <p className="text-[11px] text-[#786A5B] mt-2">
            {cleaningRooms} in cleaning turnover · {maintenanceRooms} in maintenance
          </p>
        </div>
      </div>

      {/* Middle Grid: Operational Room Matrix & Front Desk Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: 24 Physical Rooms Status Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6D9C5] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#33271D]">
                Physical Room Operational Matrix
              </h3>
              <p className="text-xs text-[#786A5B]">
                Live state of all 24 guest rooms across Floors 1, 2 & 3
              </p>
            </div>
            <NextLink
              href="/admin/rooms/inventory"
              className="text-xs font-semibold text-[#D8AD56] hover:underline"
            >
              Full Room Directory →
            </NextLink>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-[#786A5B] mb-6 pb-4 border-b border-[#E6D9C5]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#2E7D32]" />
              <span>Available ({availableRooms})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#D8AD56]" />
              <span>Occupied ({occupiedRooms})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#1565C0]" />
              <span>Reserved ({reservedRooms})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#E65100]" />
              <span>Cleaning ({cleaningRooms})</span>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {rooms.map((room) => {
              const statusColor =
                room.operational_status === 'available'
                  ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/30'
                  : room.operational_status === 'occupied'
                  ? 'bg-[#382216] text-[#D8AD56] border-[#D8AD56]'
                  : room.operational_status === 'reserved'
                  ? 'bg-[#E3F2FD] text-[#1565C0] border-[#1565C0]/30'
                  : 'bg-[#FFF3E0] text-[#E65100] border-[#E65100]/30';

              return (
                <div
                  key={room.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:scale-102 ${statusColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">R{room.room_number}</span>
                    <span className="text-[9px] uppercase font-semibold">F{room.floor_number}</span>
                  </div>
                  <div className="mt-2 text-[10px] font-semibold truncate capitalize">
                    {room.operational_status}
                  </div>
                  <div className="text-[9px] opacity-75 truncate">{room.category_name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Operational Shortcuts */}
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#E6D9C5] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#33271D] mb-1">
              Front Desk Shortcuts
            </h3>
            <p className="text-xs text-[#786A5B] mb-5">
              Rapid access to everyday hotel desk operations
            </p>

            <div className="space-y-3">
              <NextLink
                href="/admin/front-desk"
                className="w-full p-3.5 rounded-xl bg-white border border-[#E6D9C5] hover:border-[#D8AD56] text-xs font-semibold text-[#33271D] flex items-center justify-between shadow-xs group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center group-hover:bg-[#D8AD56] group-hover:text-[#25150F] transition-colors">
                    <ConciergeBell className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">Walk-In & Check-In Desk</span>
                    <span className="text-[10px] text-[#786A5B]">Keycard encoding & folios</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#786A5B] group-hover:text-[#D8AD56]" />
              </NextLink>

              <NextLink
                href="/admin/payments"
                className="w-full p-3.5 rounded-xl bg-white border border-[#E6D9C5] hover:border-[#D8AD56] text-xs font-semibold text-[#33271D] flex items-center justify-between shadow-xs group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#2E7D32] flex items-center justify-center group-hover:bg-[#2E7D32] group-hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">Financial Ledger & Expenses</span>
                    <span className="text-[10px] text-[#786A5B]">Collections & disbursements</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#786A5B] group-hover:text-[#2E7D32]" />
              </NextLink>

              <NextLink
                href="/admin/reports"
                className="w-full p-3.5 rounded-xl bg-white border border-[#E6D9C5] hover:border-[#D8AD56] text-xs font-semibold text-[#33271D] flex items-center justify-between shadow-xs group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#1565C0] flex items-center justify-center group-hover:bg-[#1565C0] group-hover:text-white transition-colors">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">Night Audit & Daily Closing</span>
                    <span className="text-[10px] text-[#786A5B]">Shift reconcile & lock day</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#786A5B] group-hover:text-[#1565C0]" />
              </NextLink>

              <NextLink
                href="/admin/housekeeping"
                className="w-full p-3.5 rounded-xl bg-white border border-[#E6D9C5] hover:border-[#D8AD56] text-xs font-semibold text-[#33271D] flex items-center justify-between shadow-xs group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#E65100] flex items-center justify-center group-hover:bg-[#E65100] group-hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">Housekeeping Turnover</span>
                    <span className="text-[10px] text-[#786A5B]">Sanitization tracking</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#786A5B] group-hover:text-[#E65100]" />
              </NextLink>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Activity Table */}
      <div className="bg-white rounded-2xl border border-[#E6D9C5] p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#33271D]">
              Recent Booking Activity
            </h3>
            <p className="text-xs text-[#786A5B]">Latest guest reservations and arrivals</p>
          </div>
          <NextLink
            href="/admin/bookings"
            className="text-xs font-semibold text-[#D8AD56] hover:underline"
          >
            All Bookings ({bookings.length}) →
          </NextLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786A5B] uppercase tracking-wider text-[10px] border-b border-[#E6D9C5]">
              <tr>
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Guest</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Dates</th>
                <th className="py-3 px-4 font-semibold">Assigned Room</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#33271D]">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                    {b.booking_reference}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold">{b.guest_name}</div>
                    <div className="text-[10px] text-[#786A5B]">{b.guest_phone}</div>
                  </td>
                  <td className="py-3.5 px-4">{b.category_name}</td>
                  <td className="py-3.5 px-4">
                    {b.check_in_date} to {b.check_out_date}
                  </td>
                  <td className="py-3.5 px-4">
                    {b.assigned_room_number ? (
                      <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E6D9C5] font-bold text-[#33271D]">
                        Room {b.assigned_room_number}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#E65100] italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    ₹ {b.total_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.status === 'checked_in'
                          ? 'bg-[#E8F5E9] text-[#2E7D32]'
                          : b.status === 'confirmed'
                          ? 'bg-[#E3F2FD] text-[#1565C0]'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
