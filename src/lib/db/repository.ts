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

  issueRFIDCard(
    roomNumber: string,
    bookingRef: string,
    guestName: string,
    issuedBy: string
  ): RFIDCard {
    const cardUid = `E0-04-1A-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`;
    const newCard: RFIDCard = {
      id: `crd-${Date.now()}`,
      card_uid: cardUid,
      card_label: `Guest Card #${Math.floor(1000 + Math.random() * 9000)}`,
      assigned_room_number: roomNumber,
      booking_reference: bookingRef,
      guest_name: guestName,
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      issued_by_name: issuedBy,
      created_at: new Date().toISOString(),
    };
    this.rfidCards.unshift(newCard);
    return newCard;
  }

  deactivateRFIDCard(cardId: string): RFIDCard | null {
    const card = this.rfidCards.find((c) => c.id === cardId);
    if (!card) return null;
    card.status = 'inactive';
    return card;
  }

  logRFIDEvent(event: Omit<RFIDAccessEvent, 'id' | 'occurred_at'>): RFIDAccessEvent {
    const newEvent: RFIDAccessEvent = {
      ...event,
      id: `evt-${Date.now()}`,
      occurred_at: new Date().toISOString(),
    };
    this.rfidEvents.unshift(newEvent);
    return newEvent;
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

export const repo = global.__hotelRepo || new HotelRepository();
if (process.env.NODE_ENV !== 'production') {
  global.__hotelRepo = repo;
}
