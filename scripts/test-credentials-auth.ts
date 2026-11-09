/**
 * ==============================================================================
 * SRI TAYI GRAND - CREDENTIALS & RBAC AUTHENTICATION VERIFICATION TEST
 * Tests full authentication functionality for Super Admin, Manager, and Staff.
 * ==============================================================================
 */

import { authenticateStaff, verifySessionToken, DEFAULT_CREDENTIALS } from '../src/lib/auth';
import { normalizeRole, hasPermission, canAccessRoute } from '../src/lib/rbac/types';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

console.log('\n==============================================================================');
console.log('🔐 SRI TAYI GRAND - 3-TIER CREDENTIALS & FULL FUNCTIONALITY AUDIT');
console.log('==============================================================================\n');

// 1. SUPER ADMIN AUTHENTICATION
console.log('📌 [TIER 1] Super Admin Credentials Authentication');
{
  const result = authenticateStaff('admin@sritayigrand.com', 'SuperAdmin@TayiGrand2026!');
  assert(result.success === true, '1.1 Super Admin logs in with dedicated password');
  assert(result.session?.role === 'Super Admin', '1.2 Session role is "Super Admin"');
  assert(normalizeRole(result.session?.role) === 'SUPER_ADMIN', '1.3 Normalized role is SUPER_ADMIN');
  
  // Verify token
  const verified = verifySessionToken(result.session?.token);
  assert(verified !== null && verified.email === 'admin@sritayigrand.com', '1.4 HMAC token verifies successfully');

  // Verify full privileges
  assert(hasPermission(result.session!.role, 'settings:manage_api_keys'), '1.5 Super Admin has settings:manage_api_keys');
  assert(hasPermission(result.session!.role, 'bookings:delete_hard'), '1.6 Super Admin has bookings:delete_hard');
  assert(canAccessRoute(result.session!.role, '/admin/settings'), '1.7 Super Admin can access /admin/settings');
  assert(canAccessRoute(result.session!.role, '/admin/audit-logs'), '1.8 Super Admin can access /admin/audit-logs');
}

// 2. HOTEL MANAGER AUTHENTICATION
console.log('\n📌 [TIER 2] Hotel Manager Credentials Authentication');
{
  const result = authenticateStaff('manager@sritayigrand.com', 'Manager@TayiGrand2026!');
  assert(result.success === true, '2.1 Manager logs in with dedicated password');
  assert(result.session?.role === 'Hotel Manager', '2.2 Session role is "Hotel Manager"');
  assert(normalizeRole(result.session?.role) === 'MANAGER', '2.3 Normalized role is MANAGER');

  // Verify token
  const verified = verifySessionToken(result.session?.token);
  assert(verified !== null && verified.email === 'manager@sritayigrand.com', '2.4 HMAC token verifies successfully');

  // Verify operational privileges and strict restrictions
  assert(hasPermission(result.session!.role, 'bookings:delete_soft'), '2.5 Manager has bookings:delete_soft');
  assert(!hasPermission(result.session!.role, 'bookings:delete_hard'), '2.6 Manager strictly lacks bookings:delete_hard');
  assert(!hasPermission(result.session!.role, 'settings:update'), '2.7 Manager strictly lacks settings:update');
  assert(canAccessRoute(result.session!.role, '/admin/bookings'), '2.8 Manager can access /admin/bookings');
  assert(!canAccessRoute(result.session!.role, '/admin/settings'), '2.9 Manager cannot access /admin/settings');
}

// 3. FRONT DESK STAFF AUTHENTICATION
console.log('\n📌 [TIER 3] Front Desk Staff Credentials Authentication');
{
  const result = authenticateStaff('staff@sritayigrand.com', 'Staff@TayiGrand2026!');
  assert(result.success === true, '3.1 Staff logs in with dedicated password (staff@sritayigrand.com)');
  assert(result.session?.role === 'Front Desk', '3.2 Session role is "Front Desk"');
  assert(normalizeRole(result.session?.role) === 'STAFF', '3.3 Normalized role is STAFF');

  // Also test frontdesk@sritayigrand.com alias
  const frontDeskResult = authenticateStaff('frontdesk@sritayigrand.com', 'Staff@TayiGrand2026!');
  assert(frontDeskResult.success === true, '3.4 Front Desk alias logs in with dedicated password');

  // Verify operational queue permissions and restrictions
  assert(hasPermission(result.session!.role, 'bookings:read'), '3.5 Staff has bookings:read');
  assert(hasPermission(result.session!.role, 'rfid:issue_guest'), '3.6 Staff has rfid:issue_guest');
  assert(!hasPermission(result.session!.role, 'bookings:delete_soft'), '3.7 Staff strictly lacks bookings:delete_soft');
  assert(!hasPermission(result.session!.role, 'accounting:read'), '3.8 Staff strictly lacks accounting:read');
  assert(canAccessRoute(result.session!.role, '/admin/front-desk'), '3.9 Staff can access /admin/front-desk');
  assert(!canAccessRoute(result.session!.role, '/admin/pricing'), '3.10 Staff cannot access /admin/pricing');
  assert(!canAccessRoute(result.session!.role, '/admin/settings'), '3.11 Staff cannot access /admin/settings');
}

// 4. SECURITY & ERROR DEFENSE TESTS
console.log('\n📌 [TIER 4] Security Boundaries & Invalid Credential Rejection');
{
  // Wrong password
  const wrongPass = authenticateStaff('admin@sritayigrand.com', 'WrongPassword123!');
  assert(wrongPass.success === false, '4.1 Invalid password correctly rejected');
  assert(wrongPass.error?.includes('Invalid password'), '4.2 Rejection error message matches expected');

  // Non-existent email
  const badEmail = authenticateStaff('hacker@unknown.com', 'SuperAdmin@TayiGrand2026!');
  assert(badEmail.success === false, '4.3 Non-existent user correctly rejected');

  // Master password fallback works across accounts
  const masterAdmin = authenticateStaff('admin@sritayigrand.com', 'GrandHotel@Kadiri2026!');
  const masterManager = authenticateStaff('manager@sritayigrand.com', 'GrandHotel@Kadiri2026!');
  const masterStaff = authenticateStaff('staff@sritayigrand.com', 'GrandHotel@Kadiri2026!');
  assert(masterAdmin.success && masterManager.success && masterStaff.success, '4.4 Universal master password fallback verified');
}

console.log('\n==============================================================================');
console.log(`📊  CREDENTIALS VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED`);
console.log('==============================================================================\n');
