// ==============================================================================
// SRI TAYI GRAND - RFID TAP HISTORY TYPES & INTERFACES
// ==============================================================================

export type RfidHistoryCardType = 'GUEST' | 'STAFF' | 'MASTER' | 'MAINTENANCE';

export type RfidHistoryAccessResult = 'GRANTED' | 'DENIED' | 'WRONG_ROOM' | 'EXPIRED';

export interface RfidTapHistoryRecord {
  id: string;
  cardUid: string;
  cardType: RfidHistoryCardType;
  roomNumber: string;
  bookingId: string | null;
  customerId: string | null;
  customerName: string | null;
  accessResult: RfidHistoryAccessResult;
  doorStatus: string; // 'UNLOCKED' | 'LOCKED' | 'TURNAROUND_IN_PROGRESS'
  reason?: string;
  metadata?: Record<string, unknown>;
  tappedAt: string; // ISO 8601 string
}

export interface RfidStaySummaryMetrics {
  totalTaps: number;
  firstEntryTime: string | null;
  lastTappedTime: string | null;
  grantedTaps: number;
  deniedTaps: number;
  guestTaps: number;
  staffTaps: number;
  masterTaps: number;
}

export interface RfidTapHistoryQueryFilters {
  roomNumber?: string;
  bookingId?: string;
  cardType?: RfidHistoryCardType | 'ALL';
  accessResult?: RfidHistoryAccessResult | 'ALL';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
