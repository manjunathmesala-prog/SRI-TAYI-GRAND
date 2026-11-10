-- =============================================================================
-- Migration: Room Transfers & Guest Relocation History
-- Tracks customer room changes (e.g. AC malfunction, plumbing, guest request)
-- =============================================================================

CREATE TABLE IF NOT EXISTS room_transfers (
    id VARCHAR(100) PRIMARY KEY,
    booking_reference VARCHAR(60) NOT NULL,
    from_room_number VARCHAR(20) NOT NULL,
    to_room_number VARCHAR(20) NOT NULL,
    from_room_id VARCHAR(100),
    to_room_id VARCHAR(100),
    reason_category VARCHAR(50) NOT NULL,
    reason_notes TEXT,
    actor VARCHAR(100) NOT NULL,
    old_room_status VARCHAR(30) DEFAULT 'cleaning',
    maintenance_ticket_id VARCHAR(100),
    transferred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_transfers_ref ON room_transfers(booking_reference);
CREATE INDEX IF NOT EXISTS idx_room_transfers_transferred ON room_transfers(transferred_at DESC);
