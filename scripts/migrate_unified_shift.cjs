const { Pool } = require('pg');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  });
}

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('--- STARTING UNIFIED SHIFT SCHEMA MIGRATION ---');
    await client.query('BEGIN');

    // 1. Add missing columns to cash_shifts
    console.log('1. Checking and adding columns to cash_shifts...');
    await client.query(`
      ALTER TABLE public.cash_shifts
      ADD COLUMN IF NOT EXISTS attendance_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS opening_denominations JSONB,
      ADD COLUMN IF NOT EXISTS closing_denominations JSONB,
      ADD COLUMN IF NOT EXISTS handover_notes TEXT,
      ADD COLUMN IF NOT EXISTS discrepancy_reason TEXT;
    `);

    // 2. Add idempotency_key to cash_transactions
    console.log('2. Checking and adding idempotency_key to cash_transactions...');
    await client.query(`
      ALTER TABLE public.cash_transactions
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);
    `);

    // 3. Create index for idempotency on cash_transactions
    console.log('3. Creating idempotency unique index on cash_transactions...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_tx_idempotency 
      ON public.cash_transactions (idempotency_key) 
      WHERE idempotency_key IS NOT NULL;
    `);

    // 4. Ensure single open cash shift partial unique index
    console.log('4. Creating partial unique index for single open cash shift...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_single_open_cash_shift 
      ON public.cash_shifts USING btree ((1)) 
      WHERE (status = 'open');
    `);

    // 5. Ensure single active duty manager partial unique index on staff_attendance
    console.log('5. Ensuring single active duty manager index on staff_attendance...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_duty_manager 
      ON public.staff_attendance USING btree ((1)) 
      WHERE (clock_out IS NULL);
    `);

    // 6. Create or replace start_manager_shift PostgreSQL function
    console.log('6. Creating start_manager_shift PostgreSQL function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.start_manager_shift(
        p_staff_id VARCHAR,
        p_staff_name VARCHAR,
        p_role VARCHAR,
        p_opening_float NUMERIC,
        p_opening_denominations JSONB,
        p_shift_type VARCHAR DEFAULT 'general',
        p_notes TEXT DEFAULT NULL,
        p_actor_name VARCHAR DEFAULT 'Duty Manager'
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_existing_att RECORD;
        v_existing_shift RECORD;
        v_att_id VARCHAR;
        v_shift_id VARCHAR;
        v_shift_number VARCHAR;
        v_today_date DATE := CURRENT_DATE;
        v_date_str VARCHAR;
        v_shift_count INT;
        v_now TIMESTAMPTZ := CLOCK_TIMESTAMP();
        v_created_att JSONB;
        v_created_shift JSONB;
      BEGIN
        -- Concurrency Check 1: Verify no manager is currently clocked in
        SELECT id, staff_name, clock_in INTO v_existing_att
        FROM public.staff_attendance
        WHERE clock_out IS NULL
        LIMIT 1;

        IF FOUND THEN
          RAISE EXCEPTION 'Manager Duty Collision: % is already clocked in on duty since %. They must clock out and close their shift before a new shift can start.',
            v_existing_att.staff_name, v_existing_att.clock_in;
        END IF;

        -- Concurrency Check 2: Verify shared cash drawer is closed
        SELECT id, shift_number, cashier_name, opened_at INTO v_existing_shift
        FROM public.cash_shifts
        WHERE status = 'open'
        LIMIT 1;

        IF FOUND THEN
          RAISE EXCEPTION 'Drawer Collision: Cash shift #% opened by % at % is still open. It must be closed before opening a new shift.',
            v_existing_shift.shift_number, v_existing_shift.cashier_name, v_existing_shift.opened_at;
        END IF;

        -- Generate unique IDs and sequential shift number
        v_att_id := 'att-' || EXTRACT(EPOCH FROM v_now)::BIGINT || '-' || FLOOR(100 + RANDOM() * 900)::INT;
        v_shift_id := 'shift-' || EXTRACT(EPOCH FROM v_now)::BIGINT || '-' || FLOOR(100 + RANDOM() * 900)::INT;
        v_date_str := TO_CHAR(v_now, 'YYYYMMDD');

        SELECT COUNT(*) + 1 INTO v_shift_count
        FROM public.cash_shifts
        WHERE TO_CHAR(opened_at, 'YYYYMMDD') = v_date_str;

        v_shift_number := 'SH-' || v_date_str || '-' || LPAD(v_shift_count::TEXT, 2, '0');

        -- 1. Insert Attendance Record
        INSERT INTO public.staff_attendance (
          id, staff_id, staff_name, role, date, shift, clock_in, status, notes, created_at, updated_at
        ) VALUES (
          v_att_id,
          p_staff_id,
          p_staff_name,
          COALESCE(p_role, 'Hotel Manager'),
          v_today_date,
          COALESCE(p_shift_type, 'general'),
          v_now,
          'present',
          p_notes,
          v_now,
          v_now
        );

        -- 2. Insert Cash Shift Record linked to attendance
        INSERT INTO public.cash_shifts (
          id,
          shift_number,
          cashier_id,
          cashier_name,
          opened_at,
          opening_float,
          status,
          attendance_id,
          opening_denominations,
          notes,
          opened_by_name,
          opened_by_role,
          created_at
        ) VALUES (
          v_shift_id,
          v_shift_number,
          p_staff_id,
          p_staff_name,
          v_now,
          GREATEST(0, COALESCE(p_opening_float, 0)),
          'open',
          v_att_id,
          p_opening_denominations,
          p_notes,
          p_actor_name,
          COALESCE(p_role, 'Hotel Manager'),
          v_now
        );

        -- 3. Write Audit Log
        INSERT INTO public.audit_logs (
          id,
          action,
          entity_name,
          entity_id,
          user_name,
          user_role,
          category,
          details,
          created_at
        ) VALUES (
          gen_random_uuid(),
          'UNIFIED_SHIFT_START',
          'shift',
          v_shift_id,
          p_actor_name,
          COALESCE(p_role, 'Hotel Manager'),
          'operations',
          'Unified shift started: ' || p_staff_name || ' clocked in for ' || COALESCE(p_shift_type, 'general') || ' shift. Cash drawer shift #' || v_shift_number || ' opened with float ' || COALESCE(p_opening_float, 0)::TEXT,
          v_now
        );

        SELECT row_to_json(a) INTO v_created_att FROM public.staff_attendance a WHERE a.id = v_att_id;
        SELECT row_to_json(s) INTO v_created_shift FROM public.cash_shifts s WHERE s.id = v_shift_id;

        RETURN jsonb_build_object(
          'success', true,
          'attendance', v_created_att,
          'shift', v_created_shift
        );
      END;
      $$;
    `);

    // 7. Create or replace end_manager_shift PostgreSQL function
    console.log('7. Creating end_manager_shift PostgreSQL function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.end_manager_shift(
        p_shift_id VARCHAR,
        p_closing_cash_counted NUMERIC,
        p_closing_denominations JSONB,
        p_handover_notes TEXT DEFAULT NULL,
        p_discrepancy_reason TEXT DEFAULT NULL,
        p_actor_name VARCHAR DEFAULT 'Duty Manager'
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_shift RECORD;
        v_att RECORD;
        v_total_cash_in NUMERIC := 0;
        v_total_cash_out NUMERIC := 0;
        v_expected_closing NUMERIC := 0;
        v_discrepancy NUMERIC := 0;
        v_work_hours NUMERIC := 0;
        v_now TIMESTAMPTZ := CLOCK_TIMESTAMP();
        v_diff_seconds NUMERIC;
        v_updated_shift JSONB;
        v_updated_att JSONB;
      BEGIN
        -- Step 1: Lock and verify open cash shift
        SELECT * INTO v_shift
        FROM public.cash_shifts
        WHERE (id = p_shift_id OR shift_number = p_shift_id) AND status = 'open'
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Active cash shift not found or already closed (ID: %).', p_shift_id;
        END IF;

        -- Step 2: Lock and verify linked attendance record
        IF v_shift.attendance_id IS NOT NULL THEN
          SELECT * INTO v_att
          FROM public.staff_attendance
          WHERE id = v_shift.attendance_id AND clock_out IS NULL
          FOR UPDATE;
        ELSE
          -- Fallback: find any active attendance for this cashier
          SELECT * INTO v_att
          FROM public.staff_attendance
          WHERE (staff_id = v_shift.cashier_id OR staff_name = v_shift.cashier_name) AND clock_out IS NULL
          ORDER BY clock_in DESC
          LIMIT 1
          FOR UPDATE;
        END IF;

        -- Step 3: Compute total physical cash collections and payouts from cash_transactions
        SELECT COALESCE(SUM(amount), 0) INTO v_total_cash_in
        FROM public.cash_transactions
        WHERE (shift_id = v_shift.id OR shift_id = v_shift.shift_number)
          AND type = 'cash_in';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_cash_out
        FROM public.cash_transactions
        WHERE (shift_id = v_shift.id OR shift_id = v_shift.shift_number)
          AND type = 'cash_out';

        -- Step 4: Calculate Expected Closing Cash and Discrepancy
        v_expected_closing := COALESCE(v_shift.opening_float, 0) + v_total_cash_in - v_total_cash_out;
        v_discrepancy := COALESCE(p_closing_cash_counted, 0) - v_expected_closing;

        -- Step 5: Close Cash Shift
        UPDATE public.cash_shifts
        SET
          status = 'closed',
          closed_at = v_now,
          closing_cash_counted = p_closing_cash_counted,
          closing_balance_counted = p_closing_cash_counted,
          expected_closing_cash = v_expected_closing,
          discrepancy = v_discrepancy,
          closing_discrepancy = v_discrepancy,
          total_cash_in = v_total_cash_in,
          total_cash_out = v_total_cash_out,
          closing_denominations = p_closing_denominations,
          handover_notes = p_handover_notes,
          discrepancy_reason = p_discrepancy_reason,
          closed_by_name = p_actor_name,
          closed_by_role = 'Hotel Manager',
          notes = CASE 
            WHEN p_handover_notes IS NOT NULL AND notes IS NOT NULL THEN notes || ' | Close: ' || p_handover_notes
            WHEN p_handover_notes IS NOT NULL THEN p_handover_notes
            ELSE notes
          END
        WHERE id = v_shift.id;

        -- Step 6: Clock out attendance if active
        IF v_att.id IS NOT NULL THEN
          v_diff_seconds := EXTRACT(EPOCH FROM (v_now - v_att.clock_in));
          v_work_hours := ROUND((v_diff_seconds / 3600.0)::NUMERIC, 2);

          UPDATE public.staff_attendance
          SET
            clock_out = v_now,
            work_hours = v_work_hours,
            notes = CASE 
              WHEN p_handover_notes IS NOT NULL AND notes IS NOT NULL THEN notes || ' | ' || p_handover_notes
              WHEN p_handover_notes IS NOT NULL THEN p_handover_notes
              ELSE notes
            END,
            updated_at = v_now
          WHERE id = v_att.id;
        END IF;

        -- Step 7: Record Audit Log
        INSERT INTO public.audit_logs (
          id,
          action,
          entity_name,
          entity_id,
          user_name,
          user_role,
          category,
          details,
          created_at
        ) VALUES (
          gen_random_uuid(),
          'UNIFIED_SHIFT_END',
          'shift',
          v_shift.id,
          p_actor_name,
          'Hotel Manager',
          'operations',
          'Unified shift ended: Cash drawer shift #' || v_shift.shift_number || ' closed. Expected: ' || v_expected_closing::TEXT || ', Counted: ' || p_closing_cash_counted::TEXT || ', Discrepancy: ' || v_discrepancy::TEXT || '. Attendance clocked out (' || v_work_hours::TEXT || ' hrs).',
          v_now
        );

        SELECT row_to_json(s) INTO v_updated_shift FROM public.cash_shifts s WHERE s.id = v_shift.id;
        IF v_att.id IS NOT NULL THEN
          SELECT row_to_json(a) INTO v_updated_att FROM public.staff_attendance a WHERE a.id = v_att.id;
        ELSE
          v_updated_att := NULL;
        END IF;

        RETURN jsonb_build_object(
          'success', true,
          'shift', v_updated_shift,
          'attendance', v_updated_att,
          'financials', jsonb_build_object(
            'openingFloat', v_shift.opening_float,
            'totalCashIn', v_total_cash_in,
            'totalCashOut', v_total_cash_out,
            'expectedClosingCash', v_expected_closing,
            'closingCashCounted', p_closing_cash_counted,
            'discrepancy', v_discrepancy,
            'workHours', v_work_hours
          )
        );
      END;
      $$;
    `);

    await client.query('COMMIT');
    console.log('--- UNIFIED SHIFT SCHEMA MIGRATION COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
