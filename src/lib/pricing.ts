/**
 * ==============================================================================
 * SRI TAYI GRAND HOTEL - AUTHORITATIVE PRICING & TARIFF CONFIGURATION
 * ==============================================================================
 * 
 * Source: Owner-Supplied Tariff Card
 * Tariff Card Date: 01-09-2023 (Strict Historical Source Date)
 * Note: Recorded as the source date; not presented as a newly verified tariff date.
 * 
 * Authoritative Tariffs (in Indian Rupees & Integer Paise):
 * ------------------------------------------------------------------------------
 * 1. Double Room    | AC | Included: 2 persons | ₹1,800  (180,000 paise)
 * 2. Four Bed Room  | AC | Included: 4 persons | ₹2,800  (280,000 paise)
 * 3. Suite Room     | AC | Included: 2 persons | ₹3,300  (330,000 paise)
 * 4. Extra Person   | AC | Subject to capacity | ₹300    (30,000 paise)
 * ------------------------------------------------------------------------------
 * General Starting Rate: "Rooms from ₹1,800" (Subject to availability).
 * Unpriced services (Convention Hall, Catering, etc.): "Contact us for a quote".
 */

export const TARIFF_SOURCE_DATE = '01-09-2023';
export const TARIFF_SOURCE_DOCUMENT = 'Owner Tariff Card dated 01-09-2023';

// Integer Paise Constants (1 Rupee = 100 Paise)
export const DOUBLE_ROOM_PAISE = 180000;    // ₹1,800
export const FOUR_BED_ROOM_PAISE = 280000; // ₹2,800
export const SUITE_ROOM_PAISE = 330000;    // ₹3,300
export const EXTRA_PERSON_PAISE = 30000;   // ₹300

// In Rupee integer units
export const DOUBLE_ROOM_RUPEES = 1800;
export const FOUR_BED_ROOM_RUPEES = 2800;
export const SUITE_ROOM_RUPEES = 3300;
export const EXTRA_PERSON_RUPEES = 300;

export const STARTING_PRICE_RUPEES = 1800;
export const STARTING_PRICE_LABEL = 'Rooms from ₹1,800';
export const STARTING_PRICE_DISCLAIMER = 'Subject to availability';

export type BillingPeriodUnit = 'night' | 'day' | '24_hour';
export type ExtraPersonChargeFrequency = 'per_billing_period' | 'per_stay';

export interface AuthoritativeRoomCategoryTariff {
  id: string;
  slug: string;
  name: string;
  airConditioning: true;
  includedOccupancy: number;
  maxPermittedOccupancy: number;
  baseTariffPaise: number;
  baseTariffRupees: number;
  extraPersonTariffPaise: number;
  extraPersonTariffRupees: number;
  bedType: string;
  shortDescription: string;
  fullDescription: string;
  coverImageUrl: string;
  galleryImages: string[];
  amenities: string[];
  features: string[];
}

