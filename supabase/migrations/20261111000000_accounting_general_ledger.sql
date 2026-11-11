-- =============================================================================
-- Migration: General Ledger Accounting (Double-Entry Bookkeeping)
-- Tracks immutable journal entries and balanced debit/credit lines
-- =============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(100) PRIMARY KEY,
    entry_number VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL,
    reference VARCHAR(100),
    description TEXT NOT NULL,
    total_debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_balanced BOOLEAN NOT NULL DEFAULT true,
    is_posted BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_journal_entry_balanced CHECK (total_debit = total_credit)
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id VARCHAR(100) PRIMARY KEY,
    entry_id VARCHAR(100) NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_journal_line_positive CHECK (debit >= 0 AND credit >= 0),
    CONSTRAINT chk_journal_line_debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries(reference);
CREATE INDEX IF NOT EXISTS idx_journal_entries_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code ON journal_lines(account_code);

-- Enable Row Level Security (RLS)
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to journal_entries" ON journal_entries;
CREATE POLICY "Service role full access to journal_entries" ON journal_entries
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to journal_lines" ON journal_lines;
CREATE POLICY "Service role full access to journal_lines" ON journal_lines
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated staff access
DROP POLICY IF EXISTS "Staff read access to journal_entries" ON journal_entries;
CREATE POLICY "Staff read access to journal_entries" ON journal_entries
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff read access to journal_lines" ON journal_lines;
CREATE POLICY "Staff read access to journal_lines" ON journal_lines
    FOR SELECT TO authenticated USING (true);
