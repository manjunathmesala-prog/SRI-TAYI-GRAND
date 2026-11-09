/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
 * TYPE DEFINITIONS & PERMISSION SCHEMA
 * ==============================================================================
 */

import { StaffRole } from '@/types';

export type RoleEnum = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

export type Resource =
  | 'users'
  | 'settings'
  | 'billing'
  | 'accounting'
  | 'bookings'
  | 'customers'
  | 'rooms'
  | 'housekeeping'
  | 'maintenance'
  | 'enquiries'
  | 'reviews'
  | 'audit_logs'
  | 'rfid'
  | 'reports';

export type Permission =
  // User Management
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:assign_role'
  | 'users:reset_password'
  
  // Settings & Infrastructure
  | 'settings:read'
  | 'settings:update'
  | 'settings:manage_api_keys'
  | 'settings:manage_webhooks'
  | 'settings:manage_integrations'
  
  // Billing & Financials
  | 'billing:read'
  | 'billing:update'
  | 'billing:manage_payouts'
  | 'billing:manage_subscriptions'
  | 'billing:view_revenue'
  
  // General Ledger Accounting
  | 'accounting:read'
  | 'accounting:create_journal'
  | 'accounting:close_period'
  | 'accounting:export'
  
  // Bookings & Reservations
  | 'bookings:read'
  | 'bookings:create'
  | 'bookings:update'
  | 'bookings:delete_soft'
  | 'bookings:delete_hard'
  | 'bookings:override_rate'
  | 'bookings:check_in_out'
  
  // Customers & Guests
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete_soft'
  | 'customers:delete_hard'
  
  // Rooms & Inventory
  | 'rooms:read'
  | 'rooms:create'
  | 'rooms:update'
  | 'rooms:delete_soft'
  | 'rooms:delete_hard'
  | 'rooms:maintenance_block'
  
  // Housekeeping & Operations
  | 'housekeeping:read'
  | 'housekeeping:update'
  | 'housekeeping:assign'
  
  // Maintenance & OOO Tickets
  | 'maintenance:read'
  | 'maintenance:create'
  | 'maintenance:update'
  | 'maintenance:resolve'
  
  // Event & Banquet Enquiries
  | 'enquiries:read'
  | 'enquiries:create'
  | 'enquiries:update'
  | 'enquiries:delete_soft'
  
  // Guest Reviews
  | 'reviews:read'
  | 'reviews:create'
  | 'reviews:update'
  | 'reviews:delete'
  
  // Audit Logs
  | 'audit_logs:read'
  | 'audit_logs:purge'
  | 'audit_logs:export'
  
  // RFID Keycards
  | 'rfid:read'
  | 'rfid:issue_guest'
  | 'rfid:issue_master'
  | 'rfid:deactivate'
  
  // Reports & Analytics
  | 'reports:read_operational'
  | 'reports:read_financial'
  | 'reports:export';

/**
 * Normalizes any legacy or database string role into standard RoleEnum
 */
export function normalizeRole(role: string | null | undefined): RoleEnum {
  if (!role) return 'STAFF';
  const r = role.toUpperCase().replace(/\s+/g, '_');
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN' || role === 'Super Admin') return 'SUPER_ADMIN';
  if (r === 'MANAGER' || r === 'HOTEL_MANAGER' || role === 'Hotel Manager') return 'MANAGER';
  return 'STAFF';
}

/**
 * Role Hierarchy Weights: SUPER_ADMIN (100) > MANAGER (50) > STAFF (10)
 */
export const ROLE_HIERARCHY: Record<RoleEnum, number> = {
  SUPER_ADMIN: 100,
  MANAGER: 50,
  STAFF: 10,
};

