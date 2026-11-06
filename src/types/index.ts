// ==============================================================================
// SRI TAYI GRAND HOTEL - MASTER TYPE DEFINITIONS
// ==============================================================================

export type OperationalStatus = 
  | 'available' 
  | 'occupied' 
  | 'reserved' 
  | 'cleaning' 
  | 'maintenance' 
  | 'out_of_service';

export type HousekeepingStatus = 'clean' | 'dirty' | 'in_progress' | 'inspected';

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'checked_in' 
  | 'checked_out' 
  | 'cancelled' 
  | 'no_show';

export type PaymentStatus = 
  | 'pending' 
  | 'successful' 
  | 'failed' 
  | 'refunded' 
  | 'partially_refunded' 
  | 'pay_at_hotel';

export type PaymentMethod = 'online' | 'cash' | 'upi' | 'card' | 'pay_at_hotel';

export type BookingSource = 'online' | 'walk_in_qr' | 'front_desk_manual';

export interface ReceptionKioskToken {
  id: string;
  kiosk_name: string;
  secret_token: string;
  is_active: boolean;
  allow_counter_payment: boolean;
  created_at: string;
}

export type HallEnquiryStatus = 
  | 'new' 
  | 'contacted' 
  | 'quotation_sent' 
  | 'pending_approval' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled';

export type StaffRole = 
  | 'Super Admin' 
  | 'Hotel Manager' 
  | 'Front Desk' 
  | 'Receptionist' 
  | 'Housekeeping' 
  | 'Accounts' 
  | 'Event Manager';

export interface RoomCategory {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  full_description: string;
  base_price_per_night: number;
  base_tariff_paise?: number;
  included_occupancy?: number;
  max_permitted_occupancy?: number;
  extra_person_tariff_paise?: number;
  extra_person_tariff_rupees?: number;
  air_conditioning?: boolean;
  tariff_source_date?: string;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  bed_type: string;
  room_size_sqft?: number;
  cover_image_url: string;
  gallery_images?: string[];
  amenities?: string[];
  features?: string[];
  is_active: boolean;
  total_physical_rooms?: number;
  available_physical_rooms?: number;
}

export interface PhysicalRoom {
  id: string;
  room_number: string;
  category_id: string;
  category_name?: string;
  floor_number: number;
  operational_status: OperationalStatus;
  housekeeping_status: HousekeepingStatus;
  current_booking_ref?: string;
  current_guest_name?: string;
  notes?: string;
  is_active: boolean;
  rfid_device_id?: string;
}

export interface Guest {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  id_type?: string;
  id_number?: string;
  total_stays: number;
  notes?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  category_id: string;
  category_name: string;
  assigned_room_id?: string;
  assigned_room_number?: string;
  room_number?: string;
  adults_count: number;
  children_count: number;
  rooms_count: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal_amount: number;
  room_charges_amount?: number;
  extra_persons_count?: number;
  extra_person_charges_amount?: number;
  tax_amount: number;
  additional_charges_amount: number;
  total_amount: number;
  paid_amount: number;
  tariff_source_date?: string;
  special_requests?: string;
  early_check_in_requested: boolean;
  late_check_out_requested: boolean;
  checked_in_at?: string;
  checked_out_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  internal_notes?: string;
  booking_source?: BookingSource;
  walk_in_token?: string;
  pickup_code?: string;
  room_assigned_by?: string;
  keycard_issued_at?: string;
  keycard_uid?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  payment_reference: string;
  booking_reference: string;
  guest_name: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  status: PaymentStatus;
  paid_at?: string;
  created_at: string;
}

export interface HallEnquiry {
  id: string;
  enquiry_reference: string;
  name: string;
  phone: string;
  email: string;
  event_type: string;
  event_date: string;
  expected_guests: number;
  requirements?: string;
  message?: string;
  status: HallEnquiryStatus;
  quoted_amount?: number;
  advance_amount?: number;
  admin_notes?: string;
  created_at: string;
}

export interface AmenityItem {
  id: string;
  code: string;
  name: string;
  icon_name: string;
  description: string;
  is_featured: boolean;
  is_active: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'all' | 'exterior' | 'rooms' | 'convention_hall' | 'reception' | 'amenities';
  image_url: string;
  display_order: number;
}

export interface HotelSettings {
  hotel_name: string;
  tagline: string;
  address: string;
  road: string;
  phone: string;
  whatsapp: string;
  email: string;
  currency: string;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
  tax_percentage: number;
  allow_pay_at_hotel: boolean;
  require_advance_payment: boolean;
  advance_percentage: number;
  hold_timeout_minutes: number;
  billing_unit?: 'night' | 'day' | '24_hour';
  extra_person_tariff_paise?: number;
  tariff_source_date?: string;
  tariff_source_label?: string;
}

export interface RFIDDevice {
  id: string;
  device_name: string;
  device_type: 'door_lock' | 'card_encoder' | 'gateway';
  room_number?: string;
  ip_address: string;
  mac_address: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  battery_level?: number;
  firmware_version: string;
  last_ping_at: string;
}

export type RFIDCardType = 'super_admin' | 'cleaner' | 'guest';

export interface RFIDCard {
  id: string;
  card_uid: string;
  card_label: string;
  card_type: RFIDCardType;
  is_lifetime?: boolean;
  holder_name?: string;
  holder_role?: string;
  staff_id?: string;
  assigned_room_number?: string;
  room_number?: string;
  booking_reference?: string;
  guest_name?: string;
  status: 'active' | 'inactive' | 'lost' | 'damaged' | 'expired';
  activated_at?: string;
  expires_at?: string;
  deactivated_at?: string;
  last_tap_room?: string;
  last_tap_at?: string;
  issued_by_name?: string;
  notes?: string;
  created_at: string;
}

