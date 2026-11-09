/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE SECURITY AUDIT LOGGER
 * Tracks sensitive operations, privilege escalations, and access attempts.
 * ==============================================================================
 */

import { repo } from '@/lib/db/repository';
import { AuthSession } from '@/lib/auth';
import { Resource } from './types';

export interface SecurityAuditParams {
  session?: AuthSession | null;
  action: string;
  resource: Resource | 'security' | 'auth' | 'system';
  resourceId?: string;
  details: string;
  status?: 'SUCCESS' | 'DENIED' | 'FAILED';
  ipAddress?: string;
  userAgent?: string;
  previousValue?: any;
  newValue?: any;
}

/**
 * Centrally records an immutable security audit event
 */
export function logSecurityAudit(params: SecurityAuditParams) {
  const userId = params.session?.userId || 'anonymous';
  const userName = params.session?.name || 'Unauthenticated Caller';
  const userRole = params.session?.role || 'Guest';

  // Construct structured audit record
  const logEntry = repo.recordAuditLog({
    userId,
    userName,
    userRole,
    action: params.action,
    entityType: (params.resource === 'security' || params.resource === 'system' || params.resource === 'auth')
      ? 'security'
      : (params.resource === 'bookings' || params.resource === 'customers' || params.resource === 'rooms')
      ? 'booking'
      : (params.resource === 'accounting' || params.resource === 'billing')
      ? 'accounting'
      : 'staff',
    entityId: params.resourceId || 'sys',
    details: `[${params.status || 'SUCCESS'}] ${params.details}${params.ipAddress ? ` | IP: ${params.ipAddress}` : ''}`,
    previousValue: params.previousValue,
    newValue: params.newValue,
  });

  return logEntry;
}

/**
 * Convenience helper to log access denials (privilege escalation attempts)
 */
export function logAccessDenied(
  session: AuthSession | null | undefined,
  attemptedAction: string,
  resource: Resource | 'security' | 'system',
  req?: Request
) {
  const ipAddress = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req?.headers.get('user-agent') || 'Unknown';

  return logSecurityAudit({
    session,
    action: `RBAC_ACCESS_DENIED:${attemptedAction.toUpperCase()}`,
    resource,
    details: `Unauthorized attempt by ${session ? `${session.email} (${session.role})` : 'unauthenticated caller'} to execute action '${attemptedAction}' on resource '${resource}'.`,
    status: 'DENIED',
    ipAddress,
    userAgent,
  });
}
