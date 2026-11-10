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
import { PhysicalRoom, Booking, PaymentRecord } from '@/types';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';

export default function AdminDashboardPage() {
  const { t, translateStatus, formatCurrency, formatDate, isTelugu } = useAdminLanguage();

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

  // Financials
  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.total_amount, 0);

  const collections = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const recentBookings = bookings.slice(0, 5);

  const filterOptions = [
    { id: 'Today', label: t('common.today', 'Today') },
    { id: 'Last 7 Days', label: t('reports.last7Days', 'Last 7 Days') },
    { id: 'This Month', label: t('reports.thisMonth', 'This Month') },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Kadiri Hotel Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#8D672F] font-semibold mb-1">
              {isTelugu ? 'హోటల్ కార్యకలాపాల ప్రధాన కేంద్రం' : 'HOTEL OPERATIONS HQ'}
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected
                ? (isTelugu ? 'ప్రత్యక్ష సింక్రనైజేషన్ సక్రియం' : 'Real-Time Sync Active')
                : `${t('common.reconnecting', 'Sync')}: ${status}`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#33271D]">
            {t('dashboard.title', 'Operational Overview')}
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            {isTelugu
              ? `శ్రీ తాయి గ్రాండ్, కదిరి • స్థానిక సమయం: ${formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}`
              : `Live metrics for Sri Tayi Grand, Kadiri • Local Time: ${formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}`}
          </p>
        </div>

        {/* Quick Date Range Filter */}
        <div className="flex items-center gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilterPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterPeriod === opt.id
                  ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
                  : 'bg-white text-[#786A5B] hover:text-[#33271D] border border-[#E6D9C5]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={fetchDashboardData}
            className="p-1.5 rounded-lg bg-white border border-[#E6D9C5] text-[#786A5B] hover:bg-[#FAF7F2] cursor-pointer"
            title={t('common.refresh', 'Refresh')}
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
              {t('dashboard.occupancyRate', 'Occupancy Rate')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#33271D]">{occupancyRate}%</span>
            <span className="text-xs text-[#2E7D32] font-semibold">
              {occupiedRooms + reservedRooms} / {totalRooms} {isTelugu ? 'గదులు' : 'Rooms'}
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
              {t('frontDesk.currentInHouse', 'Checked-In Guests')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#1565C0] flex items-center justify-center">
              <ConciergeBell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#33271D]">{checkedInCount}</span>
            <span className="text-xs text-[#786A5B]">
              {isTelugu ? 'బసలో ఉన్న గదులు' : 'Rooms Occupied'}
            </span>
          </div>
          <p className="text-[11px] text-[#786A5B] mt-2">
            {confirmedCount} {isTelugu ? 'రావలసిన నిర్ధారిత అతిథులు' : 'upcoming confirmed arrivals today'}
          </p>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786A5B]">
              {t('dashboard.totalRevenue', 'Total Bookings Revenue')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#2E7D32] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#33271D]">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <p className="text-[11px] text-[#2E7D32] mt-2 font-semibold">
            {formatCurrency(collections)} {isTelugu ? 'లెడ్జర్‌లో జమ చేయబడింది' : 'settled in ledger'}
          </p>
        </div>

        {/* Card 4: Housekeeping Status */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786A5B]">
              {t('rooms.available', 'Room Inventory Ready')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#E65100] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#33271D]">{availableRooms}</span>
            <span className="text-xs text-[#786A5B]">
              {isTelugu ? 'సిద్ధంగా ఉన్నాయి' : 'Clean & Available'}
            </span>
          </div>
          <p className="text-[11px] text-[#786A5B] mt-2">
            {cleaningRooms} {isTelugu ? 'శుభ్రతలో ఉన్నాయి' : 'in cleaning'} • {maintenanceRooms} {isTelugu ? 'మరమ్మతులో ఉన్నాయి' : 'in maintenance'}
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
                {t('rooms.title', 'Physical Room Operational Matrix')}
              </h3>
              <p className="text-xs text-[#786A5B]">
                {isTelugu
                  ? 'అంతస్తులు 1, 2 & 3 లోని మొత్తం 24 అతిథి గదుల ప్రత్యక్ష స్థితి'
                  : 'Live state of all 24 guest rooms across Floors 1, 2 & 3'}
              </p>
            </div>
            <NextLink
              href="/admin/rooms/inventory"
              className="text-xs font-semibold text-[#D8AD56] hover:underline"
            >
              {isTelugu ? 'పూర్తి బోర్డు చూడండి →' : 'View Full Board →'}
            </NextLink>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {rooms.slice(0, 24).map((r) => {
              const status = r.operational_status || 'available';
              const isOccupied = status === 'occupied';
              const isAvailable = status === 'available';
              const isCleaning = status === 'cleaning';
              const isReserved = status === 'reserved';

              return (
                <div
                  key={r.id || r.room_number}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isOccupied
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : isAvailable
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : isCleaning
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : isReserved
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="font-mono text-sm font-bold">{r.room_number}</div>
                  <div className="text-[10px] mt-1 font-semibold truncate capitalize">
                    {translateStatus(status)}
                  </div>
                  <div className="text-[9px] text-[#786A5B] opacity-80 mt-0.5 truncate">
                    {r.category_name || (isTelugu ? 'గది' : 'Room')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Front Desk Quick Action Shortcuts */}
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#E6D9C5] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#33271D] mb-1">
              {t('dashboard.quickActions', 'Front Desk Shortcuts')}
            </h3>
            <p className="text-xs text-[#786A5B] mb-5">
              {isTelugu ? 'హోటల్ దైనందిన కార్యకలాపాలకు తక్షణ ప్రాప్యత' : 'Rapid access to everyday hotel desk operations'}
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
                    <span className="block font-bold">{t('frontDesk.title', 'Walk-In & Check-In Desk')}</span>
                    <span className="text-[10px] text-[#786A5B]">{isTelugu ? 'కీకార్డ్ ఎన్‌కోడింగ్ & ఫోలియోలు' : 'Keycard encoding & folios'}</span>
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
                    <span className="block font-bold">{t('payments.title', 'Financial Ledger & Expenses')}</span>
                    <span className="text-[10px] text-[#786A5B]">{isTelugu ? 'వసూళ్లు & ఖర్చులు' : 'Collections & disbursements'}</span>
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
                    <span className="block font-bold">{t('reports.title', 'Night Audit & Daily Closing')}</span>
                    <span className="text-[10px] text-[#786A5B]">{isTelugu ? 'షిఫ్ట్ ముగింపు & లెడ్జర్ లాక్' : 'Shift reconcile & lock day'}</span>
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
                    <span className="block font-bold">{t('housekeeping.title', 'Housekeeping Turnover')}</span>
                    <span className="text-[10px] text-[#786A5B]">{isTelugu ? 'పారిశుధ్య నిర్వహణ' : 'Sanitization tracking'}</span>
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
              {t('dashboard.recentActivity', 'Recent Booking Activity')}
            </h3>
            <p className="text-xs text-[#786A5B]">{isTelugu ? 'ఇటీవలి అతిథి రిజర్వేషన్లు మరియు రాకలు' : 'Latest guest reservations and arrivals'}</p>
          </div>
          <NextLink
            href="/admin/bookings"
            className="text-xs font-semibold text-[#D8AD56] hover:underline"
          >
            {isTelugu ? `మొత్తం బుకింగ్స్ (${bookings.length}) →` : `All Bookings (${bookings.length}) →`}
          </NextLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786A5B] uppercase tracking-wider text-[10px] border-b border-[#E6D9C5]">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('bookings.reference', 'Reference')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.guestName', 'Guest')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.roomCategory', 'Category')}</th>
                <th className="py-3 px-4 font-semibold">{isTelugu ? 'తేదీలు' : 'Dates'}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.roomNumber', 'Assigned Room')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.totalAmount', 'Amount')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.bookingStatus', 'Status')}</th>
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
                    {formatDate(b.check_in_date)} {isTelugu ? 'నుండి' : 'to'} {formatDate(b.check_out_date)}
                  </td>
                  <td className="py-3.5 px-4">
                    {b.assigned_room_number ? (
                      <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E6D9C5] font-bold text-[#33271D]">
                        {isTelugu ? `గది ${b.assigned_room_number}` : `Room ${b.assigned_room_number}`}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#E65100] italic">
                        {isTelugu ? 'కేటాయించబడలేదు' : 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {formatCurrency(b.total_amount)}
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
                      {translateStatus(b.status)}
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
