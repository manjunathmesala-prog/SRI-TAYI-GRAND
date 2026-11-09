// ==============================================================================
// SRI TAYI GRAND - SAFE ASYNCHRONOUS RFID TAP HISTORY & AUDIT TRAIL ENGINE
// Non-Blocking • Zero Throw Propagation • Active Stay Linking • Append-Only
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { repo } from '@/lib/db/repository';
import { supabase } from '@/lib/supabase/client';
import {
  RfidTapHistoryRecord,
  RfidHistoryCardType,
  RfidHistoryAccessResult,
  RfidStaySummaryMetrics,
  RfidTapHistoryQueryFilters,
} from '@/types/rfid-history';
import { Booking } from '@/types';

// In-memory cache for ultra-fast query performance
let memoryTapHistory: RfidTapHistoryRecord[] = [];
let isInitialized = false;

function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(fs && fs.existsSync);
}

function getStoragePaths() {
  if (!isServerEnvironment()) return null;
  const DATA_DIR = path.join(process.cwd(), 'data');
  const HISTORY_FILE = path.join(DATA_DIR, 'rfid_tap_history.json');
  return { DATA_DIR, HISTORY_FILE };
}

/**
 * Loads existing tap history from disk on boot
 */
function loadPersistedHistory(): RfidTapHistoryRecord[] {
  const paths = getStoragePaths();
  if (!paths) return [];

  try {
    if (fs.existsSync(paths.HISTORY_FILE)) {
      const raw = fs.readFileSync(paths.HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[RFID TAP LOGGER] Could not read rfid_tap_history.json:', err);
  }
  return [];
}

/**
 * Persists updated tap history to disk (Append-only storage)
 */
function persistTapRecord(record: RfidTapHistoryRecord): void {
  const paths = getStoragePaths();
  if (!paths) return;

  try {
    if (!fs.existsSync(paths.DATA_DIR)) {
      fs.mkdirSync(paths.DATA_DIR, { recursive: true });
    }

    // Read latest array, append record, and write atomically
    let currentList: RfidTapHistoryRecord[] = [];
    if (fs.existsSync(paths.HISTORY_FILE)) {
      try {
        const raw = fs.readFileSync(paths.HISTORY_FILE, 'utf-8');
        currentList = JSON.parse(raw);
        if (!Array.isArray(currentList)) currentList = [];
      } catch {
        currentList = [];
      }
    }

    currentList.push(record);
    fs.writeFileSync(paths.HISTORY_FILE, JSON.stringify(currentList, null, 2), 'utf-8');
  } catch (err) {
    console.error('[RFID TAP LOGGER DISK ERROR] Failed to write tap history:', err);
  }
}

/**
 * Initialize memory cache on first access
 */
function ensureInitialized() {
  if (!isInitialized) {
    memoryTapHistory = loadPersistedHistory();
    isInitialized = true;
  }
}

/**
 * Optional Supabase sync for cloud redundancy
 */
async function syncToSupabaseAsync(record: RfidTapHistoryRecord): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes('placeholder') || url.includes('your-supabase-project')) {
    return;
  }

  try {
    const { error } = await supabase.from('rfid_tap_history').insert({
      id: record.id,
      card_uid: record.cardUid,
      card_type: record.cardType,
      room_number: record.roomNumber,
      booking_id: record.bookingId,
      customer_id: record.customerId,
      customer_name: record.customerName,
      access_result: record.accessResult,
      door_status: record.doorStatus,
      reason: record.reason || null,
      metadata: record.metadata || {},
      tapped_at: record.tappedAt,
    });

    if (error) {
      console.warn('[RFID SUPABASE SYNC WARN]', error.message);
    }
  } catch (err) {
    console.warn('[RFID SUPABASE SYNC ERROR]', err);
  }
}

/**
 * Normalizes card type into strictly defined enum
 */
