import { describe, it, expect } from 'vitest';
import { signSessionPayload, verifySessionToken, verifyStaffRole } from '../src/lib/auth';
import { verifyEdgeSession } from '../src/lib/auth-edge';

const claims = { userId: 'qa-user', email: 'qa@example.invalid', name: 'QA', role: 'Super Admin', exp: Date.now() + 60000 };

describe('Staff session trust boundary (no database or hardware)', () => {
  it('rejects an unsigned privileged session', () => {
    expect(verifySessionToken(Buffer.from(JSON.stringify(claims)).toString('base64'))).toBeNull();
  });
  it('rejects caller supplied staff role headers', () => {
    expect(verifyStaffRole(new Request('https://example.invalid/api/admin', { headers: { 'x-staff-role': 'Super Admin' } })).authorized).toBe(false);
  });
  it('rejects unauthenticated requests in development and test too', () => {
    expect(verifyStaffRole(new Request('https://example.invalid/api/admin')).authorized).toBe(false);
  });
  it('accepts correctly signed sessions with unchanged claims', () => {
    expect(verifySessionToken(signSessionPayload(claims))?.userId).toBe('qa-user');
  });
  it('rejects modified signatures and expired sessions', () => {
    expect(verifySessionToken(signSessionPayload(claims) + 'x')).toBeNull();
    expect(verifySessionToken(signSessionPayload({ ...claims, exp: Date.now() - 1000 }))).toBeNull();
  });
  it('rejects non-numeric expirations', () => {
    expect(verifySessionToken(signSessionPayload({ ...claims, exp: 'never' }))).toBeNull();
  });
  it('verifies identical signed claims at the page middleware boundary', async () => {
    expect(await verifyEdgeSession(signSessionPayload(claims))).toEqual({ role: 'Super Admin' });
    expect(await verifyEdgeSession(Buffer.from(JSON.stringify(claims)).toString('base64'))).toBeNull();
    expect(await verifyEdgeSession(signSessionPayload(claims) + 'x')).toBeNull();
    expect(await verifyEdgeSession(signSessionPayload({ ...claims, exp: 1 }))).toBeNull();
  });
});
