/**
 * ==============================================================================
 * SRI TAYI GRAND - BACKEND RBAC GUARDS & DATA ISOLATION MIDDLEWARE
 * Enforces server-side Defense-in-Depth for all mutations and queries.
 * ==============================================================================
 */

import { NextResponse, NextRequest } from 'next/server';
import { verifySessionToken, AuthSession } from '@/lib/auth';
import {
  RoleEnum,
  Permission,
  normalizeRole,
  hasPermission,
  hasAnyPermission,
  isRoleAtLeast,
} from './types';
import { logAccessDenied, logSecurityAudit } from './audit-logger';

export interface RBACContext {
  session: AuthSession;
  role: RoleEnum;
  params?: any;
}

export type RBACHandler<T = any> = (
  req: NextRequest,
  context: RBACContext
) => Promise<NextResponse<T>> | NextResponse<T>;

export interface RBACOptions {
  roles?: (RoleEnum | string)[];
  minRole?: RoleEnum;
  permissions?: Permission | Permission[];
  requireAllPermissions?: boolean;
  resource?: string;
  actionName?: string;
}

/**
 * Extracts and verifies the cryptographic session from the incoming HTTP request.
 */
export function getAuthenticatedSession(req: Request): AuthSession | null {
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/stg_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    try {
      const url = new URL(req.url);
      const queryToken = url.searchParams.get('token');
      if (queryToken) token = queryToken;
    } catch {}
  }

  return verifySessionToken(token);
}

/**
 * Validates request authentication. Returns 401 response if unauthenticated.
 */
export function requireAuth(req: Request): {
  authorized: boolean;
  session: AuthSession | null;
  errorResponse?: NextResponse;
} {
  const session = getAuthenticatedSession(req);

  if (!session) {
    return {
      authorized: false,
      session: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Authentication Required: An active, cryptographically signed staff session is required.',
          code: 'UNAUTHENTICATED',
        },
        { status: 401 }
      ),
    };
  }

  return { authorized: true, session };
}

/**
 * Validates that the caller holds at least one of the allowed roles.
 */
