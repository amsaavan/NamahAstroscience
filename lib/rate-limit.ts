// Extremely simple in-memory rate limiter
// Note: This resets on Vercel cold boots, but provides a basic layer of spam protection against bursts.

type RateLimitEntry = { count: number; expiresAt: number };

const store = new Map<string, RateLimitEntry>();

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  
  // Clean up expired entries periodically (naive approach)
  if (Math.random() < 0.01) {
    for (const [key, entry] of store.entries()) {
      if (now > entry.expiresAt) {
        store.delete(key);
      }
    }
  }

  const current = store.get(ip);
  if (!current || now > current.expiresAt) {
    store.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}
