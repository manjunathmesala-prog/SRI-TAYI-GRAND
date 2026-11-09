-- ==============================================================================
-- SRI TAYI GRAND - RFID TAP HISTORY & ACTIVITY AUDIT TRAIL (SQL MIGRATION)
-- Append-Only Forensic Audit Ledger • Physical Door Lock Verification
-- ==============================================================================

-- 1. Enum Types for RFID Card Classification & Access Results
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rfid_card_type') THEN
        CREATE TYPE rfid_card_type AS ENUM ('GUEST', 'STAFF', 'MASTER', 'MAINTENANCE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rfid_access_result') THEN
        CREATE TYPE rfid_access_result AS ENUM ('GRANTED', 'DENIED', 'WRONG_ROOM', 'EXPIRED');
    END IF;
END $$;

-- 2. Create the Append-Only RfidTapHistory Table
CREATE TABLE IF NOT EXISTS rfid_tap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_uid VARCHAR(100) NOT NULL,
    card_type rfid_card_type NOT NULL DEFAULT 'GUEST',
    room_number VARCHAR(20) NOT NULL,
    booking_id VARCHAR(100),
    customer_id VARCHAR(100),
    customer_name VARCHAR(200),
    access_result rfid_access_result NOT NULL,
    door_status VARCHAR(50) NOT NULL DEFAULT 'UNLOCKED',
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    tapped_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. High-Speed Compound Indexes for Chronological Filtering
CREATE INDEX IF NOT EXISTS idx_rfid_tap_room_tapped_at 
    ON rfid_tap_history (room_number, tapped_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfid_tap_booking_tapped_at 
    ON rfid_tap_history (booking_id, tapped_at DESC) 
    WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfid_tap_card_tapped_at 
    ON rfid_tap_history (card_uid, tapped_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfid_tap_result_tapped_at 
    ON rfid_tap_history (access_result, tapped_at DESC);

-- 4. Append-Only Enforcer Trigger (Prevents UPDATE or DELETE operations on audit trail)
CREATE OR REPLACE FUNCTION enforce_rfid_tap_history_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: rfid_tap_history is an append-only audit log. UPDATE or DELETE operations are strictly forbidden.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfid_tap_history_append_only ON rfid_tap_history;
CREATE TRIGGER trg_rfid_tap_history_append_only
    BEFORE UPDATE OR DELETE ON rfid_tap_history
    FOR EACH ROW
    EXECUTE FUNCTION enforce_rfid_tap_history_append_only();

-- 5. Comments & Documentation
COMMENT ON TABLE rfid_tap_history IS 'Forensic append-only audit trail capturing every door reader tap across Sri Tayi Grand physical rooms.';
COMMENT ON COLUMN rfid_tap_history.card_uid IS 'Physical hardware card identifier / UID from Be-Tech Mifare encoder.';
COMMENT ON COLUMN rfid_tap_history.booking_id IS 'Linked active booking reference or UUID if tap falls within guest checkInTime and checkOutTime.';
COMMENT ON COLUMN rfid_tap_history.access_result IS 'Evaluated security clearance result: GRANTED, DENIED, WRONG_ROOM, or EXPIRED.';