export type RFIDActionType =
  | 'door_unlock'
  | 'door_lock'
  | 'cleaning_started'
  | 'cleaning_completed'
  | 'unauthorized_attempt';

export interface RFIDAccessEvent {
  id: string;
  card_uid?: string;
  card_type?: RFIDCardType;
  card_label?: string;
  device_name: string;
  room_number: string;
  event_type: 'access_granted' | 'access_denied' | 'door_ajar' | 'battery_low';
  action_type?: RFIDActionType;
  holder_name?: string;
  booking_reference?: string;
  reason?: string;
  source: 'lock_reader' | 'encoder' | 'manual_simulation' | 'gateway';
  occurred_at: string;
}

export interface CleaningSession {
  id: string;
  room_number: string;
  cleaner_card_id: string;
  cleaner_name: string;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  status: 'in_progress' | 'completed' | 'aborted';
}

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: StaffRole;
  is_active: boolean;
  last_login?: string;
}


// ==============================================================================
// EXPENSES & NIGHT AUDIT / DAILY CLOSING
// ==============================================================================

export type ExpenseCategory = 
  | 'laundry' 
  | 'maintenance' 
  | 'fnb_supplies' 
  | 'utilities' 
  | 'staff_welfare' 
  | 'repairs' 
  | 'marketing' 
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  payment_method: PaymentMethod;
  recorded_by: string;
  expense_date: string;
  receipt_ref?: string;
  status?: 'approved' | 'pending' | 'rejected';
  created_at: string;
}

export interface DailyClosing {
  id: string;
  closing_date: string;
  total_revenue: number;
  room_revenue: number;
  hall_revenue: number;
  other_revenue: number;
  cash_collected: number;
  upi_collected: number;
  card_collected: number;
  online_collected: number;
  total_expenses: number;
  cash_expenses: number;
  expected_cash_in_drawer: number;
  actual_cash_counted: number;
  discrepancy: number;
  notes?: string;
  closed_by_name: string;
  closed_by_role: StaffRole;
  status: 'closed' | 'reopened';
  closed_at: string;
  created_at: string;
}

// ==============================================================================
// CASHBOOK & CASH DRAWER SHIFTS
// ==============================================================================

export interface CashShift {
  id: string;
  shift_number: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at?: string;
  opening_float: number;
  closing_cash_counted?: number;
  expected_closing_cash?: number;
  discrepancy?: number;
  notes?: string;
  status: 'open' | 'closed';
}

export type CashTransactionCategory =
  | 'guest_payment'
  | 'front_desk_advance'
  | 'petty_cash'
  | 'vendor_payout'
  | 'change_replenishment'
  | 'expense_payout'
  | 'other';

export interface CashTransaction {
  id: string;
  shift_id?: string;
  type: 'cash_in' | 'cash_out';
  category: CashTransactionCategory;
  amount: number;
  reason: string;
  booking_reference?: string;
  receipt_ref?: string;
  performed_by: string;
  performed_at: string;
}

// ==============================================================================
// MAINTENANCE WORK ORDERS & OUT-OF-ORDER (OOO) BLOCKS
// ==============================================================================

export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MaintenanceStatus = 'reported' | 'in_progress' | 'resolved' | 'cancelled';
export type MaintenanceCategory =
  | 'ac_climate'
  | 'ac_hvac'
  | 'plumbing_bath'
  | 'electrical_lighting'
  | 'smart_lock'
  | 'tv_wifi'
  | 'furniture_linen'
  | 'other';

export interface MaintenanceTicket {
  id: string;
  room_number: string;
  issue_title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reported_by: string;
  assigned_to?: string;
  estimated_cost: number;
  actual_cost?: number;
  room_blocked: boolean;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

// ==============================================================================
// REAL-TIME EVENT BUS DEFINITIONS
// ==============================================================================

export type RealtimeEventType = 
  | 'booking_created' 
  | 'booking_updated' 
  | 'walk_in_created'
  | 'room_assigned' 
  | 'check_in' 
  | 'check_out' 
  | 'payment_recorded' 
  | 'expense_created' 
  | 'expense_deleted'
  | 'daily_closing' 
  | 'housekeeping_updated' 
  | 'rfid_event'
  | 'cash_shift_opened'
  | 'cash_shift_closed'
  | 'cash_transaction_created'
  | 'maintenance_ticket_created'
  | 'maintenance_ticket_updated'
  | 'maintenance_ticket_deleted'
  | 'full_sync';

export interface RealtimeMessage {
  eventId: number;
  eventType: RealtimeEventType;
  type?: RealtimeEventType;
  payload: any;
  timestamp: string;
  actor?: string;
}

// ==============================================================================
// GOOGLE REVIEWS & TESTIMONIALS DEFINITIONS
// ==============================================================================

export interface GoogleReview {
  id: string; // e.g. 'STG-001'
  hotel_name: string; // 'SRI TAYI GRAND'
  reviewer_name: string;
  rating: number; // strictly 5
  rating_label: string; // '5 stars'
  review_date_display: string; // e.g. 'a month ago'
  retrieval_date: string; // '2026-11-06'
  excerpt: string; // verbatim excerpt <= 20 words (or empty string for rating-only)
  full_text?: string;
  is_rating_only: boolean;
  is_translated?: boolean;
  source_platform: string; // 'Google' or 'Tripadvisor'
  source_url: string; // 'https://www.google.com/travel/search?q=sri%20tayi%20grand%20kadiri&ap=ugEHcmV2aWV3cw'
  is_featured: boolean; // default true for first 6 written reviews
  is_published: boolean; // default true
  display_order: number;
}