export const AUTHORITATIVE_ROOM_TARIFFS: Record<string, AuthoritativeRoomCategoryTariff> = {
  'cat-double-03': {
    id: 'cat-double-03',
    slug: 'double-room',
    name: 'Double Room',
    airConditioning: true,
    includedOccupancy: 2,
    maxPermittedOccupancy: 3,
    baseTariffPaise: DOUBLE_ROOM_PAISE,
    baseTariffRupees: DOUBLE_ROOM_RUPEES,
    extraPersonTariffPaise: EXTRA_PERSON_PAISE,
    extraPersonTariffRupees: EXTRA_PERSON_RUPEES,
    bedType: 'King Bed / Twin Beds',
    shortDescription: 'Spacious air-conditioned accommodation with premium bedding, modern ensuite bath, and ambient lighting for up to 3 persons.',
    fullDescription: 'Designed for couples, business travellers, and small families visiting Kadiri. Features individual climate control, plush king or twin bedding with upholstered headboards, high-speed Wi-Fi, 24/7 hot water, smart entertainment, and work desk.',
    coverImageUrl: '/images/hotel/room-double-bed-photo-enhanced.png',
    galleryImages: [
      '/images/hotel/room-double-bed-photo-enhanced.png',
      '/images/hotel/room-twin-render-enhanced.png',
      '/images/hotel/room-headboard-detail-photo-enhanced.png',
      '/images/hotel/room-corner-photo-enhanced.png',
      '/images/hotel/suite-bathroom.jpg',
    ],
    amenities: [
      'Fully AC',
      'High-Speed Wi-Fi',
      'Smart TV',
      'Attached Bathroom',
      '24/7 Hot Water',
      'Wardrobe & Luggage Space',
    ],
    features: [
      'Included occupancy: 2 persons',
      'Permits 1 extra person (₹300)',
      'Plush bedding with acoustic headboard',
      'Dedicated work desk and dressing corner',
    ],
  },
  'cat-four-bed-02': {
    id: 'cat-four-bed-02',
    slug: 'four-bed-room',
    name: 'Four Bed Room',
    airConditioning: true,
    includedOccupancy: 4,
    maxPermittedOccupancy: 5,
    baseTariffPaise: FOUR_BED_ROOM_PAISE,
    baseTariffRupees: FOUR_BED_ROOM_RUPEES,
    extraPersonTariffPaise: EXTRA_PERSON_PAISE,
    extraPersonTariffRupees: EXTRA_PERSON_RUPEES,
    bedType: '4 Beds (Family Configuration)',
    shortDescription: 'Generous family accommodation with 4 comfortable beds, air-conditioning, and expansive space for up to 5 persons.',
    fullDescription: 'Tailored for traveling families, temple pilgrims, and group companions visiting Kadiri. Offers 4 comfortable beds with premium linens, individual climate control, high-speed Wi-Fi, spacious ensuite bathroom with geyser hot water, and generous luggage storage.',
    coverImageUrl: '/images/hotel/room-twin-render-enhanced.png',
    galleryImages: [
      '/images/hotel/room-twin-render-enhanced.png',
      '/images/hotel/room-double-bed-photo-enhanced.png',
      '/images/hotel/room-corner-photo-enhanced.png',
      '/images/hotel/room-headboard-detail-photo-enhanced.png',
      '/images/hotel/suite-bathroom.jpg',
    ],
    amenities: [
      'Fully AC',
      'High-Speed Wi-Fi',
      'Smart TV',
      'Attached Bathroom',
      '24/7 Hot Water',
      'Spacious Wardrobes',
    ],
    features: [
      'Included occupancy: 4 persons',
      'Permits 1 extra person (₹300)',
      '4 individual comfortable beds',
      'Expansive floor layout for families',
    ],
  },
  'cat-suite-01': {
    id: 'cat-suite-01',
    slug: 'suite-room',
    name: 'Suite Room',
    airConditioning: true,
    includedOccupancy: 2,
    maxPermittedOccupancy: 4,
    baseTariffPaise: SUITE_ROOM_PAISE,
    baseTariffRupees: SUITE_ROOM_RUPEES,
    extraPersonTariffPaise: EXTRA_PERSON_PAISE,
    extraPersonTariffRupees: EXTRA_PERSON_RUPEES,
    bedType: 'Plush King Bed & Living Lounge',
    shortDescription: 'Spacious luxury suite with dedicated living lounge, plush king bed, private balcony, and climate control for up to 4 persons.',
    fullDescription: 'Our premier accommodation offering a gracious blend of executive elegance and serene comfort. Features a plush king bed, dedicated living lounge with luxury armchairs, attached modern ensuite bathroom with premium fittings, and private balcony overlooking peaceful surroundings.',
    coverImageUrl: '/images/hotel/room-suite-bed-photo-enhanced.png',
    galleryImages: [
      '/images/hotel/room-suite-bed-photo-enhanced.png',
      '/images/hotel/suite-seating-photo-enhanced.png',
      '/images/hotel/room-headboard-detail-photo-enhanced.png',
      '/images/hotel/room-corner-photo-enhanced.png',
      '/images/hotel/suite-balcony-seating.jpg',
      '/images/hotel/suite-bathroom.jpg',
    ],
    amenities: [
      'Fully AC',
      'High-Speed Wi-Fi',
      'Smart TV',
      'Tea / Coffee Maker',
      'Attached Bathroom',
      'Private Balcony',
      '24/7 Hot Water',
      'Wardrobe & Living Space',
    ],
    features: [
      'Included occupancy: 2 persons',
      'Permits up to 2 extra persons (₹300 each)',
      'Dedicated executive living lounge',
      'Private balcony with panoramic aspect',
    ],
  },
};

