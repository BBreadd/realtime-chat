const buckets = new Map();

/**
 * Token-bucket rate limiter factory.
 *
 * @param {{ maxTokens: number, refillRate: number }} options
 *   maxTokens   — burst capacity
 *   refillRate  — tokens added per second
 * @returns {import('express').RequestHandler}
 */
export function rateLimiter({ maxTokens = 60, refillRate = 10 } = {}) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!buckets.has(key)) {
      buckets.set(key, { tokens: maxTokens, lastRefill: now });
    }

    const bucket = buckets.get(key);
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many requests' });
    }

    bucket.tokens -= 1;
    next();
  };
}
