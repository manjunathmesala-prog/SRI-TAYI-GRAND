-- ==============================================================================
-- SRI TAYI GRAND - PRODUCTION MANAGER ROLES & PROFILES MIGRATION
-- Provisioning Hotel Managers: Hari Achari and Sagar
-- ==============================================================================

-- 1. Ensure Hotel Manager Role Exists
INSERT INTO roles (id, name, description)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'Hotel Manager',
    'Operational management, walk-ins, folios, expenditure, general ledger, banquet, attendance, and night audit'
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

-- 2. Provision auth.users for Hari Achari (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hari@sritayigrand.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '50aba2e5-0000-4fbd-bb89-000000000001',
            'authenticated',
            'authenticated',
            'hari@sritayigrand.com',
            '$2a$10$RVJ7tuzx1wD0QGFP7kax2O.ux0YLBCVUPipZWMagoZuqLcynC8kxO',
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"role": "Hotel Manager", "display_name": "Hari Achari", "email_verified": true}'::jsonb,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- 3. Provision auth.users for Sagar (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sagar@sritayigrand.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '50aba2e5-0000-4fbd-bb89-000000000002',
            'authenticated',
            'authenticated',
            'sagar@sritayigrand.com',
            '$2a$10$RVJ7tuzx1wD0QGFP7kax2O.ux0YLBCVUPipZWMagoZuqLcynC8kxO',
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"role": "Hotel Manager", "display_name": "Sagar", "email_verified": true}'::jsonb,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- 4. Upsert Profiles for Hari Achari and Sagar
INSERT INTO profiles (
    id,
    role_id,
    full_name,
    phone,
    is_active,
    preferred_language,
    created_at,
    updated_at
) VALUES 
(
    '50aba2e5-0000-4fbd-bb89-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Hari Achari',
    '9440812346',
    true,
    'en',
    NOW(),
    NOW()
),
(
    '50aba2e5-0000-4fbd-bb89-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Sagar',
    '9440812347',
    true,
    'en',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = NOW();