/**
 * Normalizes any category ID or URL slug to its canonical category ID.
 * Preserves backward compatibility with legacy aliases (cat-double-bed-02, cat-single-04, etc.)
 */
export function normalizeCategoryId(identifier?: string | null): string {
  if (!identifier) return 'cat-double-03';
  const clean = identifier.trim().toLowerCase();

  // Suite
  if (clean === 'cat-suite-01' || clean === 'suite-room' || clean === 'suite') {
    return 'cat-suite-01';
  }

  // Four Bed Room (also aliases legacy single-bed if requested)
  if (
    clean === 'cat-four-bed-02' ||
    clean === 'four-bed-room' ||
    clean === 'four-bed' ||
    clean === 'cat-single-04' ||
    clean === 'single-bed-room'
  ) {
    return 'cat-four-bed-02';
  }

  // Double Room (default, aliases cat-double-bed-02 and double-room)
  if (
    clean === 'cat-double-03' ||
    clean === 'double-room' ||
    clean === 'cat-double-bed-02' ||
    clean === 'double-bed-room' ||
    clean === 'cat-double-01' || clean === 'deluxe-ac' || clean === 'deluxe' || clean === 'standard-ac' || clean === 'standard'
  ) {
    return 'cat-double-03';
  }

  // Direct match in registry
  if (AUTHORITATIVE_ROOM_TARIFFS[clean]) {
    return clean;
  }

  return 'cat-double-03';
}

/**
 * Retrieves the authoritative tariff for any category ID or slug.
 */
export function getAuthoritativeTariff(identifier?: string | null): AuthoritativeRoomCategoryTariff {
  const normalizedId = normalizeCategoryId(identifier);
  return AUTHORITATIVE_ROOM_TARIFFS[normalizedId] || AUTHORITATIVE_ROOM_TARIFFS['cat-double-03'];
}

/**
 * Multi-room guest allocation and occupancy limits checker.
 * Assigns guests across rooms before calculating extra persons.
 */
export interface RoomOccupancyAllocation {
  isPermitted: boolean;
  errorMessage?: string;
  roomsCount: number;
  totalGuests: number;
  includedGuestsTotal: number;
  maxPermittedGuestsTotal: number;
  extraPersonsCount: number;
  roomDistribution: Array<{
    roomIndex: number;
    assignedGuests: number;
    includedGuests: number;
    extraGuests: number;
  }>;
}

export function allocateGuestsToRooms(
  roomsCount: number,
  totalGuests: number,
  includedPerRoom: number,
  maxPermittedPerRoom: number
): RoomOccupancyAllocation {
  const rooms = Math.max(1, roomsCount);
  const guests = Math.max(1, totalGuests);
  const includedTotal = rooms * includedPerRoom;
  const maxTotal = rooms * maxPermittedPerRoom;

  if (guests > maxTotal) {
    return {
      isPermitted: false,
      errorMessage: `Selected ${rooms} room(s) can accommodate at most ${maxTotal} guests (${maxPermittedPerRoom} per room). Please increase room quantity.`,
      roomsCount: rooms,
      totalGuests: guests,
      includedGuestsTotal: includedTotal,
      maxPermittedGuestsTotal: maxTotal,
      extraPersonsCount: 0,
      roomDistribution: [],
    };
  }

  const extraPersonsCount = Math.max(0, guests - includedTotal);

  // Distribute guests across individual rooms
  const basePerRoom = Math.floor(guests / rooms);
  let remainder = guests % rooms;

  const roomDistribution = Array.from({ length: rooms }, (_, idx) => {
    const assigned = basePerRoom + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    const extraInThisRoom = Math.max(0, assigned - includedPerRoom);
    return {
      roomIndex: idx + 1,
      assignedGuests: assigned,
      includedGuests: Math.min(assigned, includedPerRoom),
      extraGuests: extraInThisRoom,
    };
  });

  return {
    isPermitted: true,
    roomsCount: rooms,
    totalGuests: guests,
    includedGuestsTotal: includedTotal,
    maxPermittedGuestsTotal: maxTotal,
    extraPersonsCount,
    roomDistribution,
  };
}

