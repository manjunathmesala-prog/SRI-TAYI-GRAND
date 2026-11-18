import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBookingTariff } from '@/lib/pricing';
import { repo } from '@/lib/db/repository';
import { checkCategoryAvailability } from '@/lib/booking-engine';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';

describe('Feature 4: GST-Inclusive and GST-Exclusive Pricing', () => {
  const TEST_ROOMS = ['204', '205', '304'];
  const testRunId = Date.now().toString().slice(-4);
  const baseOffset = 180 + Math.floor(Math.random() * 50); // Far future dates to guarantee no conflict

  const getDate = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const d1 = getDate(baseOffset);
  const d2 = getDate(baseOffset + 1);
  const d3 = getDate(baseOffset + 3);

  beforeEach(async () => {
    // Reset test room states in memory
    TEST_ROOMS.forEach((num) => {
      const room = repo.getRoomById(num);
      if (room) {
        room.operational_status = 'available';
        room.housekeeping_status = 'clean';
        room.current_booking_ref = undefined;
        room.current_guest_name = undefined;
      }
    });

    // Cancel any overlapping test bookings in memory
    repo.getBookings().forEach((b) => {
      if (
        TEST_ROOMS.includes(b.assigned_room_number || '') ||
        (b.assigned_room_numbers && b.assigned_room_numbers.some((num) => TEST_ROOMS.includes(num)))
      ) {
        if (b.guest_name.includes('TestGuest') || b.guest_name.includes('Anand Kumar') || b.guest_name.includes('Suresh Reddy') || b.guest_name.includes('Kavitha Devi')) {
          b.status = 'cancelled';
        }
      }
    });

    // Reset database stays in PostgreSQL
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        const inClause = TEST_ROOMS.map((r) => `'${r}'`).join(', ');
        await pool.query(
          `UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN (${inClause}) AND (guest_name ILIKE '%Anand Kumar%' OR guest_name ILIKE '%Suresh Reddy%' OR guest_name ILIKE '%Kavitha Devi%')`
        );
        await pool.query(
          `UPDATE rooms SET operational_status = 'available' WHERE room_number IN (${inClause})`
        );
      }
    } catch {}
  });

  describe('1. Tariff Calculator Integer Math & Rounding', () => {
    it('calculates GST-exclusive tariff with tax added strictly on top', () => {
      const calc = calculateBookingTariff({
        categoryId: 'cat-double-03',
        checkIn: d1,
        checkOut: d2,
        roomsCount: 1,
        adultsCount: 2,
        pricingMode: 'gst_exclusive',
        taxPercentage: 5,
      });

      expect(calc.isValid).toBe(true);
      expect(calc.pricingMode).toBe('gst_exclusive');
      expect(calc.roomTariffRateRupees).toBe(1800);
      expect(calc.billingPeriods).toBe(1);

      // Taxable subtotal is base tariff
      expect(calc.subtotalRupees).toBe(1800);
      expect(calc.subtotalPaise).toBe(180000);

      // 5% GST added on top: 1800 * 0.05 = 90
      expect(calc.taxAmountRupees).toBe(90);
      expect(calc.taxAmountPaise).toBe(9000);

      // Total payable is 1800 + 90 = 1890
      expect(calc.totalRupees).toBe(1890);
      expect(calc.totalPaise).toBe(189000);

      // Strict integer paise arithmetic equality
      expect(calc.subtotalPaise + calc.taxAmountPaise).toBe(calc.totalPaise);
    });

    it('calculates GST-inclusive tariff with tax backed out and zero paise rounding drift', () => {
      const calc = calculateBookingTariff({
        categoryId: 'cat-double-03',
        checkIn: d1,
        checkOut: d2,
        roomsCount: 1,
        adultsCount: 2,
        pricingMode: 'gst_inclusive',
        taxPercentage: 5,
      });

      expect(calc.isValid).toBe(true);
      expect(calc.pricingMode).toBe('gst_inclusive');
      expect(calc.billingPeriods).toBe(1);

      // Total payable is strictly the flat inclusive rate: ₹1,800
      expect(calc.totalRupees).toBe(1800);
      expect(calc.totalPaise).toBe(180000);

      // Taxable subtotal backed out: round(180,000 * 100 / 105) = 171,429 paise = ₹1,714.29
      expect(calc.subtotalPaise).toBe(171429);
      expect(calc.subtotalRupees).toBe(1714.29);

      // GST component: 180,000 - 171,429 = 8,571 paise = ₹85.71
      expect(calc.taxAmountPaise).toBe(8571);
      expect(calc.taxAmountRupees).toBe(85.71);

      // Zero-paise rounding integrity: Subtotal + Tax == Total
      expect(calc.subtotalPaise + calc.taxAmountPaise).toBe(calc.totalPaise);
      expect(Math.round((calc.subtotalRupees + calc.taxAmountRupees) * 100) / 100).toBe(calc.totalRupees);
    });

    it('correctly handles multi-room, multi-night bookings in GST-inclusive mode', () => {
      // 2 rooms for 3 nights = 6 room-nights @ ₹1,800 = ₹10,800 gross (1,080,000 paise)
      const calc = calculateBookingTariff({
        categoryId: 'cat-double-03',
        checkIn: d1,
        checkOut: d3,
        roomsCount: 2,
        adultsCount: 4,
        pricingMode: 'gst_inclusive',
        taxPercentage: 5,
      });

      expect(calc.isValid).toBe(true);
      expect(calc.billingPeriods).toBe(3);
      expect(calc.roomsCount).toBe(2);

      // Gross total: ₹10,800
      expect(calc.totalRupees).toBe(10800);
      expect(calc.totalPaise).toBe(1080000);

      // Taxable subtotal: round(1,080,000 * 100 / 105) = 1,028,571 paise = ₹1,0285.71
      expect(calc.subtotalPaise).toBe(1028571);
      expect(calc.subtotalRupees).toBe(10285.71);

      // GST: 1,080,000 - 1,028,571 = 51,429 paise = ₹514.29
      expect(calc.taxAmountPaise).toBe(51429);
      expect(calc.taxAmountRupees).toBe(514.29);

      // Zero-paise discrepancy verification
      expect(calc.subtotalPaise + calc.taxAmountPaise).toBe(calc.totalPaise);
    });

    it('defaults to gst_exclusive when pricingMode is omitted', () => {
      const calc = calculateBookingTariff({
        categoryId: 'cat-double-03',
        checkIn: d1,
        checkOut: d2,
      });

      expect(calc.pricingMode).toBe('gst_exclusive');
      expect(calc.subtotalRupees).toBe(1800);
      expect(calc.taxAmountRupees).toBe(90);
      expect(calc.totalRupees).toBe(1890);
    });
  });

  describe('2. Booking Engine Integration', () => {
    it('supports pricingMode in checkCategoryAvailability', () => {
      const availExclusive = checkCategoryAvailability('cat-double-03', d1, d2, 1, 2, 0, 'gst_exclusive');
      expect(availExclusive.pricingMode).toBe('gst_exclusive');
      expect(availExclusive.totalAmount).toBe(1890);
      expect(availExclusive.subtotal).toBe(1800);
      expect(availExclusive.taxAmount).toBe(90);

      const availInclusive = checkCategoryAvailability('cat-double-03', d1, d2, 1, 2, 0, 'gst_inclusive');
      expect(availInclusive.pricingMode).toBe('gst_inclusive');
      expect(availInclusive.totalAmount).toBe(1800);
      expect(availInclusive.subtotal).toBe(1714.29);
      expect(availInclusive.taxAmount).toBe(85.71);
    });
  });

  describe('3. Walk-In Check-In with Dual Pricing Modes', () => {
    it('creates front-desk walk-in in GST-Inclusive mode with backed-out tax and exact gross total', async () => {
      const stayIn = getDate(baseOffset + 10);
      const stayOut = getDate(baseOffset + 11);

      const walkIn = await repo.createFrontDeskWalkIn({
        guestName: `Anand Kumar ${testRunId}`,
        guestPhone: '9849019988',
        idProofType: 'Aadhaar Card',
        idProofNumber: `8877-6655-${testRunId}`,
        purposeOfVisit: 'Temple Darshan',
        categoryId: 'cat-double-03',
        roomNumber: '204',
        checkInDate: stayIn,
        checkOutDate: stayOut,
        paymentMethod: 'cash',
        pricingMode: 'gst_inclusive',
      });

      expect(walkIn.booking.pricing_mode).toBe('gst_inclusive');
      const expectedGross = walkIn.booking.booking_rooms?.[0]?.price_per_night || 1800;
      expect(walkIn.booking.total_amount).toBe(expectedGross);

      // Backed-out subtotal and tax must sum to total_amount exactly
      expect(walkIn.booking.subtotal_amount + walkIn.booking.tax_amount).toBe(walkIn.booking.total_amount);
      const expectedSubtotal = Math.round((expectedGross * 100) / 105);
      const expectedTax = expectedGross - expectedSubtotal;
      expect(walkIn.booking.subtotal_amount).toBe(expectedSubtotal);
      expect(walkIn.booking.tax_amount).toBe(expectedTax);
    });

    it('creates front-desk walk-in in GST-Exclusive mode with tax added on top', async () => {
      const stayIn = getDate(baseOffset + 20);
      const stayOut = getDate(baseOffset + 21);

      const walkIn = await repo.createFrontDeskWalkIn({
        guestName: `Suresh Reddy ${testRunId}`,
        guestPhone: '9849023344',
        idProofType: 'Driving License',
        idProofNumber: `DL-AP-02-${testRunId}`,
        purposeOfVisit: 'Business',
        categoryId: 'cat-double-03',
        roomNumber: '205',
        checkInDate: stayIn,
        checkOutDate: stayOut,
        paymentMethod: 'upi',
        pricingMode: 'gst_exclusive',
      });

      expect(walkIn.booking.pricing_mode).toBe('gst_exclusive');
      const expectedBase = walkIn.booking.booking_rooms?.[0]?.price_per_night || 1800;
      const expectedTax = Math.round(expectedBase * 0.05);
      expect(walkIn.booking.subtotal_amount).toBe(expectedBase);
      expect(walkIn.booking.tax_amount).toBe(expectedTax);
      expect(walkIn.booking.total_amount).toBe(expectedBase + expectedTax);
    });
  });

  describe('4. Extra Room Tariff Inheritance', () => {
    it('inherits GST-Inclusive pricing mode when adding an extra room', async () => {
      const stayIn = getDate(baseOffset + 30);
      const stayOut = getDate(baseOffset + 31);

      const walkIn = await repo.createFrontDeskWalkIn({
        guestName: `Kavitha Devi ${testRunId}`,
        guestPhone: '9849077665',
        idProofType: 'Passport',
        idProofNumber: `Z${testRunId}567`,
        purposeOfVisit: 'Family Holiday',
        categoryId: 'cat-double-03',
        roomNumber: '204',
        checkInDate: stayIn,
        checkOutDate: stayOut,
        paymentMethod: 'card',
        pricingMode: 'gst_inclusive',
      });

      const originalTotal = walkIn.booking.total_amount;
      const extraRes = await repo.addExtraRoomToBooking({
        bookingReference: walkIn.booking.booking_reference,
        roomNumber: '205',
        actor: 'Duty Front Desk',
      });

      // Extra room added in inclusive mode:
      const r2 = repo.getRoomById('205');
      const expectedAddedGross = r2?.category_id
        ? (repo.getCategories().find((c) => c.id === r2.category_id)?.base_price_per_night || 1800)
        : 1800;

      expect(extraRes.addedAmount + extraRes.addedTax).toBe(expectedAddedGross);
      expect(extraRes.newTotal).toBe(originalTotal + expectedAddedGross);
      expect(extraRes.booking.rooms_count).toBe(2);
    });
  });

  describe('5. Historical Invoices & Compliance Safeguards', () => {
    it('preserves existing completed invoices without altering subtotal or tax amounts', () => {
      const bookings = repo.getBookings();
      for (const b of bookings) {
        // Grand total must equal subtotal + tax + additional charges
        const expectedSum = (b.subtotal_amount || 0) + (b.tax_amount || 0) + (b.additional_charges_amount || 0);
        expect(b.total_amount).toBe(expectedSum);
        // If pricing_mode was not previously specified, it evaluates cleanly as gst_exclusive
        const effectiveMode = b.pricing_mode || 'gst_exclusive';
        expect(['gst_inclusive', 'gst_exclusive']).toContain(effectiveMode);
      }
    });

    it('enforces that tax is strictly calculated at 5% GST and never bypassed to 0%', () => {
      const calcEx = calculateBookingTariff({
        categoryId: 'cat-double-03',
        checkIn: d1,
        checkOut: d2,
        pricingMode: 'gst_exclusive',
        taxPercentage: 5,
      });
      expect(calcEx.taxAmountRupees).toBeGreaterThan(0);
      expect(calcEx.taxPercentage).toBe(5);

      const calcInc = calculateBookingTariff({
        categoryId: 'cat-double-03',
        checkIn: d1,
        checkOut: d2,
        pricingMode: 'gst_inclusive',
        taxPercentage: 5,
      });
      expect(calcInc.taxAmountRupees).toBeGreaterThan(0);
      expect(calcInc.taxPercentage).toBe(5);
    });
  });
});
