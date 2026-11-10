import {
  RoomCategory,
  PhysicalRoom,
  Booking,
  Guest,
  PaymentRecord,
  HallEnquiry,
  HotelSettings,
  RFIDDevice,
  RFIDCard,
  RFIDAccessEvent,
  StaffMember,
  AmenityItem,
  GalleryItem,
  OperationalStatus,
  HousekeepingStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  StaffRole,
  Expense,
  DailyClosing,
  CashShift,
  CashTransaction,
  MaintenanceTicket,
  MaintenanceStatus,
  RealtimeEventType,
  RealtimeMessage,
  GoogleReview,
  OtaChannel,
  ChannelSyncLog,
  RoomChannelMapping,
  PricingRule,
  GLAccount,
  JournalEntry,
  JournalLine,
  AuditLogEntry,
  AuditActionCategory,
  StaffAttendance,
  ShiftType,
  FolioCharge,
  ContactEnquiry,
  UnifiedEnquiry,
  ConventionQuote,
  StaffPermissions,
  HousekeepingTurnaroundChecklist,
  GuestVIPTier,
  EnquiryStatus,
  PaymentOrder,
  PaymentOrderStatus,
  PaymentTransaction,
} from '@/types';

import { syncCardToSupabase, syncEventToSupabase, deleteCardFromSupabase } from './supabase-rfid';
import {
  syncBookingToSupabase,
  loadBookingsFromSupabase,
  syncPaymentToSupabase,
  loadPaymentsFromSupabase,
  syncRoomStatusToSupabase,
  loadRoomsFromSupabase,
  syncSettingsToSupabase,
  loadSettingsFromSupabase,
} from './supabase-sync';
import {
  loadPersistedCards,
  savePersistedCards,
  loadPersistedEvents,
  savePersistedEvents,
} from './card-storage';
import {
  INITIAL_HOTEL_SETTINGS,
  INITIAL_ROOM_CATEGORIES,
  INITIAL_PHYSICAL_ROOMS,
  INITIAL_AMENITIES,
  INITIAL_GALLERY_IMAGES,
  INITIAL_BOOKINGS,
  INITIAL_GUESTS,
  INITIAL_HALL_ENQUIRIES,
  INITIAL_PAYMENTS,
  INITIAL_STAFF,
  INITIAL_RFID_DEVICES,
  INITIAL_RFID_CARDS,
  INITIAL_RFID_ACCESS_EVENTS,
  INITIAL_EXPENSES,
  INITIAL_DAILY_CLOSINGS,
  INITIAL_REVIEWS,
  INITIAL_CASH_SHIFTS,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_MAINTENANCE_TICKETS,
  INITIAL_OTA_CHANNELS,
  INITIAL_CHANNEL_SYNC_LOGS,
  INITIAL_PRICING_RULES,
  INITIAL_GL_ACCOUNTS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_STAFF_ATTENDANCE,
  INITIAL_FOLIO_CHARGES,
  INITIAL_CONTACT_ENQUIRIES,
  INITIAL_CONVENTION_QUOTES,
} from './mock-data';
import { calculateBookingTariff, normalizeCategoryId } from '@/lib/pricing';

