-- ==============================================================================
-- SRI TAYI GRAND - RAZORPAY PAYMENT GATEWAY & TRANSACTION LEDGER DDL (POSTGRESQL)
-- Strict Integrity • Zero Financial Leakage • Double-Entry Ledger Schema
-- ==============================================================================

-- 1. Create Enums for Orders and Transactions
DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status_enum AS ENUM ('captured', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Payment Orders Table
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    booking_reference VARCHAR(50) NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    amount_rupees NUMERIC(12, 2) NOT NULL CHECK (amount_rupees > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
    receipt VARCHAR(100) NOT NULL UNIQUE,
    guest_name VARCHAR(150),
    guest_email VARCHAR(150),
    guest_phone VARCHAR(50),
    notes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast lookups and reconciliation
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_order_id ON payment_orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_booking_reference ON payment_orders (booking_reference);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);

-- 3. Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
    booking_reference VARCHAR(50) NOT NULL,
    razorpay_payment_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_signature VARCHAR(255) NULL,
    status transaction_status_enum NOT NULL DEFAULT 'captured',
    amount_paise BIGINT NOT NULL,
    amount_rupees NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    method VARCHAR(50),      -- 'card', 'upi', 'netbanking', 'wallet'
    bank VARCHAR(100),
    wallet VARCHAR(100),
    vpa VARCHAR(100),        -- UPI Virtual Private Address (VPA)
    fee_paise BIGINT DEFAULT 0,
    tax_paise BIGINT DEFAULT 0,
    error_code VARCHAR(100),
    error_description TEXT,
    raw_webhook_payload TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_ref ON payment_transactions (booking_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions (status);
