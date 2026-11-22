-- ==============================================================================
-- SRI TAYI GRAND - STRICT STAFF TRIO & MUTUAL EXCLUSION MANAGER SHIFT PROTOCOL
-- 1. Restricts staff directory to exactly Superadmin, Hari Achari, and Sagar.
-- 2. Enforces Single Active Manager on Duty rule:
--    Only Hari and Sagar can clock in.
--    If one manager is clocked in, the other cannot clock in until the first clocks out.
-- ==============================================================================

-- 1. Deactivate all profiles except Superadmin, Hari Achari, and Sagar
UPDATE profiles 
SET is_active = false, updated_at = NOW()
WHERE id NOT IN (
    'e6e40243-6f98-44dc-94ad-3c56303cf61a', -- Sri Tayi Grand Admin (Super Admin)
    '50aba2e5-0000-4fbd-bb89-000000000001', -- Hari Achari (Hotel Manager)
    '50aba2e5-0000-4fbd-bb89-000000000002'  -- Sagar (Hotel Manager)
);

-- Ensure the three official accounts are active
UPDATE profiles
SET is_active = true, updated_at = NOW()
WHERE id IN (
    'e6e40243-6f98-44dc-94ad-3c56303cf61a',
    '50aba2e5-0000-4fbd-bb89-000000000001',
    '50aba2e5-0000-4fbd-bb89-000000000002'
);

-- 2. Clean up any historical open shifts in staff_attendance so database is consistent
UPDATE staff_attendance 
SET clock_out = COALESCE(clock_in + interval '8 hours', NOW()), 
    work_hours = ROUND(EXTRACT(EPOCH FROM (COALESCE(clock_in + interval '8 hours', NOW()) - clock_in)) / 3600.0, 1),
    updated_at = NOW()
WHERE clock_out IS NULL;

-- 3. Trigger Function: Enforce Single Active Manager on Duty
CREATE OR REPLACE FUNCTION fn_enforce_single_active_manager_shift()
RETURNS TRIGGER AS $$
DECLARE
    v_active_manager TEXT;
BEGIN
    -- Check when a shift is being clocked in or remains open
    IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NULL THEN
        -- Disallow non-manager accounts (Super Admin does not record duty shift)
        IF NEW.staff_id NOT IN (
            '50aba2e5-0000-4fbd-bb89-000000000001', 
            '50aba2e5-0000-4fbd-bb89-000000000002',
            'stf-hari',
            'stf-sagar'
        ) THEN
            RAISE EXCEPTION 'ATTENDANCE_NOT_PERMITTED: Clock-in is restricted exclusively to operational managers (Hari Achari and Sagar).';
        END IF;

        -- Check if another manager is currently on duty (clock_out IS NULL)
        SELECT staff_name INTO v_active_manager
        FROM staff_attendance
        WHERE clock_in IS NOT NULL 
          AND clock_out IS NULL 
          AND id <> NEW.id
          AND staff_id <> NEW.staff_id
        LIMIT 1;

        IF v_active_manager IS NOT NULL THEN
            RAISE EXCEPTION 'MANAGER_DUTY_COLLISION: % is currently clocked in as Manager on Duty. % must clock out before another manager can clock in.', v_active_manager, v_active_manager;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_single_active_manager_shift ON staff_attendance;
CREATE TRIGGER trg_enforce_single_active_manager_shift
BEFORE INSERT OR UPDATE ON staff_attendance
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_single_active_manager_shift();

-- 4. Create Partial Unique Index: At most ONE open shift across all managers at any time
DROP INDEX IF EXISTS idx_single_active_duty_manager;
CREATE UNIQUE INDEX idx_single_active_duty_manager 
ON staff_attendance ((1)) 
WHERE clock_out IS NULL;