function normalizeCardType(cardTypeRaw?: string, cardUid?: string): RfidHistoryCardType {
  const raw = (cardTypeRaw || '').toLowerCase();
  const uid = (cardUid || '').toUpperCase();

  if (raw === 'super_admin' || raw === 'master' || uid.startsWith('SA-')) {
    return 'MASTER';
  }
  if (raw === 'cleaner' || raw === 'housekeeping' || raw === 'staff' || uid.startsWith('CLN-')) {
    return 'STAFF';
  }
  if (raw === 'maintenance' || uid.startsWith('MNT-')) {
    return 'MAINTENANCE';
  }
  return 'GUEST';
}

/**
 * Normalizes security access result into strictly defined enum
 */
function normalizeAccessResult(
  isSuccess: boolean,
  message?: string,
  rawResult?: string
): RfidHistoryAccessResult {
  if (isSuccess) return 'GRANTED';

  const text = `${message || ''} ${rawResult || ''}`.toLowerCase();
  if (text.includes('expired') || text.includes('checkout time passed')) {
    return 'EXPIRED';
  }
  if (text.includes('belongs to room') || text.includes('cross-room') || text.includes('wrong room')) {
    return 'WRONG_ROOM';
  }
  return 'DENIED';
}

export interface RecordTapInput {
  cardUid: string;
  roomNumber: string | number;
  result: {
    success: boolean;
    message?: string;
    cardType?: string;
    roomStatus?: string;
    housekeepingStatus?: string;
    event?: any;
    reason?: string;
  };
  cardType?: string;
  customTimestamp?: string;
}

/**
 * STEP 2: Non-blocking, isolated logging utility
 * Automatically resolves active guest stay and captures full audit snapshot
 * Zero Throw Guarantee: Never throws an uncaught error back to caller
 */
