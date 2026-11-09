-- ==============================================================================
-- SRI TAYI GRAND HOTEL - OFFICIAL SEED DATA
-- Property: Sri Tayi Grand, Kadiri, Andhra Pradesh
-- ==============================================================================

-- 1. Hotel Settings
INSERT INTO hotel_settings (
    id, hotel_name, tagline, address, road, phone, whatsapp, email, currency, timezone,
    check_in_time, check_out_time, tax_percentage, allow_pay_at_hotel, require_advance_payment, advance_percentage
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'SRI TAYI GRAND',
    'Stay Â· Host Â· Celebrate',
    '4585+F8J, Opp. Girls High School, Bypass Road, Kadiri â€“ 515591, Anantapur District, Andhra Pradesh, India.',
    'Tadipatri â€“ Pulivendula â€“ Kadiri Road, Revenue Colony, Kadiri',
    '084942 23379',
    '+918494223379',
    'contact@sritayigrand.com',
    'INR',
    'Asia/Kolkata',
    '14:00:00',
    '11:00:00',
    12.00,
    true,
    false,
    100.00
) ON CONFLICT (id) DO NOTHING;

-- 2. System Roles
INSERT INTO roles (id, name, description) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Super Admin', 'Full system access and master configuration'),
    ('b0000000-0000-0000-0000-000000000002', 'Hotel Manager', 'Operational oversight, rooms, bookings, staff, and reporting'),
    ('b0000000-0000-0000-0000-000000000003', 'Front Desk', 'Daily guest arrivals, check-in, check-out, room assignment'),
    ('b0000000-0000-0000-0000-000000000004', 'Housekeeping', 'Room cleaning status, inspection, and maintenance tracking'),
    ('b0000000-0000-0000-0000-000000000005', 'Accounts', 'Payments, invoices, financial reports, and refunds'),
    ('b0000000-0000-0000-0000-000000000006', 'Event Manager', 'Convention Hall enquiries, quotations, and event bookings')
ON CONFLICT (name) DO NOTHING;

-- 3. Master Amenities
INSERT INTO amenities (id, code, name, icon_name, description, is_featured, is_active) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'ac', 'Fully AC Rooms', 'Snowflake', 'Individual climate control air-conditioning', true, true),
    ('c0000000-0000-0000-0000-000000000002', 'parking', 'Car Parking', 'Car', 'Spacious, secure on-premises parking', true, true),
    ('c0000000-0000-0000-0000-000000000003', 'hall', 'Convention Hall', 'Users', 'Grand banquet and function hall for events', true, true),
    ('c0000000-0000-0000-0000-000000000004', 'wifi', 'High-Speed Wi-Fi', 'Wifi', 'Complimentary fast wireless internet', true, true),
    ('c0000000-0000-0000-0000-000000000005', 'room_service', 'Room Service', 'Bell', 'Attentive in-room hospitality service', true, true),
    ('c0000000-0000-0000-0000-000000000006', 'lift', 'Lift Access', 'ArrowUpDown', 'Modern elevator serving all floors', true, true),
    ('c0000000-0000-0000-0000-000000000007', 'security', '24/7 Security', 'ShieldCheck', 'Round-the-clock surveillance and safety', true, true),
    ('c0000000-0000-0000-0000-000000000008', 'tv', 'Smart TV', 'Tv', 'Flat-screen TV with premium entertainment channels', false, true),
    ('c0000000-0000-0000-0000-000000000009', 'tea_maker', 'Tea / Coffee Maker', 'Coffee', 'Electric kettle with complimentary tea and coffee kit', false, true),
    ('c0000000-0000-0000-0000-000000000010', 'attached_bath', 'Attached Bathroom', 'Droplets', 'Modern ensuite bathroom with 24/7 hot and cold water', false, true),
    ('c0000000-0000-0000-0000-000000000011', 'balcony', 'Private Balcony', 'Maximize', 'Scenic balcony with outdoor seating (Suite rooms)', false, true)
ON CONFLICT (code) DO NOTHING;