/**
 * Calculates billing periods (standard hotel nights) between check-in and check-out.
 */
export function calculateBillingPeriods(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, isNaN(diffDays) ? 1 : diffDays);
}

export interface BookingTariffCalculation {
  isValid: boolean;
  errorMessage?: string;
  category: AuthoritativeRoomCategoryTariff;
  billingPeriods: number;
  billingUnit: BillingPeriodUnit;
  roomsCount: number;
  adultsCount: number;
  childrenCount: number;
  totalGuests: number;
  includedOccupancyTotal: number;
  maxPermittedOccupancyTotal: number;
  extraPersonsCount: number;
  
  // Monetary values in Integer Paise
  roomTariffRatePaise: number;
  extraPersonTariffRatePaise: number;
  roomChargesPaise: number;
  extraPersonChargesPaise: number;
  subtotalPaise: number;
  taxPercentage: number;
  taxAmountPaise: number;
  totalPaise: number;

  // Monetary values in Indian Rupees (Paise / 100)
  roomTariffRateRupees: number;
  extraPersonTariffRateRupees: number;
  roomChargesRupees: number;
  extraPersonChargesRupees: number;
  subtotalRupees: number;
  taxAmountRupees: number;
  totalRupees: number;

  // Formatted rupee strings for direct UI rendering
  formatted: {
    roomRate: string;
    extraPersonRate: string;
    roomCharges: string;
    extraPersonCharges: string;
    subtotal: string;
    tax: string;
    total: string;
  };

  tariffSourceDate: string;
  tariffSourceDocument: string;
}

export function formatRupees(val: number): string {
  return '₹' + val.toLocaleString('en-IN');
}

/**
 * Authoritative Server-Side Tariff Calculator.
 * Enforces integer paise arithmetic, guest allocation, and configurable billing rules.
 * Does not invent GST percentages; applies configured tax if present, otherwise 0.
 */
