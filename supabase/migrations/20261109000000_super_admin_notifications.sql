-- =============================================================================
-- SRI TAYI GRAND - REAL-TIME SUPER ADMIN NOTIFICATIONS ENGINE
-- Migration: 20261109000000_super_admin_notifications.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS super_admin_notifications (
    id VARCHAR(100) PRIMARY KEY,
    recipient_id VARCHAR(100) NOT NULL DEFAULT 'super-admin',
    type VARCHAR(50) NOT NULL, -- EVENT_CHECK_IN, EVENT_CHECK_OUT, EVENT_TRANSACTION, EVENT_NEW_BOOKING, EVENT_RFID_TAP
    severity VARCHAR(20) NOT NULL, -- INFO, SUCCESS, WARNING, CRITICAL
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_notifs_recip_read_time 
ON super_admin_notifications(recipient_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE super_admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access to super_admin_notifications" ON super_admin_notifications;
CREATE POLICY "Service role full access to super_admin_notifications" 
ON super_admin_notifications FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Authenticated users access to super_admin_notifications" ON super_admin_notifications;
CREATE POLICY "Authenticated users access to super_admin_notifications" 
ON super_admin_notifications FOR ALL TO authenticated USING (true);

COMMENT ON TABLE super_admin_notifications IS 'Low-latency audit alert feed for Super Admin: check-ins, check-outs, transactions, bookings, and RFID taps';
