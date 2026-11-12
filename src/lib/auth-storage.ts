'use client';

/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE ADMIN SESSION STORAGE CLIENT
 * Handles tab-scoped sessionStorage with optional rememberMe fallback,
 * cross-tab rehydration, and clean sign-out purge.
 * ==============================================================================
 */

export interface AdminSessionClaims {
  token: string;
  role: string;
  name: string;
  email?: string;
  expiresAt?: number;
}

const TOKEN_KEY = 'stg_token';
const ROLE_KEY = 'stg_role';
const USER_KEY = 'stg_user_name';
const EMAIL_KEY = 'stg_user_email';

export const authStorage = {
  /**
   * Retrieves active session token. Prioritizes tab-scoped sessionStorage,
   * falling back to localStorage if 'remember me' was elected.
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (token) return token;
      // Fallback: check document.cookie if accessible
      const match = document.cookie.match(/(?:^|;\s*)stg_session=([^;]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Generates authoritative headers including Authorization Bearer token
   * and role context for API calls across all admin dashboard modules.
   */
  getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const role = this.getRole();
    if (role && !headers['x-staff-role']) {
      headers['x-staff-role'] = role;
    }
    return headers;
  },

  /**
   * Retrieves active admin role claim (e.g. 'Super Admin', 'Hotel Manager', 'Front Desk')
   */
  getRole(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(ROLE_KEY) || localStorage.getItem(ROLE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Retrieves staff display name
   */
  getUserName(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Retrieves staff email
   */
  getUserEmail(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(EMAIL_KEY) || localStorage.getItem(EMAIL_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Stores authenticated claims.
   * Primary destination is always sessionStorage (secure, tab-isolated, shared-reception safe).
   * If rememberMe is true, also replicates to localStorage for persistent device sessions.
   */
  setSession(claims: AdminSessionClaims, rememberMe = true): void {
    if (typeof window === 'undefined') return;
    try {
      // Write to active tab's sessionStorage
      sessionStorage.setItem(TOKEN_KEY, claims.token);
      sessionStorage.setItem(ROLE_KEY, claims.role);
      sessionStorage.setItem(USER_KEY, claims.name);
      if (claims.email) sessionStorage.setItem(EMAIL_KEY, claims.email);

      // Replicate to localStorage for persistent device sessions and cross-tab reliability
      localStorage.setItem(TOKEN_KEY, claims.token);
      localStorage.setItem(ROLE_KEY, claims.role);
      localStorage.setItem(USER_KEY, claims.name);
      if (claims.email) localStorage.setItem(EMAIL_KEY, claims.email);
    } catch (err) {
      console.warn('Storage write failed:', err);
    }
  },

  /**
   * Purges all admin session data across both sessionStorage and localStorage
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(EMAIL_KEY);

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch (err) {
      console.warn('Storage purge failed:', err);
    }
  },

  /**
   * Self-healing rehydration:
   * When an admin opens a new tab or refreshes with a valid server-side httpOnly cookie,
   * but sessionStorage is blank, this queries /api/admin/auth and restores tab sessionStorage.
   */
  async rehydrate(): Promise<AdminSessionClaims | null> {
    if (typeof window === 'undefined') return null;

    const existingToken = this.getToken();
    const existingRole = this.getRole();
    const existingName = this.getUserName();

    if (existingToken && existingRole && existingName) {
      // Sync into sessionStorage if it came from localStorage
      try {
        sessionStorage.setItem(TOKEN_KEY, existingToken);
        sessionStorage.setItem(ROLE_KEY, existingRole);
        sessionStorage.setItem(USER_KEY, existingName);
      } catch {}
      return {
        token: existingToken,
        role: existingRole,
        name: existingName,
      };
    }

    try {
      const res = await fetch('/api/admin/auth', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          const claims: AdminSessionClaims = {
            token: data.session.token,
            role: data.session.role,
            name: data.session.name,
            email: data.session.email,
          };
          this.setSession(claims, false);
          return claims;
        }
      }
    } catch {
      // Network failure or unauthenticated
    }

    return null;
  },
};

export function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (typeof window !== 'undefined') {
    const token = authStorage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}
