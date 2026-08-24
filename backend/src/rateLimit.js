const buckets = new Map();

function prune(bucket, windowMs) {
  const cutoff = Date.now() - windowMs;
  while (bucket.length && bucket[0] <= cutoff) bucket.shift();
}

/**
 * Lightweight in-memory rate limiter (per-process). Fine for MVP single-instance deploys.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 100,
  keyFn = (req) => req.ip,
  skip = () => false,
  message = 'Too many requests. Please try again later.',
} = {}) {
  return function rateLimit(req, res, next) {
    if (skip(req)) return next();

    const key = keyFn(req);
    if (!key) return next();

    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    prune(bucket, windowMs);

    if (bucket.length >= max) {
      const retryAfter = Math.ceil((bucket[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message },
      });
    }

    bucket.push(now);
    next();
  };
}

function isDev() {
  return (process.env.NODE_ENV || 'development') !== 'production';
}

const SKIP_PATHS = new Set([
  '/health',
  '/categories',
  '/notifications/unread-count',
]);

export function createAuthRateLimiter() {
  return createRateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || (isDev() ? '100' : '30'), 10),
    keyFn: (req) => `auth:${req.ip}`,
    message: 'Too many authentication attempts. Please wait and try again.',
  });
}

export function createApiRateLimiter() {
  return createRateLimiter({
    // Dev browsers poll notifications + HMR and can burn a tiny bucket quickly.
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (isDev() ? '60000' : '900000'), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isDev() ? '2000' : '800'), 10),
    keyFn: (req) => `api:${req.ip}`,
    skip: (req) => SKIP_PATHS.has(req.path) || req.path.startsWith('/categories/'),
  });
}
