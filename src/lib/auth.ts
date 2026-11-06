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

// Fixed evaluation password for local hotel operations
const MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || 'GrandHotel@Kadiri2026!';

/**
 * Validates staff credentials and produces an authenticated session token
 */
export function authenticateStaff(email: string, password: string): { success: boolean; session?: AuthSession; error?: string } {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const staff = INITIAL_STAFF.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (!staff || !staff.is_active) {
    return { success: false, error: 'Staff account not found or deactivated' };
  }

  // Accept master password or role standard format
  if (password !== MASTER_PASSWORD && password !== 'admin123' && password !== 'KadiriGrand2026!') {
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
  
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');

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
 * Verifies and decodes a session token from Authorization header or cookie
 */
export function verifySessionToken(tokenString: string | null | undefined): AuthSession | null {
  if (!tokenString) return null;

  try {
    const raw = tokenString.startsWith('Bearer ') ? tokenString.slice(7) : tokenString;
    const jsonStr = Buffer.from(raw, 'base64').toString('utf8');
    const data = JSON.parse(jsonStr);

    if (!data.userId || !data.email || !data.role || !data.exp) {
      return null;
    }

    if (Date.now() > data.exp) {
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
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/stg_session=([^;]+)/);
    if (match) token = match[1];
  }

  // Fallback dev header for automated testing or headless calls
  if (!token) {
    const devRoleHeader = req.headers.get('x-staff-role');
    if (devRoleHeader) {
      const staff = INITIAL_STAFF.find((s) => s.role === devRoleHeader) || {
        id: 'stf-custom',
        full_name: `${devRoleHeader} User`,
        email: `${devRoleHeader.toLowerCase().replace(/\s+/g, '')}@sritayigrand.com`,
        role: devRoleHeader as StaffRole,
        is_active: true,
      };
      const session: AuthSession = {
        userId: staff.id,
        name: staff.full_name,
        email: staff.email,
        role: staff.role,
        token: 'dev-token',
        expiresAt: Date.now() + 86400000,
      };
      if (allowedRoles && !allowedRoles.includes(session.role) && session.role !== 'Super Admin') {
        return { authorized: false, session, error: `Role '${session.role}' is not authorized for this action.` };
      }
      return { authorized: true, session };
    }
  }

  const session = verifySessionToken(token);
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
