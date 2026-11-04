-- ==============================================================================
-- SRI TAYI GRAND HOTEL - MASTER DATABASE SCHEMA
-- Target Database: Supabase PostgreSQL
-- Features: 36 Tables, Relational Constraints, RLS, Indexes, Triggers, Seed Data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ROLES & PERMISSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. HOTEL SETTINGS & METADATA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotel_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_name VARCHAR(150) NOT NULL DEFAULT 'SRI TAYI GRAND',
    tagline VARCHAR(255) DEFAULT 'Stay · Host · Celebrate',
    address TEXT NOT NULL DEFAULT '4585+F8J, Opp. Girls High School, Bypass Road, Kadiri – 515591, Anantapur District, Andhra Pradesh, India.',
    road VARCHAR(255) DEFAULT 'Tadipatri – Pulivendula – Kadiri Road, Revenue Colony, Kadiri',
    phone VARCHAR(50) NOT NULL DEFAULT '084942 23379',
    whatsapp VARCHAR(50) DEFAULT '+918494223379',
    email VARCHAR(100) DEFAULT 'contact@sritayigrand.com',
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    check_in_time TIME DEFAULT '14:00:00',
    check_out_time TIME DEFAULT '11:00:00',
    tax_percentage NUMERIC(5, 2) DEFAULT 12.00,
    allow_pay_at_hotel BOOLEAN DEFAULT TRUE,
    require_advance_payment BOOLEAN DEFAULT FALSE,
    advance_percentage NUMERIC(5, 2) DEFAULT 100.00,
    hold_timeout_minutes INT DEFAULT 15,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. ROOM CATEGORIES & INVENTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT,
    base_price_per_night NUMERIC(10, 2) NOT NULL,
    max_adults INT NOT NULL DEFAULT 2,
    max_children INT NOT NULL DEFAULT 1,
    max_occupancy INT NOT NULL DEFAULT 3,
    bed_type VARCHAR(100) NOT NULL,
    room_size_sqft INT,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES room_categories(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50),
    description TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_amenities (
    category_id UUID REFERENCES room_categories(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    category_id UUID REFERENCES room_categories(id) ON DELETE RESTRICT,
    floor_number INT NOT NULL,
    operational_status VARCHAR(30) NOT NULL DEFAULT 'available' 
        CHECK (operational_status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_service')),
    housekeeping_status VARCHAR(30) NOT NULL DEFAULT 'clean'
        CHECK (housekeeping_status IN ('clean', 'dirty', 'in_progress', 'inspected')),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    start_date DATE NOT NULL,
    estimated_end_date DATE,
    resolved_date DATE,
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
    assigned_technician VARCHAR(150),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_housekeeping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    task_type VARCHAR(50) DEFAULT 'routine_cleaning' CHECK (task_type IN ('routine_cleaning', 'checkout_cleaning', 'deep_cleaning', 'inspection')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')),
    assigned_to UUID REFERENCES profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. GUESTS & BOOKINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(120),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    total_stays INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL, -- STG-YYYYMMDD-XXXX
    guest_id UUID REFERENCES guests(id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults_count INT NOT NULL DEFAULT 1,
    children_count INT NOT NULL DEFAULT 0,
    rooms_count INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed' 
        CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded', 'partially_refunded', 'pay_at_hotel')),
    payment_method VARCHAR(50) DEFAULT 'online', -- online, cash, upi, card, pay_at_hotel
    subtotal_amount NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    additional_charges_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    special_requests TEXT,
    early_check_in_requested BOOLEAN DEFAULT FALSE,
    late_check_out_requested BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS booking_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    category_id UUID REFERENCES room_categories(id) ON DELETE RESTRICT,
    assigned_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    price_per_night NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    guest_name VARCHAR(150) NOT NULL,
    age INT,
    gender VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES room_categories(id) ON DELETE CASCADE,
    room_quantity INT NOT NULL DEFAULT 1,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. PAYMENTS, INVOICES & REFUNDS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference VARCHAR(60) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50) NOT NULL, -- razorpay, cash, upi, pos
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
    gateway_response JSONB,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    gateway_refund_id VARCHAR(100),
    reason TEXT,
    status VARCHAR(30) DEFAULT 'processed' CHECK (status IN ('initiated', 'processed', 'failed')),
    processed_by UUID REFERENCES profiles(id),
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- INV-STG-YYYY-XXXX
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    additional_charges NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS additional_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    charge_name VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. CONVENTION HALL MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convention_halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL DEFAULT 'Sri Tayi Grand Convention Hall',
    description TEXT NOT NULL,
    capacity_min INT DEFAULT 100,
    capacity_max INT DEFAULT 800,
    features JSONB,
    base_rate_per_day NUMERIC(10, 2) DEFAULT 35000.00,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_reference VARCHAR(50) UNIQUE NOT NULL, -- ENQ-HALL-YYYYMMDD-XXXX
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(120),
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    expected_guests INT,
    requirements TEXT,
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'quotation_sent', 'pending_approval', 'confirmed', 'completed', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id UUID REFERENCES hall_enquiries(id),
    client_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(120),
    event_date DATE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    quoted_amount NUMERIC(10, 2) NOT NULL,
    advance_amount NUMERIC(10, 2) DEFAULT 0.00,
    balance_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_booking_id UUID REFERENCES hall_bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. STAFF, NOTIFICATIONS & AUDIT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    shift_name VARCHAR(50) NOT NULL, -- Morning, Evening, Night
    shift_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(20) NOT NULL, -- guest, staff, admin
    recipient_address VARCHAR(150) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- email, whatsapp, sms
    template_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'all', -- exterior, rooms, convention_hall, reception, amenities
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    section VARCHAR(50) NOT NULL,
    content_value JSONB NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancellation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    hours_before_checkin INT NOT NULL,
    refund_percentage NUMERIC(5, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. RFID SMART ROOM KEY INTEGRATION FRAMEWORK
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- door_lock, card_encoder, gateway
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    status VARCHAR(30) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
    firmware_version VARCHAR(50),
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfid_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_uid VARCHAR(100) UNIQUE NOT NULL,
    card_label VARCHAR(100),
    assigned_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'lost', 'damaged', 'expired')),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    issued_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfid_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES rfid_cards(id) ON DELETE SET NULL,
    device_id UUID REFERENCES rfid_devices(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    event_type VARCHAR(30) NOT NULL, -- access_granted, access_denied, door_ajar, battery_low
    reason TEXT,
    source VARCHAR(50) DEFAULT 'lock_reader', -- lock_reader, encoder, manual_simulation
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) UNIQUE NOT NULL, -- razorpay, rfid_gateway, sendgrid, gupshup
    config JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(30) DEFAULT 'unknown',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    old_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rooms_operational_status ON rooms(operational_status);
CREATE INDEX IF NOT EXISTS idx_rooms_category_id ON rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_assigned ON booking_rooms(assigned_room_id);
CREATE INDEX IF NOT EXISTS idx_booking_holds_expires ON booking_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_rfid_access_occurred ON rfid_access_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE convention_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_enquiries ENABLE ROW LEVEL SECURITY;

-- Public can view catalog, content, settings, and active room categories
CREATE POLICY "Public can view active room categories" ON room_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active room images" ON room_images FOR SELECT USING (true);
CREATE POLICY "Public can view active amenities" ON amenities FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view room amenities" ON room_amenities FOR SELECT USING (true);
CREATE POLICY "Public can view hotel settings" ON hotel_settings FOR SELECT USING (true);
CREATE POLICY "Public can view active gallery" ON gallery_images FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view convention hall info" ON convention_halls FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view website content" ON website_content FOR SELECT USING (true);
CREATE POLICY "Public can view cancellation policies" ON cancellation_policies FOR SELECT USING (is_active = true);

-- Public can submit hall enquiry
CREATE POLICY "Public can create hall enquiry" ON hall_enquiries FOR INSERT WITH CHECK (true);

-- Authenticated staff have full access
CREATE POLICY "Staff full access to categories" ON room_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access to rooms" ON rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access to bookings" ON bookings FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access to payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access to guests" ON guests FOR ALL TO authenticated USING (true);