export function calculateBookingTariff(params: {
  categoryId: string;
  checkIn: string;
  checkOut: string;
  roomsCount?: number;
  adultsCount?: number;
  childrenCount?: number;
  customRatePaise?: number;
  taxPercentage?: number;
  billingUnit?: BillingPeriodUnit;
  extraPersonFrequency?: ExtraPersonChargeFrequency;
}): BookingTariffCalculation {
  const category = getAuthoritativeTariff(params.categoryId);
  const roomsCount = Math.max(1, Number(params.roomsCount) || 1);
  const adultsCount = Math.max(1, Number(params.adultsCount) || 1);
  const childrenCount = Math.max(0, Number(params.childrenCount) || 0);
  const totalGuests = adultsCount + childrenCount;

  // Inverted / invalid date check
  const dIn = new Date(params.checkIn);
  const dOut = new Date(params.checkOut);
  const isInvalidDate = isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut.getTime() <= dIn.getTime();
  if (isInvalidDate) {
    return {
      isValid: false,
      errorMessage: 'Check-out date must be strictly after check-in date.',
      category,
      billingPeriods: 0,
      billingUnit: 'night',
      roomsCount,
      adultsCount,
      childrenCount,
      totalGuests,
      includedOccupancyTotal: roomsCount * category.includedOccupancy,
      maxPermittedOccupancyTotal: roomsCount * category.maxPermittedOccupancy,
      extraPersonsCount: 0,
      roomTariffRatePaise: category.baseTariffPaise,
      extraPersonTariffRatePaise: category.extraPersonTariffPaise,
      roomChargesPaise: 0,
      extraPersonChargesPaise: 0,
      subtotalPaise: 0,
      taxPercentage: 0,
      taxAmountPaise: 0,
      totalPaise: 0,
      roomTariffRateRupees: category.baseTariffRupees,
      extraPersonTariffRateRupees: category.extraPersonTariffRupees,
      roomChargesRupees: 0,
      extraPersonChargesRupees: 0,
      subtotalRupees: 0,
      taxAmountRupees: 0,
      totalRupees: 0,
      formatted: {
        roomRate: formatRupees(category.baseTariffRupees),
        extraPersonRate: formatRupees(category.extraPersonTariffRupees),
        roomCharges: formatRupees(0),
        extraPersonCharges: formatRupees(0),
        subtotal: formatRupees(0),
        tax: formatRupees(0),
        total: formatRupees(0),
      },
      tariffSourceDate: TARIFF_SOURCE_DATE,
      tariffSourceDocument: TARIFF_SOURCE_DOCUMENT,
    };
  }

  const billingPeriods = calculateBillingPeriods(params.checkIn, params.checkOut);
  const billingUnit: BillingPeriodUnit = params.billingUnit || 'night';
  const extraPersonFrequency: ExtraPersonChargeFrequency = params.extraPersonFrequency || 'per_billing_period';

  // Multi-room occupancy allocation
  const allocation = allocateGuestsToRooms(
    roomsCount,
    totalGuests,
    category.includedOccupancy,
    category.maxPermittedOccupancy
  );

  const roomTariffRatePaise = params.customRatePaise !== undefined 
    ? params.customRatePaise 
    : category.baseTariffPaise;

  const extraPersonTariffRatePaise = category.extraPersonTariffPaise;

  // Room charges: (base rate) * roomsCount * billingPeriods
  const roomChargesPaise = roomTariffRatePaise * roomsCount * billingPeriods;

  // Extra person charges: only for permitted additional occupants
  let extraPersonChargesPaise = 0;
  if (allocation.isPermitted && allocation.extraPersonsCount > 0) {
    if (extraPersonFrequency === 'per_billing_period') {
      extraPersonChargesPaise = allocation.extraPersonsCount * extraPersonTariffRatePaise * billingPeriods;
    } else {
      extraPersonChargesPaise = allocation.extraPersonsCount * extraPersonTariffRatePaise;
    }
  }

  const subtotalPaise = roomChargesPaise + extraPersonChargesPaise;

  // Tax calculation: only applied if a valid tax percentage is configured (default 0)
  const taxPercentage = typeof params.taxPercentage === 'number' && !isNaN(params.taxPercentage) && params.taxPercentage > 0
    ? params.taxPercentage
    : 0;

  const taxAmountPaise = taxPercentage > 0
    ? Math.round((subtotalPaise * taxPercentage) / 100)
    : 0;

  const totalPaise = subtotalPaise + taxAmountPaise;

  // Rupee conversions
  const roomTariffRateRupees = roomTariffRatePaise / 100;
  const extraPersonTariffRateRupees = extraPersonTariffRatePaise / 100;
  const roomChargesRupees = roomChargesPaise / 100;
  const extraPersonChargesRupees = extraPersonChargesPaise / 100;
  const subtotalRupees = subtotalPaise / 100;
  const taxAmountRupees = taxAmountPaise / 100;
  const totalRupees = totalPaise / 100;


  return {
    isValid: allocation.isPermitted,
    errorMessage: allocation.errorMessage,
    category,
    billingPeriods,
    billingUnit,
    roomsCount,
    adultsCount,
    childrenCount,
    totalGuests,
    includedOccupancyTotal: allocation.includedGuestsTotal,
    maxPermittedOccupancyTotal: allocation.maxPermittedGuestsTotal,
    extraPersonsCount: allocation.extraPersonsCount,

    roomTariffRatePaise,
    extraPersonTariffRatePaise,
    roomChargesPaise,
    extraPersonChargesPaise,
    subtotalPaise,
    taxPercentage,
    taxAmountPaise,
    totalPaise,

    roomTariffRateRupees,
    extraPersonTariffRateRupees,
    roomChargesRupees,
    extraPersonChargesRupees,
    subtotalRupees,
    taxAmountRupees,
    totalRupees,

    formatted: {
      roomRate: formatRupees(roomTariffRateRupees),
      extraPersonRate: formatRupees(extraPersonTariffRateRupees),
      roomCharges: formatRupees(roomChargesRupees),
      extraPersonCharges: formatRupees(extraPersonChargesRupees),
      subtotal: formatRupees(subtotalRupees),
      tax: formatRupees(taxAmountRupees),
      total: formatRupees(totalRupees),
    },

    tariffSourceDate: TARIFF_SOURCE_DATE,
    tariffSourceDocument: TARIFF_SOURCE_DOCUMENT,
  };
}
