/**
 * In-Memory Sliding-Window Rate Limiter
 * Provides thread-safe, self-cleaning rate limiting for authentication, payments, and public APIs.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of memoryStore.entries()) {
    const freshTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (freshTimestamps.length === 0) {
      memoryStore.delete(key);
    } else {
      record.timestamps = freshTimestamps;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Checks whether an action keyed by `key` exceeds `maxRequests` within `windowMs`.
 * @param key Unique identifier (e.g., `auth:192.168.1.1` or `booking:guest@email.com`)
 * @param maxRequests Maximum allowed hits within the window
 * @param windowMs Time window in milliseconds (default: 60 seconds)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  purgeExpiredEntries(windowMs);

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - record.timestamps.length,
  };
}

/**
 * Extracts a best-effort client IP from standard Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
