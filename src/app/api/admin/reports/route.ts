import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function sanitizeCsvValue(val: unknown): string {
  const str = String(val ?? '');
  // Prefix dangerous spreadsheet formula triggers with a single quote
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  const safeStr = formulaTriggers.includes(str.charAt(0)) ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized: Staff session required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') || '30d';
    const isExportCsv = searchParams.get('export') === 'csv';

    const validRanges = ['today', '7d', '30d', '90d', 'ytd'] as const;
    const range = validRanges.includes(rangeParam as any)
      ? (rangeParam as 'today' | '7d' | '30d' | '90d' | 'ytd')
      : '30d';

    await repo.ensureAllLoaded();
    const analytics = repo.getHospitalityAnalytics(range);

    if (isExportCsv) {
      // Build CSV document
      const rows: string[] = [];

      rows.push('SRI TAYI GRAND - EXECUTIVE HOSPITALITY REVENUE & BUSINESS INTELLIGENCE REPORT');
      rows.push(`Generated: ${new Date().toLocaleString('en-IN')}`);
      rows.push(`Timeframe: ${range.toUpperCase()}`);
      rows.push('');

      // KPI Section
      rows.push('KEY PERFORMANCE INDICATORS (KPIs)');
      rows.push('Metric,Value');
      rows.push(`Total Period Revenue,INR ${analytics.kpis.totalRevenue.toLocaleString('en-IN')}`);
      rows.push(`RevPAR (Revenue Per Available Room),INR ${analytics.kpis.revPAR.toLocaleString('en-IN')}`);
      rows.push(`ADR (Average Daily Rate),INR ${analytics.kpis.adr.toLocaleString('en-IN')}`);
      rows.push(`Occupancy Rate,${analytics.kpis.occupancyRate}%`);
      rows.push(`Total Room Inventory,${analytics.kpis.totalRooms}`);
      rows.push(`Currently Occupied Rooms,${analytics.kpis.occupiedRooms}`);
      rows.push(`Available Clean Rooms,${analytics.kpis.availableRooms}`);
      rows.push(`Maintenance / OOO Rooms,${analytics.kpis.maintenanceRooms}`);
      rows.push('');

      // Distribution Channel Breakdown
      rows.push('DISTRIBUTION CHANNEL BREAKDOWN');
      rows.push('Channel Name,Bookings Count,Revenue (INR),Share (%)');
      for (const ch of analytics.channelBreakdown) {
        rows.push(`${sanitizeCsvValue(ch.name)},${ch.count},${ch.revenue},${ch.percentage}%`);
      }
      rows.push('');

      // Category Yield Performance
      rows.push('ROOM CATEGORY YIELD PERFORMANCE');
      rows.push('Category,Base Price (INR),Bookings Count,Revenue (INR),Est. Occupancy (%)');
      for (const cat of analytics.categoryYield) {
        rows.push(`${sanitizeCsvValue(cat.category)},${cat.basePrice},${cat.bookings},${cat.revenue},${cat.occupancy}%`);
      }
      rows.push('');

      // Monthly Trajectory
      rows.push('MONTHLY PERFORMANCE TRAJECTORY (LAST 6 MONTHS)');
      rows.push('Month,Revenue (INR),Occupancy (%),Bookings');
      for (const m of analytics.monthlyTrajectory) {
        rows.push(`${sanitizeCsvValue(m.month)},${m.revenue},${m.occupancy}%,${m.bookings}`);
      }

      const csvContent = rows.join('\r\n');
      const filename = `sri-tayi-grand-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json({
      success: true,
      range: analytics.range,
      kpis: analytics.kpis,
      channelBreakdown: analytics.channelBreakdown,
      categoryYield: analytics.categoryYield,
      monthlyTrajectory: analytics.monthlyTrajectory,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error fetching hospitality analytics:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate analytics report' },
      { status: 500 }
    );
  }
}
