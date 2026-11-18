import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { repo } from '@/lib/db/repository';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';

describe('Feature 1: Extra Room Option in Booking Workflow', () => {
  const TEST_ROOM_A = '201';
  const TEST_ROOM_B = '202';
  const TEST_ROOM_C = '203';

  beforeEach(async () => {
    // Reset test room operational states in memory
    [TEST_ROOM_A, TEST_ROOM_B, TEST_ROOM_C].forEach((num) => {
      const room = repo.getRoomById(num);
      if (room) {
        room.operational_status = 'available';
        room.housekeeping_status = 'clean';
        room.current_booking_ref = undefined;
        room.current_guest_name = undefined;
      }
    });

    // Cancel in-memory bookings using test rooms
    repo.getBookings().forEach((b) => {
      if (
        b.assigned_room_number === TEST_ROOM_A ||
        b.assigned_room_number === TEST_ROOM_B ||
        b.assigned_room_number === TEST_ROOM_C ||
        (b.assigned_room_numbers && b.assigned_room_numbers.some((num) => [TEST_ROOM_A, TEST_ROOM_B, TEST_ROOM_C].includes(num)))
      ) {
        b.status = 'cancelled';
      }
    });

    // Reset database stays in PostgreSQL
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        await pool.query(
          `UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN ('${TEST_ROOM_A}', '${TEST_ROOM_B}', '${TEST_ROOM_C}') AND status IN ('confirmed', 'checked_in')`
        );
        await pool.query(
          `UPDATE rooms SET operational_status = 'available' WHERE room_number IN ('${TEST_ROOM_A}', '${TEST_ROOM_B}', '${TEST_ROOM_C}')`
        );
      }
    } catch {}
  });

  afterAll(async () => {
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        await pool.query(
          `UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN ('${TEST_ROOM_A}', '${TEST_ROOM_B}', '${TEST_ROOM_C}') AND status IN ('confirmed', 'checked_in')`
        );
        await pool.query(
          `UPDATE rooms SET operational_status = 'available' WHERE room_number IN ('${TEST_ROOM_A}', '${TEST_ROOM_B}', '${TEST_ROOM_C}')`
        );
      }
    } catch {}
  });

  it('1. Preserves existing single-room booking creation and baseline workflow', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const booking = await repo.createBooking({
      guest_id: 'gst-single-01',
      guest_name: 'Rajendra Prasad',
      guest_phone: '9849012001',
      guest_email: 'rajendra@example.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: today,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_A,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'pay_at_hotel',
      subtotal_amount: 1800,
      room_charges_amount: 1800,
      tax_amount: 90,
      additional_charges_amount: 0,
      total_amount: 1890,
      paid_amount: 0,
    });

    expect(booking).toBeDefined();
    expect(booking.rooms_count).toBe(1);
    expect(booking.assigned_room_number).toBe(TEST_ROOM_A);
    expect(booking.subtotal_amount).toBe(1800);
    expect(booking.tax_amount).toBe(90);
    expect(booking.total_amount).toBe(1890);
  });

  it('2. Adds an extra room with distinct identity, verifies availability, and recalculates totals correctly', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const booking = await repo.createBooking({
      guest_id: 'gst-extra-02',
      guest_name: 'Venkata Narayana',
      guest_phone: '9849012002',
      guest_email: 'venkata@example.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: today,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_A,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'pay_at_hotel',
      subtotal_amount: 1800,
      room_charges_amount: 1800,
      tax_amount: 90,
      additional_charges_amount: 0,
      total_amount: 1890,
      paid_amount: 0,
    });

    // Add extra room (TEST_ROOM_B)
    const result = await repo.addExtraRoomToBooking({
      bookingReference: booking.booking_reference,
      roomNumber: TEST_ROOM_B,
      actor: 'Front Desk Duty Officer',
    });

    expect(result.extraRoom.room_number).toBe(TEST_ROOM_B);
    expect(result.booking.rooms_count).toBe(2);
    expect(result.booking.assigned_room_numbers).toContain(TEST_ROOM_A);
    expect(result.booking.assigned_room_numbers).toContain(TEST_ROOM_B);
    expect(result.addedAmount).toBe(1800);
    expect(result.addedTax).toBe(90);
    expect(result.newTotal).toBe(3780); // 1890 * 2 = 3780
    expect(result.booking.total_amount).toBe(3780);
    expect(result.booking.subtotal_amount).toBe(3600);
    expect(result.booking.tax_amount).toBe(180);

    // Verify booking_rooms breakdown
    expect(result.booking.booking_rooms).toBeDefined();
    expect(result.booking.booking_rooms!.length).toBe(2);
    expect(result.booking.booking_rooms!.some((br) => br.room_number === TEST_ROOM_A)).toBe(true);
    expect(result.booking.booking_rooms!.some((br) => br.room_number === TEST_ROOM_B)).toBe(true);
  });

  it('3. Strictly prevents double booking when attempting to add an already booked/occupied room', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Booking 1 has Room 201
    const booking1 = await repo.createBooking({
      guest_id: 'gst-double-03',
      guest_name: 'Suresh Kumar',
      guest_phone: '9849012003',
      guest_email: 'suresh@example.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: today,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_A,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'pay_at_hotel',
      subtotal_amount: 1800,
      additional_charges_amount: 0,
      tax_amount: 90,
      total_amount: 1890,
      paid_amount: 0,
    });

    // Booking 2 has Room 202
    const booking2 = await repo.createBooking({
      guest_id: 'gst-double-04',
      guest_name: 'Mahesh Babu',
      guest_phone: '9849012004',
      guest_email: 'mahesh@example.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: today,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_B,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'pay_at_hotel',
      subtotal_amount: 1800,
      additional_charges_amount: 0,
      tax_amount: 90,
      total_amount: 1890,
      paid_amount: 0,
    });

    // Attempting to add Room 201 again to Booking 1 must be rejected
    await expect(
      repo.addExtraRoomToBooking({
        bookingReference: booking1.booking_reference,
        roomNumber: TEST_ROOM_A,
      })
    ).rejects.toThrow(/already assigned/i);

    // Attempting to add Room 202 (booked by Booking 2) to Booking 1 must be rejected due to overlap conflict
    await expect(
      repo.addExtraRoomToBooking({
        bookingReference: booking1.booking_reference,
        roomNumber: TEST_ROOM_B,
      })
    ).rejects.toThrow(/already booked|conflict|occupied/i);
  });

  it('4. Respects existing OTA booking contract when adding an extra room at front desk', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Create OTA Booking (prepaid by MMT)
    const otaVoucher = 'MMT-VCH-883921';
    const otaBooking = await repo.createBooking({
      guest_id: 'gst-ota-05',
      guest_name: 'Anand Mahindra',
      guest_phone: '9849012005',
      guest_email: 'anand@ota-guest.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: today,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_A,
      status: 'confirmed',
      payment_status: 'successful',
      payment_method: 'online',
      subtotal_amount: 1800,
      tax_amount: 90,
      additional_charges_amount: 0,
      total_amount: 1890,
      paid_amount: 1890, // Prepaid through OTA
      booking_source: 'online',
      internal_notes: `OTA Channel: MakeMyTrip | Voucher: ${otaVoucher} | Comm: 18% | Net: ₹1550`,
    });

    expect(otaBooking.total_amount).toBe(1890);
    expect(otaBooking.paid_amount).toBe(1890);
    expect(otaBooking.total_amount - otaBooking.paid_amount).toBe(0);

    // Guest requests an extra room directly at hotel reception
    const result = await repo.addExtraRoomToBooking({
      bookingReference: otaBooking.booking_reference,
      roomNumber: TEST_ROOM_B,
      actor: 'Front Desk Duty Officer',
    });

    // Verify OTA voucher is preserved
    expect(result.booking.internal_notes).toContain(otaVoucher);
    expect(result.booking.internal_notes).toContain('MakeMyTrip');
    expect(result.booking.internal_notes).toContain('Extra Room #202 added at Front Desk');

    // Verify financial integrity: OTA voucher payment preserved, extra room balance due
    expect(result.booking.rooms_count).toBe(2);
    expect(result.booking.paid_amount).toBe(1890); // Prepaid voucher untouched
    expect(result.booking.total_amount).toBe(3780); // 1890 + 1890
    const balanceDue = result.booking.total_amount - result.booking.paid_amount;
    expect(balanceDue).toBe(1890); // Counter balance due for the extra room
  });

  it('5. Supports sequential addition of multiple extra rooms (1 -> 2 -> 3 rooms)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const booking = await repo.createBooking({
      guest_id: 'gst-multi-06',
      guest_name: 'Lakshmi Devi',
      guest_phone: '9849012006',
      guest_email: 'lakshmi@example.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: today,
      check_out_date: tomorrow,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_A,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'pay_at_hotel',
      subtotal_amount: 1800,
      additional_charges_amount: 0,
      tax_amount: 90,
      total_amount: 1890,
      paid_amount: 0,
    });

    // Add 2nd room
    await repo.addExtraRoomToBooking({
      bookingReference: booking.booking_reference,
      roomNumber: TEST_ROOM_B,
    });

    // Add 3rd room
    const step3 = await repo.addExtraRoomToBooking({
      bookingReference: booking.booking_reference,
      roomNumber: TEST_ROOM_C,
    });

    expect(step3.booking.rooms_count).toBe(3);
    expect(step3.booking.assigned_room_numbers).toEqual([TEST_ROOM_A, TEST_ROOM_B, TEST_ROOM_C]);
    expect(step3.booking.subtotal_amount).toBe(5400); // 1800 * 3
    expect(step3.booking.tax_amount).toBe(270); // 90 * 3
    expect(step3.booking.total_amount).toBe(5670); // 1890 * 3
    expect(step3.booking.booking_rooms!.length).toBe(3);
  });
});
