/** Verify the existing HMAC session format in the Edge runtime. */
export async function verifyEdgeSession(token: string): Promise<{ role: string } | null> {
  const secret = process.env.ADMIN_JWT_SECRET || 'sri_tayi_grand_secure_default_hmac_jwt_secret_kadiri_2026_enterprise';
  if (secret.length < 32) return null;
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const parts = raw.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, decode(signature), new TextEncoder().encode(payload))) return null;
    const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (!claims.userId || !claims.email || typeof claims.role !== 'string' ||
        typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= Date.now()) return null;
    return { role: claims.role };
  } catch {
    return null;
  }
}