export function isRoleAtLeast(userRole: string | RoleEnum, requiredRole: RoleEnum): boolean {
  const normUser = normalizeRole(userRole);
  return ROLE_HIERARCHY[normUser] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * STRICT PERMISSION MATRIX MAPPING
 */
export const ROLE_PERMISSIONS: Record<RoleEnum, readonly Permission[]> = {
  SUPER_ADMIN: [
    // Super Admin has all permissions
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:assign_role',
    'users:reset_password',
    'settings:read',
    'settings:update',
    'settings:manage_api_keys',
    'settings:manage_webhooks',
    'settings:manage_integrations',
    'billing:read',
    'billing:update',
    'billing:manage_payouts',
    'billing:manage_subscriptions',
    'billing:view_revenue',
    'accounting:read',
    'accounting:create_journal',
    'accounting:close_period',
    'accounting:export',
    'bookings:read',
    'bookings:create',
    'bookings:update',
    'bookings:delete_soft',
    'bookings:delete_hard',
    'bookings:override_rate',
    'bookings:check_in_out',
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:delete_soft',
    'customers:delete_hard',
    'rooms:read',
    'rooms:create',
    'rooms:update',
    'rooms:delete_soft',
    'rooms:delete_hard',
    'rooms:maintenance_block',
    'housekeeping:read',
    'housekeeping:update',
    'housekeeping:assign',
    'maintenance:read',
    'maintenance:create',
    'maintenance:update',
    'maintenance:resolve',
    'enquiries:read',
    'enquiries:create',
    'enquiries:update',
    'enquiries:delete_soft',
    'reviews:read',
    'reviews:create',
    'reviews:update',
    'reviews:delete',
    'audit_logs:read',
    'audit_logs:purge',
    'audit_logs:export',
    'rfid:read',
    'rfid:issue_guest',
    'rfid:issue_master',
    'rfid:deactivate',
    'reports:read_operational',
    'reports:read_financial',
    'reports:export',
  ],

  MANAGER: [
    // Manager has operational oversight, cannot do destructive hard deletes or system infrastructure
    'users:read',
    'users:update', // Can update staff details, but cannot create/delete super admins
    'accounting:read',
    'bookings:read',
    'bookings:create',
    'bookings:update',
    'bookings:delete_soft', // Soft delete / archive only
    'bookings:override_rate',
    'bookings:check_in_out',
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:delete_soft',
    'rooms:read',
    'rooms:create',
    'rooms:update',
    'rooms:delete_soft',
    'rooms:maintenance_block',
    'housekeeping:read',
    'housekeeping:update',
    'housekeeping:assign',
    'maintenance:read',
    'maintenance:create',
    'maintenance:update',
    'maintenance:resolve',
    'enquiries:read',
    'enquiries:create',
    'enquiries:update',
    'enquiries:delete_soft',
    'reviews:read',
    'reviews:create',
    'reviews:update',
    'rfid:read',
    'rfid:issue_guest',
    'rfid:issue_master',
    'rfid:deactivate',
    'reports:read_operational',
    'reports:export',
  ],

  STAFF: [
    // Staff has task execution only, zero delete permissions, zero financial/settings
    'bookings:read',
    'bookings:create',
    'bookings:update', // Status update of assigned/front-desk bookings
    'bookings:check_in_out',
    'customers:read',
    'customers:create',
    'rooms:read',
    'housekeeping:read',
    'housekeeping:update', // Mark room clean/dirty
    'maintenance:read',
    'maintenance:create', // Log ticket
    'enquiries:read',
    'enquiries:create',
    'reviews:read',
    'rfid:read',
    'rfid:issue_guest', // Front desk check-in issuance
    'rfid:deactivate',
  ],
};

/**
 * Route to Required Role / Permission Mapping
 */
export const ROUTE_ACCESS_RULES: { path: string; exact?: boolean; minRole: RoleEnum }[] = [
  { path: '/admin/settings', minRole: 'SUPER_ADMIN' },
  { path: '/admin/audit-logs', minRole: 'SUPER_ADMIN' },
  { path: '/admin/pricing', minRole: 'MANAGER' },
  { path: '/admin/channels', minRole: 'MANAGER' },
  { path: '/admin/staff', minRole: 'MANAGER' },
  { path: '/admin/reports', minRole: 'MANAGER' },
  { path: '/admin/analytics', minRole: 'MANAGER' },
  { path: '/admin/accounting', minRole: 'MANAGER' },
  { path: '/admin/payments', minRole: 'MANAGER' },
  { path: '/admin/daily-closing', minRole: 'MANAGER' },
  { path: '/admin/expenses', minRole: 'MANAGER' },
  { path: '/admin/rooms/categories', minRole: 'MANAGER' },
  // Front Desk, Bookings, Guests, Housekeeping, Maintenance, RFID accessible to Staff
  { path: '/admin/front-desk', minRole: 'STAFF' },
  { path: '/admin/bookings', minRole: 'STAFF' },
  { path: '/admin/guests', minRole: 'STAFF' },
  { path: '/admin/rooms/board', minRole: 'STAFF' },
  { path: '/admin/rooms/inventory', minRole: 'STAFF' },
  { path: '/admin/housekeeping', minRole: 'STAFF' },
  { path: '/admin/maintenance', minRole: 'STAFF' },
  { path: '/admin/convention-hall', minRole: 'STAFF' },
  { path: '/admin/enquiries', minRole: 'STAFF' },
  { path: '/admin/rfid', minRole: 'STAFF' },
  { path: '/admin/reviews', minRole: 'STAFF' },
  { path: '/admin/cashbook', minRole: 'STAFF' },
  { path: '/admin/dashboard', minRole: 'STAFF' },
];

/**
 * Checks if a role has a specific permission
 */
export function hasPermission(role: string | RoleEnum | StaffRole, permission: Permission): boolean {
  const normRole = normalizeRole(role);
  if (normRole === 'SUPER_ADMIN') return true; // Super Admin has wildcard access
  const permissions = ROLE_PERMISSIONS[normRole] || [];
  return (permissions as readonly Permission[]).includes(permission);
}

/**
 * Checks if a role has ANY of the given permissions
 */
export function hasAnyPermission(role: string | RoleEnum | StaffRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Checks if a role has ALL of the given permissions
 */
export function hasAllPermissions(role: string | RoleEnum | StaffRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Checks if a role can access a specific administrative route
 */
export function canAccessRoute(role: string | RoleEnum | StaffRole, pathname: string): boolean {
  const normRole = normalizeRole(role);
  if (normRole === 'SUPER_ADMIN') return true;

  // Find the most specific matching rule
  const matchedRule = ROUTE_ACCESS_RULES.find((rule) => {
    if (rule.exact) return pathname === rule.path;
    return pathname === rule.path || pathname.startsWith(rule.path + '/');
  });

  if (!matchedRule) return true; // Default allow for unspecified sub-pages
  return isRoleAtLeast(normRole, matchedRule.minRole);
}