-- 4. Room Categories (Suite Room, Double Bed Room, Double Room, Single Bed Room)
INSERT INTO room_categories (
    id, slug, name, short_description, full_description, base_price_per_night,
    max_adults, max_children, max_occupancy, bed_type, room_size_sqft, cover_image_url, is_active
) VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'suite-room',
        'Suite Room',
        'Spacious luxury with premium comfort, dedicated living area, and private balcony.',
        'Our Suite Room offers an exquisite blend of space, elegance, and modern amenities for a truly comfortable stay. Features a plush king bed, dedicated living lounge with premium armchairs, attached modern bathroom, and private balcony overlooking lush surroundings.',
        4999.00,
        4, 2, 4,
        'King Bed',
        380,
        '/images/hotel/room-suite-large.jpg',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'double-bed-room',
        'Double Bed Room',
        'Comfortable and refined accommodation ideal for families and couples.',
        'Crafted for restful rejuvenation, the Double Bed Room features an expansive double bed with elegant wooden accents, ambient headboard lighting, workspace, and a sleek modern ensuite bathroom.',
        2999.00,
        2, 1, 3,
        'Double Bed (King Size)',
        260,
        '/images/hotel/room-double-bed-large.jpg',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'double-room',
        'Double Room',
        'A spacious and convenient stay with twin bed configuration for companions.',
        'Featuring two comfortable twin beds with upholstered headboards, our Double Room is designed for business colleagues, friends, and family travelers looking for generous space and pristine cleanliness.',
        2499.00,
        2, 1, 2,
        'Twin Beds (Two Singles)',
        240,
        '/images/hotel/room-double-large.jpg',
        true
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'single-bed-room',
        'Single Bed Room',
        'A cozy, convenient stay tailored for solo travelers and business visits.',
        'Perfect for solo business travelers or pilgrim visitors, the Single Bed Room offers compact elegance, a comfortable single bed, air-conditioning, attached modern bathroom, and work area.',
        1999.00,
        1, 0, 1,
        'Single Bed',
        180,
        '/images/hotel/room-single-large.jpg',
        true
    )
ON CONFLICT (slug) DO NOTHING;

-- 5. Physical Rooms Inventory (All 25 Rooms across Floors 1, 2, 3)
-- Floor 1 (Rooms 101 - 109)
INSERT INTO rooms (room_number, category_id, floor_number, operational_status, housekeeping_status) VALUES
    ('101', 'd0000000-0000-0000-0000-000000000004', 1, 'available', 'clean'),
    ('102', 'd0000000-0000-0000-0000-000000000004', 1, 'available', 'clean'),
    ('103', 'd0000000-0000-0000-0000-000000000003', 1, 'available', 'clean'),
    ('104', 'd0000000-0000-0000-0000-000000000003', 1, 'available', 'clean'),
    ('105', 'd0000000-0000-0000-0000-000000000002', 1, 'available', 'clean'),
    ('106', 'd0000000-0000-0000-0000-000000000002', 1, 'available', 'clean'),
    ('107', 'd0000000-0000-0000-0000-000000000004', 1, 'available', 'clean'),
    ('108', 'd0000000-0000-0000-0000-000000000003', 1, 'available', 'clean'),
    ('109', 'd0000000-0000-0000-0000-000000000002', 1, 'available', 'clean'),
-- Floor 2 (Rooms 201 - 208)
    ('201', 'd0000000-0000-0000-0000-000000000002', 2, 'available', 'clean'),
    ('202', 'd0000000-0000-0000-0000-000000000002', 2, 'occupied', 'clean'),
    ('203', 'd0000000-0000-0000-0000-000000000003', 2, 'available', 'clean'),
    ('204', 'd0000000-0000-0000-0000-000000000003', 2, 'cleaning', 'dirty'),
    ('205', 'd0000000-0000-0000-0000-000000000001', 2, 'available', 'clean'),
    ('206', 'd0000000-0000-0000-0000-000000000001', 2, 'reserved', 'clean'),
    ('207', 'd0000000-0000-0000-0000-000000000001', 2, 'available', 'clean'),
    ('208', 'd0000000-0000-0000-0000-000000000002', 2, 'available', 'clean'),
-- Floor 3 (Rooms 301 - 308)
    ('301', 'd0000000-0000-0000-0000-000000000002', 3, 'available', 'clean'),
    ('302', 'd0000000-0000-0000-0000-000000000002', 3, 'available', 'clean'),
    ('303', 'd0000000-0000-0000-0000-000000000001', 3, 'occupied', 'clean'),
    ('304', 'd0000000-0000-0000-0000-000000000001', 3, 'available', 'clean'),
    ('305', 'd0000000-0000-0000-0000-000000000004', 3, 'available', 'clean'),
    ('306', 'd0000000-0000-0000-0000-000000000004', 3, 'maintenance', 'dirty'),
    ('307', 'd0000000-0000-0000-0000-000000000003', 3, 'available', 'clean'),
    ('308', 'd0000000-0000-0000-0000-000000000002', 3, 'available', 'clean')
