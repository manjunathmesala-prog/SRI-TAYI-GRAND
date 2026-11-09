-- =============================================================================
-- SRI TAYI GRAND - RFID EXPANSION: SUPER ADMIN, CLEANER & GUEST CARD LIFECYCLE
-- Migration: 20261105000000_rfid_cards_roles_and_housekeeping.sql
-- =============================================================================

-- 1. Extend rfid_cards table with card_type, lifetime flag, holder info, and tap tracking
ALTER TABLE rfid_cards 
ADD COLUMN IF NOT EXISTS card_type VARCHAR(30) DEFAULT 'guest' 
    CHECK (card_type IN ('super_admin', 'cleaner', 'guest')),
ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS holder_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS holder_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_tap_room VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_tap_at TIMESTAMPTZ;

-- 2. Extend rfid_access_events table with telemetry columns
ALTER TABLE rfid_access_events
ADD COLUMN IF NOT EXISTS card_type VARCHAR(30) DEFAULT 'guest',
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'door_unlock',
ADD COLUMN IF NOT EXISTS holder_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50),
ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS device_name VARCHAR(100);

-- 3. Create room_cleaning_sessions table for in/out tap tracking
CREATE TABLE IF NOT EXISTS room_cleaning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    cleaner_card_id UUID REFERENCES rfid_cards(id) ON DELETE SET NULL,
    cleaner_name VARCHAR(150) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'aborted')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high speed tap auditing
CREATE INDEX IF NOT EXISTS idx_rfid_access_events_room_time 
ON rfid_access_events(room_number, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfid_cards_type_status 
ON rfid_cards(card_type, status);

CREATE INDEX IF NOT EXISTS idx_cleaning_sessions_room_status 
ON room_cleaning_sessions(room_number, status);

-- Comment explanations
COMMENT ON COLUMN rfid_cards.card_type IS 'Role classification: super_admin (master override), cleaner (housekeeping), guest (room customer)';
COMMENT ON COLUMN rfid_cards.is_lifetime IS 'True for perpetual Super Admin keys that never expire';
COMMENT ON COLUMN rfid_access_events.action_type IS 'Action trigger: door_unlock, door_lock, cleaning_started, cleaning_completed, unauthorized_attempt';