export function requireRole(
  req: Request,
  allowedRoles: (RoleEnum | string)[]
): {
  authorized: boolean;
  session: AuthSession | null;
  errorResponse?: NextResponse;
} {
  const auth = requireAuth(req);
  if (!auth.authorized || !auth.session) {
    return auth;
  }

  const userRole = normalizeRole(auth.session.role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  // Super Admin always bypasses role restrictions
  if (userRole === 'SUPER_ADMIN' || normalizedAllowed.includes(userRole)) {
    return { authorized: true, session: auth.session };
  }

  // Privilege escalation attempt: Log security audit
  logAccessDenied(auth.session, 'ROLE_RESTRICTION', 'security', req);

  return {
    authorized: false,
    session: auth.session,
    errorResponse: NextResponse.json(
      {
        success: false,
        error: `Access Denied: Role '${auth.session.role}' is not authorized. Required: [${allowedRoles.join(', ')}]`,
        code: 'FORBIDDEN',
        userRole: auth.session.role,
      },
      { status: 403 }
    ),
  };
}

/**
 * Validates that the caller holds a specific fine-grained permission.
 */
export function requirePermission(
  req: Request,
  requiredPermission: Permission | Permission[],
  actionName: string = 'EXECUTE_MUTATION'
): {
  authorized: boolean;
  session: AuthSession | null;
  errorResponse?: NextResponse;
} {
  const auth = requireAuth(req);
  if (!auth.authorized || !auth.session) {
    return auth;
  }

  const userRole = normalizeRole(auth.session.role);

  // Super Admin always has full access
  if (userRole === 'SUPER_ADMIN') {
    return { authorized: true, session: auth.session };
  }

  const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  const hasAccess = perms.every((p) => hasPermission(userRole, p));

  if (!hasAccess) {
    logAccessDenied(auth.session, actionName, 'security', req);

    return {
      authorized: false,
      session: auth.session,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Access Denied: Missing required permission: ${perms.join(' AND ')}`,
          code: 'FORBIDDEN',
          requiredPermissions: perms,
          userRole: auth.session.role,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session: auth.session };
}

/**
 * Higher-Order Function (HOC) decorator to wrap Next.js Route Handlers with RBAC.
 */
export function withRBAC(options: RBACOptions, handler: RBACHandler) {
  return async (req: NextRequest, { params }: { params?: any } = {}) => {
    // 1. Authenticate caller
    const auth = requireAuth(req);
    if (!auth.authorized || !auth.session) {
      return auth.errorResponse!;
    }

    const session = auth.session;
    const userRole = normalizeRole(session.role);

    // 2. Check minimum role requirement if specified
    if (options.minRole && !isRoleAtLeast(userRole, options.minRole)) {
      logAccessDenied(session, options.actionName || 'MIN_ROLE_CHECK', 'security', req);
      return NextResponse.json(
        {
          success: false,
          error: `Access Denied: Requires minimum role '${options.minRole}'. Current role: '${session.role}'`,
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // 3. Check allowed roles list if specified
    if (options.roles && options.roles.length > 0) {
      const normalizedAllowed = options.roles.map(normalizeRole);
      if (userRole !== 'SUPER_ADMIN' && !normalizedAllowed.includes(userRole)) {
        logAccessDenied(session, options.actionName || 'ROLE_CHECK', 'security', req);
        return NextResponse.json(
          {
            success: false,
            error: `Access Denied: Role '${session.role}' not permitted for this route.`,
            code: 'FORBIDDEN',
          },
          { status: 403 }
        );
      }
    }

    // 4. Check granular permissions if specified
    if (options.permissions) {
      const perms = Array.isArray(options.permissions) ? options.permissions : [options.permissions];
      const hasPerms = options.requireAllPermissions !== false
        ? perms.every((p) => hasPermission(userRole, p))
        : perms.some((p) => hasPermission(userRole, p));

      if (userRole !== 'SUPER_ADMIN' && !hasPerms) {
        logAccessDenied(session, options.actionName || 'PERMISSION_CHECK', 'security', req);
        return NextResponse.json(
          {
            success: false,
            error: `Access Denied: Caller lacks required permission(s): ${perms.join(', ')}`,
            code: 'FORBIDDEN',
          },
          { status: 403 }
        );
      }
    }

    // 5. Execute guarded handler with verified session
    const resolvedParams = params ? await params : undefined;
    return handler(req, { session, role: userRole, params: resolvedParams });
  };
}

/**
 * ==============================================================================
 * ROW-LEVEL DATA ISOLATION (RLS / QUERY-LEVEL OWNERSHIP FILTERING)
 * Guarantees that Staff members can only query or mutate their assigned records.
 * ==============================================================================
 */

/**
 * Injects ownership or departmental constraints into queries executed by Staff.
 */
export function applyStaffDataIsolation<T extends Record<string, any>>(
  data: T[],
  session: AuthSession,
  options: {
    assignedToField?: keyof T;
    departmentField?: keyof T;
  } = {}
): T[] {
  const role = normalizeRole(session.role);

  // Super Admin and Manager have global visibility across all hotel records
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') {
    return data;
  }

  const assignedField = (options.assignedToField || 'assigned_staff_id') as keyof T;
  const deptField = (options.departmentField || 'department') as keyof T;

  // Filter records to only those assigned directly to this staff user or department
  return data.filter((item) => {
    const isAssigned = item[assignedField] === session.userId;
    const isDeptMatch = item[deptField] && item[deptField] === session.role;
    // Allow records unassigned (operational queue) or explicitly assigned
    const isUnassignedQueue = item[assignedField] === undefined || item[assignedField] === null;

    return isAssigned || isDeptMatch || isUnassignedQueue;
  });
}

/**
 * Generates an ORM / Database query predicate for row-level isolation
 */
export function getStaffScopeWhereClause(
  session: AuthSession,
  assignedToKey: string = 'assignedTo'
): Record<string, any> {
  const role = normalizeRole(session.role);

  if (role === 'SUPER_ADMIN' || role === 'MANAGER') {
    return {}; // Unrestricted global query
  }

  // Staff constraint: Only their own assignments or unassigned tickets
  return {
    OR: [
      { [assignedToKey]: session.userId },
      { [assignedToKey]: null },
    ],
  };
}