export async function recordRfidTapAsync(input: RecordTapInput): Promise<RfidTapHistoryRecord | null> {
  try {
    ensureInitialized();

    const roomNumberStr = String(input.roomNumber || '').trim();
    const cardUidStr = String(input.cardUid || '').trim();
    const tapTimestamp = input.customTimestamp || new Date().toISOString();
    const tapEpoch = new Date(tapTimestamp).getTime();

    // 1. Resolve registered card details from repository
    const registeredCards = repo.getRFIDCards();
    const cardRecord = registeredCards.find(
      (c) => c.card_uid.toLowerCase() === cardUidStr.toLowerCase()
    );

    // 2. Resolve Card Type
    const resolvedCardType = normalizeCardType(
      input.cardType || input.result.cardType || cardRecord?.card_type,
      cardUidStr
    );

    // 3. Resolve Access Result
    const resolvedResult = normalizeAccessResult(
      input.result.success,
      input.result.message || input.result.reason,
      input.result.event?.event_type
    );

    // 4. Resolve Door Status
    let doorStatus = input.result.success ? 'UNLOCKED' : 'LOCKED';
    if (resolvedCardType === 'STAFF' && input.result.event?.action_type === 'cleaning_completed') {
      doorStatus = 'LOCKED (CLEAN)';
    }

    // 5. Active Stay Resolution: Link tap to active checked-in Customer and Booking ID
    let linkedBooking: Booking | null = null;

    // Check by card's assigned booking reference first
    const cardBookingRef = cardRecord?.booking_reference;
    if (cardBookingRef) {
      const match = repo.getBookingByReference(cardBookingRef) || repo.getBookingById(cardBookingRef);
      if (match) {
        linkedBooking = match;
      }
    }

    // If not linked via card reference, search active bookings for this room number
    if (!linkedBooking) {
      const allBookings = repo.getBookings();
      // Match room number and time window
      const activeMatch = allBookings.find((b) => {
        const matchesRoom =
          b.assigned_room_number === roomNumberStr ||
          b.room_number === roomNumberStr;
        if (!matchesRoom) return false;

        // Check if currently checked in
        if (b.status === 'checked_in') return true;

        // Check if tap occurred between guest check-in and check-out window
        const checkInEpoch = b.checked_in_at
          ? new Date(b.checked_in_at).getTime()
          : b.check_in_date
          ? new Date(`${b.check_in_date}T00:00:00`).getTime()
          : 0;

        const checkOutEpoch = b.checked_out_at
          ? new Date(b.checked_out_at).getTime()
          : b.check_out_date
          ? new Date(`${b.check_out_date}T23:59:59`).getTime()
          : Infinity;

        return tapEpoch >= checkInEpoch && tapEpoch <= checkOutEpoch;
      });

      if (activeMatch) {
        linkedBooking = activeMatch;
      }
    }

    // 6. Snapshot Customer / Cardholder Details
    const customerId = linkedBooking?.guest_id || null;
    let customerName: string | null = null;

    if (resolvedCardType === 'MASTER') {
      customerName = cardRecord?.holder_name || input.result.event?.holder_name || 'Super Admin Master';
    } else if (resolvedCardType === 'STAFF') {
      customerName = cardRecord?.holder_name || input.result.event?.holder_name || 'Housekeeping Staff';
    } else if (resolvedCardType === 'MAINTENANCE') {
      customerName = cardRecord?.holder_name || 'Maintenance Staff';
    } else {
      customerName =
        linkedBooking?.guest_name ||
        cardRecord?.guest_name ||
        cardRecord?.holder_name ||
        'Guest';
    }

    // 7. Assemble Append-Only Audit Record
    const recordId = `tap-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const historyRecord: RfidTapHistoryRecord = {
      id: recordId,
      cardUid: cardUidStr,
      cardType: resolvedCardType,
      roomNumber: roomNumberStr,
      bookingId: linkedBooking?.id || linkedBooking?.booking_reference || null,
      customerId,
      customerName,
      accessResult: resolvedResult,
      doorStatus,
      reason: input.result.message || input.result.reason || `Door tap at Room ${roomNumberStr}`,
      metadata: {
        roomStatus: input.result.roomStatus,
        housekeepingStatus: input.result.housekeepingStatus,
        actionType: input.result.event?.action_type || 'door_unlock',
        device: `Lock-Room-${roomNumberStr}`,
        hotelProperty: 'Sri Tayi Grand',
      },
      tappedAt: tapTimestamp,
    };

    // 8. Update in-memory audit collection
    memoryTapHistory.push(historyRecord);

    // 9. Asynchronously persist to disk without blocking execution
    setTimeout(() => {
      persistTapRecord(historyRecord);
      syncToSupabaseAsync(historyRecord).catch(() => {});
    }, 0);

    return historyRecord;
  } catch (error) {
    // Non-blocking interceptor guarantee: Log and return null without throwing
    console.error('[RFID Tap History Error - Observer Caught Exception]:', error);
    return null;
  }
}

/**
 * STEP 3 (API 1 Helper): Stay-based history aggregation for a specific room/stay
 * Calculates Total Taps, First Entry Time, Last Tapped Time, and universal card breakdown
 */
export function getRfidTapsForRoomAndStay(
  roomNumber: string,
  options?: {
    bookingId?: string;
    checkInTime?: string;
    checkOutTime?: string;
  }
): {
  roomNumber: string;
  booking: Booking | null;
  metrics: RfidStaySummaryMetrics;
  taps: RfidTapHistoryRecord[];
} {
  ensureInitialized();

  const roomClean = String(roomNumber || '').trim();
  let targetBooking: Booking | null = null;

  if (options?.bookingId) {
    targetBooking =
      repo.getBookingById(options.bookingId) ||
      repo.getBookingByReference(options.bookingId) ||
      null;
  }

  // If no booking provided, find active or latest booking for this room
  if (!targetBooking && roomClean) {
    const allBookings = repo.getBookings();
    targetBooking =
      allBookings.find(
        (b) =>
          (b.assigned_room_number === roomClean || b.room_number === roomClean) &&
          b.status === 'checked_in'
      ) ||
      allBookings.find(
        (b) => b.assigned_room_number === roomClean || b.room_number === roomClean
      ) ||
      null;
  }

  // Determine stay time bounds
  let checkInEpoch = 0;
  let checkOutEpoch = Infinity;

  if (options?.checkInTime) {
    checkInEpoch = new Date(options.checkInTime).getTime();
  } else if (targetBooking) {
    const inStr = targetBooking.checked_in_at || (targetBooking.check_in_date ? `${targetBooking.check_in_date}T00:00:00` : null);
    if (inStr) checkInEpoch = new Date(inStr).getTime();
  }

  if (options?.checkOutTime) {
    checkOutEpoch = new Date(options.checkOutTime).getTime();
  } else if (targetBooking) {
    const outStr = targetBooking.checked_out_at || (targetBooking.check_out_date ? `${targetBooking.check_out_date}T23:59:59` : null);
    if (outStr) checkOutEpoch = new Date(outStr).getTime();
  }

  // Filter taps for this room and stay
  const filteredTaps = memoryTapHistory.filter((tap) => {
    if (roomClean && tap.roomNumber !== roomClean) return false;

    // If bookingId explicitly specified, match bookingId or stay window
    if (options?.bookingId) {
      if (tap.bookingId === options.bookingId) return true;
    }

    const tapTime = new Date(tap.tappedAt).getTime();
    return tapTime >= checkInEpoch && tapTime <= checkOutEpoch;
  });

  // Sort chronologically (newest first for timeline display)
  filteredTaps.sort((a, b) => new Date(b.tappedAt).getTime() - new Date(a.tappedAt).getTime());

  // Calculate Summary Metrics
  const totalTaps = filteredTaps.length;
  const lastTappedTime = totalTaps > 0 ? filteredTaps[0].tappedAt : null;

  // First entry time: earliest tap with GRANTED access
  const grantedTapsList = filteredTaps
    .filter((t) => t.accessResult === 'GRANTED')
    .sort((a, b) => new Date(a.tappedAt).getTime() - new Date(b.tappedAt).getTime());
  const firstEntryTime = grantedTapsList.length > 0 ? grantedTapsList[0].tappedAt : null;

  const metrics: RfidStaySummaryMetrics = {
    totalTaps,
    firstEntryTime,
    lastTappedTime,
    grantedTaps: filteredTaps.filter((t) => t.accessResult === 'GRANTED').length,
    deniedTaps: filteredTaps.filter((t) => t.accessResult !== 'GRANTED').length,
    guestTaps: filteredTaps.filter((t) => t.cardType === 'GUEST').length,
    staffTaps: filteredTaps.filter((t) => t.cardType === 'STAFF').length,
    masterTaps: filteredTaps.filter((t) => t.cardType === 'MASTER' || t.cardType === 'MAINTENANCE').length,
  };

  return {
    roomNumber: roomClean,
    booking: targetBooking,
    metrics,
    taps: filteredTaps,
  };
}

/**
 * STEP 3 (API 2 Helper): Global RFID tap audit query with pagination and filters
 */
export function getGlobalRfidHistory(filters: RfidTapHistoryQueryFilters = {}) {
  ensureInitialized();

  let list = [...memoryTapHistory];

  if (filters.roomNumber && filters.roomNumber !== 'ALL') {
    list = list.filter((t) => t.roomNumber === filters.roomNumber);
  }

  if (filters.bookingId && filters.bookingId !== 'ALL') {
    list = list.filter((t) => t.bookingId === filters.bookingId);
  }

  if (filters.cardType && filters.cardType !== 'ALL') {
    list = list.filter((t) => t.cardType === filters.cardType);
  }

  if (filters.accessResult && filters.accessResult !== 'ALL') {
    list = list.filter((t) => t.accessResult === filters.accessResult);
  }

  if (filters.startDate) {
    const startEpoch = new Date(filters.startDate).getTime();
    list = list.filter((t) => new Date(t.tappedAt).getTime() >= startEpoch);
  }

  if (filters.endDate) {
    const endEpoch = new Date(filters.endDate).getTime();
    list = list.filter((t) => new Date(t.tappedAt).getTime() <= endEpoch);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (t) =>
        t.cardUid.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.reason && t.reason.toLowerCase().includes(q)) ||
        t.roomNumber.toLowerCase().includes(q) ||
        (t.bookingId && t.bookingId.toLowerCase().includes(q))
    );
  }

  // Sort descending (newest taps first)
  list.sort((a, b) => new Date(b.tappedAt).getTime() - new Date(a.tappedAt).getTime());

  const total = list.length;
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(200, filters.limit || 50));
  const startIndex = (page - 1) * limit;
  const paginatedItems = list.slice(startIndex, startIndex + limit);

  return {
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    taps: paginatedItems,
  };
}
