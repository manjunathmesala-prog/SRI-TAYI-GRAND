import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { repo } from '@/lib/db/repository';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';

describe('Feature 3: Multiple Room Selection for Walk-In Bookings', () => {
  const TEST_ROOM_201 = '201'; // Double Room (cat-double-03, ₹1,800)
  const TEST_ROOM_202 = '202'; // Double Room (cat-double-03, ₹1,800)
  const TEST_ROOM_306 = '306'; // Suite Room (cat-suite-01, ₹3,300)
  const TEST_ROOM_206 = '206'; // Four Bed Room (cat-four-bed-02, ₹2,800)

  const ALL_TEST_ROOMS = [TEST_ROOM_201, TEST_ROOM_202, TEST_ROOM_306, TEST_ROOM_206];

  const getDate = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  };

  beforeEach(async () => {
    // Reset test room states in memory
    ALL_TEST_ROOMS.forEach((num) => {
      const room = repo.getRoomById(num);
      if (room) {
        room.operational_status = 'available';
        room.housekeeping_status = 'clean';
        room.current_booking_ref = undefined;
        room.current_guest_name = undefined;
      }
    });

    // Cancel active test bookings in memory
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

  it('1. Preserves existing single-room walk-in check-in', async () => {
    const checkIn = getDate(30);
    const checkOut = getDate(31);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Suresh Reddy',
      guestPhone: '9849011111',
      guestEmail: 'suresh@example.com',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548211112222',
      purposeOfVisit: 'Temple Darshan',
      categoryId: 'cat-double-03',
      roomNumber: TEST_ROOM_201,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
      amountCollected: 1890,
      staffName: 'Front Desk Officer',
    });

    expect(result.booking).toBeDefined();
    expect(result.booking.status).toBe('checked_in');
    expect(result.booking.rooms_count).toBe(1);
    expect(result.booking.assigned_room_number).toBe(TEST_ROOM_201);
    expect(result.booking.assigned_room_numbers).toEqual([TEST_ROOM_201]);
    expect(result.booking.subtotal_amount).toBe(1800);
    expect(result.booking.tax_amount).toBe(90);
    expect(result.booking.total_amount).toBe(1890);

    const room = repo.getRoomById(TEST_ROOM_201);
    expect(room?.operational_status).toBe('occupied');
    expect(room?.current_guest_name).toBe('Suresh Reddy');
    expect(room?.current_booking_ref).toBe(result.booking.booking_reference);
  });

  it('2. Allows one guest or booking party to reserve and check in to multiple available rooms', async () => {
    const checkIn = getDate(32);
    const checkOut = getDate(33);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Balaji Narayanan',
      guestPhone: '9849022222',
      guestEmail: 'balaji@example.com',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548222223333',
      purposeOfVisit: 'Family Pilgrimage',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_201 },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_202 },
      ],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
      amountCollected: 3780,
      staffName: 'Front Desk Officer',
    });

    expect(result.booking).toBeDefined();
    expect(result.booking.status).toBe('checked_in');
    expect(result.booking.rooms_count).toBe(2);
    expect(result.booking.assigned_room_numbers).toEqual([TEST_ROOM_201, TEST_ROOM_202]);
    expect(result.booking.subtotal_amount).toBe(3600); // 1800 * 2
    expect(result.booking.tax_amount).toBe(180); // 5% GST
    expect(result.booking.total_amount).toBe(3780);

    // Both physical rooms must be occupied under this single booking party
    const roomA = repo.getRoomById(TEST_ROOM_201);
    const roomB = repo.getRoomById(TEST_ROOM_202);
    expect(roomA?.operational_status).toBe('occupied');
    expect(roomA?.current_booking_ref).toBe(result.booking.booking_reference);
    expect(roomB?.operational_status).toBe('occupied');
    expect(roomB?.current_booking_ref).toBe(result.booking.booking_reference);
  });

  it('3. Supports mixed room categories within one walk-in booking party with correct rates', async () => {
    const checkIn = getDate(34);
    const checkOut = getDate(35);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Venkata Swamy',
      guestPhone: '9849033333',
      idProofType: 'Driving License',
      idProofNumber: 'AP0420230009876',
      purposeOfVisit: 'VIP Temple Visit',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_201, customRate: 1800 },
        { categoryId: 'cat-suite-01', roomNumber: TEST_ROOM_306, customRate: 3300 },
      ],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'upi',
      amountCollected: 5355,
      staffName: 'Front Desk Duty Officer',
    });

    expect(result.booking).toBeDefined();
    expect(result.booking.rooms_count).toBe(2);
    expect(result.booking.assigned_room_numbers).toEqual([TEST_ROOM_201, TEST_ROOM_306]);
    expect(result.booking.subtotal_amount).toBe(5100); // 1800 + 3300
    expect(result.booking.tax_amount).toBe(255); // 5% of 5100
    expect(result.booking.total_amount).toBe(5355);

    // Ensure all linked rooms are recorded in booking_rooms structure
    expect(result.booking.booking_rooms).toBeDefined();
    expect(result.booking.booking_rooms!.length).toBe(2);
    expect(result.booking.booking_rooms![0].room_number).toBe(TEST_ROOM_201);
    expect(result.booking.booking_rooms![0].price_per_night).toBe(1800);
    expect(result.booking.booking_rooms![1].room_number).toBe(TEST_ROOM_306);
    expect(result.booking.booking_rooms![1].price_per_night).toBe(3300);
  });

  it('4. Reuses existing guest registration without creating duplicate records', async () => {
    const initialGuestsCount = repo.getGuests().length;
    const phone = '9849' + Math.floor(100000 + Math.random() * 900000);
    const aadhaar = '5482' + Math.floor(10000000 + Math.random() * 90000000);

    const checkIn1 = getDate(36);
    const checkOut1 = getDate(37);

    // 1st Walk-In
    const walkIn1 = await repo.createFrontDeskWalkIn({
      guestName: 'Anand Kumar',
      guestPhone: phone,
      idProofType: 'Aadhaar Card',
      idProofNumber: aadhaar,
      purposeOfVisit: 'Business',
      categoryId: 'cat-double-03',
      roomNumber: TEST_ROOM_201,
      checkInDate: checkIn1,
      checkOutDate: checkOut1,
      paymentMethod: 'cash',
      amountCollected: 1890,
    });

    const guestId = walkIn1.booking.guest_id;
    const guestsAfterFirst = repo.getGuests().length;
    expect(guestsAfterFirst).toBe(initialGuestsCount + 1);

    // 2nd Walk-In (same guest phone & Aadhaar, reserving multi-room)
    const checkIn2 = getDate(38);
    const checkOut2 = getDate(39);

    const walkIn2 = await repo.createFrontDeskWalkIn({
      guestName: 'Anand Kumar',
      guestPhone: phone,
      idProofType: 'Aadhaar Card',
      idProofNumber: aadhaar,
      purposeOfVisit: 'Family Pilgrimage',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_201 },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_202 },
      ],
      checkInDate: checkIn2,
      checkOutDate: checkOut2,
      paymentMethod: 'upi',
      amountCollected: 3780,
    });

    // Must reuse identical guest record and NOT create a new guest row
    const existingGuest = repo.getGuests().find((g) => g.phone === phone);
    expect(existingGuest).toBeDefined();
    expect(walkIn2.booking.guest_id).toBe(existingGuest?.id);
    expect(repo.getGuests().length).toBe(guestsAfterFirst);

    // Guest total stays should increment
    expect(existingGuest?.total_stays).toBeGreaterThanOrEqual(2);
  });

  it('5. Maintains accurate room occupancy and prevents overlapping conflicts', async () => {
    const checkIn = getDate(40);
    const checkOut = getDate(42);

    // Check in Room 201 & 202
    await repo.createFrontDeskWalkIn({
      guestName: 'Ravi Teja',
      guestPhone: '9849055555',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548255556666',
      purposeOfVisit: 'Temple',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_201 },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_202 },
      ],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
    });

    // Attempt to book Room 201 during overlapping dates must fail with conflict error
    await expect(
      repo.createFrontDeskWalkIn({
        guestName: 'Conflicting Guest',
        guestPhone: '9849066666',
        idProofType: 'Passport',
        idProofNumber: 'Z1234567',
        purposeOfVisit: 'Tourism',
        categoryId: 'cat-double-03',
        roomNumber: TEST_ROOM_201,
        checkInDate: getDate(41),
        checkOutDate: getDate(43),
        paymentMethod: 'cash',
      })
    ).rejects.toThrow(/Room 201.*occupied|Conflict.*Room 201/);
  });

  it('6. Checking out a multi-room walk-in marks ALL linked rooms as dirty / cleaning', async () => {
    const checkIn = getDate(44);
    const checkOut = getDate(45);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Naveen Chandra',
      guestPhone: '9849077777',
      idProofType: 'Voter ID',
      idProofNumber: 'VOT1234567',
      purposeOfVisit: 'Darshan',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_201 },
        { categoryId: 'cat-suite-01', roomNumber: TEST_ROOM_306 },
      ],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
    });

    const bookingRef = result.booking.booking_reference;

    // Confirm both rooms are currently occupied
    expect(repo.getRoomById(TEST_ROOM_201)?.operational_status).toBe('occupied');
    expect(repo.getRoomById(TEST_ROOM_306)?.operational_status).toBe('occupied');

    // Perform check-out
    await repo.updateBookingStatus(bookingRef, 'checked_out', 'Guest departed and settled folio');

    // Both rooms must now transition to housekeeping 'dirty' and operational 'cleaning'
    const roomA = repo.getRoomById(TEST_ROOM_201);
    const roomB = repo.getRoomById(TEST_ROOM_306);
    expect(roomA?.operational_status).toBe('cleaning');
    expect(roomA?.housekeeping_status).toBe('dirty');
    expect(roomB?.operational_status).toBe('cleaning');
    expect(roomB?.housekeeping_status).toBe('dirty');
  });

  it('7. Cancelling a multi-room walk-in releases ALL linked rooms back to available', async () => {
    const checkIn = getDate(46);
    const checkOut = getDate(47);

    const result = await repo.createFrontDeskWalkIn({
      guestName: 'Praveen Raju',
      guestPhone: '9849088888',
      idProofType: 'Aadhaar Card',
      idProofNumber: '548288889999',
      purposeOfVisit: 'Temple',
      rooms: [
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_201 },
        { categoryId: 'cat-double-03', roomNumber: TEST_ROOM_202 },
      ],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      paymentMethod: 'cash',
    });

    const bookingRef = result.booking.booking_reference;

    // Perform cancellation
    await repo.updateBookingStatus(bookingRef, 'cancelled', 'Walk-in cancelled');

    // Both rooms must be restored to available with references cleared
    const roomA = repo.getRoomById(TEST_ROOM_201);
    const roomB = repo.getRoomById(TEST_ROOM_202);
    expect(roomA?.operational_status).toBe('available');
    expect(roomA?.current_booking_ref).toBeUndefined();
    expect(roomB?.operational_status).toBe('available');
    expect(roomB?.current_booking_ref).toBeUndefined();
  });
});
