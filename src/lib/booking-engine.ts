import { repo } from '@/lib/db/repository';
import { RoomCategory } from '@/types';
import {
  calculateBookingTariff,
  normalizeCategoryId,
  calculateBillingPeriods,
} from '@/lib/pricing';

export interface AvailabilityResult {
  category: RoomCategory;
  totalRooms: number;
  availableRooms: number;
  isAvailable: boolean;
  nights: number;
  pricePerNight: number;
  roomCharges: number;
  extraPersonsCount: number;
  extraPersonCharges: number;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  tariffSourceDate: string;
  tariffSourceDocument: string;
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
  requestedRooms: number = 1,
  adultsCount: number = 1,
  childrenCount: number = 0
): AvailabilityResult {
  cleanExpiredHolds();

  // Inverted date check
  const checkInTime = new Date(checkIn).getTime();
  const checkOutTime = new Date(checkOut).getTime();
  if (isNaN(checkInTime) || isNaN(checkOutTime) || checkOutTime <= checkInTime) {
    const categories = repo.getCategories();
    const cat = categories.find((c) => c.id === categoryId || c.slug === categoryId) || categories[0];
    return {
      category: cat,
      totalRooms: 0,
      availableRooms: 0,
      isAvailable: false,
      nights: 0,
      pricePerNight: cat.base_price_per_night,
      roomCharges: 0,
      extraPersonsCount: 0,
      extraPersonCharges: 0,
      subtotal: 0,
      taxPercentage: 0,
      taxAmount: 0,
      totalAmount: 0,
      tariffSourceDate: new Date().toISOString().split('T')[0],
      tariffSourceDocument: 'Invalid date sequence: check-out must be strictly after check-in',
    };
  }

  const normalizedId = normalizeCategoryId(categoryId);
  const categories = repo.getCategories();
  const category =
    categories.find(
      (c) => c.id === categoryId || c.id === normalizedId || c.slug === categoryId
    ) || categories[0];

  if (!category) {
    throw new Error(`Category ${categoryId} not found`);
  }

  // 1. Get total physical rooms for this category
  const allCategoryRooms = repo.getRooms().filter(
    (r) =>
      (r.category_id === category.id ||
        normalizeCategoryId(r.category_id) === normalizedId) &&
      r.is_active
  );
  const totalPhysicalRooms = allCategoryRooms.length;

  // 2. Count rooms unavailable due to maintenance or out of service
  const maintenanceCount = allCategoryRooms.filter(
    (r) =>
      r.operational_status === 'maintenance' ||
      r.operational_status === 'out_of_service'
  ).length;

  // 3. Count overlapping active bookings for this category
  const overlappingBookings = repo.getBookings().filter((b) => {
    if (b.status === 'cancelled' || b.status === 'no_show') return false;
    if (
      b.category_id !== category.id &&
      normalizeCategoryId(b.category_id) !== normalizedId
    ) {
      return false;
    }
    return datesOverlap(checkIn, checkOut, b.check_in_date, b.check_out_date);
  });

  const bookedRoomsCount = overlappingBookings.reduce(
    (sum, b) => sum + (b.rooms_count || 1),
    0
  );

  // 4. Count overlapping active holds
  let holdRoomsCount = 0;
  for (const hold of activeHolds.values()) {
    if (
      (hold.categoryId === category.id ||
        normalizeCategoryId(hold.categoryId) === normalizedId) &&
      datesOverlap(checkIn, checkOut, hold.checkIn, hold.checkOut)
    ) {
      holdRoomsCount += hold.roomsCount;
    }
  }

  // 5. Calculate net available rooms
  const occupiedOrBlocked = maintenanceCount + bookedRoomsCount + holdRoomsCount;
  const availableRooms = Math.max(0, totalPhysicalRooms - occupiedOrBlocked);
  const hasRooms = availableRooms >= requestedRooms;

  // 6. Authoritative Pricing calculation via pricing.ts
  const settings = repo.getSettings();
  const tariffCalc = calculateBookingTariff({
    categoryId: category.id,
    checkIn,
    checkOut,
    roomsCount: requestedRooms,
    adultsCount,
    childrenCount,
    customRatePaise: category.base_tariff_paise,
    taxPercentage: settings.tax_percentage || 0,
  });

  const isAvailable = hasRooms && tariffCalc.isValid;

  return {
    category,
    totalRooms: totalPhysicalRooms,
    availableRooms,
    isAvailable,
    nights: tariffCalc.billingPeriods,
    pricePerNight: tariffCalc.roomTariffRateRupees,
    roomCharges: tariffCalc.roomChargesRupees,
    extraPersonsCount: tariffCalc.extraPersonsCount,
    extraPersonCharges: tariffCalc.extraPersonChargesRupees,
    subtotal: tariffCalc.subtotalRupees,
    taxPercentage: tariffCalc.taxPercentage,
    taxAmount: tariffCalc.taxAmountRupees,
    totalAmount: tariffCalc.totalRupees,
    tariffSourceDate: tariffCalc.tariffSourceDate,
    tariffSourceDocument: tariffCalc.tariffSourceDocument,
  };
}

export function searchAvailability(
  checkIn: string,
  checkOut: string,
  adults: number = 1,
  children: number = 0,
  roomsCount: number = 1
): AvailabilityResult[] {
  const categories = repo.getCategories().filter((c) => c.is_active);

  return categories.map((cat) => {
    return checkCategoryAvailability(
      cat.id,
      checkIn,
      checkOut,
      roomsCount,
      adults,
      children
    );
  });
}
