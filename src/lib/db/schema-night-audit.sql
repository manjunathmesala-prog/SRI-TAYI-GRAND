-- Night Audit System Schema
-- Version 1.0

CREATE TABLE IF NOT EXISTS night_audit_settings (
    id VARCHAR(50) PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    execution_time VARCHAR(10) DEFAULT '00:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    email_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS night_audit_recipients (
    id VARCHAR(50) PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'email' | 'whatsapp'
    recipient_name VARCHAR(255) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    consent_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS night_audit_runs (
    id VARCHAR(50) PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL,
    business_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'exception'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details TEXT,
    report_version VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS night_audit_reports (
    id VARCHAR(50) PRIMARY KEY,
    audit_run_id VARCHAR(50) REFERENCES night_audit_runs(id),
    report_data JSONB NOT NULL,
    pdf_storage_path VARCHAR(500),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS night_audit_deliveries (
    id VARCHAR(50) PRIMARY KEY,
    audit_run_id VARCHAR(50) REFERENCES night_audit_runs(id),
    recipient_id VARCHAR(50) REFERENCES night_audit_recipients(id),
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending' | 'delivered' | 'failed'
    attempts INTEGER DEFAULT 0,
    provider_message_id VARCHAR(255),
    last_error TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS night_audit_execution_logs (
    id VARCHAR(50) PRIMARY KEY,
    audit_run_id VARCHAR(50) REFERENCES night_audit_runs(id),
    event_type VARCHAR(100) NOT NULL,
    event_details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