ON CONFLICT (room_number) DO NOTHING;

-- 5b. RFID Door Locks (25 Locks for 25 Rooms + Encoders + IoT Gateway)
INSERT INTO rfid_devices (device_name, device_type, room_id, ip_address, mac_address, status, firmware_version)
SELECT 
    'Lock-Room-' || r.room_number,
    'door_lock',
    r.id,
    '192.168.1.' || r.room_number,
    '00:1B:44:11:' || LPAD(r.floor_number::text, 2, '0') || ':' || LPAD(RIGHT(r.room_number, 2), 2, '0'),
    'online',
    'v2.4.1'
FROM rooms r
ON CONFLICT DO NOTHING;

INSERT INTO rfid_devices (device_name, device_type, ip_address, mac_address, status, firmware_version) VALUES
    ('Front-Desk-Encoder-01', 'card_encoder', '192.168.1.50', '00:1B:44:99:FF:01', 'online', 'v3.1.0'),
    ('Front-Desk-Encoder-02 (Mobile/Tab)', 'card_encoder', '192.168.1.51', '00:1B:44:99:FF:02', 'online', 'v3.1.0'),
    ('Central-RFID-IoT-Gateway', 'gateway', '192.168.1.1', '00:1B:44:AA:00:01', 'online', 'v4.0.2')
ON CONFLICT DO NOTHING;

-- 6. Convention Hall
INSERT INTO convention_halls (
    id, name, description, capacity_min, capacity_max, features, base_rate_per_day, cover_image_url, is_active
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'Sri Tayi Grand Convention Hall',
    'A magnificent, fully air-conditioned banquet venue designed for grand weddings, receptions, corporate meetings, and memorable celebrations. Features an opulent grand stage, acoustic sound setup, royal chandelier lighting, and extensive parking.',
    100, 800,
    '["Grand Decorated Stage", "Fully Air-Conditioned", "Banquet Seating", "Dining Hall Facility", "Chandelier Lighting", "Ample Car Parking", "Backstage Green Rooms"]'::jsonb,
    45000.00,
    '/images/hotel/convention-hall-wide.jpg',
    true
) ON CONFLICT (id) DO NOTHING;

-- 7. Cancellation Policies
INSERT INTO cancellation_policies (id, title, hours_before_checkin, refund_percentage, description) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Free Cancellation (48+ Hours)', 48, 100.00, 'Full 100% refund for cancellations made at least 48 hours before check-in time (14:00).'),
    ('f0000000-0000-0000-0000-000000000002', 'Moderate Cancellation (24â€“48 Hours)', 24, 50.00, '50% refund for cancellations made between 24 and 48 hours prior to check-in.'),
    ('f0000000-0000-0000-0000-000000000003', 'Late Cancellation (< 24 Hours)', 0, 0.00, 'No refund for cancellations made within 24 hours of check-in or no-shows.')
ON CONFLICT (id) DO NOTHING;

-- 8. Gallery Images
INSERT INTO gallery_images (title, category, image_url, display_order) VALUES
    ('Hotel Exterior Dusk View', 'exterior', '/images/hotel/hotel-exterior-hero.jpg', 1),
    ('Suite Room Luxury Living', 'rooms', '/images/hotel/room-suite-large.jpg', 2),
    ('Grand Convention Hall', 'convention_hall', '/images/hotel/convention-hall-wide.jpg', 3),
    ('Reception & Front Desk', 'reception', '/images/hotel/reception-desk.jpg', 4),
    ('Double Bed Room', 'rooms', '/images/hotel/room-double-bed-large.jpg', 5),
    ('Lobby Lounge', 'reception', '/images/hotel/lobby-lounge.jpg', 6),
    ('Double Twin Room', 'rooms', '/images/hotel/room-double-large.jpg', 7),
    ('Single Bed Room', 'rooms', '/images/hotel/room-single-large.jpg', 8),
    ('Suite Room Private Balcony', 'rooms', '/images/hotel/suite-balcony-seating.jpg', 9),
    ('Hotel Building Night Ambience', 'exterior', '/images/hotel/hotel-building-night.jpg', 10)
ON CONFLICT DO NOTHING;
