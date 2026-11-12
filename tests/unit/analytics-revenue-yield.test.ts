import { describe, it, expect } from 'vitest';
import { repo } from '@/lib/db/repository';
import { Booking } from '@/types';

describe('Analytics, Revenue Yield & Business Intelligence', () => {
  it('accurately computes zero baseline when no bookings exist in period', () => {
    const originalBookings = (repo as any).bookings;
    try {
      (repo as any).bookings = [];
      const analytics = repo.getHospitalityAnalytics('30d');

      expect(analytics.kpis.totalRevenue).toBe(0);
      expect(analytics.kpis.adr).toBe(0);
      expect(analytics.kpis.revPAR).toBe(0);
      expect(analytics.kpis.totalRooms).toBe(24);

      // Channel breakdown must have 0 counts and 0 revenues
      expect(analytics.channelBreakdown).toHaveLength(3);
      for (const ch of analytics.channelBreakdown) {
        expect(ch.count).toBe(0);
        expect(ch.revenue).toBe(0);
        expect(ch.percentage).toBe(0);
      }

      // Category yield must have 0 bookings and 0 revenues
      expect(analytics.categoryYield.length).toBeGreaterThanOrEqual(4);
      for (const cat of analytics.categoryYield) {
        expect(cat.bookings).toBe(0);
        expect(cat.revenue).toBe(0);
        expect(cat.occupancy).toBe(0);
      }

      // Monthly trajectory must have 6 months with 0 revenue
      expect(analytics.monthlyTrajectory).toHaveLength(6);
      for (const m of analytics.monthlyTrajectory) {
        expect(m.revenue).toBe(0);
        expect(m.bookings).toBe(0);
        expect(m.occupancy).toBe(0);
      }
    } finally {
      (repo as any).bookings = originalBookings;
    }
  });

  it('dynamically attributes revenue, ADR, channel mix, and category yield for live bookings', () => {
    const originalBookings = (repo as any).bookings;
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const testBooking: Booking = {
      id: 'bk-test-analytics-01',
      booking_reference: 'TEST-STG-ANALYTICS',
      guest_id: 'gst-analytics-01',
      guest_name: 'Dr. K. Srinivas',
      guest_phone: '9849011223',
      check_in_date: todayStr,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'cash',
      subtotal_amount: 2500,
      tax_amount: 300,
      total_amount: 2800,
      paid_amount: 2800,
      booking_source: 'front_desk_manual',
      created_at: new Date().toISOString(),
    };

    try {
      (repo as any).bookings = [testBooking];
      const analytics = repo.getHospitalityAnalytics('30d');

      // KPIs
      expect(analytics.kpis.totalRevenue).toBe(2800);
      expect(analytics.kpis.adr).toBe(2500); // 2500 room revenue / 1 night
      expect(analytics.kpis.revPAR).toBeGreaterThan(0);

      // Channel Breakdown
      const directChannel = analytics.channelBreakdown.find(
        (c) => c.name === 'Front Desk Direct & Walk-In'
      );
      expect(directChannel).toBeDefined();
      expect(directChannel?.count).toBe(1);
      expect(directChannel?.revenue).toBe(2800);
      expect(directChannel?.percentage).toBe(100);

      // Category Yield
      const doubleCategory = analytics.categoryYield.find(
        (c) => c.slug === 'double-room' || c.category === 'Double Room'
      );
      expect(doubleCategory).toBeDefined();
      expect(doubleCategory?.bookings).toBe(1);
      expect(doubleCategory?.revenue).toBe(2800);

      // Monthly Trajectory: current month has 1 booking and 2800 revenue
      const currentMonth = analytics.monthlyTrajectory[analytics.monthlyTrajectory.length - 1];
      expect(currentMonth.bookings).toBe(1);
      expect(currentMonth.revenue).toBe(2800);
    } finally {
      (repo as any).bookings = originalBookings;
    }
  });
});
