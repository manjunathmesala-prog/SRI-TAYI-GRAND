import { repo } from '@/lib/db/repository';
import { RoomCategory } from '@/types';

export interface AvailabilityResult {
  category: RoomCategory;
  totalRooms: number;
  availableRooms: number;
  isAvailable: boolean;
  nights: number;
  pricePerNight: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export interface BookingHold {
  id: string;
  sessionId: string;
  categoryId: string;
  checkIn: string;
  checkOut: string;
  roomsCount: number;
  expiresAt: number;
}

// In-memory hold storage with 15-minute lease
const activeHolds = new Map<string, BookingHold>();

export function createBookingHold(
  sessionId: string,
  categoryId: string,
  checkIn: string,
  checkOut: string,
  roomsCount: number
): BookingHold | null {
  cleanExpiredHolds();

  const avail = checkCategoryAvailability(categoryId, checkIn, checkOut, roomsCount);
  if (!avail.isAvailable) {
    return null;
  }

  const hold: BookingHold = {
    id: `hold-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sessionId,
    categoryId,
    checkIn,
    checkOut,
    roomsCount,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes lease
  };

  activeHolds.set(hold.id, hold);
  return hold;
}

export function releaseBookingHold(holdId: string): void {
  activeHolds.delete(holdId);
}

function cleanExpiredHolds(): void {
  const now = Date.now();
  for (const [id, hold] of activeHolds.entries()) {
    if (hold.expiresAt <= now) {
      activeHolds.delete(id);
    }
  }
}

function calculateNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, isNaN(diffDays) ? 1 : diffDays);
}

function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

export function checkCategoryAvailability(
  categoryId: string,
  checkIn: string,
  checkOut: string,
  requestedRooms: number = 1
): AvailabilityResult {
  cleanExpiredHolds();

  const category = repo.getCategories().find((c) => c.id === categoryId);
  if (!category) {
    throw new Error(`Category ${categoryId} not found`);
  }

  // 1. Get total physical rooms for this category
  const allCategoryRooms = repo.getRooms().filter((r) => r.category_id === categoryId && r.is_active);
  const totalPhysicalRooms = allCategoryRooms.length;

  // 2. Count rooms unavailable due to maintenance or out of service
  const maintenanceCount = allCategoryRooms.filter(
    (r) => r.operational_status === 'maintenance' || r.operational_status === 'out_of_service'
  ).length;

  // 3. Count overlapping active bookings for this category
  const overlappingBookings = repo.getBookings().filter((b) => {
    if (b.status === 'cancelled' || b.status === 'no_show') return false;
    if (b.category_id !== categoryId) return false;
    return datesOverlap(checkIn, checkOut, b.check_in_date, b.check_out_date);
  });

  const bookedRoomsCount = overlappingBookings.reduce((sum, b) => sum + (b.rooms_count || 1), 0);

  // 4. Count overlapping active holds
  let holdRoomsCount = 0;
  for (const hold of activeHolds.values()) {
    if (hold.categoryId === categoryId && datesOverlap(checkIn, checkOut, hold.checkIn, hold.checkOut)) {
      holdRoomsCount += hold.roomsCount;
    }
  }

  // 5. Calculate net available
  const occupiedOrBlocked = maintenanceCount + bookedRoomsCount + holdRoomsCount;
  const availableRooms = Math.max(0, totalPhysicalRooms - occupiedOrBlocked);
  const isAvailable = availableRooms >= requestedRooms;

  // 6. Pricing calculations
  const settings = repo.getSettings();
  const nights = calculateNights(checkIn, checkOut);
  const pricePerNight = category.base_price_per_night;
  const subtotal = pricePerNight * nights * requestedRooms;
  const taxAmount = Number(((subtotal * settings.tax_percentage) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  return {
    category,
    totalRooms: totalPhysicalRooms,
    availableRooms,
    isAvailable,
    nights,
    pricePerNight,
    subtotal,
    taxAmount,
    totalAmount,
  };
}

export function searchAvailability(
  checkIn: string,
  checkOut: string,
  adults: number = 1,
  children: number = 0,
  roomsCount: number = 1
): AvailabilityResult[] {
  const totalGuests = adults + children;
  const categories = repo.getCategories().filter((c) => c.is_active);

  return categories.map((cat) => {
    const avail = checkCategoryAvailability(cat.id, checkIn, checkOut, roomsCount);
    // Accommodate guest capacity check
    const fitsGuests = cat.max_occupancy * roomsCount >= totalGuests;
    return {
      ...avail,
      isAvailable: avail.isAvailable && fitsGuests,
    };
  });
}
