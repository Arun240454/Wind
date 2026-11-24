import { ApiError } from '@/lib/api';

const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter, in memory and per server instance. There is no login, so this is
 * what keeps one visitor from running up the AI bill.
 */
export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait a minute and try again.');
  }
  recent.push(now);
  hits.set(key, recent);
}
