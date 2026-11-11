import crypto from 'crypto';
import { StaffMember, StaffRole } from '@/types';
import { INITIAL_STAFF } from './db/mock-data';

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  token: string;
  expiresAt: number;
}

// Cryptographic signing secret for JWT/Session tokens
const AUTH_SECRET = process.env.ADMIN_JWT_SECRET || 'sri_tayi_grand_secure_default_hmac_jwt_secret_kadiri_2026_enterprise';

// Fixed master password for staff operations (checked securely via timing-safe comparison)
const MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || 'GrandHotel@Kadiri2026!';

/**
 * PRODUCTION ROLE CREDENTIAL CONFIGURATION
 * Dedicated credentials for Super Admin, Manager, and Staff roles.
 */
export const DEFAULT_CREDENTIALS = {
  superAdmin: {
    email: 'admin@sritayigrand.com',
    password: process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || 'GrandHotel@Kadiri2026!',
    role: 'Super Admin' as StaffRole,
    name: 'Sri Tayi Grand Admin',
    badge: 'Super Admin',
    description: 'System Owner (Full Unrestricted Access & Infrastructure)',
  },
  manager: {
    email: 'manager@sritayigrand.com',
    password: process.env.MANAGER_PASSWORD || 'GrandHotel@Kadiri2026!',
    role: 'Hotel Manager' as StaffRole,
    name: 'G. Mohan Kumar',
    badge: 'Hotel Manager',
    description: 'Operational Lead (Bookings, Guests, Operations, Soft-delete)',
  },
  staff: {
    email: 'staff@sritayigrand.com',
    password: process.env.STAFF_PASSWORD || 'GrandHotel@Kadiri2026!',
    role: 'Front Desk' as StaffRole,
    name: 'Sri Tayi Grand Staff',
    badge: 'Front Desk Staff',
    description: 'Front Desk Operator (Check-ins, Queue, Room Status, RFID)',
  },
};

export const ROLE_CREDENTIALS: Record<string, { role: StaffRole; expectedPassword: string }> = {
  'admin@sritayigrand.com': {
    role: 'Super Admin',
    expectedPassword: process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || 'GrandHotel@Kadiri2026!',
  },
  'manager@sritayigrand.com': {
    role: 'Hotel Manager',
    expectedPassword: process.env.MANAGER_PASSWORD || 'GrandHotel@Kadiri2026!',
  },
  'staff@sritayigrand.com': {
    role: 'Front Desk',
    expectedPassword: process.env.STAFF_PASSWORD || 'GrandHotel@Kadiri2026!',
  },
  'frontdesk@sritayigrand.com': {
    role: 'Front Desk',
    expectedPassword: process.env.STAFF_PASSWORD || '',
  },
};

/**
 * Creates a cryptographically signed session token: <dataB64url>.<hmacSignature>
 */
export function signSessionPayload(payload: object): string {
  if (AUTH_SECRET.length < 32) throw new Error('Staff authentication signing secret is not configured');
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataB64)
    .digest('base64url');
  return `${dataB64}.${signature}`;
}

/**
 * Validates staff credentials and produces an authenticated cryptographically signed session token
 */
export function authenticateStaff(
  email: string,
  password: string
): { success: boolean; session?: AuthSession; error?: string } {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const staff = INITIAL_STAFF.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (!staff || !staff.is_active) {
    return { success: false, error: 'Invalid credentials or staff account deactivated' };
  }

  // Constant-time password validation helper
  const verifyPasswordMatch = (inputPass: string, expectedPass: string): boolean => {
    const inputBuf = Buffer.from(inputPass, 'utf8');
    const expectedBuf = Buffer.from(expectedPass, 'utf8');
    return inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf);
  };

  if (AUTH_SECRET.length < 32) return { success: false, error: 'Staff authentication is not configured' };

  // Check explicitly configured account credentials
  const roleCred = ROLE_CREDENTIALS[staff.email.toLowerCase()];
  const isDedicatedMatch = roleCred?.expectedPassword ? verifyPasswordMatch(password, roleCred.expectedPassword) : false;
  const isMasterMatch = Boolean(MASTER_PASSWORD) && verifyPasswordMatch(password, MASTER_PASSWORD);

  if (!isDedicatedMatch && !isMasterMatch) {
    return { success: false, error: 'Invalid password. Please check your credentials.' };
  }

  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = {
    userId: staff.id,
    name: staff.full_name,
    email: staff.email,
    role: staff.role,
    exp: expiresAt,
  };

  const token = signSessionPayload(payload);

  return {
    success: true,
    session: {
      userId: staff.id,
      name: staff.full_name,
      email: staff.email,
      role: staff.role,
      token,
      expiresAt,
    },
  };
}

/**
 * Verifies and decodes an HMAC-signed session token from Authorization header or cookie
 */
export function verifySessionToken(tokenString: string | null | undefined): AuthSession | null {
  if (!tokenString || AUTH_SECRET.length < 32) return null;

  try {
    const raw = tokenString.startsWith('Bearer ') ? tokenString.slice(7) : tokenString;
    const parts = raw.split('.');

    // Signed format: data.signature
    if (parts.length === 2) {
      const [dataB64, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(dataB64)
        .digest('base64url');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSig, 'utf8');

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }

      const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf8');
      const data = JSON.parse(jsonStr);

      if (!data.userId || !data.email || !data.role || !data.exp) {
        return null;
      }

      if (typeof data.exp !== 'number' || !Number.isFinite(data.exp) || Date.now() >= data.exp) {
        return null; // Expired
      }

      return {
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        token: raw,
        expiresAt: data.exp,
      };
    }

    return null; // Unsigned legacy tokens are never authenticated.
  } catch {
    return null;
  }
}

/**
 * Validates request authorization and role permissions
 */
export function verifyStaffRole(
  req: Request,
  allowedRoles?: StaffRole[]
): { authorized: boolean; session: AuthSession | null; error?: string } {
  // Extract token from Authorization header or cookie
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token === 'null' || token === 'undefined' || token === '') {
    token = null;
  }

  // Check NextRequest .cookies object if available
  if (!token && 'cookies' in req && typeof (req as any).cookies?.get === 'function') {
    const cookieVal = (req as any).cookies.get('stg_session')?.value;
    if (cookieVal && cookieVal !== 'null' && cookieVal !== 'undefined') {
      token = cookieVal;
    }
  }

  // Check raw Cookie header
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)stg_session=([^;]+)/);
    if (match && match[1] && match[1] !== 'null' && match[1] !== 'undefined') {
      token = match[1];
    }
  }

  // Check URL query param fallback
  if (!token) {
    try {
      const url = new URL(req.url);
      const queryToken = url.searchParams.get('token');
      if (queryToken && queryToken !== 'null' && queryToken !== 'undefined') {
        token = queryToken;
      }
    } catch {}
  }

  let session = verifySessionToken(token);

  if (!session) {
    return { authorized: false, session: null, error: 'Unauthorized: Valid staff session required' };
  }

  // Super Admin always has full access
  if (session.role === 'Super Admin') {
    return { authorized: true, session };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      authorized: false,
      session,
      error: `Access Denied: Role '${session.role}' does not have permission for this operation. Required: [${allowedRoles.join(', ')}]`,
    };
  }

  return { authorized: true, session };
}