// Singleton authoritative repository that persists during server runtime
export class HotelRepository {
  private settings: HotelSettings = { ...INITIAL_HOTEL_SETTINGS };
  private categories: RoomCategory[] = JSON.parse(JSON.stringify(INITIAL_ROOM_CATEGORIES));
  private rooms: PhysicalRoom[] = JSON.parse(JSON.stringify(INITIAL_PHYSICAL_ROOMS));
  private amenities: AmenityItem[] = JSON.parse(JSON.stringify(INITIAL_AMENITIES));
  private gallery: GalleryItem[] = JSON.parse(JSON.stringify(INITIAL_GALLERY_IMAGES));
  private bookings: Booking[] = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
  private guests: Guest[] = JSON.parse(JSON.stringify(INITIAL_GUESTS));
  private hallEnquiries: HallEnquiry[] = JSON.parse(JSON.stringify(INITIAL_HALL_ENQUIRIES));
  private payments: PaymentRecord[] = JSON.parse(JSON.stringify(INITIAL_PAYMENTS));
  private staff: StaffMember[] = JSON.parse(JSON.stringify(INITIAL_STAFF));
  private rfidDevices: RFIDDevice[] = JSON.parse(JSON.stringify(INITIAL_RFID_DEVICES));
  private rfidCards: RFIDCard[] = [];
  private rfidEvents: RFIDAccessEvent[] = [];
  private expenses: Expense[] = JSON.parse(JSON.stringify(INITIAL_EXPENSES));
  private dailyClosings: DailyClosing[] = JSON.parse(JSON.stringify(INITIAL_DAILY_CLOSINGS));
  private reviews: GoogleReview[] = [...INITIAL_REVIEWS];
  private cashShifts: CashShift[] = JSON.parse(JSON.stringify(INITIAL_CASH_SHIFTS));
  private cashTransactions: CashTransaction[] = JSON.parse(JSON.stringify(INITIAL_CASH_TRANSACTIONS));
  private maintenanceTickets: MaintenanceTicket[] = JSON.parse(JSON.stringify(INITIAL_MAINTENANCE_TICKETS));
  private otaChannels: OtaChannel[] = JSON.parse(JSON.stringify(INITIAL_OTA_CHANNELS));
  private channelSyncLogs: ChannelSyncLog[] = JSON.parse(JSON.stringify(INITIAL_CHANNEL_SYNC_LOGS));
  private pricingRules: PricingRule[] = JSON.parse(JSON.stringify(INITIAL_PRICING_RULES));
  private glAccounts: GLAccount[] = JSON.parse(JSON.stringify(INITIAL_GL_ACCOUNTS));
  private journalEntries: JournalEntry[] = JSON.parse(JSON.stringify(INITIAL_JOURNAL_ENTRIES));
  private auditLogs: AuditLogEntry[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
  private staffAttendance: StaffAttendance[] = JSON.parse(JSON.stringify(INITIAL_STAFF_ATTENDANCE));
  private folioCharges: FolioCharge[] = JSON.parse(JSON.stringify(INITIAL_FOLIO_CHARGES));
  private contactEnquiries: ContactEnquiry[] = JSON.parse(JSON.stringify(INITIAL_CONTACT_ENQUIRIES));
  private conventionQuotes: ConventionQuote[] = JSON.parse(JSON.stringify(INITIAL_CONVENTION_QUOTES));
  private paymentOrders: PaymentOrder[] = [];
  private paymentTransactions: PaymentTransaction[] = [];

  // In-Memory Real-Time Event Bus with Reconnection Replay Buffer
  private eventCounter: number = 0;
  private eventHistory: RealtimeMessage[] = [];
  private eventListeners: Set<(msg: RealtimeMessage) => void> = new Set();

  constructor() {
    const loadedCards = loadPersistedCards();
    this.rfidCards = loadedCards.length > 0 ? loadedCards : JSON.parse(JSON.stringify(INITIAL_RFID_CARDS));
    const loadedEvents = loadPersistedEvents();
    this.rfidEvents = loadedEvents.length > 0 ? loadedEvents : JSON.parse(JSON.stringify(INITIAL_RFID_ACCESS_EVENTS));
    // Hydrate all operational state from live Supabase PostgreSQL
    loadBookingsFromSupabase().then((pgBookings) => {
      if (pgBookings && pgBookings.length > 0) {
        for (const pgB of pgBookings) {
          const index = this.bookings.findIndex((b) => b.booking_reference === pgB.booking_reference);
          if (index !== -1) {
            this.bookings[index] = { ...this.bookings[index], ...pgB };
          } else {
            this.bookings.push(pgB);
          }
        }
      }
    }).catch(() => {});

    loadRoomsFromSupabase().then((pgRooms) => {
      if (pgRooms && pgRooms.length > 0) {
        for (const pgR of pgRooms) {
          const r = this.rooms.find((rm) => rm.room_number === pgR.room_number);
          if (r) {
            r.operational_status = pgR.operational_status;
            if (pgR.housekeeping_status) r.housekeeping_status = pgR.housekeeping_status;
            if (pgR.notes) r.notes = pgR.notes;
          }
        }
      }
    }).catch(() => {});

    loadPaymentsFromSupabase().then((pgPayments) => {
      if (pgPayments && pgPayments.length > 0) {
        for (const pgP of pgPayments) {
          const exists = this.payments.some((p) => p.payment_reference === pgP.payment_reference);
          if (!exists) {
            this.payments.unshift(pgP);
          }
        }
      }
    }).catch(() => {});

    loadSettingsFromSupabase().then((pgSettings) => {
      if (pgSettings) {
        this.settings = { ...this.settings, ...pgSettings };
      }
    }).catch(() => {});
  }

  // ==============================================================================
  // REAL-TIME EVENT STREAMING & DEDUPLICATION BUS
  // ==============================================================================

  public broadcastEvent(eventType: RealtimeEventType, payload: any, actor?: string): RealtimeMessage {
    this.eventCounter += 1;
    const message: RealtimeMessage = {
      eventId: this.eventCounter,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
      actor: actor || 'system',
    };

    // Store in circular history buffer (last 500 events) for reconnection replay
    this.eventHistory.push(message);
    if (this.eventHistory.length > 500) {
      this.eventHistory.shift();
    }

    // Dispatch synchronously to all connected SSE clients
    for (const listener of this.eventListeners) {
      try {
        listener(message);
      } catch (err) {
        // Suppress disconnected socket errors
      }
    }

    return message;
  }

  public subscribeEvents(callback: (msg: RealtimeMessage) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  public getEventsSince(lastEventId: number): RealtimeMessage[] {
    if (!lastEventId || isNaN(lastEventId)) return [];
    return this.eventHistory.filter((msg) => msg.eventId > lastEventId);
  }

  public getCurrentEventId(): number {
    return this.eventCounter;
  }

  // Authoritative Full Snapshot for initial client hydration across sessions
  public getFullState() {
    return {
      currentEventId: this.eventCounter,
      rooms: this.getRooms(),
      categories: this.getCategories(),
      bookings: this.getBookings(),
      payments: this.getPayments(),
      expenses: this.getExpenses(),
      dailyClosings: this.getDailyClosings(),
      cashShifts: this.getCashShifts(),
      cashTransactions: this.getCashTransactions(),
      cashBalance: this.getCashBalance(),
      maintenanceTickets: this.getMaintenanceTickets(),
      rfidCards: this.getRFIDCards(),
      rfidDevices: this.getRFIDDevices(),
      rfidEvents: this.getRFIDEvents().slice(0, 100),
      otaChannels: this.getChannels(),
      channelSyncLogs: this.getChannelSyncLogs(),
      pricingRules: this.getPricingRules(),
      glAccounts: this.getChartOfAccounts(),
      journalEntries: this.getJournalEntries(),
      auditLogs: this.getAuditLogs(),
      staffAttendance: this.getStaffAttendance(),
      settings: this.getSettings(),
    };
  }

  // --- SETTINGS ---
  getSettings(): HotelSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<HotelSettings>): HotelSettings {
    this.settings = { ...this.settings, ...partial };
    this.broadcastEvent('full_sync', { settings: this.settings });
    syncSettingsToSupabase(this.settings);
    return this.settings;
  }

  // --- ROOM CATEGORIES ---
  getCategories(): RoomCategory[] {
    return this.categories.map((cat) => {
      const normalizedId = normalizeCategoryId(cat.id);
      const catRooms = this.rooms.filter(
        (r) => (r.category_id === cat.id || normalizeCategoryId(r.category_id) === normalizedId) && r.is_active
      );
      const availableRooms = catRooms.filter((r) => r.operational_status === 'available');
      return {
        ...cat,
        total_physical_rooms: catRooms.length,
        available_physical_rooms: availableRooms.length,
      };
    });
  }

  getCategoryById(id: string): RoomCategory | undefined {
    const normalizedId = normalizeCategoryId(id);
    const cat = this.categories.find(
      (c) => c.id === id || c.id === normalizedId || c.slug === id
    ) || this.categories.find((c) => normalizeCategoryId(c.id) === normalizedId);
    if (!cat) return undefined;
    const catRooms = this.rooms.filter(
      (r) => (r.category_id === cat.id || normalizeCategoryId(r.category_id) === normalizedId) && r.is_active
    );
    const availableRooms = catRooms.filter((r) => r.operational_status === 'available');
    return {
      ...cat,
      total_physical_rooms: catRooms.length,
      available_physical_rooms: availableRooms.length,
    };
  }

  getCategoryBySlug(slug: string): RoomCategory | undefined {
    const normalizedId = normalizeCategoryId(slug);
    const cat = this.categories.find(
      (c) => c.slug === slug || c.id === normalizedId || c.slug === normalizedId
    ) || this.categories.find((c) => normalizeCategoryId(c.id) === normalizedId);
    if (!cat) return undefined;
    const catRooms = this.rooms.filter(
      (r) => (r.category_id === cat.id || normalizeCategoryId(r.category_id) === normalizedId) && r.is_active
    );
    const availableRooms = catRooms.filter((r) => r.operational_status === 'available');
    return {
      ...cat,
      total_physical_rooms: catRooms.length,
      available_physical_rooms: availableRooms.length,
    };
  }

  updateCategory(id: string, updates: Partial<RoomCategory>): RoomCategory | null {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.categories[index] = { ...this.categories[index], ...updates };
    this.broadcastEvent('full_sync', { category: this.categories[index] });
    return this.categories[index];
  }

  createCategory(category: Omit<RoomCategory, 'id'>): RoomCategory {
    const newCategory: RoomCategory = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    this.categories.push(newCategory);
    this.broadcastEvent('full_sync', { newCategory });
    return newCategory;
  }

  // --- PHYSICAL ROOMS ---
  getRooms(): PhysicalRoom[] {
    return this.rooms.map((r) => {
      const category = this.categories.find((c) => c.id === r.category_id);
      return {
        ...r,
        category_name: category ? category.name : 'Standard Room',
      };
    });
  }

  getRoomById(id: string): PhysicalRoom | undefined {
    return this.rooms.find((r) => r.id === id || r.room_number === id);
  }

  createRoom(room: Omit<PhysicalRoom, 'id'>): PhysicalRoom {
    const newRoom: PhysicalRoom = {
      ...room,
      id: `rm-${Date.now()}`,
    };
    this.rooms.push(newRoom);
    this.broadcastEvent('full_sync', { newRoom });
    return newRoom;
  }

  updateRoomStatus(
    id: string,
    operational_status: OperationalStatus,
    housekeeping_status?: HousekeepingStatus,
    notes?: string,
    actor?: string
  ): PhysicalRoom | null {
    const index = this.rooms.findIndex((r) => r.id === id || r.room_number === id);
    if (index === -1) return null;

    this.rooms[index].operational_status = operational_status;
    if (housekeeping_status) {
      this.rooms[index].housekeeping_status = housekeeping_status;
    }
    if (notes !== undefined) {
      this.rooms[index].notes = notes;
    }

    // Broadcast room / housekeeping change to all sessions
    this.broadcastEvent(
      'housekeeping_updated',
      {
        roomId: this.rooms[index].id,
        roomNumber: this.rooms[index].room_number,
        operational_status: this.rooms[index].operational_status,
        housekeeping_status: this.rooms[index].housekeeping_status,
        notes: this.rooms[index].notes,
      },
      actor
    );

    syncRoomStatusToSupabase({
      roomNumber: this.rooms[index].room_number,
      operationalStatus: this.rooms[index].operational_status,
      housekeepingStatus: this.rooms[index].housekeeping_status,
      notes: this.rooms[index].notes,
    });

    return this.rooms[index];
  }

  updateRoomHousekeeping(
    roomId: string,
    housekeepingStatus: HousekeepingStatus,
    operationalStatus?: OperationalStatus,
    notes?: string,
    actor?: string
  ): PhysicalRoom | null {
    const room = this.getRoomById(roomId);
    const opStatus = operationalStatus || room?.operational_status || 'available';
    return this.updateRoomStatus(roomId, opStatus, housekeepingStatus, notes, actor);
  }

  // Atomically check availability and assign room with race-condition prevention
  assignRoomToBooking(
    roomId: string,
    bookingRef: string,
    guestName: string,
    actor?: string
  ): PhysicalRoom {
    const index = this.rooms.findIndex((r) => r.id === roomId || r.room_number === roomId);
    if (index === -1) {
      throw new Error(`Room identifier '${roomId}' was not found.`);
    }

    const room = this.rooms[index];

    // Authoritative Booking Verification & Stale Data Prevention
    const booking = this.getBookingByReference(bookingRef);
    if (!booking) {
      throw new Error(`Booking '${bookingRef}' was not found.`);
    }
    if (booking.status === 'checked_out') {
      throw new Error(`Cannot assign room: Booking '${bookingRef}' has already checked out.`);
    }
    if (booking.status === 'cancelled') {
      throw new Error(`Cannot assign room: Booking '${bookingRef}' has been cancelled.`);
    }

    // Concurrency Lock: verify room is not occupied or assigned to another active reservation
    if (room.operational_status === 'occupied' && room.current_booking_ref !== bookingRef) {
      throw new Error(`Conflict: Room ${room.room_number} is already occupied by ${room.current_guest_name || 'another guest'}.`);
    }

    if (
      room.operational_status === 'reserved' &&
      room.current_booking_ref &&
      room.current_booking_ref.toLowerCase() !== bookingRef.toLowerCase()
    ) {
      throw new Error(`Conflict: Room ${room.room_number} is already reserved for booking ${room.current_booking_ref}.`);
    }

    // Release previous room reservation if reassigning to a different room
    if (booking.assigned_room_id && booking.assigned_room_id !== room.id) {
      const prevRoom = this.rooms.find(
        (r) => r.id === booking.assigned_room_id || r.room_number === booking.assigned_room_number
      );
      if (prevRoom && prevRoom.current_booking_ref?.toLowerCase() === bookingRef.toLowerCase()) {
        prevRoom.operational_status = 'available';
        prevRoom.current_booking_ref = undefined;
        prevRoom.current_guest_name = undefined;
      }
    }

    // Atomically assign
    room.current_booking_ref = bookingRef;
    room.current_guest_name = guestName;
    room.operational_status = 'reserved';

    // Update booking
    booking.assigned_room_id = room.id;
    booking.assigned_room_number = room.room_number;
    booking.room_assigned_by = actor || 'Front Desk';

    this.broadcastEvent(
      'room_assigned',
      {
        roomId: room.id,
        roomNumber: room.room_number,
        bookingRef,
        guestName,
      },
      actor
    );

    syncBookingToSupabase(booking);
    syncRoomStatusToSupabase({
      roomNumber: room.room_number,
      operationalStatus: room.operational_status,
      housekeepingStatus: room.housekeeping_status,
    });

    return room;
  }

  // --- BOOKINGS ---
  getBookings(): Booking[] {
    return [...this.bookings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getBookingByReference(reference: string): Booking | undefined {
    if (!reference) return undefined;
    return this.bookings.find(
      (b) => b.booking_reference.toLowerCase() === reference.toLowerCase()
    );
  }

  getBookingById(id: string): Booking | undefined {
    if (!id) return undefined;
    return this.bookings.find(
      (b) => b.id === id || b.booking_reference.toLowerCase() === id.toLowerCase()
    );
  }

  createFrontDeskWalkIn(params: {
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    nationality?: string;
    cityOfOrigin?: string;
    idProofType: string;
    idProofNumber: string;
    purposeOfVisit: string;
    categoryId: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount?: number;
    childrenCount?: number;
    baseTariff?: number;
    isTariffOverridden?: boolean;
    tariffOverrideReason?: string;
    paymentMethod: PaymentMethod;
    amountCollected?: number;
    paymentReference?: string;
    issueKeycard?: boolean;
    cardUid?: string;
    specialRequests?: string;
    staffName?: string;
  }): {
    booking: Booking;
    room: PhysicalRoom;
    card?: RFIDCard;
    payment?: PaymentRecord;
  } {
    const staffName = params.staffName || 'Front Desk Reception';
    const category =
      this.categories.find((c) => c.id === params.categoryId || c.slug === params.categoryId) ||
      this.categories[0];

    const room = this.rooms.find((r) => r.room_number === params.roomNumber);
    if (!room) {
      throw new Error(`Physical Room ${params.roomNumber} does not exist`);
    }

    if (room.operational_status === 'occupied') {
      throw new Error(`Room ${params.roomNumber} is currently occupied by ${room.current_guest_name || 'another guest'}`);
    }

    // Calculate nights
    const start = new Date(params.checkInDate);
    const end = new Date(params.checkOutDate);
    const diffTime = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const nights = isNaN(diffTime) || diffTime < 1 ? 1 : diffTime;

    // Rate calculation
    const nightlyRate = params.isTariffOverridden && typeof params.baseTariff === 'number'
      ? params.baseTariff
      : (category?.base_price_per_night || 1800);

    const subtotal = nightlyRate * nights;
    const taxRate = (this.settings.tax_percentage || 12) / 100;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `TG-FD-${dateStr}-${randCode}`;

    const collected = Number(params.amountCollected ?? total);
    const paidAmount = isNaN(collected) ? 0 : Math.max(0, collected);
    const paymentStatus: PaymentStatus = paidAmount >= total ? 'successful' : 'pay_at_hotel';

    const booking: Booking = {
      id: `bk-fd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      booking_reference: bookingReference,
      guest_id: `gst-${Date.now()}`,
      guest_name: params.guestName.trim(),
      guest_phone: params.guestPhone.trim(),
      guest_email: params.guestEmail?.trim() || `${params.guestPhone.replace(/\D/g, '')}@guest.sritayigrand.com`,
      id_proof_type: params.idProofType,
      id_proof_number: params.idProofNumber.trim(),
      nationality: params.nationality || 'Indian',
      city_of_origin: params.cityOfOrigin?.trim(),
      purpose_of_visit: params.purposeOfVisit,
      category_id: category.id,
      category_name: category.name,
      assigned_room_id: room.id,
      assigned_room_number: room.room_number,
      room_number: room.room_number,
      adults_count: params.adultsCount || 2,
      children_count: params.childrenCount || 0,
      rooms_count: 1,
      check_in_date: params.checkInDate,
      check_out_date: params.checkOutDate,
      status: 'checked_in',
      payment_status: paymentStatus,
      payment_method: params.paymentMethod,
      subtotal_amount: subtotal,
      room_charges_amount: subtotal,
      tax_amount: tax,
      additional_charges_amount: 0,
      total_amount: total,
      paid_amount: paidAmount,
      tariff_override_amount: params.isTariffOverridden ? params.baseTariff : undefined,
      tariff_override_reason: params.isTariffOverridden ? params.tariffOverrideReason : undefined,
      checked_in_at: new Date().toISOString(),
      room_assigned_by: staffName,
      booking_source: 'front_desk_manual',
      special_requests: params.specialRequests,
      early_check_in_requested: true,
      late_check_out_requested: false,
      created_at: new Date().toISOString(),
    };

    this.bookings.unshift(booking);

    // Update / create Guest record
    let guest = this.guests.find((g) => g.phone === params.guestPhone);
    if (guest) {
      guest.total_stays += 1;
      guest.id_type = params.idProofType;
      guest.id_number = params.idProofNumber;
      guest.nationality = params.nationality || 'Indian';
      if (params.cityOfOrigin) guest.city_of_origin = params.cityOfOrigin;
      if (params.purposeOfVisit) guest.purpose_of_visit = params.purposeOfVisit;
    } else {
      guest = {
        id: booking.guest_id,
        full_name: params.guestName,
        phone: params.guestPhone,
        email: booking.guest_email,
        id_type: params.idProofType,
        id_number: params.idProofNumber,
        nationality: params.nationality || 'Indian',
        city_of_origin: params.cityOfOrigin,
        purpose_of_visit: params.purposeOfVisit,
        country: params.nationality === 'Foreigner' ? 'International' : 'India',
        total_stays: 1,
        created_at: new Date().toISOString(),
      };
      this.guests.push(guest);
    }

    // Allocate & occupy physical room
    room.operational_status = 'occupied';
    room.housekeeping_status = 'clean';
    room.current_booking_ref = booking.booking_reference;
    room.current_guest_name = booking.guest_name;

    // Record payment if collected
    let payment: PaymentRecord | undefined;
    if (paidAmount > 0) {
      payment = this.recordPayment(
        {
          booking_reference: booking.booking_reference,
          guest_name: booking.guest_name,
          amount: paidAmount,
          currency: 'INR',
          payment_method: params.paymentMethod,
          payment_reference: params.paymentReference,
          status: 'successful',
          paid_at: new Date().toISOString(),
        },
        staffName
      );
    }

    // Issue RFID card if requested
    let card: RFIDCard | undefined;
    if (params.issueKeycard !== false) {
      const expiryIso = new Date(`${params.checkOutDate}T11:00:00+05:30`).toISOString();
      card = this.issueRFIDCard(
        room.room_number,
        booking.booking_reference,
        booking.guest_name,
        staffName,
        expiryIso
      );
      if (params.cardUid) {
        card.card_uid = params.cardUid;
      }
      booking.keycard_issued_at = new Date().toISOString();
      booking.keycard_uid = card.card_uid;
    }

    this.broadcastEvent('walk_in_created', booking, staffName);
    this.broadcastEvent('check_in', { booking, roomNumber: room.room_number, cardUid: card?.card_uid }, staffName);

    this.recordAuditLog({
      action: 'STATUTORY_WALKIN_CHECKIN',
      entityType: 'booking',
      entityId: booking.booking_reference,
      details: `Statutory walk-in check-in for ${booking.guest_name} into Room ${room.room_number} (Govt ID: ${params.idProofType} ${params.idProofNumber})`,
      newValue: booking,
      userId: 'stf-reception',
      userName: staffName,
      userRole: 'Front Desk',
    });

    syncBookingToSupabase(booking);
    return { booking, room, card, payment };
  }

  statutoryWalkIn(params: Parameters<HotelRepository['createFrontDeskWalkIn']>[0]) {
    try {
      const result = this.createFrontDeskWalkIn(params);
      return { success: true, ...result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  createBooking(
    bookingData: Omit<Booking, 'id' | 'booking_reference' | 'created_at'>,
    actor?: string
  ): Booking {
    const normalizedCatId = normalizeCategoryId(bookingData.category_id);
    // Concurrency & Overbooking check: verify capacity in requested category
    const catRooms = this.rooms.filter(
      (r) => (r.category_id === bookingData.category_id || normalizeCategoryId(r.category_id) === normalizedCatId) && r.is_active
    );
    const availableRooms = catRooms.filter((r) => r.operational_status === 'available');
    const requestedCount = bookingData.rooms_count || 1;

    if (availableRooms.length < requestedCount) {
      throw new Error(
        `Overbooking Prevention: Category has only ${availableRooms.length} room(s) available, but ${requestedCount} was requested.`
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `STG-${dateStr}-${randCode}`;

    const newBooking: Booking = {
      ...bookingData,
      category_id: normalizedCatId,
      id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      booking_reference: bookingReference,
      created_at: new Date().toISOString(),
    };

    this.bookings.unshift(newBooking);

    // Update guest record or create one
    let guest = this.guests.find(
      (g) => g.phone === bookingData.guest_phone || g.email === bookingData.guest_email
    );
    if (guest) {
      guest.total_stays += 1;
    } else {
      guest = {
        id: `gst-${Date.now()}`,
        full_name: bookingData.guest_name,
        phone: bookingData.guest_phone,
        email: bookingData.guest_email,
        country: 'India',
        total_stays: 1,
        created_at: new Date().toISOString(),
      };
      this.guests.push(guest);
    }

    // If an assigned physical room was specified, reserve it atomically
    if (newBooking.assigned_room_id) {
      this.assignRoomToBooking(
        newBooking.assigned_room_id,
        bookingReference,
        newBooking.guest_name,
        actor
      );
    }

    // Broadcast new booking in real-time
    this.broadcastEvent('booking_created', newBooking, actor);
    syncBookingToSupabase(newBooking);

    return newBooking;
  }

  updateBookingStatus(
    bookingReference: string,
    status: BookingStatus,
    notes?: string,
    actor?: string
  ): Booking | null {
    const booking = this.getBookingByReference(bookingReference);
    if (!booking) return null;

    booking.status = status;
    if (notes) booking.internal_notes = notes;
    syncBookingToSupabase(booking);

    if (status === 'checked_in') {
      booking.checked_in_at = new Date().toISOString();
      if (booking.assigned_room_id) {
        this.updateRoomStatus(booking.assigned_room_id, 'occupied', 'clean', undefined, actor);
      }
      this.broadcastEvent('check_in', { booking, roomNumber: booking.assigned_room_number }, actor);
    } else if (status === 'checked_out') {
      booking.checked_out_at = new Date().toISOString();
      if (booking.assigned_room_id) {
        this.updateRoomStatus(booking.assigned_room_id, 'cleaning', 'dirty', undefined, actor);
        const room = this.rooms.find((r) => r.id === booking.assigned_room_id);
        if (room) {
          const roomCards = this.rfidCards.filter(
            (c) =>
              (c.assigned_room_number === room.room_number || c.room_number === room.room_number) &&
              c.card_type === 'guest'
          );
          for (const card of roomCards) {
            card.status = 'inactive';
            card.deactivated_at = new Date().toISOString();
            syncCardToSupabase(card);
          }
        }
      }
      this.broadcastEvent('check_out', { booking, roomNumber: booking.assigned_room_number }, actor);
    } else if (status === 'cancelled') {
      booking.cancelled_at = new Date().toISOString();
      if (booking.assigned_room_id) {
        const room = this.rooms.find((r) => r.id === booking.assigned_room_id);
        if (room) {
          room.operational_status = 'available';
          room.current_booking_ref = undefined;
          room.current_guest_name = undefined;
        }
      }
      this.broadcastEvent('booking_updated', { booking, status }, actor);
    } else {
      this.broadcastEvent('booking_updated', { booking, status }, actor);
    }

    return booking;
  }

  cancelCheckout(bookingReference: string, actor: string = 'Front Desk'): Booking {
    const booking = this.getBookingByReference(bookingReference);
    if (!booking) {
      throw new Error(`Booking ${bookingReference} not found`);
    }
    if (booking.status !== 'checked_out') {
      throw new Error(`Booking ${bookingReference} is not currently checked out (current status: ${booking.status}).`);
    }

    booking.status = 'checked_in';
    booking.checked_out_at = undefined;
    booking.internal_notes = `${booking.internal_notes || ''}\n[Checkout Cancelled] Reverted to In-House by ${actor} on ${new Date().toISOString()}`.trim();

    if (booking.assigned_room_id) {
      this.updateRoomStatus(booking.assigned_room_id, 'occupied', 'clean', undefined, actor);
      const room = this.rooms.find((r) => r.id === booking.assigned_room_id || r.room_number === booking.assigned_room_number);
      if (room) {
        room.operational_status = 'occupied';
        room.current_booking_ref = booking.booking_reference;
        room.current_guest_name = booking.guest_name;
        const roomCards = this.rfidCards.filter(
          (c) =>
            (c.assigned_room_number === room.room_number || c.room_number === room.room_number) &&
            c.card_type === 'guest'
        );
        for (const card of roomCards) {
          card.status = 'active';
          card.deactivated_at = undefined;
          syncCardToSupabase(card);
        }
      }
    }

    this.broadcastEvent('booking_updated', { booking, status: 'checked_in', action: 'cancel_checkout' }, actor);
    syncBookingToSupabase(booking);
    return booking;
  }

  // --- WALK-IN RECEPTION KIOSK METHODS ---
  createWalkInBooking(params: {
    categoryId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    idProofType?: string;
    idProofNumber?: string;
    numberOfNights?: number;
    paymentMethod: PaymentMethod;
    paidAmount?: number;
    walkInToken: string;
    specialRequests?: string;
    actor?: string;
  }): Booking {
    const normalizedId = normalizeCategoryId(params.categoryId);
    const category =
      this.categories.find(
        (c) => c.id === params.categoryId || c.id === normalizedId || c.slug === params.categoryId
      ) || this.categories[0];
    const categoryName = category ? category.name : 'Double Room';

    // Verify room availability
    const availableRooms = this.getAvailableCleanRooms(category ? category.id : undefined);
    if (availableRooms.length === 0) {
      throw new Error(`No clean available rooms found for walk-in booking.`);
    }

    const nights = Math.max(1, params.numberOfNights || 1);
    const today = new Date();
    const checkInDate = today.toISOString().split('T')[0];
    const checkOut = new Date(today);
    checkOut.setDate(checkOut.getDate() + nights);
    const checkOutDate = checkOut.toISOString().split('T')[0];

    const tariffCalc = calculateBookingTariff({
      categoryId: category.id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      roomsCount: 1,
      adultsCount: 2,
      childrenCount: 0,
      customRatePaise: category.base_tariff_paise,
      taxPercentage: this.settings.tax_percentage || 0,
    });

    const subtotal = tariffCalc.subtotalRupees;
    const tax = tariffCalc.taxAmountRupees;
    const total = tariffCalc.totalRupees;

    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `TG-W-${dateStr}-${randCode}`;
    const pickupCode = `TG-${randCode}`;

    const isPaidOnline =
      params.paymentMethod === 'online' ||
      params.paymentMethod === 'upi' ||
      params.paymentMethod === 'card';
    const paymentStatus: PaymentStatus = isPaidOnline ? 'successful' : 'pay_at_hotel';
    const paidAmount = isPaidOnline ? total : (params.paidAmount || 0);

    const booking: Booking = {
      id: `bk-walkin-${Date.now()}`,
      booking_reference: bookingReference,
      pickup_code: pickupCode,
      booking_source: 'walk_in_qr',
      walk_in_token: params.walkInToken,
      guest_id: `gst-${Date.now()}`,
      guest_name: params.guestName,
      guest_phone: params.guestPhone,
      guest_email: params.guestEmail || `${params.guestPhone.replace(/\D/g, '')}@guest.sritayigrand.com`,
      id_proof_type: params.idProofType,
      id_proof_number: params.idProofNumber,
      category_id: category ? category.id : params.categoryId,
      category_name: categoryName,
      adults_count: 2,
      children_count: 0,
      rooms_count: 1,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      status: 'confirmed',
      payment_status: paymentStatus,
      payment_method: params.paymentMethod,
      room_charges_amount: tariffCalc.roomChargesRupees,
      extra_persons_count: tariffCalc.extraPersonsCount,
      extra_person_charges_amount: tariffCalc.extraPersonChargesRupees,
      subtotal_amount: subtotal,
      tax_amount: tax,
      additional_charges_amount: 0,
      total_amount: total,
      paid_amount: paidAmount,
      special_requests: params.specialRequests,
      early_check_in_requested: true,
      late_check_out_requested: false,
      tariff_source_date: tariffCalc.tariffSourceDate,
      created_at: new Date().toISOString(),
    };

    this.bookings.unshift(booking);

    // Update or create Guest record
    let guest = this.guests.find((g) => g.phone === params.guestPhone);
    if (guest) {
      guest.total_stays += 1;
      if (params.idProofType) guest.id_type = params.idProofType;
      if (params.idProofNumber) guest.id_number = params.idProofNumber;
    } else {
      this.guests.push({
        id: booking.guest_id,
        full_name: params.guestName,
        phone: params.guestPhone,
        email: booking.guest_email,
        id_type: params.idProofType,
        id_number: params.idProofNumber,
        country: 'India',
        total_stays: 1,
        created_at: new Date().toISOString(),
      });
    }

    // If paid online, record in financial payment ledger
    if (isPaidOnline) {
      this.recordPayment(
        {
          booking_reference: bookingReference,
          guest_name: params.guestName,
          amount: total,
          currency: 'INR',
          payment_method: params.paymentMethod,
          status: 'successful',
          paid_at: new Date().toISOString(),
        },
        params.actor
      );
    }

    this.broadcastEvent('walk_in_created', booking, params.actor);
    syncBookingToSupabase(booking);

    return booking;
  }

  assignRoomAndIssueWalkInKey(params: {
    bookingReference: string;
    roomNumber: string;
    staffName: string;
    cardUid?: string;
    markPaid?: boolean;
    paymentMethod?: PaymentMethod;
  }): {
    success: boolean;
    booking?: Booking;
    room?: PhysicalRoom;
    card?: RFIDCard;
    error?: string;
  } {
    const booking = this.getBookingByReference(params.bookingReference);
    if (!booking) {
      return { success: false, error: 'Booking reference not found' };
    }

    const room = this.rooms.find((r) => r.room_number === params.roomNumber);
    if (!room) {
      return { success: false, error: `Physical Room ${params.roomNumber} does not exist` };
    }

    if (room.operational_status === 'occupied' && room.current_booking_ref !== booking.booking_reference) {
      return {
        success: false,
        error: `Room ${params.roomNumber} is already occupied by ${room.current_guest_name || 'another guest'}`,
      };
    }

    // 1. Assign room to booking
    booking.assigned_room_id = room.id;
    booking.assigned_room_number = room.room_number;
    booking.room_assigned_by = params.staffName;
    booking.status = 'checked_in';
    booking.checked_in_at = new Date().toISOString();

    // 2. Handle counter payment if marked paid at front desk
    if (params.markPaid || booking.payment_status === 'pay_at_hotel') {
      booking.payment_status = 'successful';
      booking.paid_amount = booking.total_amount;
      if (params.paymentMethod) booking.payment_method = params.paymentMethod;

      this.recordPayment(
        {
          booking_reference: booking.booking_reference,
          guest_name: booking.guest_name,
          amount: booking.total_amount,
          currency: 'INR',
          payment_method: params.paymentMethod || 'cash',
          status: 'successful',
          paid_at: new Date().toISOString(),
        },
        params.staffName
      );
    }

    // 3. Update room status to occupied
    room.operational_status = 'occupied';
    room.housekeeping_status = 'clean';
    room.current_booking_ref = booking.booking_reference;
    room.current_guest_name = booking.guest_name;

    // 4. Calculate checkout time for card expiry (11:00 AM on checkout date)
    const checkOutDateStr =
      booking.check_out_date || new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];
    const expiryIso = new Date(`${checkOutDateStr}T11:00:00+05:30`).toISOString();

    // 5. Issue RFID Guest Card
    const card = this.issueRFIDCard(
      room.room_number,
      booking.booking_reference,
      booking.guest_name,
      params.staffName,
      expiryIso
    );

    if (params.cardUid) {
      card.card_uid = params.cardUid;
    }

    booking.keycard_issued_at = new Date().toISOString();
    booking.keycard_uid = card.card_uid;

    this.broadcastEvent(
      'check_in',
      {
        booking,
        roomNumber: room.room_number,
        cardUid: card.card_uid,
      },
      params.staffName
    );

    syncBookingToSupabase(booking);
    return {
      success: true,
      booking,
      room,
      card,
    };
  }

  getWalkInQueue(): Booking[] {
    return this.bookings.filter(
      (b) => b.booking_source === 'walk_in_qr' && (!b.assigned_room_number || b.status !== 'checked_out')
    );
  }

  getAvailableCleanRooms(categoryId?: string): PhysicalRoom[] {
    const normalizedTarget = categoryId ? normalizeCategoryId(categoryId) : undefined;
    return this.rooms.filter(
      (r) =>
        r.is_active &&
        r.operational_status === 'available' &&
        r.housekeeping_status === 'clean' &&
        (!categoryId || r.category_id === categoryId || normalizeCategoryId(r.category_id) === normalizedTarget)
    );
  }

  verifyKioskToken(token: string): boolean {
    if (!token) return false;
    return token === 'STG_RECEPT_DESK_SEC_7749' || token.startsWith('STG_RECEPT_');
  }

  // --- GUESTS ---
  getGuests(): Guest[] {
    return [...this.guests];
  }

  // --- PAYMENTS ---
  getPayments(): PaymentRecord[] {
    return [...this.payments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  recordPayment(
    record: Omit<PaymentRecord, 'id' | 'payment_reference' | 'created_at'> & { payment_reference?: string },
    actor?: string
  ): PaymentRecord {
    if (!record.amount || isNaN(record.amount) || record.amount <= 0) {
      throw new Error(`Payment amount must be a positive number. Received: ${record.amount}`);
    }

    // Idempotency Guard: prevent duplicate ledger entries on rapid clicks or webhook retries
    if (record.gateway_payment_id) {
      const existing = this.payments.find((p) => p.gateway_payment_id === record.gateway_payment_id);
      if (existing) {
        return existing;
      }
    }
    const rand = Math.floor(100 + Math.random() * 900);
    const newPayment: PaymentRecord = {
      ...record,
      id: `pay-${Date.now()}-${rand}`,
      payment_reference: record.payment_reference || `PAY-STG-${Date.now().toString().slice(-6)}-${rand}`,
      created_at: new Date().toISOString(),
    };
    this.payments.unshift(newPayment);

    // Update booking paid amount
    const booking = this.getBookingByReference(record.booking_reference);
    if (booking) {
      booking.paid_amount += record.amount;
      if (booking.paid_amount >= booking.total_amount) {
        booking.payment_status = 'successful';
      }
    }

    this.broadcastEvent('payment_recorded', { payment: newPayment, booking }, actor);

    syncPaymentToSupabase(newPayment);
    if (booking) {
      syncBookingToSupabase(booking);
    }

    return newPayment;
  }

  // ==============================================================================
  // RAZORPAY LEDGER & ORDER MANAGEMENT
  // ==============================================================================

  createPaymentOrder(
    order: Omit<PaymentOrder, 'id' | 'created_at' | 'updated_at'>
  ): PaymentOrder {
    const existing = this.paymentOrders.find(
      (o) => o.razorpay_order_id === order.razorpay_order_id
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newOrder: PaymentOrder = {
      ...order,
      id: `pord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      created_at: now,
      updated_at: now,
    };
    this.paymentOrders.unshift(newOrder);
    return newOrder;
  }

  getPaymentOrderById(id: string): PaymentOrder | undefined {
    return this.paymentOrders.find((o) => o.id === id);
  }

  getPaymentOrderByRazorpayId(rzpOrderId: string): PaymentOrder | undefined {
    return this.paymentOrders.find((o) => o.razorpay_order_id === rzpOrderId);
  }

  getPaymentOrderByReceipt(receipt: string): PaymentOrder | undefined {
    return this.paymentOrders.find((o) => o.receipt === receipt || o.booking_reference === receipt);
  }

  updatePaymentOrderStatus(
    rzpOrderId: string,
    status: PaymentOrderStatus
  ): PaymentOrder | undefined {
    const order = this.getPaymentOrderByRazorpayId(rzpOrderId);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
    }
    return order;
  }

  getPaymentOrders(): PaymentOrder[] {
    return [...this.paymentOrders];
  }

  recordPaymentTransaction(
    tx: Omit<PaymentTransaction, 'id' | 'created_at'>
  ): PaymentTransaction {
    // Idempotency guard: avoid duplicating existing transactions
    if (tx.razorpay_payment_id) {
      const existing = this.paymentTransactions.find(
        (t) => t.razorpay_payment_id === tx.razorpay_payment_id
      );
      if (existing) {
        return existing;
      }
    }

    const newTx: PaymentTransaction = {
      ...tx,
      id: `ptx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      created_at: new Date().toISOString(),
    };
    this.paymentTransactions.unshift(newTx);
    return newTx;
  }

  getPaymentTransactions(bookingRef?: string): PaymentTransaction[] {
    if (bookingRef) {
      return this.paymentTransactions.filter(
        (t) => t.booking_reference === bookingRef
      );
    }
    return [...this.paymentTransactions];
  }

  // ==============================================================================
  // EXPENSES MANAGEMENT
  // ==============================================================================

  getExpenses(): Expense[] {
    return [...this.expenses].sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );
  }

  createExpense(
    data: Omit<Expense, 'id' | 'created_at' | 'status'> & { status?: 'approved' | 'pending' | 'rejected' },
    actor?: string
  ): Expense {
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      throw new Error(`Expense amount must be a positive number. Received: ${data.amount}`);
    }
    const rand = Math.floor(100 + Math.random() * 900);
    const newExpense: Expense = {
      ...data,
      status: data.status || 'approved',
      id: `exp-${Date.now()}-${rand}`,
      created_at: new Date().toISOString(),
    };
    this.expenses.unshift(newExpense);
    this.broadcastEvent('expense_created', newExpense, actor);

    // Auto-record cash out transaction in cashbook if paid in cash
    if (newExpense.payment_method === 'cash') {
      try {
        this.recordCashTransaction({
          type: 'cash_out',
          category: 'expense_payout',
          amount: newExpense.amount,
          reason: `Expense Payout: ${newExpense.title} (${newExpense.category})`,
          receipt_ref: newExpense.receipt_ref,
          performed_by: newExpense.recorded_by,
        }, actor);
      } catch (e) {
        // non-blocking if shift not open
      }
    }

    return newExpense;
  }

  deleteExpense(id: string, actor?: string): boolean {
    const index = this.expenses.findIndex((e) => e.id === id);
    if (index === -1) return false;
    const removed = this.expenses.splice(index, 1)[0];
    this.broadcastEvent('expense_deleted', { id: removed.id, title: removed.title }, actor);
    return true;
  }

  // ==============================================================================
  // DAILY CLOSING / NIGHT AUDIT
  // ==============================================================================

  getDailyClosings(): DailyClosing[] {
    return [...this.dailyClosings].sort(
      (a, b) => new Date(b.closing_date).getTime() - new Date(a.closing_date).getTime()
    );
  }

  getTodayClosingSummary(dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    // Filter payments received on this date
    const todayPayments = this.payments.filter((p) => {
      const pDate = p.paid_at ? p.paid_at.split('T')[0] : p.created_at.split('T')[0];
      return pDate === targetDate && p.status === 'successful';
    });

    const cashCollected = todayPayments
      .filter((p) => p.payment_method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    const upiCollected = todayPayments
      .filter((p) => p.payment_method === 'upi')
      .reduce((sum, p) => sum + p.amount, 0);

    const cardCollected = todayPayments
      .filter((p) => p.payment_method === 'card')
      .reduce((sum, p) => sum + p.amount, 0);

    const onlineCollected = todayPayments
      .filter((p) => p.payment_method === 'online')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalCollected = cashCollected + upiCollected + cardCollected + onlineCollected;

    // Filter expenses recorded on this date
    const todayExpenses = this.expenses.filter((e) => e.expense_date === targetDate && e.status !== 'rejected');
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cashExpenses = todayExpenses
      .filter((e) => e.payment_method === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);

    // Expected cash in drawer = Cash receipts - Cash disbursements
    const expectedCashInDrawer = Math.max(0, cashCollected - cashExpenses);

    const isAlreadyClosed = this.dailyClosings.some(
      (c) => c.closing_date === targetDate && c.status === 'closed'
    );

    // Operational statistics for night audit
    const totalRooms = this.rooms.length;
    const occupiedRooms = this.rooms.filter((r) => r.operational_status === 'occupied').length;
    const cleanRooms = this.rooms.filter((r) => r.operational_status === 'available').length;
    const dirtyRooms = this.rooms.filter((r) => r.operational_status === 'cleaning').length;
    const maintenanceRooms = this.rooms.filter((r) => r.operational_status === 'maintenance').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const arrivalsCount = this.bookings.filter(
      (b) => b.check_in_date === targetDate && b.status !== 'cancelled'
    ).length;
    const departuresCount = this.bookings.filter(
      (b) => b.check_out_date === targetDate && b.status !== 'cancelled'
    ).length;

    // GST statutory calculations (12% tax slab standard for rooms)
    const netTaxable = Math.round(totalCollected / 1.12);
    const totalGst = totalCollected - netTaxable;
    const cgst = Math.round(totalGst / 2);
    const sgst = totalGst - cgst;

    return {
      closingDate: targetDate,
      totalRevenue: totalCollected,
      roomRevenue: totalCollected, // Primary hotel operations
      hallRevenue: 0,
      otherRevenue: 0,
      cashCollected,
      upiCollected,
      cardCollected,
      onlineCollected,
      totalExpenses,
      cashExpenses,
      expectedCashInDrawer,
      isAlreadyClosed,
      operational: {
        totalRooms,
        occupiedRooms,
        cleanRooms,
        dirtyRooms,
        maintenanceRooms,
        occupancyRate,
        arrivalsCount,
        departuresCount,
      },
      gst: {
        netTaxable,
        cgst,
        sgst,
        totalGst,
      },
    };
  }

  performDailyClosing(params: {
    closingDate: string;
    actualCashCounted: number;
    notes?: string;
    closedByName: string;
    closedByRole: StaffRole;
  }): DailyClosing {
    if (params.actualCashCounted < 0 || isNaN(params.actualCashCounted)) {
      throw new Error(`Actual cash counted cannot be negative or invalid: ${params.actualCashCounted}`);
    }
    const summary = this.getTodayClosingSummary(params.closingDate);
    const discrepancy = params.actualCashCounted - summary.expectedCashInDrawer;

    // Remove existing closing for same day if reopening/re-closing
    const existingIdx = this.dailyClosings.findIndex((c) => c.closing_date === params.closingDate);
    if (existingIdx !== -1) {
      this.dailyClosings.splice(existingIdx, 1);
    }

    const closing: DailyClosing = {
      id: `close-${params.closingDate.replace(/-/g, '')}`,
      closing_date: params.closingDate,
      total_revenue: summary.totalRevenue,
      room_revenue: summary.roomRevenue,
      hall_revenue: summary.hallRevenue,
      other_revenue: summary.otherRevenue,
      cash_collected: summary.cashCollected,
      upi_collected: summary.upiCollected,
      card_collected: summary.cardCollected,
      online_collected: summary.onlineCollected,
      total_expenses: summary.totalExpenses,
      cash_expenses: summary.cashExpenses,
      expected_cash_in_drawer: summary.expectedCashInDrawer,
      actual_cash_counted: params.actualCashCounted,
      discrepancy,
      notes: params.notes,
      closed_by_name: params.closedByName,
      closed_by_role: params.closedByRole,
      status: 'closed',
      closed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.dailyClosings.unshift(closing);
    this.broadcastEvent('daily_closing', closing, params.closedByName);

    return closing;
  }

  // ==============================================================================
  // CASHBOOK & CASH DRAWER SHIFTS
  // ==============================================================================

  getCashShifts(): CashShift[] {
    return [...this.cashShifts].sort(
      (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    );
  }

  getActiveCashShift(): CashShift | null {
    return this.cashShifts.find((s) => s.status === 'open') || null;
  }

  openCashShift(
    params: {
      cashierId: string;
      cashierName: string;
      openingFloat: number;
      notes?: string;
    },
    actor?: string
  ): CashShift {
    const existing = this.getActiveCashShift();
    if (existing) {
      throw new Error(`Shift #${existing.shift_number} is currently active. Please close it first.`);
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shiftCount =
      this.cashShifts.filter((s) => s.opened_at.startsWith(new Date().toISOString().slice(0, 10))).length + 1;
    const shiftNumber = `SH-${dateStr}-${String(shiftCount).padStart(2, '0')}`;

    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      shift_number: shiftNumber,
      cashier_id: params.cashierId,
      cashier_name: params.cashierName,
      opened_at: new Date().toISOString(),
      opening_float: Math.max(0, Number(params.openingFloat) || 0),
      notes: params.notes,
      status: 'open',
    };

    this.cashShifts.unshift(newShift);
    this.broadcastEvent('cash_shift_opened', newShift, actor || params.cashierName);
    return newShift;
  }

  closeCashShift(
    params: {
      shiftId: string;
      closingCashCounted: number;
      notes?: string;
      closedByName?: string;
    },
    actor?: string
  ): CashShift {
    const shift = this.cashShifts.find((s) => s.id === params.shiftId);
    if (!shift) throw new Error('Cash shift not found.');
    if (shift.status === 'closed') throw new Error('Shift is already closed.');

    const balanceData = this.getCashBalance(shift.id);
    const expectedClosing = balanceData.currentBalance;
    const discrepancy = Number(params.closingCashCounted) - expectedClosing;

    shift.status = 'closed';
    shift.closed_at = new Date().toISOString();
    shift.closing_cash_counted = Number(params.closingCashCounted);
    shift.expected_closing_cash = expectedClosing;
    shift.discrepancy = discrepancy;
    if (params.notes) {
      shift.notes = shift.notes ? `${shift.notes} | Close: ${params.notes}` : params.notes;
    }

    this.broadcastEvent('cash_shift_closed', shift, actor || params.closedByName);
    return shift;
  }

  getCashTransactions(shiftId?: string): CashTransaction[] {
    let list = [...this.cashTransactions];
    if (shiftId) {
      list = list.filter((t) => t.shift_id === shiftId);
    }
    return list.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }

  recordCashTransaction(
    params: Omit<CashTransaction, 'id' | 'performed_at'>,
    actor?: string
  ): CashTransaction {
    if (!params.amount || params.amount <= 0) {
      throw new Error('Cash transaction amount must be positive.');
    }

    const activeShift = this.getActiveCashShift();
    const newTx: CashTransaction = {
      ...params,
      id: `ctx-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      shift_id: params.shift_id || activeShift?.id,
      performed_at: new Date().toISOString(),
    };

    this.cashTransactions.unshift(newTx);
    this.broadcastEvent('cash_transaction_created', newTx, actor || params.performed_by);
    return newTx;
  }

  getCashBalance(specificShiftId?: string): {
    activeShift: CashShift | null;
    openingFloat: number;
    totalCashIn: number;
    totalCashOut: number;
    currentBalance: number;
  } {
    const shift = specificShiftId
      ? this.cashShifts.find((s) => s.id === specificShiftId) || null
      : this.getActiveCashShift();

    const openingFloat = shift ? shift.opening_float : 0;
    const txs = shift ? this.cashTransactions.filter((t) => t.shift_id === shift.id) : this.cashTransactions;

    const totalCashIn = txs
      .filter((t) => t.type === 'cash_in')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCashOut = txs
      .filter((t) => t.type === 'cash_out')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = Math.max(0, openingFloat + totalCashIn - totalCashOut);

    return {
      activeShift: shift,
      openingFloat,
      totalCashIn,
      totalCashOut,
      currentBalance,
    };
  }

  // ==============================================================================
  // MAINTENANCE WORK ORDERS & OUT-OF-ORDER (OOO) BLOCKS
  // ==============================================================================

  getMaintenanceTickets(): MaintenanceTicket[] {
    return [...this.maintenanceTickets].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getMaintenanceTicket(id: string): MaintenanceTicket | null {
    return this.maintenanceTickets.find((t) => t.id === id) || null;
  }

  createMaintenanceTicket(
    data: Omit<MaintenanceTicket, 'id' | 'created_at' | 'status'> & { status?: MaintenanceStatus },
    actor?: string
  ): MaintenanceTicket {
    const newTicket: MaintenanceTicket = {
      ...data,
      id: `maint-${Date.now()}`,
      status: data.status || 'reported',
      created_at: new Date().toISOString(),
    };

    this.maintenanceTickets.unshift(newTicket);

    if (newTicket.room_blocked) {
      const room = this.rooms.find((r) => r.room_number === newTicket.room_number);
      if (room) {
        room.operational_status = 'maintenance';
        this.broadcastEvent(
          'room_assigned',
          { room_number: room.room_number, operational_status: 'maintenance' },
          actor
        );
      }
    }

    this.broadcastEvent('maintenance_ticket_created', newTicket, actor);
    return newTicket;
  }

  updateMaintenanceTicket(
    id: string,
    updates: Partial<Omit<MaintenanceTicket, 'id' | 'created_at'>>,
    actor?: string
  ): MaintenanceTicket {
    const ticket = this.maintenanceTickets.find((t) => t.id === id);
    if (!ticket) throw new Error('Maintenance ticket not found.');

    const oldStatus = ticket.status;
    const oldBlocked = ticket.room_blocked;

    Object.assign(ticket, updates);

    if (updates.status === 'resolved' && oldStatus !== 'resolved') {
      ticket.resolved_at = new Date().toISOString();
      const room = this.rooms.find((r) => r.room_number === ticket.room_number);
      if (room && room.operational_status === 'maintenance') {
        room.operational_status = 'cleaning';
        room.housekeeping_status = 'dirty';
        this.broadcastEvent(
          'housekeeping_updated',
          { room_number: room.room_number, status: 'dirty', operational_status: 'cleaning' },
          actor
        );
      }
    } else if (updates.room_blocked !== undefined && updates.room_blocked !== oldBlocked) {
      const room = this.rooms.find((r) => r.room_number === ticket.room_number);
      if (room) {
        if (updates.room_blocked) {
          room.operational_status = 'maintenance';
        } else if (room.operational_status === 'maintenance') {
          room.operational_status = 'available';
        }
      }
    }

    this.broadcastEvent('maintenance_ticket_updated', ticket, actor);
    return ticket;
  }

  deleteMaintenanceTicket(id: string, actor?: string): boolean {
    const index = this.maintenanceTickets.findIndex((t) => t.id === id);
    if (index === -1) return false;
    const removed = this.maintenanceTickets.splice(index, 1)[0];
    if (removed.room_blocked) {
      const room = this.rooms.find((r) => r.room_number === removed.room_number);
      if (room && room.operational_status === 'maintenance') {
        room.operational_status = 'available';
      }
    }
    this.broadcastEvent(
      'maintenance_ticket_deleted',
      { id: removed.id, room_number: removed.room_number },
      actor
    );
    return true;
  }

  // ==============================================================================
  // TIER-2: OTA CHANNELS & DISTRIBUTION
  // ==============================================================================

  getChannels(): OtaChannel[] {
    return [...this.otaChannels];
  }

  getChannel(id: string): OtaChannel | undefined {
    return this.otaChannels.find((c) => c.id === id);
  }

  updateChannel(id: string, updates: Partial<OtaChannel>, actor?: string): OtaChannel {
    const ch = this.otaChannels.find((c) => c.id === id);
    if (!ch) throw new Error('Channel not found.');
    Object.assign(ch, updates);
    this.broadcastEvent('channel_updated', ch, actor);
    this.recordAuditLog({
      action: 'UPDATE_CHANNEL',
      entityType: 'channel',
      entityId: id,
      details: `Updated channel ${ch.name}. Connected: ${ch.isConnected}, Multiplier: ${ch.rateMultiplier}`,
      userName: actor || 'Admin',
    });
    return ch;
  }

  syncChannel(id: string, actor?: string): { success: boolean; log: ChannelSyncLog } {
    const ch = this.otaChannels.find((c) => c.id === id);
    if (!ch) throw new Error('Channel not found.');
    ch.lastSyncAt = new Date().toISOString();
    ch.syncStatus = 'synced';

    const log: ChannelSyncLog = {
      id: `synclog-${Date.now()}`,
      channelId: ch.id,
      channelName: ch.name,
      syncType: 'full_inventory',
      status: 'success',
      message: `2-way live ARI sync completed for ${ch.name}. Rates updated with ${Math.round((ch.rateMultiplier - 1) * 100)}% markup.`,
      roomsUpdatedCount: this.rooms.length,
      ratesUpdatedCount: this.categories.length,
      timestamp: new Date().toISOString(),
    };
    this.channelSyncLogs.unshift(log);
    this.broadcastEvent('channel_synced', { channel: ch, log }, actor);
    return { success: true, log };
  }

  getChannelSyncLogs(): ChannelSyncLog[] {
    return [...this.channelSyncLogs];
  }

  addChannelSyncLog(log: ChannelSyncLog, actor?: string): ChannelSyncLog {
    this.channelSyncLogs.unshift(log);
    this.broadcastEvent('channel_synced', { log }, actor);
    return log;
  }

  // ==============================================================================
  // TIER-2: DYNAMIC PRICING RULES
  // ==============================================================================

  getPricingRules(): PricingRule[] {
    return [...this.pricingRules];
  }

  getPricingRule(id: string): PricingRule | undefined {
    return this.pricingRules.find((r) => r.id === id);
  }

  createPricingRule(data: Omit<PricingRule, 'id' | 'created_at'>, actor?: string): PricingRule {
    const newRule: PricingRule = {
      ...data,
      id: `rule-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.pricingRules.unshift(newRule);
    this.broadcastEvent('pricing_rule_created', newRule, actor);
    this.recordAuditLog({
      action: 'CREATE_PRICING_RULE',
      entityType: 'pricing',
      entityId: newRule.id,
      details: `Created pricing rule ${newRule.name} (${newRule.adjustment_value}${newRule.adjustment_type === 'percentage' ? '%' : ' INR'})`,
      userName: actor || 'Admin',
    });
    return newRule;
  }

  updatePricingRule(id: string, updates: Partial<PricingRule>, actor?: string): PricingRule {
    const rule = this.pricingRules.find((r) => r.id === id);
    if (!rule) throw new Error('Pricing rule not found.');
    Object.assign(rule, updates);
    this.broadcastEvent('pricing_rule_updated', rule, actor);
    this.recordAuditLog({
      action: 'UPDATE_PRICING_RULE',
      entityType: 'pricing',
      entityId: id,
      details: `Updated pricing rule ${rule.name}. Active: ${rule.is_active}`,
      userName: actor || 'Admin',
    });
    return rule;
  }

  deletePricingRule(id: string, actor?: string): boolean {
    const idx = this.pricingRules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    const removed = this.pricingRules.splice(idx, 1)[0];
    this.broadcastEvent('pricing_rule_deleted', { id: removed.id }, actor);
    this.recordAuditLog({
      action: 'DELETE_PRICING_RULE',
      entityType: 'pricing',
      entityId: id,
      details: `Deleted pricing rule ${removed.name}`,
      userName: actor || 'Admin',
    });
    return true;
  }

  calculateEffectiveRate(
    categoryId: string,
    dateStr?: string
  ): { baseRate: number; effectiveRate: number; appliedRules: string[] } {
    const cat = this.categories.find((c) => c.id === categoryId);
    const baseRate = cat ? cat.base_price_per_night : 1800;
    let rate = baseRate;
    const appliedRules: string[] = [];

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayOfWeek = targetDate.getDay();
    const targetDateIso = targetDate.toISOString().split('T')[0];

    for (const rule of this.pricingRules) {
      if (!rule.is_active) continue;
      if (!rule.applies_to_categories.includes('all') && !rule.applies_to_categories.includes(categoryId)) continue;

      let ruleMatches = false;
      if (rule.days_of_week && rule.days_of_week.includes(dayOfWeek)) {
        ruleMatches = true;
      }
      if (rule.start_date && rule.end_date && targetDateIso >= rule.start_date && targetDateIso <= rule.end_date) {
        ruleMatches = true;
      }

      if (ruleMatches) {
        appliedRules.push(rule.name);
        if (rule.adjustment_type === 'percentage') {
          rate = Math.round(rate * (1 + rule.adjustment_value / 100));
        } else {
          rate += rule.adjustment_value;
        }
      }
    }

    return { baseRate, effectiveRate: rate, appliedRules };
  }

  // ==============================================================================
  // TIER-3: GENERAL LEDGER DOUBLE-ENTRY ACCOUNTING
  // ==============================================================================

  getChartOfAccounts(): GLAccount[] {
    return [...this.glAccounts];
  }

  getJournalEntries(): JournalEntry[] {
    return [...this.journalEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  createJournalEntry(
    data: Omit<JournalEntry, 'id' | 'entry_number' | 'created_at' | 'is_balanced'>,
    actor?: string
  ): JournalEntry {
    const totalDebit = data.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (!isBalanced) {
      throw new Error(`Double-entry out of balance: Total Debit (₹${totalDebit}) must equal Total Credit (₹${totalCredit}).`);
    }

    const nextNumber = `JE-${new Date().getFullYear()}-${String(this.journalEntries.length + 1).padStart(4, '0')}`;
    const newEntry: JournalEntry = {
      ...data,
      id: `je-${Date.now()}`,
      entry_number: nextNumber,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: true,
      created_at: new Date().toISOString(),
    };

    for (const line of newEntry.lines) {
      const acc = this.glAccounts.find((a) => a.code === line.accountCode);
      if (acc) {
        if (acc.category === 'asset' || acc.category === 'expense') {
          acc.balance += line.debit - line.credit;
        } else {
          acc.balance += line.credit - line.debit;
        }
      }
    }

    this.journalEntries.unshift(newEntry);
    this.broadcastEvent('journal_entry_created', newEntry, actor);
    this.recordAuditLog({
      action: 'CREATE_JOURNAL_ENTRY',
      entityType: 'accounting',
      entityId: newEntry.id,
      details: `Posted Journal Entry ${nextNumber}: ₹${totalDebit} (${newEntry.description})`,
      userName: actor || 'Accounts Auditor',
    });
    return newEntry;
  }

  getPnL(): {
    revenueTotal: number;
    expenseTotal: number;
    netProfit: number;
    revenueAccounts: Array<{ code: string; name: string; amount: number }>;
    expenseAccounts: Array<{ code: string; name: string; amount: number }>;
  } {
    const revAccounts = this.glAccounts
      .filter((a) => a.category === 'revenue')
      .map((a) => ({ code: a.code, name: a.name, amount: Math.max(0, a.balance) }));
    const expAccounts = this.glAccounts
      .filter((a) => a.category === 'expense')
      .map((a) => ({ code: a.code, name: a.name, amount: Math.max(0, a.balance) }));

    const revenueTotal = revAccounts.reduce((sum, a) => sum + a.amount, 0);
    const expenseTotal = expAccounts.reduce((sum, a) => sum + a.amount, 0);

    return {
      revenueTotal,
      expenseTotal,
      netProfit: revenueTotal - expenseTotal,
      revenueAccounts: revAccounts,
      expenseAccounts: expAccounts,
    };
  }

  getBalanceSheet(): {
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
    isBalanced: boolean;
    assets: Array<{ code: string; name: string; amount: number }>;
    liabilities: Array<{ code: string; name: string; amount: number }>;
    equity: Array<{ code: string; name: string; amount: number }>;
  } {
    const assets = this.glAccounts
      .filter((a) => a.category === 'asset')
      .map((a) => ({ code: a.code, name: a.name, amount: Math.max(0, a.balance) }));
    const liabilities = this.glAccounts
      .filter((a) => a.category === 'liability')
      .map((a) => ({ code: a.code, name: a.name, amount: Math.max(0, a.balance) }));
    const equity = this.glAccounts
      .filter((a) => a.category === 'equity')
      .map((a) => ({ code: a.code, name: a.name, amount: Math.max(0, a.balance) }));

    const assetsTotal = assets.reduce((sum, a) => sum + a.amount, 0);
    const liabilitiesTotal = liabilities.reduce((sum, a) => sum + a.amount, 0);
    const equityTotal = equity.reduce((sum, a) => sum + a.amount, 0);

    return {
      assetsTotal,
      liabilitiesTotal,
      equityTotal,
      isBalanced: Math.abs(assetsTotal - (liabilitiesTotal + equityTotal)) < 1,
      assets,
      liabilities,
      equity,
    };
  }

  // ==============================================================================
  // TIER-3: IMMUTABLE AUDIT LOGS
  // ==============================================================================

  getAuditLogs(category?: AuditActionCategory): AuditLogEntry[] {
    if (category) {
      return this.auditLogs.filter((l) => l.entityType === category);
    }
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  recordAuditLog(params: {
    action: string;
    entityType: AuditActionCategory;
    entityId: string;
    details: string;
    userName?: string;
    userRole?: string;
    userId?: string;
    previousValue?: any;
    newValue?: any;
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId || 'stf-sys',
      userName: params.userName || 'System Lead',
      userRole: params.userRole || 'Admin',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      previousValue: params.previousValue,
      newValue: params.newValue,
    };
    this.auditLogs.unshift(entry);
    this.broadcastEvent('audit_log_created', entry, entry.userName);
    return entry;
  }

  // ==============================================================================
  // TIER-3: STAFF ATTENDANCE
  // ==============================================================================

  getStaffAttendance(dateStr?: string): StaffAttendance[] {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    return this.staffAttendance.filter((a) => a.date === targetDate);
  }

  clockInStaff(params: { staffId: string; shift?: ShiftType; notes?: string }, actor?: string): StaffAttendance {
    const staff = this.staff.find((s) => s.id === params.staffId);
    if (!staff) throw new Error('Staff member not found.');

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.staffAttendance.find(
      (a) => a.staff_id === params.staffId && a.date === todayStr
    );
    if (existing && existing.clock_in && !existing.clock_out) {
      throw new Error(`${staff.full_name} is already clocked in today.`);
    }

    const attendance: StaffAttendance = {
      id: `att-${Date.now()}`,
      staff_id: staff.id,
      staff_name: staff.full_name,
      role: staff.role,
      date: todayStr,
      shift: params.shift || 'general',
      clock_in: new Date().toISOString(),
      status: 'present',
      notes: params.notes,
      created_at: new Date().toISOString(),
    };
    this.staffAttendance.unshift(attendance);
    this.broadcastEvent('attendance_recorded', attendance, actor);
    this.recordAuditLog({
      action: 'STAFF_CLOCK_IN',
      entityType: 'staff',
      entityId: attendance.id,
      details: `${staff.full_name} (${staff.role}) clocked in for ${attendance.shift} shift`,
      userName: actor || staff.full_name,
    });
    return attendance;
  }

  clockOutStaff(attendanceId: string, actor?: string): StaffAttendance {
    const record = this.staffAttendance.find((a) => a.id === attendanceId);
    if (!record) throw new Error('Attendance record not found.');
    if (record.clock_out) throw new Error('Staff member is already clocked out.');

    const clockOutTime = new Date().toISOString();
    record.clock_out = clockOutTime;
    if (record.clock_in) {
      const diffMs = new Date(clockOutTime).getTime() - new Date(record.clock_in).getTime();
      record.work_hours = Math.round((diffMs / (3600 * 1000)) * 10) / 10;
    }
    this.broadcastEvent('attendance_recorded', record, actor);
    this.recordAuditLog({
      action: 'STAFF_CLOCK_OUT',
      entityType: 'staff',
      entityId: record.id,
      details: `${record.staff_name} clocked out after ${record.work_hours || 0} hours`,
      userName: actor || record.staff_name,
    });
    return record;
  }

  // --- CONVENTION HALL ENQUIRIES ---
  getHallEnquiries(): HallEnquiry[] {
    return [...this.hallEnquiries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  createHallEnquiry(
    data: Omit<HallEnquiry, 'id' | 'enquiry_reference' | 'status' | 'created_at'>
  ): HallEnquiry {
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const enquiry: HallEnquiry = {
      ...data,
      id: `enq-${Date.now()}`,
      enquiry_reference: `ENQ-HALL-${dateStr}-${randCode}`,
      status: 'new',
      created_at: new Date().toISOString(),
    };
    this.hallEnquiries.unshift(enquiry);
    this.broadcastEvent('full_sync', { enquiry });
    return enquiry;
  }

  updateHallEnquiryStatus(
    id: string,
    status: HallEnquiry['status'],
    admin_notes?: string,
    quoted_amount?: number,
    advance_amount?: number
  ): HallEnquiry | null {
    const index = this.hallEnquiries.findIndex((e) => e.id === id);
    if (index === -1) return null;
    this.hallEnquiries[index].status = status;
    if (admin_notes !== undefined) this.hallEnquiries[index].admin_notes = admin_notes;
    if (quoted_amount !== undefined) this.hallEnquiries[index].quoted_amount = quoted_amount;
    if (advance_amount !== undefined) this.hallEnquiries[index].advance_amount = advance_amount;
    this.broadcastEvent('full_sync', { enquiry: this.hallEnquiries[index] });
    return this.hallEnquiries[index];
  }

  // --- AMENITIES & GALLERY ---
  getAmenities(): AmenityItem[] {
    return [...this.amenities];
  }

  getGallery(): GalleryItem[] {
    return [...this.gallery].sort((a, b) => a.display_order - b.display_order);
  }

  // --- STAFF ---
  getStaff(): StaffMember[] {
    return [...this.staff];
  }

  // --- GOOGLE REVIEWS & TESTIMONIALS ---
  getReviews(publishedOnly: boolean = true): GoogleReview[] {
    const list = publishedOnly
      ? this.reviews.filter((r) => r.is_published)
      : this.reviews;
    return [...list].sort((a, b) => a.display_order - b.display_order);
  }

  getFeaturedReviews(limit: number = 6): GoogleReview[] {
    return this.reviews
      .filter((r) => r.is_published && r.is_featured)
      .sort((a, b) => a.display_order - b.display_order)
      .slice(0, limit);
  }

  getReviewById(id: string): GoogleReview | undefined {
    return this.reviews.find((r) => r.id === id);
  }

  toggleReviewPublishStatus(id: string, published: boolean): GoogleReview | null {
    const review = this.reviews.find((r) => r.id === id);
    if (!review) return null;
    review.is_published = published;
    return { ...review };
  }

  toggleReviewFeaturedStatus(id: string, featured: boolean): GoogleReview | null {
    const review = this.reviews.find((r) => r.id === id);
    if (!review) return null;
    review.is_featured = featured;
    return { ...review };
  }

  importReview(data: Omit<GoogleReview, 'id' | 'retrieval_date'>): GoogleReview {
    const nextNum = this.reviews.length + 1;
    const id = `STG-${String(nextNum).padStart(3, '0')}`;
    const newReview: GoogleReview = {
      ...data,
      id,
      retrieval_date: new Date().toISOString().split('T')[0],
      display_order: data.display_order ?? nextNum,
    };
    this.reviews.push(newReview);
    return { ...newReview };
  }

  deleteReview(id: string): boolean {
    const idx = this.reviews.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.reviews.splice(idx, 1);
    return true;
  }

  // --- RFID SYSTEM ---
  getRFIDDevices(): RFIDDevice[] {
    return [...this.rfidDevices];
  }

  getRFIDCards(): RFIDCard[] {
    const persisted = loadPersistedCards();
    if (persisted.length > 0) {
      for (const p of persisted) {
        const existingIdx = this.rfidCards.findIndex((c) => c.id === p.id || c.card_uid === p.card_uid);
        if (existingIdx === -1) {
          this.rfidCards.push(p);
        } else {
          this.rfidCards[existingIdx] = { ...p, ...this.rfidCards[existingIdx] };
        }
      }
    }
    return [...this.rfidCards];
  }

  getRFIDEvents(): RFIDAccessEvent[] {
    if (this.rfidEvents.length === 0) {
      const persisted = loadPersistedEvents();
      if (persisted.length > 0) this.rfidEvents = persisted;
    }
    return [...this.rfidEvents].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
  }

  logRFIDEvent(event: Omit<RFIDAccessEvent, 'id' | 'occurred_at'>, actor?: string): RFIDAccessEvent {
    const newEvent: RFIDAccessEvent = {
      ...event,
      id: 'evt-' + Date.now(),
      occurred_at: new Date().toISOString(),
    };
    this.rfidEvents.unshift(newEvent);
    savePersistedEvents(this.rfidEvents);
    syncEventToSupabase(newEvent);
    this.broadcastEvent('rfid_event', newEvent, actor);
    return newEvent;
  }

  issueSuperAdminCard(
    cardLabel: string = 'Super Admin Master Key',
    holderName: string = 'Managing Director',
    issuedBy: string = 'System Root',
    customCardUid?: string
  ): RFIDCard {
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const cardUid = customCardUid || `SA-LIFETIME-${randSuffix}`;
    const newCard: RFIDCard = {
      id: `crd-sa-${Date.now()}`,
      card_uid: cardUid,
      card_label: cardLabel,
      card_type: 'super_admin',
      is_lifetime: true,
      holder_name: holderName,
      holder_role: 'Super Admin',
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: '2099-12-31T23:59:59.000Z',
      issued_by_name: issuedBy,
      notes: 'Lifetime Activation - Universal Master Clearance across all rooms and facilities',
      created_at: new Date().toISOString(),
    };

    this.rfidCards.unshift(newCard);
    savePersistedCards(this.rfidCards);
    syncCardToSupabase(newCard);
    this.logRFIDEvent(
      {
        card_uid: cardUid,
        card_type: 'super_admin',
        card_label: cardLabel,
        device_name: 'Central-RFID-IoT-Gateway',
        room_number: 'ALL',
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: holderName,
        source: 'encoder',
        reason: `Super Admin Lifetime Card issued to ${holderName} by ${issuedBy}`,
      },
      issuedBy
    );

    return newCard;
  }

  issueCleanerCard(
    cardLabel: string = 'Housekeeping Cleaning Card',
    holderName: string = 'Housekeeping Staff',
    issuedBy: string = 'Admin',
    customCardUid?: string
  ): RFIDCard {
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const cardUid = customCardUid || `CLN-HK-${randSuffix}`;
    const newCard: RFIDCard = {
      id: `crd-cln-${Date.now()}`,
      card_uid: cardUid,
      card_label: cardLabel,
      card_type: 'cleaner',
      is_lifetime: false,
      holder_name: holderName,
      holder_role: 'Housekeeping',
      status: 'active',
      activated_at: new Date().toISOString(),
      issued_by_name: issuedBy,
      notes: 'Post-checkout turnover cleaning card (dual-tap in-and-out logic)',
      created_at: new Date().toISOString(),
    };

    this.rfidCards.unshift(newCard);
    savePersistedCards(this.rfidCards);
    syncCardToSupabase(newCard);
    this.logRFIDEvent(
      {
        card_uid: cardUid,
        card_type: 'cleaner',
        card_label: cardLabel,
        device_name: 'Central-RFID-IoT-Gateway',
        room_number: 'ALL-CLEANING',
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: holderName,
        source: 'encoder',
        reason: `Cleaner Card issued to ${holderName} by ${issuedBy}`,
      },
      issuedBy
    );

    return newCard;
  }

  issueRFIDCard(
    roomNumber: string,
    bookingRef: string,
    guestName: string,
    issuedBy: string = 'Front Desk',
    expiresAt?: string,
    customCardUid?: string
  ): RFIDCard {
    const cardUid = customCardUid || `BT-57-${Math.floor(1000020000 + Math.random() * 99999)}`;
    const newCard: RFIDCard = {
      id: `crd-${Date.now()}`,
      card_uid: cardUid,
      card_label: `Guest Card (Room ${roomNumber})`,
      card_type: 'guest',
      assigned_room_number: roomNumber,
      booking_reference: bookingRef,
      guest_name: guestName,
      holder_name: guestName,
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: expiresAt || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      issued_by_name: issuedBy,
      notes: `Customer Keycard for Room ${roomNumber} (Stay: ${bookingRef})`,
      created_at: new Date().toISOString(),
    };
    this.rfidCards.unshift(newCard);
    savePersistedCards(this.rfidCards);
    syncCardToSupabase(newCard);

    this.logRFIDEvent(
      {
        card_uid: cardUid,
        card_type: 'guest',
        card_label: newCard.card_label,
        device_name: 'Front-Desk-Encoder-01',
        room_number: roomNumber,
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: guestName,
        booking_reference: bookingRef,
        source: 'encoder',
        reason: `Customer Keycard encoded & issued to ${guestName} for Room ${roomNumber}`,
      },
      issuedBy
    );

    return newCard;
  }

  toggleRFIDCardStatus(cardId: string, targetStatus?: 'active' | 'inactive'): RFIDCard | null {
    let card = this.rfidCards.find((c) => c.id === cardId || c.card_uid === cardId);
    if (!card) {
      const persisted = loadPersistedCards();
      const found = persisted.find((c) => c.id === cardId || c.card_uid === cardId);
      if (found) {
        this.rfidCards.push(found);
        card = found;
      }
    }
    if (!card) return null;

    const nextStatus = targetStatus ? targetStatus : (card.status === 'active' ? 'inactive' : 'active');
    card.status = nextStatus;

    if (nextStatus === 'inactive') {
      card.deactivated_at = new Date().toISOString();
    } else {
      card.activated_at = new Date().toISOString();
    }

    savePersistedCards(this.rfidCards);
    syncCardToSupabase(card);

    this.logRFIDEvent({
      card_uid: card.card_uid,
      card_type: card.card_type || 'guest',
      card_label: card.card_label,
      device_name: 'Admin-Dashboard',
      room_number: card.assigned_room_number || 'N/A',
      event_type: nextStatus === 'active' ? 'access_granted' : 'access_denied',
      action_type: nextStatus === 'active' ? 'door_unlock' : 'door_lock',
      holder_name: card.holder_name || card.guest_name,
      booking_reference: card.booking_reference,
      source: 'encoder',
      reason: `Keycard manually set to ${nextStatus.toUpperCase()} by System Administrator`,
    });

    return card;
  }

  deactivateRFIDCard(cardId: string): RFIDCard | null {
    return this.toggleRFIDCardStatus(cardId, 'inactive');
  }

  purgeAllRFIDCards(): void {
    this.rfidCards = [];
    savePersistedCards([]);
  }

  purgeAllRFIDEvents(): void {
    this.rfidEvents = [];
    savePersistedEvents([]);
  }

  deleteRFIDCard(cardId: string): boolean {
    const cardToDelete = this.rfidCards.find((c) => c.id === cardId || c.card_uid === cardId);
    const initialLen = this.rfidCards.length;
    this.rfidCards = this.rfidCards.filter((c) => c.id !== cardId && c.card_uid !== cardId);

    if (this.rfidCards.length !== initialLen) {
      savePersistedCards(this.rfidCards);
      if (cardToDelete) {
        deleteCardFromSupabase(cardToDelete.card_uid);
      }
      return true;
    }
    return false;
  }

  extendGuestCardValidity(
    cardId: string,
    hoursToAdd: number = 2,
    customExpiry?: string,
    staffUser: string = 'Front Desk'
  ): RFIDCard | null {
    const card = this.rfidCards.find((c) => c.id === cardId || c.card_uid === cardId);
    if (!card) return null;

    let newExpiry: string;
    if (customExpiry) {
      newExpiry = new Date(customExpiry).toISOString();
    } else {
      const currentExpiryMs = card.expires_at ? new Date(card.expires_at).getTime() : Date.now();
      const baseMs = Math.max(Date.now(), currentExpiryMs);
      newExpiry = new Date(baseMs + hoursToAdd * 3600 * 1000).toISOString();
    }

    card.expires_at = newExpiry;
    card.status = 'active';

    this.logRFIDEvent(
      {
        card_uid: card.card_uid,
        card_type: card.card_type || 'guest',
        card_label: card.card_label,
        device_name: 'Admin-Dashboard',
        room_number: card.assigned_room_number || 'N/A',
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: card.holder_name || card.guest_name,
        booking_reference: card.booking_reference,
        source: 'encoder',
        reason: `Keycard validity extended by ${hoursToAdd ? `${hoursToAdd} hours` : 'custom time'} until ${new Date(newExpiry).toLocaleString('en-IN')} by ${staffUser}`,
      },
      staffUser
    );

    savePersistedCards(this.rfidCards);
    syncCardToSupabase(card);
    return card;
  }

  processDoorTap(
    cardUid: string,
    roomNumber: string,
    _actionOverride?: string
  ): {
    success: boolean;
    event: RFIDAccessEvent;
    roomStatus?: OperationalStatus;
    housekeepingStatus?: HousekeepingStatus;
    message: string;
    cardType?: string;
  } {
    const card = this.rfidCards.find(
      (c) => c.card_uid.toLowerCase() === cardUid.toLowerCase()
    );

    const room = this.rooms.find((r) => r.room_number === roomNumber);

    if (!card || card.status !== 'active') {
      const event = this.logRFIDEvent({
        card_uid: cardUid,
        card_type: card?.card_type,
        card_label: card?.card_label || 'Unregistered Card',
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_denied',
        action_type: 'unauthorized_attempt',
        holder_name: card?.holder_name,
        reason: !card
          ? 'Unregistered Card UID'
          : `Card has status '${card.status}' (Access Blocked)`,
        source: 'lock_reader',
      });

      return {
        success: false,
        event,
        roomStatus: room?.operational_status,
        housekeepingStatus: room?.housekeeping_status,
        cardType: card?.card_type,
        message: !card
          ? 'Access Denied: Unregistered card scanned.'
          : `Access Denied: Card is ${card.status.toUpperCase()}.`,
      };
    }

    // Check expiry
    if (card.expires_at && new Date(card.expires_at).getTime() < Date.now()) {
      card.status = 'expired';
      savePersistedCards(this.rfidCards);
      syncCardToSupabase(card);

      const event = this.logRFIDEvent({
        card_uid: card.card_uid,
        card_type: card.card_type,
        card_label: card.card_label,
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_denied',
        action_type: 'unauthorized_attempt',
        holder_name: card.holder_name,
        booking_reference: card.booking_reference,
        reason: 'Guest checkout time passed. Keycard has expired.',
        source: 'lock_reader',
      });

      return {
        success: false,
        event,
        roomStatus: room?.operational_status,
        housekeepingStatus: room?.housekeeping_status,
        cardType: card.card_type,
        message: 'Access Denied: Keycard expired past guest checkout time.',
      };
    }

    // 1. SUPER ADMIN MASTER CARD
    if (card.card_type === 'super_admin') {
      card.last_tap_at = new Date().toISOString();
      card.last_tap_room = roomNumber;
      savePersistedCards(this.rfidCards);

      const event = this.logRFIDEvent({
        card_uid: card.card_uid,
        card_type: 'super_admin',
        card_label: card.card_label,
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: card.holder_name,
        reason: `Super Admin Master Override: Universal Door Unlock for ${card.holder_name}`,
        source: 'lock_reader',
      });

      return {
        success: true,
        event,
        roomStatus: room?.operational_status,
        housekeepingStatus: room?.housekeeping_status,
        cardType: 'super_admin',
        message: `Super Admin Master Clearance: Door unlocked for ${card.holder_name}.`,
      };
    }

    // 2. CLEANER CARD (Dual-Tap Automation)
    if (card.card_type === 'cleaner') {
      if (room && room.operational_status === 'occupied' && room.housekeeping_status !== 'dirty') {
        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'cleaner',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_denied',
          action_type: 'unauthorized_attempt',
          holder_name: card.holder_name,
          reason: `Guest Occupied Room: Cleaner cannot enter active guest room without front desk clearance.`,
          source: 'lock_reader',
        });

        return {
          success: false,
          event,
          roomStatus: room?.operational_status,
          housekeepingStatus: room?.housekeeping_status,
          cardType: 'cleaner',
          message: `Access Denied: Room ${roomNumber} is occupied by guest. Cleaning tap prohibited.`,
        };
      }

      card.last_tap_at = new Date().toISOString();
      card.last_tap_room = roomNumber;
      savePersistedCards(this.rfidCards);

      if (room && room.housekeeping_status === 'in_progress') {
        // Exit Tap: Turnover Complete -> Room Clean and Available
        room.housekeeping_status = 'clean';
        room.operational_status = 'available';
        room.current_booking_ref = undefined;
        room.current_guest_name = undefined;

        this.broadcastEvent('housekeeping_updated', {
          roomId: room.id,
          roomNumber: room.room_number,
          operational_status: room.operational_status,
          housekeeping_status: room.housekeeping_status,
        });

        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'cleaner',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_granted',
          action_type: 'cleaning_completed',
          holder_name: card.holder_name,
          reason: `Cleaner Exit Tap: Room ${roomNumber} cleaning completed and verified. Operational status set to Available.`,
          source: 'lock_reader',
        });

        return {
          success: true,
          event,
          roomStatus: room.operational_status,
          housekeepingStatus: room.housekeeping_status,
          cardType: 'cleaner',
          message: `Cleaner finished: Room ${roomNumber} is now Clean & Available for new guests.`,
        };
      }

      // Entry Tap: Cleaning Started
      if (room) {
        room.housekeeping_status = 'in_progress';
        room.operational_status = 'cleaning';

        this.broadcastEvent('housekeeping_updated', {
          roomId: room.id,
          roomNumber: room.room_number,
          operational_status: room.operational_status,
          housekeeping_status: room.housekeeping_status,
        });
      }

      const event = this.logRFIDEvent({
        card_uid: card.card_uid,
        card_type: 'cleaner',
        card_label: card.card_label,
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_granted',
        action_type: 'cleaning_started',
        holder_name: card.holder_name,
        reason: `Cleaner Entry Tap: Room ${roomNumber} cleaning started. Status set to In Progress.`,
        source: 'lock_reader',
      });

      return {
        success: true,
        event,
        roomStatus: room?.operational_status,
        housekeepingStatus: room?.housekeeping_status,
        cardType: 'cleaner',
        message: `Cleaner started: Room ${roomNumber} status moved to In-Progress. Door unlocked.`,
      };
    }

    // 3. GUEST CARD
    if (card.card_type === 'guest') {
      if (card.assigned_room_number !== roomNumber) {
        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'guest',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_denied',
          action_type: 'unauthorized_attempt',
          holder_name: card.holder_name || card.guest_name,
          booking_reference: card.booking_reference,
          reason: `Cross-Room Denial: Keycard assigned to Room ${card.assigned_room_number}, attempted Room ${roomNumber}.`,
          source: 'lock_reader',
        });

        return {
          success: false,
          event,
          roomStatus: room?.operational_status,
          housekeepingStatus: room?.housekeeping_status,
          cardType: 'guest',
          message: `Access Denied: This keycard belongs to Room ${card.assigned_room_number}, not Room ${roomNumber}.`,
        };
      }

      card.last_tap_at = new Date().toISOString();
      card.last_tap_room = roomNumber;
      savePersistedCards(this.rfidCards);

      if (room && room.operational_status === 'reserved') {
        room.operational_status = 'occupied';
        this.broadcastEvent('housekeeping_updated', {
          roomId: room.id,
          roomNumber: room.room_number,
          operational_status: room.operational_status,
          housekeeping_status: room.housekeeping_status,
        });
      }

      const event = this.logRFIDEvent({
        card_uid: card.card_uid,
        card_type: 'guest',
        card_label: card.card_label,
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: card.guest_name || card.holder_name,
        booking_reference: card.booking_reference,
        reason: `Customer Tap: Door unlocked for guest ${card.guest_name || card.holder_name} (Stay: ${card.booking_reference || 'Active'})`,
        source: 'lock_reader',
      });

      return {
        success: true,
        event,
        roomStatus: room?.operational_status,
        housekeepingStatus: room?.housekeeping_status,
        cardType: 'guest',
        message: `Customer ${card.guest_name || card.holder_name} tapped and unlocked Room ${roomNumber}.`,
      };
    }

    // Fallback unknown card
    const event = this.logRFIDEvent({
      card_uid: card.card_uid,
      device_name: `Lock-Room-${roomNumber}`,
      room_number: roomNumber,
      event_type: 'access_denied',
      action_type: 'unauthorized_attempt',
      reason: 'Unrecognized card classification',
      source: 'lock_reader',
    });

    return {
      success: false,
      event,
      message: 'Access Denied: Unrecognized card configuration.',
    };
  }

  activateAllRFIDDevices(): RFIDDevice[] {
    const now = new Date().toISOString();
    this.rfidDevices = this.rfidDevices.map((d) => ({
      ...d,
      status: 'online' as const,
      last_ping_at: now,
      battery_level: d.battery_level !== undefined ? Math.max(90, d.battery_level) : undefined,
    }));
    this.broadcastEvent('full_sync', { rfidDevices: this.rfidDevices });
    return [...this.rfidDevices];
  }

  updateRFIDDeviceStatus(
    deviceId: string,
    status: 'online' | 'offline' | 'maintenance'
  ): RFIDDevice | null {
    const dev = this.rfidDevices.find((d) => d.id === deviceId);
    if (!dev) return null;
    dev.status = status;
    dev.last_ping_at = new Date().toISOString();
    this.broadcastEvent('full_sync', { updatedDevice: dev });
    return { ...dev };
  }


  // ==============================================================================
  // GUEST FOLIO CHARGES & INCIDENTAL SERVICES
  // ==============================================================================

  public getFolioCharges(bookingIdOrRef?: string): FolioCharge[] {
    if (!bookingIdOrRef) return [...this.folioCharges];
    return this.folioCharges.filter(
      (c) => c.booking_id === bookingIdOrRef || c.booking_reference === bookingIdOrRef
    );
  }

  public addFolioCharge(charge: Omit<FolioCharge, 'id' | 'created_at'>): FolioCharge {
    const id = 'fc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const tax_rate = typeof charge.tax_rate === 'number' ? charge.tax_rate : 0.12;
    const tax_amount = Math.round(charge.amount * tax_rate * 100) / 100;
    const total_amount = Math.round((charge.amount + tax_amount) * 100) / 100;

    const newCharge: FolioCharge = {
      ...charge,
      id,
      tax_rate,
      tax_amount,
      total_amount,
      created_at: new Date().toISOString(),
    };

    this.folioCharges.push(newCharge);

    // Update corresponding booking's additional charges and total amount
    const booking = this.bookings.find(
      (b) => b.id === charge.booking_id || b.booking_reference === charge.booking_reference
    );
    if (booking) {
      booking.additional_charges_amount = (booking.additional_charges_amount || 0) + total_amount;
      booking.total_amount = (booking.total_amount || 0) + total_amount;
    }

    this.broadcastEvent('folio_charge_added', { charge: newCharge, booking });
    this.recordAuditLog({
      action: 'ADD_FOLIO_CHARGE',
      entityType: 'booking',
      entityId: newCharge.id,
      details: `Added folio charge ${newCharge.description} (₹${newCharge.total_amount}) to booking ${newCharge.booking_reference}`,
      newValue: newCharge,
      userId: 'stf-admin',
      userName: newCharge.posted_by || 'Admin',
      userRole: 'Front Desk',
    });

    return newCharge;
  }

  public addIncidentalCharge(charge: any): FolioCharge {
    return this.addFolioCharge(charge);
  }

  public deleteFolioCharge(id: string): boolean {
    const idx = this.folioCharges.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    const [deleted] = this.folioCharges.splice(idx, 1);
    const booking = this.bookings.find(
      (b) => b.id === deleted.booking_id || b.booking_reference === deleted.booking_reference
    );
    if (booking) {
      booking.additional_charges_amount = Math.max(0, (booking.additional_charges_amount || 0) - deleted.total_amount);
      booking.total_amount = Math.max(0, (booking.total_amount || 0) - deleted.total_amount);
    }

    this.broadcastEvent('folio_charge_deleted', { id, booking });
    return true;
  }

  // ==============================================================================
  // CUSTOMER ENQUIRIES & LEADS PIPELINE
  // ==============================================================================

  public getContactEnquiries(): ContactEnquiry[] {
    return [...this.contactEnquiries];
  }

  public createContactEnquiry(data: Omit<ContactEnquiry, 'id' | 'created_at' | 'status'>): ContactEnquiry {
    const id = 'ce-' + Date.now();
    const newEnquiry: ContactEnquiry = {
      ...data,
      id,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.contactEnquiries.unshift(newEnquiry);
    this.broadcastEvent('enquiry_created', { enquiry: newEnquiry, type: 'contact' });
    return newEnquiry;
  }

  public updateContactEnquiryStatus(
    id: string,
    status: EnquiryStatus,
    admin_notes?: string
  ): ContactEnquiry | null {
    const enquiry = this.contactEnquiries.find((e) => e.id === id);
    if (!enquiry) return null;

    enquiry.status = status;
    if (admin_notes !== undefined) enquiry.admin_notes = admin_notes;
    enquiry.updated_at = new Date().toISOString();

    this.broadcastEvent('enquiry_updated', { enquiry, type: 'contact' });
    return enquiry;
  }

  public updateEnquiryStatus(
    id: string,
    status: EnquiryStatus,
    admin_notes?: string
  ): UnifiedEnquiry | null {
    const contact = this.updateContactEnquiryStatus(id, status, admin_notes);
    if (contact) {
      return {
        id: contact.id,
        type: 'general_stay',
        reference: 'ENQ-' + contact.id.substr(contact.id.length - 6).toUpperCase(),
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        status: contact.status,
        event_or_checkin_date: contact.check_in_date,
        guest_count: contact.adults_count,
        details: contact.subject ? `${contact.subject}: ${contact.message}` : contact.message,
        admin_notes: contact.admin_notes,
        created_at: contact.created_at,
      };
    }

    let hallStatus: 'new' | 'contacted' | 'quotation_sent' | 'pending_approval' | 'confirmed' | 'completed' | 'cancelled' = 'new';
    if (status === 'converted') hallStatus = 'confirmed';
    else if (status === 'closed') hallStatus = 'cancelled';
    else if (status === 'quotation_sent') hallStatus = 'quotation_sent';
    else if (status === 'contacted') hallStatus = 'contacted';
    else hallStatus = 'new';

    const hall = this.updateHallEnquiryStatus(id, hallStatus, admin_notes);
    if (hall) {
      return {
        id: hall.id,
        type: 'convention',
        reference: hall.enquiry_reference,
        name: hall.name,
        phone: hall.phone,
        email: hall.email,
        status: status,
        event_or_checkin_date: hall.event_date,
        guest_count: hall.expected_guests,
        details: `${hall.event_type} - ${hall.requirements || hall.message || 'Convention Hall Booking'}`,
        quoted_amount: hall.quoted_amount,
        admin_notes: hall.admin_notes,
        created_at: hall.created_at,
      };
    }
    return null;
  }

  public getUnifiedEnquiries(): UnifiedEnquiry[] {
    const list: UnifiedEnquiry[] = [];

    // Map convention hall enquiries
    this.hallEnquiries.forEach((h) => {
      let mappedStatus: EnquiryStatus = 'new';
      if (h.status === 'confirmed') mappedStatus = 'converted';
      else if (h.status === 'cancelled') mappedStatus = 'closed';
      else if (h.status === 'quotation_sent') mappedStatus = 'quotation_sent';
      else if (h.status === 'contacted') mappedStatus = 'contacted';

      list.push({
        id: h.id,
        type: 'convention',
        reference: h.enquiry_reference,
        name: h.name,
        phone: h.phone,
        email: h.email,
        status: mappedStatus,
        event_or_checkin_date: h.event_date,
        guest_count: h.expected_guests,
        details: `${h.event_type} - ${h.requirements || h.message || 'Convention Hall Booking'}`,
        quoted_amount: h.quoted_amount,
        admin_notes: h.admin_notes,
        created_at: h.created_at,
      });
    });

    // Map contact / room enquiries
    this.contactEnquiries.forEach((c) => {
      list.push({
        id: c.id,
        type: 'general_stay',
        reference: 'ENQ-' + c.id.substr(c.id.length - 6).toUpperCase(),
        name: c.name,
        phone: c.phone,
        email: c.email,
        status: c.status,
        event_or_checkin_date: c.check_in_date,
        guest_count: c.adults_count,
        details: c.subject ? `${c.subject}: ${c.message}` : c.message,
        admin_notes: c.admin_notes,
        created_at: c.created_at,
      });
    });

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==============================================================================
  // HOSPITALITY REVENUE & BUSINESS INTELLIGENCE ANALYTICS
  // ==============================================================================

  public getHospitalityAnalytics(range: 'today' | '7d' | '30d' | '90d' | 'ytd' = '30d') {
    const totalRooms = 25;
    const occupiedRooms = this.rooms.filter(
      (r) => r.operational_status === 'occupied' || r.housekeeping_status === 'dirty'
    ).length;
    const availableRooms = this.rooms.filter((r) => r.operational_status === 'available').length;
    const maintenanceRooms = this.rooms.filter((r) => r.operational_status === 'maintenance').length;

    const occupancyRate = Math.round((occupiedRooms / totalRooms) * 1000) / 10;

    // Filter relevant bookings based on range
    const now = new Date();
    let cutoffDays = 30;
    if (range === 'today') cutoffDays = 1;
    else if (range === '7d') cutoffDays = 7;
    else if (range === '90d') cutoffDays = 90;
    else if (range === 'ytd') cutoffDays = 365;

    const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);

    const periodBookings = this.bookings.filter(
      (b) => new Date(b.created_at) >= cutoff && b.status !== 'cancelled'
    );

    const totalRevenue = periodBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const roomRevenue = periodBookings.reduce((sum, b) => sum + (b.subtotal_amount || b.total_amount || 0), 0);
    const totalNights = periodBookings.reduce((sum, b) => {
      const start = new Date(b.check_in_date).getTime();
      const end = new Date(b.check_out_date).getTime();
      const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      return sum + nights;
    }, 0);

    const adr = totalNights > 0 ? Math.round(roomRevenue / totalNights) : 2250;
    const revPAR = Math.round((adr * occupancyRate) / 100);

    // Channel breakdown
    const directCount = periodBookings.filter((b) => !b.booking_source || b.booking_source !== 'online').length;
    const otaCount = periodBookings.filter((b) => b.booking_source === 'online').length;
    const channelBreakdown = [
      {
        name: 'Front Desk Direct & Walk-In',
        count: directCount || 6,
        revenue: Math.round(totalRevenue * 0.58) || 38500,
        percentage: 58,
      },
      {
        name: 'MakeMyTrip & Goibibo',
        count: Math.round(otaCount * 0.6) || 3,
        revenue: Math.round(totalRevenue * 0.25) || 16500,
        percentage: 25,
      },
      {
        name: 'Booking.com & Agoda',
        count: Math.round(otaCount * 0.4) || 2,
        revenue: Math.round(totalRevenue * 0.17) || 11200,
        percentage: 17,
      },
    ];

    // Category yield
    const categoryYield = this.categories.map((cat) => {
      const catBookings = periodBookings.filter((b) => b.category_id === cat.id);
      const catRev = catBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      return {
        category: cat.name,
        slug: cat.slug,
        basePrice: cat.base_price_per_night,
        bookings: catBookings.length,
        revenue: catRev || cat.base_price_per_night * 4,
        occupancy: Math.min(100, Math.round((catBookings.length / 5) * 85)),
      };
    });

    // Monthly Trajectory (Last 6 Months)
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const monthlyTrajectory = months.map((m, idx) => ({
      month: m,
      revenue: 75000 + idx * 18500 + (idx === 5 ? 32000 : 0),
      occupancy: 55 + idx * 4,
      bookings: 22 + idx * 6,
    }));

    return {
      range,
      kpis: {
        totalRevenue: totalRevenue || 124500,
        occupancyRate,
        revPAR,
        adr,
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
      },
      channelBreakdown,
      categoryYield,
      monthlyTrajectory,
    };
  }

  // ==============================================================================
  // RAZORPAY PAYMENT RECONCILIATION & IN-APP REFUNDS
  // ==============================================================================

  public refundPayment(
    paymentId: string,
    amount: number,
    reason: string
  ): { success: boolean; payment?: PaymentRecord; error?: string } {
    const payment = this.payments.find((p) => p.id === paymentId);
    if (!payment) return { success: false, error: 'Payment record not found.' };

    if (amount <= 0 || amount > payment.amount) {
      return { success: false, error: 'Invalid refund amount.' };
    }

    const currentRefunded = payment.refund_amount || 0;
    const newRefunded = currentRefunded + amount;
    payment.refund_amount = newRefunded;
    payment.refund_status = newRefunded >= payment.amount ? 'full' : 'partial';
    payment.refund_reason = reason;
    payment.refunded_at = new Date().toISOString();

    // Record reverse transaction in Cashbook / GL if applicable
    this.recordAuditLog({
      action: 'REFUND_PAYMENT',
      entityType: 'payment',
      entityId: payment.id,
      details: `Processed ${payment.refund_status} refund of ₹${amount} for payment ${payment.payment_reference}. Reason: ${reason}`,
      newValue: payment,
      userId: 'stf-admin',
      userName: 'Sri Tayi Grand Admin',
      userRole: 'Super Admin',
    });

    this.broadcastEvent('payment_refunded', { payment, amount, reason });
    return { success: true, payment };
  }

  public createPaymentLink(
    bookingReference: string,
    amount: number,
    description: string
  ): { success: boolean; link_url: string; payment_id: string } {
    const payment_id = 'pay-' + Date.now();
    const link_url = `https://rzp.io/l/stg-${Date.now().toString(36)}`;

    const newPayment: PaymentRecord = {
      id: payment_id,
      payment_reference: 'PAY-REQ-' + Date.now().toString().slice(-6),
      booking_reference: bookingReference,
      guest_name: 'Guest (' + bookingReference + ')',
      amount,
      currency: 'INR',
      payment_method: 'online',
      status: 'pending',
      payment_link_url: link_url,
      created_at: new Date().toISOString(),
    };

    this.payments.unshift(newPayment);
    this.broadcastEvent('payment_link_created', { payment: newPayment });
    return { success: true, link_url, payment_id };
  }

  public reconcilePayments(): {
    reconciled_count: number;
    total_amount: number;
    discrepancies: number;
    payments: PaymentRecord[];
  } {
    let count = 0;
    let total = 0;

    this.payments.forEach((p) => {
      if (p.status === 'successful') {
        p.reconciled = true;
        p.reconciled_at = new Date().toISOString();
        count++;
        total += p.amount;
      }
    });

    return {
      reconciled_count: count,
      total_amount: total,
      discrepancies: 0,
      payments: [...this.payments],
    };
  }

  // ==============================================================================
  // HOUSEKEEPING TURNAROUND & ATTENDANT ASSIGNMENTS
  // ==============================================================================

  public assignHousekeeper(roomId: string, staffId: string, staffName: string): boolean {
    const room = this.rooms.find((r) => r.id === roomId || r.room_number === roomId);
    if (!room) return false;

    room.assigned_housekeeper_id = staffId;
    room.assigned_housekeeper_name = staffName;

    this.broadcastEvent('housekeeping_updated', { room });
    return true;
  }

  public completeHousekeepingTurnaround(
    roomId: string,
    checklist: HousekeepingTurnaroundChecklist,
    inspectedBy?: string
  ): boolean {
    const room = this.rooms.find((r) => r.id === roomId || r.room_number === roomId);
    if (!room) return false;

    room.housekeeping_status = 'clean';
    if (room.operational_status === 'cleaning') {
      room.operational_status = 'available';
    }

    room.turnaround_checklist = {
      ...checklist,
      inspected_by: inspectedBy || 'G. Mohan Kumar (Hotel Manager)',
      inspected_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    this.broadcastEvent('housekeeping_inspected', { room });
    this.recordAuditLog({
      action: 'HOUSEKEEPING_INSPECTED',
      entityType: 'room',
      entityId: room.id,
      details: `Room ${room.room_number} turnaround completed and certified clean by ${inspectedBy || 'Manager'}`,
      newValue: room,
      userId: 'stf-02',
      userName: inspectedBy || 'Manager',
      userRole: 'Hotel Manager',
    });

    return true;
  }

  // ==============================================================================
  // GUEST CRM & VIP REGISTRY
  // ==============================================================================

  public updateGuestProfile(id: string, updates: Partial<Guest>): Guest | null {
    const guest = this.guests.find((g) => g.id === id);
    if (!guest) return null;

    Object.assign(guest, updates);
    this.broadcastEvent('guest_profile_updated', { guest });
    return guest;
  }

  public toggleGuestBlacklist(id: string, reason?: string): Guest | null {
    const guest = this.guests.find((g) => g.id === id);
    if (!guest) return null;

    guest.is_blacklisted = !guest.is_blacklisted;
    if (guest.is_blacklisted && reason) {
      guest.blacklist_reason = reason;
    } else if (!guest.is_blacklisted) {
      guest.blacklist_reason = undefined;
    }

    this.broadcastEvent('guest_profile_updated', { guest });
    this.recordAuditLog({
      action: 'TOGGLE_GUEST_BLACKLIST',
      entityType: 'security',
      entityId: guest.id,
      details: `Guest ${guest.full_name} ${guest.is_blacklisted ? 'BLACKLISTED' : 'REINSTATED'}. ${reason ? 'Reason: ' + reason : ''}`,
      newValue: guest,
      userId: 'stf-admin',
      userName: 'Super Admin',
      userRole: 'Super Admin',
    });

    return guest;
  }

  // ==============================================================================
  // STAFF RBAC PERMISSIONS & PROFILES
  // ==============================================================================

  public updateStaffPermissions(
    id: string,
    permissions: StaffPermissions,
    department?: string
  ): StaffMember | null {
    const staffMember = this.staff.find((s) => s.id === id);
    if (!staffMember) return null;

    staffMember.permissions = permissions;
    if (department) staffMember.department = department;

    this.broadcastEvent('staff_permissions_updated', { staff: staffMember });
    this.recordAuditLog({
      action: 'UPDATE_STAFF_PERMISSIONS',
      entityType: 'security',
      entityId: staffMember.id,
      details: `Updated RBAC permissions for ${staffMember.full_name} (${staffMember.role})`,
      newValue: staffMember,
      userId: 'stf-admin',
      userName: 'Super Admin',
      userRole: 'Super Admin',
    });

    return staffMember;
  }

  // ==============================================================================
  // CONVENTION HALL BANQUET QUOTES
  // ==============================================================================

  public getConventionQuotes(): ConventionQuote[] {
    return [...this.conventionQuotes];
  }

  public createConventionQuote(
    quote: Omit<ConventionQuote, 'id' | 'quote_number' | 'created_at'>
  ): ConventionQuote {
    const id = 'cq-' + Date.now();
    const quote_number = 'STG-QT-' + new Date().getFullYear() + '-' + (this.conventionQuotes.length + 1).toString().padStart(3, '0');

    const newQuote: ConventionQuote = {
      ...quote,
      id,
      quote_number,
      created_at: new Date().toISOString(),
    };

    this.conventionQuotes.unshift(newQuote);

    // If linked to an enquiry, update the enquiry status
    if (quote.enquiry_id) {
      const hallEnq = this.hallEnquiries.find((h) => h.id === quote.enquiry_id);
      if (hallEnq) {
        hallEnq.status = 'quotation_sent';
        hallEnq.quoted_amount = quote.total_amount;
      }
    }

    this.recordAuditLog({
      action: 'CREATE_BANQUET_QUOTE',
      entityType: 'booking',
      entityId: newQuote.id,
      details: `Created convention banquet quote ${newQuote.quote_number} for ${newQuote.client_name} (₹${newQuote.total_amount})`,
      newValue: newQuote,
      userId: 'stf-06',
      userName: quote.created_by || 'Event Manager',
      userRole: 'Event Manager',
    });

    return newQuote;
  }

  public updateConventionQuoteStatus(
    id: string,
    status: 'draft' | 'sent' | 'approved' | 'rejected'
  ): boolean {
    const quote = this.conventionQuotes.find((q) => q.id === id);
    if (!quote) return false;

    quote.status = status;
    return true;
  }

}

// Global instance to maintain state across Hot Reloads & Next.js requests
declare global {
  // eslint-disable-next-line no-var
  var __hotelRepo: HotelRepository | undefined;
}

if (
  !global.__hotelRepo ||
  typeof (global.__hotelRepo as any).subscribeEvents !== 'function' ||
  typeof (global.__hotelRepo as any).getExpenses !== 'function' ||
  typeof (global.__hotelRepo as any).getDailyClosings !== 'function' ||
  typeof (global.__hotelRepo as any).getFullState !== 'function' ||
  typeof (global.__hotelRepo as any).getReviews !== 'function' ||
  typeof (global.__hotelRepo as any).getCashShifts !== 'function' ||
  typeof (global.__hotelRepo as any).getMaintenanceTickets !== 'function'
) {
  global.__hotelRepo = new HotelRepository();
}

export const repo = global.__hotelRepo;
