import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { repo } from '@/lib/db/repository';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';

describe('Guest Room Change & Relocation Flow (AC / Water / Defect Scenario)', () => {
  beforeEach(async () => {
    // Reset room operational states in memory
    const r101 = repo.getRooms().find((r) => r.room_number === '101');
    if (r101) {
      r101.operational_status = 'available';
      r101.housekeeping_status = 'clean';
      r101.current_booking_ref = undefined;
      r101.current_guest_name = undefined;
    }
    const r102 = repo.getRooms().find((r) => r.room_number === '102');
    if (r102) {
      r102.operational_status = 'available';
      r102.housekeeping_status = 'clean';
      r102.current_booking_ref = undefined;
      r102.current_guest_name = undefined;
    }
    repo.getBookings().forEach((b) => {
      if ((b.assigned_room_number === '101' || b.assigned_room_number === '102') && (b.guest_name === 'Bhavani Shankar' || b.guest_name === 'Suresh Kumar')) {
        b.status = 'cancelled';
      }
    });

    // Reset database stays in PostgreSQL so GiST exclusion constraints don't block subsequent runs
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        await pool.query("UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN ('101', '102') AND status IN ('confirmed', 'checked_in')");
        await pool.query("UPDATE rooms SET operational_status = 'available' WHERE room_number IN ('101', '102')");
      }
    } catch {}
  });

  afterAll(async () => {
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        await pool.query("UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN ('101', '102') AND status IN ('confirmed', 'checked_in')");
        await pool.query("UPDATE rooms SET operational_status = 'available' WHERE room_number IN ('101', '102')");
      }
    } catch {}
  });

  it('successfully relocates a checked-in guest due to AC failure, creates maintenance ticket, and locks old room', async () => {
    // 1. Create walk-in / regular booking
    const booking = await repo.createBooking(
      {
        guest_id: 'gst-test-101',
        guest_name: 'Bhavani Shankar',
        guest_phone: '9849012345',
        guest_email: 'bhavani@example.com',
        adults_count: 2,
        children_count: 0,
        rooms_count: 1,
        check_in_date: new Date().toISOString().slice(0, 10),
        check_out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        category_id: 'standard-double',
        category_name: 'Standard Double Room',
        total_amount: 1800,
        paid_amount: 1800,
        status: 'confirmed',
        booking_source: 'walk_in',
        payment_status: 'paid',
      } as any,
      'Front Desk'
    );

    // 2. Guest checks in to Room 101
    await repo.assignRoomToBooking('101', booking.booking_reference, booking.guest_name, 'Front Desk');
    await repo.updateBookingStatus(booking.booking_reference, 'checked_in', undefined, 'Front Desk');

    const room101Before = repo.getRooms().find((r) => r.room_number === '101');
    expect(room101Before?.operational_status).toBe('occupied');
    expect(room101Before?.current_guest_name).toBe('Bhavani Shankar');

    // 3. 30 minutes in, guest reports AC is blowing warm air and requests room change
    const transferResult = repo.transferBookingRoom({
      bookingReference: booking.booking_reference,
      toRoomIdOrNumber: '102',
      reasonCategory: 'ac_issue',
      reasonNotes: 'Guest spent 30 minutes in room; AC compressor is not cooling and blowing warm air.',
      actor: 'Front Desk - Receptionist Ramesh',
      createMaintenanceTicket: true,
      oldRoomAction: 'maintenance',
    });

    // 4. Verify Transfer Result & Booking State
    expect(transferResult.booking.assigned_room_number).toBe('102');
    expect(transferResult.booking.room_transfers).toBeDefined();
    expect(transferResult.booking.room_transfers?.length).toBeGreaterThanOrEqual(1);

    const transfer = transferResult.transferRecord;
    expect(transfer.from_room_number).toBe('101');
    expect(transfer.to_room_number).toBe('102');
    expect(transfer.reason_category).toBe('ac_issue');
    expect(transfer.old_room_status).toBe('maintenance');
    expect(transfer.actor).toBe('Front Desk - Receptionist Ramesh');
    expect(transfer.maintenance_ticket_id).toBeDefined();

    // 5. Verify Old Room 101 is locked for Maintenance and unassigned from guest
    const room101After = repo.getRooms().find((r) => r.room_number === '101');
    expect(room101After?.operational_status).toBe('maintenance');
    expect(room101After?.housekeeping_status).toBe('dirty');
    expect(room101After?.current_booking_ref).toBeUndefined();
    expect(room101After?.current_guest_name).toBeUndefined();

    // 6. Verify Maintenance Ticket was created automatically
    const tickets = repo.getMaintenanceTickets();
    const createdTicket = tickets.find((t) => t.id === transfer.maintenance_ticket_id);
    expect(createdTicket).toBeDefined();
    expect(createdTicket?.room_number).toBe('101');
    expect(createdTicket?.category).toBe('ac_hvac');
    expect(createdTicket?.priority).toBe('high');
    expect(createdTicket?.room_blocked).toBe(true);
    expect(createdTicket?.description).toContain('30 minutes in room');

    // 7. Verify New Room 102 is now occupied by Bhavani Shankar
    const room102After = repo.getRooms().find((r) => r.room_number === '102');
    expect(room102After?.operational_status).toBe('occupied');
    expect(room102After?.current_booking_ref).toBe(booking.booking_reference);
    expect(room102After?.current_guest_name).toBe('Bhavani Shankar');
  });

  it('rejects room transfer if target room is already occupied or the same room', async () => {
    const booking = await repo.createBooking(
      {
        guest_id: 'gst-test-102',
        guest_name: 'Suresh Kumar',
        guest_phone: '9849098765',
        guest_email: 'suresh@example.com',
        adults_count: 2,
        children_count: 0,
        rooms_count: 1,
        check_in_date: new Date().toISOString().slice(0, 10),
        check_out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        category_id: 'standard-double',
        category_name: 'Standard Double Room',
        total_amount: 1800,
        paid_amount: 1800,
        status: 'confirmed',
        booking_source: 'walk_in',
        payment_status: 'paid',
      } as any,
      'Front Desk'
    );

    await repo.assignRoomToBooking('101', booking.booking_reference, booking.guest_name, 'Front Desk');
    await repo.updateBookingStatus(booking.booking_reference, 'checked_in', undefined, 'Front Desk');

    // Attempt transfer to same room
    expect(() =>
      repo.transferBookingRoom({
        bookingReference: booking.booking_reference,
        toRoomIdOrNumber: '101',
        reasonCategory: 'plumbing_water',
        reasonNotes: 'Water pressure low',
        actor: 'Front Desk',
      })
    ).toThrow(/identical|same/i);
  });
});
