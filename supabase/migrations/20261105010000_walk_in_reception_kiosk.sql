-- Sri Tayi Grand - Reception QR Walk-In & Kiosk Keycard System
-- Migration: 20261105010000_walk_in_reception_kiosk.sql

-- 1. Add Walk-In & Pickup Tracking to bookings table
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS booking_source VARCHAR(32) DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS walk_in_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(16),
  ADD COLUMN IF NOT EXISTS room_assigned_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS keycard_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS keycard_uid VARCHAR(64),
  ADD COLUMN IF NOT EXISTS id_proof_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS id_proof_number VARCHAR(64);

-- 2. Index for Front Desk Queue query speed
CREATE INDEX IF NOT EXISTS idx_bookings_walk_in_queue 
  ON bookings (status, booking_source, created_at DESC);

-- 3. Reception Kiosk QR Configuration Table
CREATE TABLE IF NOT EXISTS reception_kiosk_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_name VARCHAR(64) NOT NULL DEFAULT 'Front Desk Standee #1',
  secret_token VARCHAR(128) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_counter_payment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-seed default reception desk token for Sri Tayi Grand
INSERT INTO reception_kiosk_tokens (kiosk_name, secret_token, allow_counter_payment)
VALUES ('Reception Desk Acrylic QR Standee', 'STG_RECEPT_DESK_SEC_7749', true)
ON CONFLICT (secret_token) DO NOTHING;
