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
import { useRealtimeSync, getAdminHeaders } from '@/lib/realtime-client';

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
      const res = await fetch(`/api/admin/reports?range=${range}`, {
        headers: getAdminHeaders(),
      });
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E6D9C5]/60 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#2A1D13] tracking-tight">
            Analytics & Performance
          </h1>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Timeframe Tabs */}
          <div className="inline-flex p-1 bg-white rounded-xl border border-[#E6D9C5] shadow-xs">
            {rangeLabels.map(({ key, label }) => {
              const isActive = selectedRange === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedRange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2A1D13] text-[#EAD8B8] shadow-xs'
                      : 'text-[#786A5B] hover:text-[#2A1D13] hover:bg-[#FAF8F5]'
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
            className="p-2.5 rounded-xl bg-white border border-[#E6D9C5] text-[#786A5B] hover:text-[#2A1D13] hover:border-[#8D672F] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#8D672F]' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] font-semibold text-xs tracking-wide shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Period Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#786A5B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#8D672F]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-serif font-bold text-[#2A1D13]">
            ₹{analytics?.kpis.totalRevenue.toLocaleString('en-IN') || '0'}
          </div>
        </div>

        {/* RevPAR */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#786A5B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">RevPAR</span>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#8D672F]">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-serif font-bold text-[#2A1D13]">
            ₹{analytics?.kpis.revPAR.toLocaleString('en-IN') || '0'}
          </div>
        </div>

        {/* ADR */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#786A5B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">ADR</span>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#8D672F]">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-serif font-bold text-[#2A1D13]">
            ₹{analytics?.kpis.adr.toLocaleString('en-IN') || '0'}
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#786A5B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Occupancy</span>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-emerald-700">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-serif font-bold text-[#2A1D13]">
            {analytics?.kpis.occupancyRate !== undefined ? `${analytics.kpis.occupancyRate}%` : '0%'}
          </div>
          <div className="w-full bg-[#E6D9C5]/50 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[#2A1D13] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(analytics?.kpis.occupancyRate || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Room Status Split */}
        <div className="bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#786A5B] mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Rooms</span>
            <span className="text-xs font-bold text-[#2A1D13]">
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
            <div className="bg-[#FAF8F5] rounded-lg p-1.5 border border-[#E6D9C5]">
              <div className="text-sm font-bold text-[#2A1D13]">
                {analytics?.kpis.occupiedRooms ?? '—'}
              </div>
              <div className="text-[10px] text-[#786A5B] font-semibold uppercase">Occupied</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200">
              <div className="text-sm font-bold text-amber-800">
                {analytics?.kpis.maintenanceRooms ?? '—'}
              </div>
              <div className="text-[10px] text-amber-600 font-semibold uppercase">OOO</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Distribution Channels & Monthly Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribution Channel Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#2A1D13]">
                  Channel Mix
                </h3>
              </div>
              <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#8D672F]">
                <Globe className="w-4 h-4" />
              </div>
            </div>

            {/* Visual share bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#FAF8F5] mb-5">
              {analytics?.channelBreakdown && analytics.channelBreakdown.some((c) => c.percentage > 0) ? (
                analytics.channelBreakdown.map((channel, index) => (
                  <div
                    key={channel.name}
                    style={{ width: `${Math.max(0, Math.min(100, channel.percentage))}%` }}
                    className={['bg-[#2A1D13] h-full', 'bg-[#8D672F] h-full', 'bg-[#C5A880] h-full'][index % 3]}
                    title={`${channel.name} (${channel.percentage}%)`}
                  />
                ))
              ) : (
                <div className="w-full h-full bg-[#E6D9C5]/40" title="Awaiting transactions" />
              )}
            </div>

            {/* Channel Cards */}
            <div className="space-y-2.5">
              {analytics?.channelBreakdown.map((channel, idx) => {
                const colorDots = [
                  'bg-[#2A1D13]',
                  'bg-[#8D672F]',
                  'bg-[#C5A880]',
                ];
                return (
                  <div
                    key={channel.name}
                    className="p-3 rounded-xl border border-[#E6D9C5]/70 bg-[#FAF8F5]/60 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorDots[idx % colorDots.length]}`} />
                      <div>
                        <h4 className="text-xs font-bold text-[#2A1D13]">{channel.name}</h4>
                        <span className="text-[11px] text-[#786A5B]">
                          {channel.count} bookings
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#2A1D13]">
                        ₹{channel.revenue.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-semibold text-[#EAD8B8] bg-[#2A1D13] px-1.5 py-0.5 rounded">
                        {channel.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Monthly Revenue & Occupancy Trajectory (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#2A1D13]">
                Monthly Trajectory
              </h3>
            </div>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#8D672F]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="mt-4 pt-2 pb-2">
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-[#E6D9C5]/60 pb-2">
              {analytics?.monthlyTrajectory.map((item) => {
                const heightPercent =
                  maxMonthlyRevenue > 0 && item.revenue > 0
                    ? Math.max(8, Math.round((item.revenue / maxMonthlyRevenue) * 100))
                    : 0;
                return (
                  <div key={item.month} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#2A1D13] text-white text-[10px] p-2 rounded-lg pointer-events-none shadow-lg text-center whitespace-nowrap mb-1">
                      <p className="font-bold text-[#EAD8B8]">₹{item.revenue.toLocaleString('en-IN')}</p>
                      <p>{item.occupancy}% Occupancy</p>
                      <p>{item.bookings} Stays</p>
                    </div>

                    {/* Occupancy chip */}
                    <span className="text-[10px] font-bold text-[#786A5B] bg-[#FAF8F5] px-1.5 py-0.5 rounded">
                      {item.occupancy}%
                    </span>

                    {/* Bar Pillar */}
                    <div className="w-full max-w-[40px] bg-[#E6D9C5]/30 rounded-t-lg overflow-hidden flex flex-col justify-end h-32">
                      <div
                        className="w-full bg-[#2A1D13] hover:bg-[#3D2B1D] rounded-t-lg transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Month Label */}
                    <span className="text-xs font-semibold text-[#2A1D13]">{item.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#786A5B] mt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#2A1D13]" />
                <span>Monthly Revenue (₹)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E6D9C5]" />
                <span>Occupancy %</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Category Yield Performance Table */}
      <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] overflow-hidden">
        <div className="p-5 border-b border-[#E6D9C5]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif font-bold text-base text-[#2A1D13]">
              Room Yield
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#786A5B] uppercase tracking-wider font-semibold border-b border-[#E6D9C5]/60">
              <tr>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Base Rate</th>
                <th className="py-3 px-5 text-center">Bookings</th>
                <th className="py-3 px-5">Revenue</th>
                <th className="py-3 px-5">Occupancy</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D9C5]/50">
              {analytics?.categoryYield.map((row) => (
                <tr key={row.category} className="hover:bg-[#FAF8F5]/60 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-[#2A1D13]">
                    {row.category}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-[#2A1D13]">
                    ₹{row.basePrice.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-[#2A1D13]">
                    {row.bookings}
                  </td>
                  <td className="py-3.5 px-5 font-mono font-bold text-[#2A1D13]">
                    ₹{row.revenue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#E6D9C5]/50 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2A1D13] h-full rounded-full"
                          style={{ width: `${Math.min(row.occupancy, 100)}%` }}
                        />
                      </div>
                      <span className="font-medium text-[#786A5B]">{row.occupancy}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.occupancy >= 70
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : row.occupancy >= 50
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : row.bookings > 0
                          ? 'bg-stone-50 text-stone-700 border border-stone-200'
                          : 'bg-stone-50 text-stone-400 border border-stone-200'
                      }`}
                    >
                      {row.occupancy >= 70 ? 'High Yield' : row.occupancy >= 50 ? 'Optimal' : row.bookings > 0 ? 'Growing' : 'Available'}
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
