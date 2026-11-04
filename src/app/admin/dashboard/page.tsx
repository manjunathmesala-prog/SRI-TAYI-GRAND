'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { repo } from '@/lib/db/repository';
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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [filterPeriod, setFilterPeriod] = useState('Today');

  const rooms = repo.getRooms();
  const bookings = repo.getBookings();
  const payments = repo.getPayments();
  const hallEnquiries = repo.getHallEnquiries();

  // Calculate Operational Metrics
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.operational_status === 'occupied').length;
  const reservedRooms = rooms.filter((r) => r.operational_status === 'reserved').length;
  const availableRooms = rooms.filter((r) => r.operational_status === 'available').length;
  const cleaningRooms = rooms.filter((r) => r.operational_status === 'cleaning').length;
  const maintenanceRooms = rooms.filter((r) => r.operational_status === 'maintenance').length;

  const occupancyRate = totalRooms > 0 ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) : 0;

  // Bookings breakdown
  const checkedInCount = bookings.filter((b) => b.status === 'checked_in').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingPaymentsCount = bookings.filter((b) => b.payment_status === 'pending' || b.payment_status === 'pay_at_hotel').length;

  // Financials
  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.total_amount, 0);

  const collections = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const newHallEnquiries = hallEnquiries.filter((e) => e.status === 'new').length;

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Kadiri Hotel Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            HOTEL OPERATIONS HQ
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5">
            Operational Overview
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Live metrics for Sri Tayi Grand, Kadiri · Local Time: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
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
                  : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Occupancy Rate */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
              Occupancy Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#241912]">{occupancyRate}%</span>
            <span className="text-xs text-[#2E7D32] font-semibold">{occupiedRooms} of {totalRooms} rooms</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#D8AD56] h-1.5 rounded-full" style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>

        {/* Card 2: Available Rooms */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
              Available Rooms
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#241912]">{availableRooms}</span>
            <span className="text-xs text-[#786B61]">Ready for check-in</span>
          </div>
          <div className="mt-2 text-[11px] text-[#786B61] flex items-center gap-2">
            <span>Cleaning: <strong className="text-[#241912]">{cleaningRooms}</strong></span>
            <span>·</span>
            <span>Maint: <strong className="text-[#241912]">{maintenanceRooms}</strong></span>
          </div>
        </div>

        {/* Card 3: Today's Arrivals & Stays */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
              Active & Arrivals
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center">
              <ConciergeBell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#241912]">{checkedInCount}</span>
            <span className="text-xs text-[#2E7D32] font-semibold">Active stays</span>
          </div>
          <div className="mt-2 text-[11px] text-[#786B61]">
            <span>Expected Arrivals Today: <strong className="text-[#241912]">{confirmedCount}</strong></span>
          </div>
        </div>

        {/* Card 4: Collections & Revenue */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">
              Collected Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#241912]">
              ₹ {collections.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#786B61]">
            <span>Pending collection: <strong>{pendingPaymentsCount} stays</strong></span>
          </div>
        </div>
      </div>

      {/* Operations Quick Action Bar */}
      <div className="bg-[#25150F] text-white rounded-2xl p-6 sm:p-7 shadow-luxury flex flex-col md:flex-row items-center justify-between gap-6 border border-[#D8AD56]/30">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            QUICK FRONT DESK SHORTCUT
          </div>
          <h3 className="font-serif text-xl font-bold text-white mt-1">
            Front Desk Guest Check-in & Room Assignment
          </h3>
          <p className="text-xs text-[#EFE3D6]/70 mt-1 max-w-xl">
            Assign physical rooms, encode RFID keycards, record check-in timestamps, and settle checkout folios instantly.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NextLink
            href="/admin/front-desk"
            className="px-5 py-2.5 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940] transition-colors shadow-md flex items-center gap-1.5"
          >
            <ConciergeBell className="w-4 h-4" />
            <span>Open Front Desk</span>
          </NextLink>
          <NextLink
            href="/admin/rooms/inventory"
            className="px-4 py-2.5 rounded-xl border border-white/20 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            Room Board
          </NextLink>
        </div>
      </div>

      {/* Two Column Layout: Room Status Distribution & Convention Hall Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 cols: Physical Rooms Operational Distribution */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#241912]">
                Room Inventory Operational Status
              </h3>
              <p className="text-xs text-[#786B61]">Real-time status across 18 physical rooms (Floors 1–3)</p>
            </div>
            <NextLink
              href="/admin/rooms/inventory"
              className="text-xs font-semibold text-[#D8AD56] hover:underline"
            >
              View Grid →
            </NextLink>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9]">
              <span className="text-[10px] uppercase font-semibold text-[#2E7D32] block">Available</span>
              <span className="text-2xl font-bold font-serif text-[#1B5E20]">{availableRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF3E0] border border-[#FFE0B2]">
              <span className="text-[10px] uppercase font-semibold text-[#E65100] block">Occupied</span>
              <span className="text-2xl font-bold font-serif text-[#BF360C]">{occupiedRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#E3F2FD] border border-[#BBDEFB]">
              <span className="text-[10px] uppercase font-semibold text-[#1565C0] block">Reserved</span>
              <span className="text-2xl font-bold font-serif text-[#0D47A1]">{reservedRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F3E5F5] border border-[#E1BEE7]">
              <span className="text-[10px] uppercase font-semibold text-[#6A1B9A] block">Cleaning</span>
              <span className="text-2xl font-bold font-serif text-[#4A148C]">{cleaningRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FFEBEE] border border-[#FFCDD2]">
              <span className="text-[10px] uppercase font-semibold text-[#C62828] block">Maintenance</span>
              <span className="text-2xl font-bold font-serif text-[#B71C1C]">{maintenanceRooms}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#ECEFF1] border border-[#CFD8DC]">
              <span className="text-[10px] uppercase font-semibold text-[#455A64] block">Total Rooms</span>
              <span className="text-2xl font-bold font-serif text-[#263238]">{totalRooms}</span>
            </div>
          </div>

          {/* Quick Housekeeping Alert */}
          {cleaningRooms > 0 && (
            <div className="p-3.5 rounded-xl bg-[#FFF9C4] border border-[#FFF59D] text-[#F57F17] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span><strong>{cleaningRooms} rooms</strong> currently require housekeeping cleaning & inspection.</span>
              </div>
              <NextLink
                href="/admin/housekeeping"
                className="font-bold underline text-xs"
              >
                Assign Staff
              </NextLink>
            </div>
          )}
        </div>

        {/* Right 5 cols: Convention Hall Enquiries */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  Convention Hall Pipeline
                </h3>
                <p className="text-xs text-[#786B61]">Event dates & quotations</p>
              </div>
              <NextLink
                href="/admin/convention-hall"
                className="text-xs font-semibold text-[#D8AD56] hover:underline"
              >
                Manage All →
              </NextLink>
            </div>

            <div className="space-y-3">
              {hallEnquiries.slice(0, 3).map((enq) => (
                <div
                  key={enq.id}
                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#241912]">{enq.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D8AD56]/20 text-[#382216]">
                      {enq.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#786B61] flex items-center justify-between">
                    <span>{enq.event_type} · {enq.expected_guests} guests</span>
                    <span className="font-medium text-[#241912]">{enq.event_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#EFE3D6]">
            <NextLink
              href="/admin/convention-hall"
              className="w-full py-2.5 px-4 rounded-xl border border-[#382216] text-[#382216] text-xs font-semibold hover:bg-[#382216] hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View All Convention Hall Leads</span>
              <ArrowUpRight className="w-4 h-4" />
            </NextLink>
          </div>
        </div>
      </div>

      {/* Recent Bookings Activity Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#241912]">
              Recent Booking Activity
            </h3>
            <p className="text-xs text-[#786B61]">Latest guest reservations and arrivals</p>
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
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
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
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                    {b.booking_reference}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold">{b.guest_name}</div>
                    <div className="text-[10px] text-[#786B61]">{b.guest_phone}</div>
                  </td>
                  <td className="py-3.5 px-4">{b.category_name}</td>
                  <td className="py-3.5 px-4">
                    {b.check_in_date} to {b.check_out_date}
                  </td>
                  <td className="py-3.5 px-4">
                    {b.assigned_room_number ? (
                      <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#EFE3D6] font-bold text-[#241912]">
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
