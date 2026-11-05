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
} from '@/types';

import { syncCardToSupabase, syncEventToSupabase, deleteCardFromSupabase } from './supabase-rfid';
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
} from './mock-data';

// Singleton in-memory state that persists during server runtime
class HotelRepository {
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
  private rfidCards: RFIDCard[] = JSON.parse(JSON.stringify(INITIAL_RFID_CARDS));
  private rfidEvents: RFIDAccessEvent[] = JSON.parse(JSON.stringify(INITIAL_RFID_ACCESS_EVENTS));

  // --- SETTINGS ---
  getSettings(): HotelSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<HotelSettings>): HotelSettings {
    this.settings = { ...this.settings, ...partial };
    return this.settings;
  }

  // --- ROOM CATEGORIES ---
  getCategories(): RoomCategory[] {
    return this.categories.map((cat) => {
      const catRooms = this.rooms.filter((r) => r.category_id === cat.id && r.is_active);
      const availableRooms = catRooms.filter((r) => r.operational_status === 'available');
      return {
        ...cat,
        total_physical_rooms: catRooms.length,
        available_physical_rooms: availableRooms.length,
      };
    });
  }

  getCategoryBySlug(slug: string): RoomCategory | undefined {
    const cat = this.categories.find((c) => c.slug === slug);
    if (!cat) return undefined;
    const catRooms = this.rooms.filter((r) => r.category_id === cat.id && r.is_active);
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
    return this.categories[index];
  }

  createCategory(category: Omit<RoomCategory, 'id'>): RoomCategory {
    const newCategory: RoomCategory = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    this.categories.push(newCategory);
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
    return this.rooms.find((r) => r.id === id);
  }

  createRoom(room: Omit<PhysicalRoom, 'id'>): PhysicalRoom {
    const newRoom: PhysicalRoom = {
      ...room,
      id: `rm-${Date.now()}`,
    };
    this.rooms.push(newRoom);
    return newRoom;
  }

  updateRoomStatus(
    id: string,
    operational_status: OperationalStatus,
    housekeeping_status?: HousekeepingStatus,
    notes?: string
  ): PhysicalRoom | null {
    const index = this.rooms.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.rooms[index].operational_status = operational_status;
    if (housekeeping_status) {
      this.rooms[index].housekeeping_status = housekeeping_status;
    }
    if (notes !== undefined) {
      this.rooms[index].notes = notes;
    }
    return this.rooms[index];
  }

  assignRoomToBooking(roomId: string, bookingRef: string, guestName: string): PhysicalRoom | null {
    const index = this.rooms.findIndex((r) => r.id === roomId);
    if (index === -1) return null;
    this.rooms[index].current_booking_ref = bookingRef;
    this.rooms[index].current_guest_name = guestName;
    this.rooms[index].operational_status = 'reserved';
    return this.rooms[index];
  }

  // --- BOOKINGS ---
  getBookings(): Booking[] {
    return [...this.bookings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getBookingByReference(reference: string): Booking | undefined {
    return this.bookings.find(
      (b) => b.booking_reference.toLowerCase() === reference.toLowerCase()
    );
  }

  createBooking(
    bookingData: Omit<Booking, 'id' | 'booking_reference' | 'created_at'>
  ): Booking {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `STG-${dateStr}-${randCode}`;

    const newBooking: Booking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
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

    // If an assigned physical room was specified, reserve it
    if (newBooking.assigned_room_id) {
      this.assignRoomToBooking(
        newBooking.assigned_room_id,
        bookingReference,
        newBooking.guest_name
      );
    }

    return newBooking;
  }

  updateBookingStatus(
    bookingReference: string,
    status: BookingStatus,
    notes?: string
  ): Booking | null {
    const booking = this.getBookingByReference(bookingReference);
    if (!booking) return null;

    booking.status = status;
    if (notes) booking.internal_notes = notes;

    if (status === 'checked_in') {
      booking.checked_in_at = new Date().toISOString();
      if (booking.assigned_room_id) {
        this.updateRoomStatus(booking.assigned_room_id, 'occupied', 'clean');
      }
    } else if (status === 'checked_out') {
      booking.checked_out_at = new Date().toISOString();
      if (booking.assigned_room_id) {
        this.updateRoomStatus(booking.assigned_room_id, 'cleaning', 'dirty');
      }
    } else if (status === 'cancelled') {
      booking.cancelled_at = new Date().toISOString();
      if (booking.assigned_room_id) {
        this.updateRoomStatus(booking.assigned_room_id, 'available', 'clean');
      }
    }

    return booking;
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

  recordPayment(record: Omit<PaymentRecord, 'id' | 'payment_reference' | 'created_at'>): PaymentRecord {
    const rand = Math.floor(100 + Math.random() * 900);
    const newPayment: PaymentRecord = {
      ...record,
      id: `pay-${Date.now()}`,
      payment_reference: `PAY-STG-${Date.now().toString().slice(-6)}-${rand}`,
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

    return newPayment;
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

  // --- RFID SYSTEM ---
  getRFIDDevices(): RFIDDevice[] {
    return [...this.rfidDevices];
  }

  getRFIDCards(): RFIDCard[] {
    return [...this.rfidCards];
  }

  getRFIDEvents(): RFIDAccessEvent[] {
    return [...this.rfidEvents].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
  }

  logRFIDEvent(event: Omit<RFIDAccessEvent, 'id' | 'occurred_at'>): RFIDAccessEvent {
    const newEvent: RFIDAccessEvent = {
      ...event,
      id: 'evt-' + Date.now(),
      occurred_at: new Date().toISOString(),
    };
    this.rfidEvents.unshift(newEvent);
    syncEventToSupabase(newEvent);
    return newEvent;
  }

  issueSuperAdminCard(
    cardLabel: string = 'Super Admin Master Key',
    holderName: string = 'Managing Director',
    issuedBy: string = 'System Root'
  ): RFIDCard {
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const cardUid = `SA-LIFETIME-${randSuffix}`;
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
    syncCardToSupabase(newCard);
    this.logRFIDEvent({
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
    });

    return newCard;
  }

  issueCleanerCard(
    cardLabel: string = 'Housekeeping Cleaning Card',
    holderName: string = 'Housekeeping Staff',
    issuedBy: string = 'Admin'
  ): RFIDCard {
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const cardUid = `CLN-HK-${randSuffix}`;
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
    syncCardToSupabase(newCard);
    this.logRFIDEvent({
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
    });

    return newCard;
  }

  issueRFIDCard(
    roomNumber: string,
    bookingRef: string,
    guestName: string,
    issuedBy: string = 'Front Desk',
    expiresAt?: string
  ): RFIDCard {
    const cardUid = `BT-57-${Math.floor(1000020000 + Math.random() * 99999)}`;
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
    syncCardToSupabase(newCard);

    this.logRFIDEvent({
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
    });

    return newCard;
  }

  toggleRFIDCardStatus(cardId: string, targetStatus?: 'active' | 'inactive'): RFIDCard | null {
    const card = this.rfidCards.find((c) => c.id === cardId || c.card_uid === cardId);
    if (!card) return null;

    const nextStatus = targetStatus || (card.status === 'active' ? 'inactive' : 'active');
    card.status = nextStatus;

    if (nextStatus === 'inactive') {
      card.deactivated_at = new Date().toISOString();
    } else {
      card.activated_at = new Date().toISOString();
    }

    this.logRFIDEvent({
      card_uid: card.card_uid,
      card_type: card.card_type,
      card_label: card.card_label,
      device_name: 'Admin-Dashboard',
      room_number: card.assigned_room_number || 'N/A',
      event_type: nextStatus === 'active' ? 'access_granted' : 'access_denied',
      action_type: nextStatus === 'active' ? 'door_unlock' : 'unauthorized_attempt',
      holder_name: card.holder_name || card.guest_name,
      source: 'encoder',
      reason: `Card ${card.card_uid} (${card.card_type}) ${nextStatus === 'active' ? 'ACTIVATED' : 'DEACTIVATED'} via Admin Dashboard`,
    });

    syncCardToSupabase(card);
    return card;
  }

  deactivateRFIDCard(cardId: string): RFIDCard | null {
    return this.toggleRFIDCardStatus(cardId, 'inactive');
  }

  
  purgeAllRFIDCards(): void {
    this.rfidCards = [];
  }

  purgeAllRFIDEvents(): void {
    this.rfidEvents = [];
  }

  deleteRFIDCard(cardId: string): boolean {
    const idx = this.rfidCards.findIndex((c) => c.id === cardId || c.card_uid === cardId);
    if (idx === -1) return false;
    const [removed] = this.rfidCards.splice(idx, 1);
    if (removed) deleteCardFromSupabase(removed.card_uid);
    return true;
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
    card.status = 'active'; // Reactivate card if it was marked expired

    this.logRFIDEvent({
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
    });

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
    const roomCategory = room ? this.categories.find((c) => c.id === room.category_id) : undefined;
    const roomCatName = roomCategory ? roomCategory.name : 'Standard Room';

    // 1. If Card Not Found or Inactive
    if (!card || card.status !== 'active') {
      const isCardFound = !!card;
      const denialReason = !isCardFound
        ? `Unregistered card UID: ${cardUid}`
        : `Card ${card.card_uid} is currently ${card.status.toUpperCase()}`;

      const event = this.logRFIDEvent({
        card_uid: cardUid,
        card_type: card?.card_type || 'guest',
        card_label: card?.card_label || 'Unregistered Card',
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_denied',
        action_type: 'unauthorized_attempt',
        holder_name: card?.holder_name || 'Unknown Holder',
        booking_reference: card?.booking_reference,
        reason: `Access Denied: ${denialReason}`,
        source: 'lock_reader',
      });

      return {
        success: false,
        event,
        message: `Access Denied: ${denialReason}`,
      };
    }

    // Update card last tap tracking
    card.last_tap_room = roomNumber;
    card.last_tap_at = new Date().toISOString();

    // 2. CASE: SUPER ADMIN CARD (Lifetime Activation, Universal Unlock)
    if (card.card_type === 'super_admin') {
      const event = this.logRFIDEvent({
        card_uid: card.card_uid,
        card_type: 'super_admin',
        card_label: card.card_label,
        device_name: `Lock-Room-${roomNumber}`,
        room_number: roomNumber,
        event_type: 'access_granted',
        action_type: 'door_unlock',
        holder_name: card.holder_name,
        reason: `Super Admin Lifetime Override: Master Access Granted to Room ${roomNumber} for ${card.holder_name}`,
        source: 'lock_reader',
      });

      return {
        success: true,
        event,
        roomStatus: room?.operational_status,
        housekeepingStatus: room?.housekeeping_status,
        cardType: 'super_admin',
        message: `Super Admin Master Card Unlocked Room ${roomNumber} (Lifetime Clearance)`,
      };
    }

    // 3. CASE: CLEANING CARD (Housekeeping In-and-Out Automation)
    if (card.card_type === 'cleaner') {
      // Guard: If guest is actively occupying the room
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
          reason: `Access Denied: Room ${roomNumber} is occupied by guest (${room.current_guest_name || 'Guest'}). Cleaning access restricted until checkout or housekeeping request.`,
          source: 'lock_reader',
        });

        return {
          success: false,
          event,
          roomStatus: room.operational_status,
          housekeepingStatus: room.housekeeping_status,
          cardType: 'cleaner',
          message: `Access Denied: Room ${roomNumber} is currently occupied by guest. Cleaning restricted.`,
        };
      }

      // State Machine for Cleaning Card
      // Tap 1: Cleaner goes inside -> mark housekeeping as in_progress (cleaner inside)
      if (room && (room.housekeeping_status === 'dirty' || room.operational_status === 'cleaning' && room.housekeeping_status !== 'in_progress')) {
        this.updateRoomStatus(room.id, 'cleaning', 'in_progress', `Cleaner ${card.holder_name} entered room for turnover sanitization`);

        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'cleaner',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_granted',
          action_type: 'cleaning_started',
          holder_name: card.holder_name,
          reason: `Cleaner Entered: Cleaner ${card.holder_name} inside Room ${roomNumber}. Marked: Cleaning In Progress.`,
          source: 'lock_reader',
        });

        return {
          success: true,
          event,
          roomStatus: 'cleaning',
          housekeepingStatus: 'in_progress',
          cardType: 'cleaner',
          message: `Cleaner ${card.holder_name} tapped into Room ${roomNumber}. Marked: Cleaning In Progress.`,
        };
      }

      // Tap 2: Cleaner leaves & door locks -> mark cleaning completed & room available
      if (room && room.housekeeping_status === 'in_progress') {
        this.updateRoomStatus(room.id, 'available', 'clean', `Cleaned & sanitized by ${card.holder_name}. Ready for guest check-in.`);

        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'cleaner',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_granted',
          action_type: 'cleaning_completed',
          holder_name: card.holder_name,
          reason: `Cleaning Completed: Cleaner ${card.holder_name} exited & locked door. Room ${roomNumber} is now Clean & Available for check-in.`,
          source: 'lock_reader',
        });

        return {
          success: true,
          event,
          roomStatus: 'available',
          housekeepingStatus: 'clean',
          cardType: 'cleaner',
          message: `Cleaning Completed for Room ${roomNumber}! Door locked. Room is now Clean & Available.`,
        };
      }

      // Fallback: If room was already clean, allow inspection
      if (room) {
        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'cleaner',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_granted',
          action_type: 'door_unlock',
          holder_name: card.holder_name,
          reason: `Housekeeping Inspection: Cleaner ${card.holder_name} inspected Room ${roomNumber}.`,
          source: 'lock_reader',
        });

        return {
          success: true,
          event,
          roomStatus: room.operational_status,
          housekeepingStatus: room.housekeeping_status,
          cardType: 'cleaner',
          message: `Housekeeping routine inspection unlock for Room ${roomNumber}.`,
        };
      }
    }

    // 4. CASE: CUSTOMER / GUEST CARD
    if (card.card_type === 'guest') {
      // Check room assignment
      if (card.assigned_room_number !== roomNumber) {
        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'guest',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_denied',
          action_type: 'unauthorized_attempt',
          holder_name: card.guest_name || card.holder_name,
          booking_reference: card.booking_reference,
          reason: `Access Denied: Keycard is assigned to Room ${card.assigned_room_number}, unauthorized for Room ${roomNumber}`,
          source: 'lock_reader',
        });

        return {
          success: false,
          event,
          cardType: 'guest',
          message: `Access Denied: Card is assigned to Room ${card.assigned_room_number}, not Room ${roomNumber}`,
        };
      }

      // Check card expiration
      if (card.expires_at && new Date(card.expires_at).getTime() < Date.now()) {
        const event = this.logRFIDEvent({
          card_uid: card.card_uid,
          card_type: 'guest',
          card_label: card.card_label,
          device_name: `Lock-Room-${roomNumber}`,
          room_number: roomNumber,
          event_type: 'access_denied',
          action_type: 'unauthorized_attempt',
          holder_name: card.guest_name || card.holder_name,
          booking_reference: card.booking_reference,
          reason: `Access Denied: Keycard expired at checkout time (${new Date(card.expires_at).toLocaleString('en-IN')})`,
          source: 'lock_reader',
        });

        return {
          success: false,
          event,
          cardType: 'guest',
          message: `Access Denied: Keycard expired at checkout time.`,
        };
      }

      // Valid customer keycard unlock
      if (room && room.operational_status === 'reserved') {
        this.updateRoomStatus(room.id, 'occupied', 'clean');
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

    // Fallback unknown card type
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
    return [...this.rfidDevices];
  }

  updateRFIDDeviceStatus(deviceId: string, status: 'online' | 'offline' | 'maintenance'): RFIDDevice | null {
    const dev = this.rfidDevices.find((d) => d.id === deviceId);
    if (!dev) return null;
    dev.status = status;
    dev.last_ping_at = new Date().toISOString();
    return { ...dev };
  }
}

// Global instance to maintain state across Hot Reloads & Next.js requests
declare global {
  // eslint-disable-next-line no-var
  var __hotelRepo: HotelRepository | undefined;
}

if (!global.__hotelRepo || typeof (global.__hotelRepo as any).processDoorTap !== 'function' || typeof (global.__hotelRepo as any).extendGuestCardValidity !== 'function' || typeof (global.__hotelRepo as any).purgeAllRFIDCards !== 'function') {
  global.__hotelRepo = new HotelRepository();
}

export const repo = global.__hotelRepo;
