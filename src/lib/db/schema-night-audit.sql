-- ==============================================================================
-- SRI TAYI GRAND - ENTERPRISE AUTOMATED NIGHT AUDIT & REPORTING SCHEMA
-- Version 2.0 (Production Architecture)
-- Provides full relational persistence, delivery tracking, and exception management.
-- ==============================================================================

-- 1. SCHEDULER & POLICY SETTINGS
CREATE TABLE IF NOT EXISTS night_audit_settings (
    id TEXT PRIMARY KEY DEFAULT 'stg-audit-settings',
    hotel_id TEXT NOT NULL DEFAULT 'sri-tayi-grand',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    execution_time TEXT NOT NULL DEFAULT '00:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_retry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_retry_attempts INTEGER NOT NULL DEFAULT 3,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_status TEXT DEFAULT 'pending',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alias view for audit_scheduler_settings
CREATE OR REPLACE VIEW audit_scheduler_settings AS 
SELECT * FROM night_audit_settings;

-- 2. RECIPIENT MANAGEMENT
CREATE TABLE IF NOT EXISTS night_audit_recipients (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL DEFAULT 'sri-tayi-grand',
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    recipient_name TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'General Manager',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    consent_status TEXT NOT NULL DEFAULT 'granted',
    created_by TEXT DEFAULT 'Super Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_recipient_channel_address UNIQUE (hotel_id, channel, recipient_address)
);

-- Alias view for audit_recipients
CREATE OR REPLACE VIEW audit_recipients AS 
SELECT * FROM night_audit_recipients;

-- 3. AUDIT RUNS / HISTORICAL EXECUTION RECORDS
CREATE TABLE IF NOT EXISTS daily_audit_runs (
    id TEXT PRIMARY KEY,
    business_date DATE NOT NULL,
    run_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (run_type IN ('scheduled', 'manual', 'test')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'exception')),
    triggered_by TEXT NOT NULL DEFAULT 'Vercel Cron Trigger',
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    pdf_path TEXT,
    pdf_filename TEXT,
    error_log TEXT,
    reconciled BOOLEAN NOT NULL DEFAULT TRUE,
    discrepancy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_date ON daily_audit_runs(business_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_runs_status ON daily_audit_runs(status);

-- 4. REPORT SNAPSHOTS (Immutable Historical Data Snapshots)
CREATE TABLE IF NOT EXISTS audit_report_snapshots (
    id TEXT PRIMARY KEY,
    audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    snapshot_json JSONB NOT NULL,
    cutoff_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON audit_report_snapshots(business_date);

-- 5. REPORT FILES (Archived PDF Assets & Integrity Hashes)
CREATE TABLE IF NOT EXISTS audit_report_files (
    id TEXT PRIMARY KEY,
    audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    sha256_checksum TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. DISPATCH LOGS (Per-recipient delivery status and provider tracking)
CREATE TABLE IF NOT EXISTS audit_dispatch_logs (
    id TEXT PRIMARY KEY,
    audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
    recipient_id TEXT,
    recipient_name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('delivered', 'sent', 'failed', 'configuration_required', 'disabled', 'pending')),
    provider TEXT,
    provider_message_id TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dispatch_run_id ON audit_dispatch_logs(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON audit_dispatch_logs(status);

-- 7. DELIVERY EVENTS (Webhook and Lifecycle Events)
CREATE TABLE IF NOT EXISTS audit_delivery_events (
    id TEXT PRIMARY KEY,
    dispatch_log_id TEXT REFERENCES audit_dispatch_logs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('dispatched', 'delivered', 'bounced', 'failed', 'retried')),
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT EXCEPTIONS (Discrepancy and Anomaly Tracking)
CREATE TABLE IF NOT EXISTS audit_exceptions (
    id TEXT PRIMARY KEY,
    audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    exception_type TEXT NOT NULL,
    message TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. EXECUTION AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_execution_logs (
    id TEXT PRIMARY KEY,
    audit_run_id TEXT REFERENCES daily_audit_runs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Production Recipients (Preserving Authorized Stakeholders)
INSERT INTO night_audit_recipients (id, hotel_id, channel, recipient_name, recipient_address, role, is_active, consent_status, created_by)
VALUES 
    ('rec-gm-hari', 'sri-tayi-grand', 'email', 'General Manager (Hari Achari)', 'hari@sritayigrand.com', 'General Manager', true, 'granted', 'System Seed'),
    ('rec-accounts-dept', 'sri-tayi-grand', 'email', 'Accounts Department', 'accounts@sritayigrand.com', 'Accounts Department', true, 'granted', 'System Seed'),
    ('rec-mgmt-official', 'sri-tayi-grand', 'email', 'Sri Tayi Grand Official', 'contact@sritayigrand.com', 'Official', true, 'granted', 'System Seed'),
    ('rec-tech-vaynex', 'sri-tayi-grand', 'email', 'Technical Admin (Vaynex)', 'byvaynex@gmail.com', 'Technical Admin', true, 'granted', 'System Seed')
ON CONFLICT (hotel_id, channel, recipient_address) 
DO UPDATE SET
    recipient_name = EXCLUDED.recipient_name,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- Seed Default Settings
INSERT INTO night_audit_settings (id, hotel_id, enabled, execution_time, timezone, email_enabled, whatsapp_enabled, updated_at)
VALUES ('stg-audit-settings', 'sri-tayi-grand', true, '00:00', 'Asia/Kolkata', true, false, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    timezone = 'Asia/Kolkata',
    execution_time = '00:00',
    updated_at = CURRENT_TIMESTAMP;
