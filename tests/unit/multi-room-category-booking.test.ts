import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { repo } from '@/lib/db/repository';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';

describe('Feature 2: Multiple Room Selection by Room Category', () => {
  const TEST_ROOM_DOUBLE_A = '201'; // Double Room (cat-double-03, ₹1800)
  const TEST_ROOM_DOUBLE_B = '202'; // Double Room (cat-double-03, ₹1800)
  const TEST_ROOM_SUITE = '306';    // Suite Room (cat-suite-01, ₹3300)
  const TEST_ROOM_FOURBED = '206';  // Four Bed Room (cat-four-bed-02, ₹2800)

  const ALL_TEST_ROOMS = [
    TEST_ROOM_DOUBLE_A,
    TEST_ROOM_DOUBLE_B,
    TEST_ROOM_SUITE,
    TEST_ROOM_FOURBED,
  ];

  const getDate = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  };

  beforeEach(async () => {
    // Reset test room operational states in memory
    ALL_TEST_ROOMS.forEach((num) => {
      const room = repo.getRoomById(num);
      if (room) {
        room.operational_status = 'available';
        room.housekeeping_status = 'clean';
        room.current_booking_ref = undefined;
        room.current_guest_name = undefined;
      }
    });

    // Cancel any active in-memory bookings for these test rooms
    repo.getBookings().forEach((b) => {
      if (
        ALL_TEST_ROOMS.includes(b.assigned_room_number || '') ||
        (b.assigned_room_numbers && b.assigned_room_numbers.some((num) => ALL_TEST_ROOMS.includes(num)))
      ) {
        b.status = 'cancelled';
      }
    });

    // Reset database stays in PostgreSQL
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        const inClause = ALL_TEST_ROOMS.map((r) => `'${r}'`).join(', ');
        await pool.query(
          `UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN (${inClause}) AND status IN ('confirmed', 'checked_in')`
        );
        await pool.query(
          `UPDATE rooms SET operational_status = 'available' WHERE room_number IN (${inClause})`
        );
      }
    } catch {}
  });

  afterAll(async () => {
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        const inClause = ALL_TEST_ROOMS.map((r) => `'${r}'`).join(', ');
        await pool.query(
          `UPDATE bookings SET status = 'cancelled' WHERE assigned_room_number IN (${inClause}) AND status IN ('confirmed', 'checked_in')`
        );
        await pool.query(
          `UPDATE rooms SET operational_status = 'available' WHERE room_number IN (${inClause})`
        );
      }
    } catch {}
  });

  it('1. Preserves existing single-room statutory walk-in registration', async () => {
    const checkIn = getDate(10);
    const checkOut = getDate(11);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Kishore Varma',
      guestPhone: '9849021001',
      guestEmail: 'kishore@example.com',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548219283841',
      purposeOfVisit: 'Pilgrimage / Temple Darshan',
      categoryId: 'cat-double-03',
      roomNumber: TEST_ROOM_DOUBLE_A,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
      staffName: 'Receptionist Duty Officer',
    });

    expect(result.booking).toBeDefined();
    expect(result.booking.rooms_count).toBe(1);
    expect(result.booking.assigned_room_number).toBe(TEST_ROOM_DOUBLE_A);
    expect(result.booking.assigned_room_numbers).toEqual([TEST_ROOM_DOUBLE_A]);
    expect(result.booking.booking_rooms).toBeDefined();
    expect(result.booking.booking_rooms!.length).toBe(1);
    expect(result.booking.booking_rooms![0].room_number).toBe(TEST_ROOM_DOUBLE_A);
    expect(result.booking.booking_rooms![0].category_id).toBe('cat-double-03');
    expect(result.booking.subtotal_amount).toBe(1800);
    expect(result.booking.tax_amount).toBe(90);
    expect(result.booking.total_amount).toBe(1890);
    expect(result.booking.status).toBe('checked_in');

    const room = repo.getRoomById(TEST_ROOM_DOUBLE_A);
    expect(room?.operational_status).toBe('occupied');
  });

  it('2. Allocates multiple rooms of the same category under one reservation with combined totals', async () => {
    const checkIn = getDate(12);
    const checkOut = getDate(13);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Srinivasa Rao',
      guestPhone: '9849021002',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548219283842',
      purposeOfVisit: 'Pilgrimage / Temple Darshan',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'upi',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_B },
      ],
      staffName: 'Front Desk Duty Officer',
    });

    expect(result.booking).toBeDefined();
    expect(result.booking.rooms_count).toBe(2);
    expect(result.booking.assigned_room_numbers).toEqual([TEST_ROOM_DOUBLE_A, TEST_ROOM_DOUBLE_B]);
    expect(result.booking.booking_rooms).toBeDefined();
    expect(result.booking.booking_rooms!.length).toBe(2);

    // Rates: 2 * 1800 = 3600 subtotal, 5% GST = 180, total = 3780
    expect(result.booking.subtotal_amount).toBe(3600);
    expect(result.booking.tax_amount).toBe(180);
    expect(result.booking.total_amount).toBe(3780);

    // Both physical rooms must be occupied
    const roomA = repo.getRoomById(TEST_ROOM_DOUBLE_A);
    const roomB = repo.getRoomById(TEST_ROOM_DOUBLE_B);
    expect(roomA?.operational_status).toBe('occupied');
    expect(roomB?.operational_status).toBe('occupied');
  });

  it('3. Supports mixed room categories within one reservation and computes room-wise rates correctly', async () => {
    const checkIn = getDate(14);
    const checkOut = getDate(15);

    // Mixed reservation: 1 Double Room (₹1,800) + 1 Suite Room (₹3,300)
    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Chandrasekhar Reddy',
      guestPhone: '9849021003',
      idProofType: 'Passport',
      idProofNumber: 'Z8829102',
      purposeOfVisit: 'Business',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'card',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A }, // Double: ₹1800
        { categoryId: 'cat-suite-01', roomNumber: TEST_ROOM_SUITE },     // Suite: ₹3300
      ],
      staffName: 'Front Desk Duty Officer',
    });

    expect(result.booking.rooms_count).toBe(2);
    expect(result.booking.assigned_room_numbers).toEqual([TEST_ROOM_DOUBLE_A, TEST_ROOM_SUITE]);

    // Inspect individual booking_rooms items
    const items = result.booking.booking_rooms!;
    expect(items.length).toBe(2);

    const itemDouble = items.find((br) => br.room_number === TEST_ROOM_DOUBLE_A);
    const itemSuite = items.find((br) => br.room_number === TEST_ROOM_SUITE);

    expect(itemDouble).toBeDefined();
    expect(itemDouble?.category_id).toBe('cat-double-03');
    expect(itemDouble?.price_per_night).toBe(1800);

    expect(itemSuite).toBeDefined();
    expect(itemSuite?.category_id).toBe('cat-suite-01');
    expect(itemSuite?.price_per_night).toBe(3300);

    // Financial calculation: Subtotal = 1800 + 3300 = 5100
    // 5% GST = Math.round(5100 * 0.05) = 255
    // Total = 5355
    expect(result.booking.subtotal_amount).toBe(5100);
    expect(result.booking.tax_amount).toBe(255);
    expect(result.booking.total_amount).toBe(5355);

    // Verify both rooms occupied
    expect(repo.getRoomById(TEST_ROOM_DOUBLE_A)?.operational_status).toBe('occupied');
    expect(repo.getRoomById(TEST_ROOM_SUITE)?.operational_status).toBe('occupied');
  });

  it('4. Rejects duplicate room selection within the same multi-room reservation', async () => {
    const checkIn = getDate(16);
    const checkOut = getDate(17);

    await expect(
      repo.createFrontDeskWalkIn({
        guestName: 'Duplicate Test Guest',
        guestPhone: '9849021004',
        idProofType: 'Aadhaar Card',
        idProofNumber: '548219283844',
        purposeOfVisit: 'Transit',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        paymentMethod: 'cash',
        rooms: [
          { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
          { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A }, // Duplicate!
        ],
      })
    ).rejects.toThrow(/duplicate rooms/i);
  });

  it('5. Strictly rejects reservation if any requested room has an overlapping booking conflict', async () => {
    const checkIn = getDate(18);
    const checkOut = getDate(19);

    // Pre-occupy Room 201 with an existing reservation for dates 18 to 19
    await repo.createBooking({
      guest_id: 'gst-existing-01',
      guest_name: 'Existing Occupant',
      guest_phone: '9849021005',
      guest_email: 'existing@example.com',
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: checkIn,
      check_out_date: checkOut,
      category_id: 'cat-double-03',
      category_name: 'Double Room',
      assigned_room_number: TEST_ROOM_DOUBLE_A,
      status: 'confirmed',
      payment_status: 'successful',
      payment_method: 'online',
      subtotal_amount: 1800,
      room_charges_amount: 1800,
      tax_amount: 90,
      additional_charges_amount: 0,
      total_amount: 1890,
      paid_amount: 1890,
    });

    // Attempting to book Room 201 + Room 202 for the same dates must be rejected due to Room 201 overlap
    await expect(
      repo.createFrontDeskWalkIn({
        guestName: 'Conflict Guest',
        guestPhone: '9849021006',
        idProofType: 'Aadhaar Card',
        idProofNumber: '548219283846',
        purposeOfVisit: 'Transit',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        paymentMethod: 'cash',
        rooms: [
          { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
          { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_B },
        ],
      })
    ).rejects.toThrow(/conflict|already booked/i);
  });

  it('6. Rejects room allocation when room is in maintenance or out of service', async () => {
    const checkIn = getDate(20);
    const checkOut = getDate(21);

    const roomA = repo.getRoomById(TEST_ROOM_DOUBLE_A);
    if (roomA) roomA.operational_status = 'maintenance';

    await expect(
      repo.createFrontDeskWalkIn({
        guestName: 'Maintenance Test Guest',
        guestPhone: '9849021007',
        idProofType: 'Aadhaar Card',
        idProofNumber: '548219283847',
        purposeOfVisit: 'Transit',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        paymentMethod: 'cash',
        rooms: [
          { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
          { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_B },
        ],
      })
    ).rejects.toThrow(/maintenance|out of service/i);
  });

  it('7. Cancelling a multi-room reservation releases ALL assigned rooms back to available', async () => {
    const checkIn = getDate(22);
    const checkOut = getDate(23);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Cancellation Test Guest',
      guestPhone: '9849021008',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548219283848',
      purposeOfVisit: 'Pilgrimage / Temple Darshan',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
        { categoryId: 'cat-suite-01', roomNumber: TEST_ROOM_SUITE },
      ],
      staffName: 'Front Desk Duty Officer',
    });

    expect(repo.getRoomById(TEST_ROOM_DOUBLE_A)?.operational_status).toBe('occupied');
    expect(repo.getRoomById(TEST_ROOM_SUITE)?.operational_status).toBe('occupied');

    // Cancel reservation
    const cancelled = await repo.updateBookingStatus(
      result.booking.booking_reference,
      'cancelled',
      'Guest requested cancellation before occupancy',
      'Front Desk Manager'
    );

    expect(cancelled?.status).toBe('cancelled');

    // Both rooms must be released back to available
    expect(repo.getRoomById(TEST_ROOM_DOUBLE_A)?.operational_status).toBe('available');
    expect(repo.getRoomById(TEST_ROOM_SUITE)?.operational_status).toBe('available');
  });

  it('8. Checking out a multi-room reservation marks ALL assigned rooms as dirty / cleaning', async () => {
    const checkIn = getDate(24);
    const checkOut = getDate(25);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Checkout Test Guest',
      guestPhone: '9849021009',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548219283849',
      purposeOfVisit: 'Pilgrimage / Temple Darshan',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_B },
      ],
      staffName: 'Front Desk Duty Officer',
    });

    // Check out
    const checkedOut = await repo.updateBookingStatus(
      result.booking.booking_reference,
      'checked_out',
      'Guest completed stay and settled folio',
      'Front Desk Manager'
    );

    expect(checkedOut?.status).toBe('checked_out');

    // Both rooms must be marked dirty and in cleaning
    const roomA = repo.getRoomById(TEST_ROOM_DOUBLE_A);
    const roomB = repo.getRoomById(TEST_ROOM_DOUBLE_B);
    expect(roomA?.operational_status).toBe('cleaning');
    expect(roomA?.housekeeping_status).toBe('dirty');
    expect(roomB?.operational_status).toBe('cleaning');
    expect(roomB?.housekeeping_status).toBe('dirty');
  });

  it('9. Rescheduling a multi-room reservation unassigns ALL allocated rooms', async () => {
    const checkIn = getDate(26);
    const checkOut = getDate(27);
    const nextMonthStart = getDate(40);
    const nextMonthEnd = getDate(41);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Reschedule Test Guest',
      guestPhone: '9849021010',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548219283850',
      purposeOfVisit: 'Pilgrimage / Temple Darshan',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_A },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_DOUBLE_B },
      ],
      staffName: 'Front Desk Duty Officer',
    });

    const rescheduled = await repo.rescheduleBooking({
      bookingReference: result.booking.booking_reference,
      newCheckIn: nextMonthStart,
      newCheckOut: nextMonthEnd,
      actor: 'Front Desk Duty Officer',
    });

    expect(rescheduled.check_in_date).toBe(nextMonthStart);
    expect(rescheduled.check_out_date).toBe(nextMonthEnd);

    // Old room assignments must be unassigned
    expect(rescheduled.assigned_room_numbers).toEqual([]);
    expect(rescheduled.booking_rooms).toEqual([]);
    expect(repo.getRoomById(TEST_ROOM_DOUBLE_A)?.operational_status).toBe('available');
    expect(repo.getRoomById(TEST_ROOM_DOUBLE_B)?.operational_status).toBe('available');
  });
});
