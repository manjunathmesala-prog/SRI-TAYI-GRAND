-- ==============================================================================
-- SRI TAYI GRAND - ENTERPRISE RBAC & ROW-LEVEL SECURITY (RLS) SQL SCHEMA
-- Target Database: PostgreSQL 14+
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE role_type AS ENUM ('SUPER_ADMIN', 'MANAGER', 'STAFF');
CREATE TYPE audit_status AS ENUM ('SUCCESS', 'DENIED', 'FAILED');
CREATE TYPE audit_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    department VARCHAR(100),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- 3. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name role_type UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy_level INT DEFAULT 10 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'bookings:delete_hard'
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- 5. User-Role Association (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_user_role UNIQUE(user_id, role_id)
);

-- 6. Role-Permission Association (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_permission UNIQUE(role_id, permission_id)
);

-- 7. Immutable Security Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details TEXT NOT NULL,
    status audit_status DEFAULT 'SUCCESS' NOT NULL,
    severity audit_severity DEFAULT 'INFO' NOT NULL,
    ip_address INET,
    user_agent TEXT,
    previous_value JSONB,
    new_value JSONB
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource_action ON audit_logs(resource, action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_status ON audit_logs(status);

-- 8. Row-Level Security (RLS) Policies on Operational Tasks Table
CREATE TABLE IF NOT EXISTS operational_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS
ALTER TABLE operational_tasks ENABLE ROW LEVEL SECURITY;

-- Policy A: Super Admin and Manager can view ALL tasks
CREATE POLICY manager_admin_view_all_tasks ON operational_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'MANAGER')
        )
    );

-- Policy B: Staff can only view their OWN assigned tasks or unassigned pool tasks
CREATE POLICY staff_view_assigned_tasks ON operational_tasks
    FOR SELECT
    USING (
        assigned_to = auth.uid() OR assigned_to IS NULL
    );

-- Policy C: Staff can ONLY update status of tasks assigned to themselves
CREATE POLICY staff_update_assigned_tasks ON operational_tasks
    FOR UPDATE
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());
