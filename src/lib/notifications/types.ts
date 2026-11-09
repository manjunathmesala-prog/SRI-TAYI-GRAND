export type NotificationEventType =
  | 'EVENT_CHECK_IN'
  | 'EVENT_CHECK_OUT'
  | 'EVENT_TRANSACTION'
  | 'EVENT_NEW_BOOKING'
  | 'EVENT_RFID_TAP';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface CheckInPayload {
  guestName: string;
  roomNumber: string;
  bookingReference: string;
  checkInTime?: string;
  staffId?: string;
  staffName?: string;
}

export interface CheckOutPayload {
  guestName: string;
  roomNumber: string;
  bookingReference: string;
  checkOutTime?: string;
  balanceStatus: 'settled' | 'pending';
  outstandingAmount?: number;
  staffName?: string;
}

export interface TransactionPayload {
  transactionId: string;
  amount: number;
  currency: 'INR' | string;
  method: 'upi' | 'cash' | 'card' | 'netbanking' | 'pos' | string;
  payerName: string;
  bookingReference?: string;
  status: 'captured' | 'failed' | 'refunded' | string;
  receiptNumber?: string;
}

export interface NewBookingPayload {
  bookingReference: string;
  customerName: string;
  roomCategory: string;
  roomsCount?: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  source: 'online' | 'walk_in' | 'kiosk' | 'phone' | string;
}

export interface RfidTapPayload {
  deviceId: string;
  deviceName?: string;
  location: string; // Room number or Entrance
  cardUid: string;
  holderName?: string;
  cardType?: 'super_admin' | 'cleaner' | 'guest';
  result: 'GRANTED' | 'DENIED';
  reason?: string;
  timestamp?: string;
}

export type NotificationPayload =
  | CheckInPayload
  | CheckOutPayload
  | TransactionPayload
  | NewBookingPayload
  | RfidTapPayload
  | Record<string, any>;

export interface SuperAdminNotification {
  id: string;
  recipientId: string; // 'super-admin'
  type: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationEventInput {
  eventType: NotificationEventType;
  payload: NotificationPayload;
  severity?: NotificationSeverity;
  title?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export type NotificationCategoryFilter =
  | 'all'
  | 'financials'
  | 'check_in_out'
  | 'rfid_taps'
  | 'bookings';
