/**
 * ==============================================================================
 * SRI TAYI GRAND - RBAC SECURITY AUDIT & PRIVILEGE ESCALATION TEST SUITE
 * Executes 5 rigorous security test scenarios to verify Defense-in-Depth.
 * ==============================================================================
 */

import {
  RoleEnum,
  normalizeRole,
  hasPermission,
  canAccessRoute,
  ROLE_PERMISSIONS,
} from '../src/lib/rbac/types';
import {
  requireRole,
  requirePermission,
  applyStaffDataIsolation,
  getStaffScopeWhereClause,
} from '../src/lib/rbac/middleware';
import { AuthSession } from '../src/lib/auth';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

console.log('\n==============================================================================');
console.log('🛡️  SRI TAYI GRAND - ROLE-BASED ACCESS CONTROL (RBAC) SECURITY AUDIT');
console.log('==============================================================================\n');

// Mock User Sessions
const superAdminSession: AuthSession = {
  userId: 'usr-admin-01',
  name: 'Sri Tayi Grand Admin',
  email: 'admin@sritayigrand.com',
  role: 'Super Admin',
  token: 'mock-token-super-admin',
  expiresAt: Date.now() + 86400000,
};

const managerSession: AuthSession = {
  userId: 'usr-mgr-02',
  name: 'G. Mohan Kumar',
  email: 'manager@sritayigrand.com',
  role: 'Hotel Manager',
  token: 'mock-token-manager',
  expiresAt: Date.now() + 86400000,
};

const staffSession: AuthSession = {
  userId: 'usr-staff-03',
  name: 'B. Lakshmi Devi',
  email: 'frontdesk@sritayigrand.com',
  role: 'Front Desk',
  token: 'mock-token-staff',
  expiresAt: Date.now() + 86400000,
};

// ------------------------------------------------------------------------------
// SCENARIO 1: Staff Privilege Escalation to Settings & Infrastructure Blocked
// ------------------------------------------------------------------------------
console.log('📌 [SCENARIO 1] Staff Privilege Escalation to Settings & Infrastructure');
{
  // 1.1 Permission Check
  const staffCanManageSettings = hasPermission(staffSession.role, 'settings:update');
  const staffCanManageApiKeys = hasPermission(staffSession.role, 'settings:manage_api_keys');
  assert(!staffCanManageSettings, '1.1 Staff lacks settings:update permission');
  assert(!staffCanManageApiKeys, '1.2 Staff lacks settings:manage_api_keys permission');

  // 1.2 Route Access Check
  const staffCanAccessSettingsRoute = canAccessRoute(staffSession.role, '/admin/settings');
  const staffCanAccessAuditLogsRoute = canAccessRoute(staffSession.role, '/admin/audit-logs');
  assert(!staffCanAccessSettingsRoute, '1.3 Staff route access to /admin/settings is BLOCKED');
  assert(!staffCanAccessAuditLogsRoute, '1.4 Staff route access to /admin/audit-logs is BLOCKED');

  // 1.3 Super Admin Allowed
  const adminCanAccessSettingsRoute = canAccessRoute(superAdminSession.role, '/admin/settings');
  assert(adminCanAccessSettingsRoute, '1.5 Super Admin has full access to /admin/settings');
}

// ------------------------------------------------------------------------------
// SCENARIO 2: Manager Destructive Hard Delete Blocked (Soft-Delete Only)
// ------------------------------------------------------------------------------
console.log('\n📌 [SCENARIO 2] Manager Destructive Action Guard (Hard Delete Blocked)');
{
  const mgrCanSoftDelete = hasPermission(managerSession.role, 'bookings:delete_soft');
  const mgrCanHardDelete = hasPermission(managerSession.role, 'bookings:delete_hard');
  const mgrCanPurgeAuditLogs = hasPermission(managerSession.role, 'audit_logs:purge');

  assert(mgrCanSoftDelete, '2.1 Manager is permitted to perform bookings:delete_soft');
  assert(!mgrCanHardDelete, '2.2 Manager is strictly BLOCKED from bookings:delete_hard');
  assert(!mgrCanPurgeAuditLogs, '2.3 Manager is strictly BLOCKED from audit_logs:purge');

  const adminCanHardDelete = hasPermission(superAdminSession.role, 'bookings:delete_hard');
  assert(adminCanHardDelete, '2.4 Super Admin is permitted to perform bookings:delete_hard');
}

