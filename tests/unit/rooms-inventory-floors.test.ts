import { describe, it, expect } from 'vitest';
import { repo } from '@/lib/db/repository';
import { searchAvailability } from '@/lib/booking-engine';
import { normalizeCategoryId } from '@/lib/pricing';

describe('Rooms, Floors & Walk-In Inventory Rules', () => {
  it('correctly allocates 25 physical rooms across Floors 1 to 3', () => {
    const rooms = repo.getRooms();
    expect(rooms.length).toBe(25);

    const floor1Rooms = rooms.filter((r) => r.floor_number === 1).map((r) => r.room_number).sort();
    const floor2Rooms = rooms.filter((r) => r.floor_number === 2).map((r) => r.room_number).sort();
    const floor3Rooms = rooms.filter((r) => r.floor_number === 3).map((r) => r.room_number).sort();

    expect(floor1Rooms).toEqual(['101', '102', '103', '104', '105', '106', '107', '108', '109']);
    expect(floor2Rooms).toEqual(['201', '202', '203', '204', '205', '206', '207', '208']);
    expect(floor3Rooms).toEqual(['301', '302', '303', '304', '305', '306', '307', '308']);
  });

  it('allocates 106 and 206 as Four Bed Rooms', () => {
    const r106 = repo.getRooms().find((r) => r.room_number === '106');
    const r206 = repo.getRooms().find((r) => r.room_number === '206');

    expect(r106).toBeDefined();
    expect(r106?.category_id).toBe('cat-four-bed-02');

    expect(r206).toBeDefined();
    expect(r206?.category_id).toBe('cat-four-bed-02');
  });

  it('allocates 306 as the Suite Room', () => {
    const r306 = repo.getRooms().find((r) => r.room_number === '306');
    expect(r306).toBeDefined();
    expect(r306?.category_id).toBe('cat-suite-01');
  });

  it('allocates 107 as the Single Room with walk_in_only set to true', () => {
    const r107 = repo.getRooms().find((r) => r.room_number === '107');
    expect(r107).toBeDefined();
    expect(r107?.category_id).toBe('cat-single-04');
    expect(r107?.walk_in_only).toBe(true);
  });

  it('allocates all remaining 21 rooms from 101 to 308 as Double Rooms', () => {
    const doubleRooms = repo.getRooms().filter((r) => r.category_id === 'cat-double-03');
    expect(doubleRooms.length).toBe(21);

    const doubleRoomNumbers = doubleRooms.map((r) => r.room_number).sort();
    const expectedDoubleNumbers = [
      '101', '102', '103', '104', '105', '108', '109',
      '201', '202', '203', '204', '205', '207', '208',
      '301', '302', '303', '304', '305', '307', '308'
    ].sort();

    expect(doubleRoomNumbers).toEqual(expectedDoubleNumbers);
  });

  it('excludes Single Room from online availability search but includes it in walk-in search', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];

    // Online search (default)
    const onlineResults = searchAvailability(checkIn, checkOut, 1, 0, 1, 'online');
    const hasSingleOnline = onlineResults.some((r) => r.category.id === 'cat-single-04' || r.category.slug === 'single-room');
    expect(hasSingleOnline).toBe(false);

    // Walk-in search
    const walkInResults = searchAvailability(checkIn, checkOut, 1, 0, 1, 'walk_in');
    const hasSingleWalkIn = walkInResults.some((r) => r.category.id === 'cat-single-04' || r.category.slug === 'single-room');
    expect(hasSingleWalkIn).toBe(true);
  });

  it('normalizes single room category identifiers to cat-single-04', () => {
    expect(normalizeCategoryId('cat-single-04')).toBe('cat-single-04');
    expect(normalizeCategoryId('single-room')).toBe('cat-single-04');
    expect(normalizeCategoryId('single')).toBe('cat-single-04');
  });
  it('enforces exact authoritative room tariffs for Double, Four Bed, Suite, and Single rooms', () => {
    const categories = repo.getCategories();
    
    const doubleCat = categories.find((c) => c.id === 'cat-double-03');
    expect(doubleCat).toBeDefined();
    expect(doubleCat?.base_price_per_night).toBe(1800);
    expect(doubleCat?.base_tariff_paise).toBe(180000);

    const fourBedCat = categories.find((c) => c.id === 'cat-four-bed-02');
    expect(fourBedCat).toBeDefined();
    expect(fourBedCat?.base_price_per_night).toBe(2800);
    expect(fourBedCat?.base_tariff_paise).toBe(280000);

    const suiteCat = categories.find((c) => c.id === 'cat-suite-01');
    expect(suiteCat).toBeDefined();
    expect(suiteCat?.base_price_per_night).toBe(3300);
    expect(suiteCat?.base_tariff_paise).toBe(330000);

    const singleCat = categories.find((c) => c.id === 'cat-single-04');
    expect(singleCat).toBeDefined();
    expect(singleCat?.base_price_per_night).toBe(900);
    expect(singleCat?.base_tariff_paise).toBe(90000);
  });
});