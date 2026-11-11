'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  BedDouble,
  Users,
  Building2,
  Globe,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'ytd';

interface AnalyticsData {
  range: TimeRange;
  kpis: {
    totalRevenue: number;
    occupancyRate: number;
    revPAR: number;
    adr: number;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    maintenanceRooms: number;
  };
  channelBreakdown: Array<{
    name: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  categoryYield: Array<{
    category: string;
    slug: string;
    basePrice: number;
    bookings: number;
    revenue: number;
    occupancy: number;
  }>;
  monthlyTrajectory: Array<{
    month: string;
    revenue: number;
    occupancy: number;
    bookings: number;
  }>;
}

export default function AnalyticsAdminPage() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async (range: TimeRange = selectedRange) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/reports?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnalytics(data);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchAnalytics(selectedRange);
  }, [selectedRange, fetchAnalytics]);

  // Real-time synchronization
  const { isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'booking_created' ||
        event.eventType === 'booking_updated' ||
        event.eventType === 'room_status_changed' ||
        event.eventType === 'payment_recorded'
      ) {
        fetchAnalytics(selectedRange);
      }
    },
  });

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const url = `/api/admin/reports?range=${selectedRange}&export=csv`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sri-tayi-grand-analytics-${selectedRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const rangeLabels: { key: TimeRange; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'ytd', label: 'Year-to-Date' },
  ];

  const maxMonthlyRevenue = analytics?.monthlyTrajectory
    ? Math.max(...analytics.monthlyTrajectory.map((m) => m.revenue), 1)
    : 1;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#33271D] p-4 md:p-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E6D9C5] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#43001F] text-[#D8AD56] tracking-wider uppercase border border-[#D8AD56]/40">
              Executive Command Center
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#786A5B]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isConnected ? 'Live Telemetry' : 'Sync Standby'}</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#43001F] tracking-tight">
            Hospitality Revenue & Business Intelligence
          </h1>
          <p className="text-sm text-[#786A5B] mt-1">
            Sri Tayi Grand, Kadiri • Real-time RevPAR yield, ADR metrics, channel distribution & room analytics
          </p>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Timeframe Tabs */}
          <div className="inline-flex p-1 bg-white rounded-xl border border-[#E6D9C5] shadow-sm">
            {rangeLabels.map(({ key, label }) => {
              const isActive = selectedRange === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedRange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#43001F] text-[#D8AD56] shadow-sm'
                      : 'text-[#786A5B] hover:text-[#43001F] hover:bg-[#F8F3E9]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(selectedRange)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-[#E6D9C5] text-[#786A5B] hover:text-[#43001F] hover:border-[#D8AD56] transition-all shadow-sm disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D8AD56]' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-[#D8AD56] font-semibold text-xs tracking-wide shadow-md transition-all border border-[#D8AD56]/40 hover:shadow-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating CSV...' : 'Export CSV Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Period Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D8AD56]/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-[#786A5B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-lg bg-[#F8F3E9] text-[#43001F]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-[#43001F]">
            ₹{analytics?.kpis.totalRevenue.toLocaleString('en-IN') || '0'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Period gross hospitality yield</span>
          </div>
        </div>

        {/* RevPAR */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#43001F]/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-[#786A5B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RevPAR</span>
            <div className="p-2 rounded-lg bg-[#F8F3E9] text-[#D8AD56]">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-[#43001F]">
            ₹{analytics?.kpis.revPAR.toLocaleString('en-IN') || '0'}
          </div>
          <p className="text-xs text-[#786A5B] mt-2">Revenue per available room night</p>
        </div>

        {/* ADR */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#786A5B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">ADR (Daily Rate)</span>
            <div className="p-2 rounded-lg bg-[#F8F3E9] text-[#43001F]">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-[#43001F]">
            ₹{analytics?.kpis.adr.toLocaleString('en-IN') || '0'}
          </div>
          <p className="text-xs text-[#786A5B] mt-2">Average realized price per occupied night</p>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#786A5B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Occupancy Rate</span>
            <div className="p-2 rounded-lg bg-[#F8F3E9] text-emerald-700">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-[#43001F]">
            {analytics?.kpis.occupancyRate !== undefined ? `${analytics.kpis.occupancyRate}%` : '0%'}
          </div>
          <div className="w-full bg-[#E6D9C5]/50 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#43001F] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(analytics?.kpis.occupancyRate || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Room Status Split */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#786A5B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rooms Inventory</span>
            <span className="text-xs font-bold text-[#43001F]">
              {analytics?.kpis.totalRooms ?? '—'} Total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 pt-1 border-t border-[#E6D9C5]/50 text-center">
            <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
              <div className="text-sm font-bold text-emerald-800">
                {analytics?.kpis.availableRooms ?? '—'}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold uppercase">Clean</div>
            </div>
            <div className="bg-[#43001F]/5 rounded-lg p-1.5 border border-[#43001F]/20">
              <div className="text-sm font-bold text-[#43001F]">
                {analytics?.kpis.occupiedRooms ?? '—'}
              </div>
              <div className="text-[10px] text-[#43001F]/80 font-semibold uppercase">Occupied</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200">
              <div className="text-sm font-bold text-amber-800">
                {analytics?.kpis.maintenanceRooms ?? '—'}
              </div>
              <div className="text-[10px] text-amber-600 font-semibold uppercase">OOO / Mnt</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Distribution Channels & Monthly Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Distribution Channel Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E6D9C5] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#43001F]">
                  Distribution Channel Mix
                </h3>
                <p className="text-xs text-[#786A5B]">Direct walk-ins vs OTA partners revenue</p>
              </div>
              <div className="p-2 rounded-xl bg-[#F8F3E9] text-[#D8AD56]">
                <Globe className="w-5 h-5" />
              </div>
            </div>

            {/* Visual share bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 mb-6 shadow-inner">
              {analytics?.channelBreakdown.map((channel, index) => (
                <div
                  key={channel.name}
                  style={{ width: `${Math.max(0, Math.min(100, channel.percentage))}%` }}
                  className={['bg-[#43001F] h-full', 'bg-[#D8AD56] h-full', 'bg-[#786A5B] h-full'][index % 3]}
                  title={`${channel.name} (${channel.percentage}%)`}
                />
              ))}
            </div>

            {/* Channel Cards */}
            <div className="space-y-3">
              {analytics?.channelBreakdown.map((channel, idx) => {
                const colorDots = [
                  'bg-[#43001F]',
                  'bg-[#D8AD56]',
                  'bg-[#786A5B]',
                ];
                return (
                  <div
                    key={channel.name}
                    className="p-3.5 rounded-xl border border-[#E6D9C5] bg-[#FDFBF7] flex items-center justify-between hover:bg-[#F8F3E9] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${colorDots[idx % colorDots.length]}`} />
                      <div>
                        <h4 className="text-xs font-bold text-[#33271D]">{channel.name}</h4>
                        <span className="text-[11px] text-[#786A5B]">
                          {channel.count} bookings registered
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#43001F]">
                        ₹{channel.revenue.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] font-semibold text-[#D8AD56] bg-[#43001F] px-1.5 py-0.5 rounded">
                        {channel.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6D9C5] text-xs text-[#786A5B] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D8AD56]" />
            <span>
              <strong>Strategic Note:</strong> Direct Desk bookings preserve 100% margin with zero OTA commission deduction.
            </span>
          </div>
        </div>

        {/* Monthly Revenue & Occupancy Trajectory (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#E6D9C5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#43001F]">
                Revenue & Occupancy Trajectory
              </h3>
              <p className="text-xs text-[#786A5B]">
                Last 6 months consecutive performance & seasonal trend analysis
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#F8F3E9] text-[#43001F]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="mt-6 pt-4 pb-2">
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-52 border-b border-[#E6D9C5] pb-2">
              {analytics?.monthlyTrajectory.map((item) => {
                const heightPercent = Math.max(15, Math.round((item.revenue / maxMonthlyRevenue) * 100));
                return (
                  <div key={item.month} className="flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#25150F] text-white text-[10px] p-2 rounded-lg pointer-events-none shadow-lg text-center whitespace-nowrap mb-1">
                      <p className="font-bold text-[#D8AD56]">₹{item.revenue.toLocaleString('en-IN')}</p>
                      <p>{item.occupancy}% Occupancy</p>
                      <p>{item.bookings} Stays</p>
                    </div>

                    {/* Occupancy chip */}
                    <span className="text-[10px] font-bold text-[#786A5B] bg-[#F8F3E9] px-1.5 py-0.5 rounded">
                      {item.occupancy}%
                    </span>

                    {/* Bar Pillar */}
                    <div className="w-full max-w-[42px] bg-[#E6D9C5]/40 rounded-t-xl overflow-hidden flex flex-col justify-end h-36">
                      <div
                        className="w-full bg-gradient-to-t from-[#43001F] to-[#B18A4A] rounded-t-xl transition-all duration-500 group-hover:from-[#2E0015] group-hover:to-[#D8AD56]"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Month Label */}
                    <span className="text-xs font-bold text-[#33271D]">{item.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#786A5B] mt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-[#43001F] to-[#B18A4A]" />
                <span>Monthly Realized Revenue (INR)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E6D9C5]" />
                <span>Occupancy % Badge</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Category Yield Performance Table */}
      <div className="bg-white rounded-2xl border border-[#E6D9C5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E6D9C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#43001F]">
              Room Category Yield & Inventory Performance
            </h3>
            <p className="text-xs text-[#786A5B]">
              Yield comparison across Deluxe AC, Four Bed, Executive & Royal Suites
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F3E9] text-[#43001F] border border-[#D8AD56]/40">
            4 Signature Categories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] text-[#786A5B] uppercase font-semibold border-b border-[#E6D9C5]">
              <tr>
                <th className="py-3.5 px-6">Room Category</th>
                <th className="py-3.5 px-6">Base Rack Rate</th>
                <th className="py-3.5 px-6 text-center">Period Bookings</th>
                <th className="py-3.5 px-6">Total Category Revenue</th>
                <th className="py-3.5 px-6">Capacity Utilization</th>
                <th className="py-3.5 px-6 text-right">Yield Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D9C5]/50">
              {analytics?.categoryYield.map((row) => (
                <tr key={row.category} className="hover:bg-[#FDFBF7] transition-colors">
                  <td className="py-4 px-6 font-bold text-[#43001F] text-sm">
                    {row.category}
                  </td>
                  <td className="py-4 px-6 font-mono text-[#33271D]">
                    ₹{row.basePrice.toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] text-[#786A5B]">/ night</span>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-[#33271D]">
                    {row.bookings} stays
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-[#43001F]">
                    ₹{row.revenue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-[#E6D9C5]/50 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#43001F] h-full rounded-full"
                          style={{ width: `${Math.min(row.occupancy, 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-[#786A5B]">{row.occupancy}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        row.occupancy >= 70
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : row.occupancy >= 50
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-stone-100 text-stone-700 border border-stone-300'
                      }`}
                    >
                      {row.occupancy >= 70 ? 'High Yield' : row.occupancy >= 50 ? 'Optimal' : 'Growing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#786A5B] pt-4 border-t border-[#E6D9C5]">
        <span>Sri Tayi Grand Hotel Management Software • Analytics Engine</span>
        <span>
          Last updated: {lastRefreshed?.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? 'Awaiting data'}
        </span>
      </div>
    </div>
  );
}