// ------------------------------------------------------------------------------
// SCENARIO 3: Manager Attempt to Create/Assign Super Admin Role Blocked
// ------------------------------------------------------------------------------
console.log('\n📌 [SCENARIO 3] User Role Assignment & Escalation Boundaries');
{
  const mgrCanAssignRoles = hasPermission(managerSession.role, 'users:assign_role');
  const adminCanAssignRoles = hasPermission(superAdminSession.role, 'users:assign_role');
  const staffCanAssignRoles = hasPermission(staffSession.role, 'users:assign_role');

  assert(!mgrCanAssignRoles, '3.1 Manager is BLOCKED from users:assign_role');
  assert(!staffCanAssignRoles, '3.2 Staff is BLOCKED from users:assign_role');
  assert(adminCanAssignRoles, '3.3 Super Admin is permitted to users:assign_role');
}

// ------------------------------------------------------------------------------
// SCENARIO 4: Staff Access to Financial Ledger & Net Revenue Blocked
// ------------------------------------------------------------------------------
console.log('\n📌 [SCENARIO 4] Financial Ledger & Revenue Shielding');
{
  const staffCanViewRevenue = hasPermission(staffSession.role, 'billing:view_revenue');
  const staffCanClosePeriod = hasPermission(staffSession.role, 'accounting:close_period');
  const staffCanAccessAccountingRoute = canAccessRoute(staffSession.role, '/admin/accounting');

  assert(!staffCanViewRevenue, '4.1 Staff is BLOCKED from billing:view_revenue');
  assert(!staffCanClosePeriod, '4.2 Staff is BLOCKED from accounting:close_period');
  assert(!staffCanAccessAccountingRoute, '4.3 Staff route access to /admin/accounting is BLOCKED');

  const mgrCanAccessAccountingRoute = canAccessRoute(managerSession.role, '/admin/accounting');
  assert(mgrCanAccessAccountingRoute, '4.4 Manager has operational access to /admin/accounting');
}

// ------------------------------------------------------------------------------
// SCENARIO 5: Row-Level Security & Staff Query Data Isolation
// ------------------------------------------------------------------------------
console.log('\n📌 [SCENARIO 5] Row-Level Security & Query Data Isolation');
{
  const mockTasks = [
    { id: 'tsk-01', title: 'Clean Deluxe Room 101', assigned_staff_id: 'usr-staff-03' },
    { id: 'tsk-02', title: 'Inspect Suite Room 301', assigned_staff_id: 'usr-staff-99' },
    { id: 'tsk-03', title: 'Unassigned Pool Task', assigned_staff_id: null },
  ];

  // Staff Isolation Test: Staff usr-staff-03 should only receive their assigned task + unassigned pool
  const staffFiltered = applyStaffDataIsolation(mockTasks, staffSession);
  assert(staffFiltered.length === 2, '5.1 Staff query filtered to assigned (1) + unassigned pool (1)');
  assert(staffFiltered.some((t) => t.id === 'tsk-01'), '5.2 Staff sees assigned task tsk-01');
  assert(!staffFiltered.some((t) => t.id === 'tsk-02'), '5.3 Staff CANNOT see other staff task tsk-02');

  // Manager and Super Admin Global Visibility Test
  const managerFiltered = applyStaffDataIsolation(mockTasks, managerSession);
  const adminFiltered = applyStaffDataIsolation(mockTasks, superAdminSession);
  assert(managerFiltered.length === 3, '5.4 Manager receives full global dataset (3 tasks)');
  assert(adminFiltered.length === 3, '5.5 Super Admin receives full global dataset (3 tasks)');

  // ORM Where-Clause Generation Test
  const staffClause = getStaffScopeWhereClause(staffSession, 'assigned_staff_id');
  const adminClause = getStaffScopeWhereClause(superAdminSession, 'assigned_staff_id');
  assert(Array.isArray(staffClause.OR), '5.6 Staff scope generates OR constraint predicate');
  assert(Object.keys(adminClause).length === 0, '5.7 Admin scope generates unrestricted predicate ({})');
}

console.log('\n==============================================================================');
console.log(`📊  RBAC VERIFICATION RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('==============================================================================\n');
