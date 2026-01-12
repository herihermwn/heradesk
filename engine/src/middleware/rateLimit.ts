/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter using sliding window algorithm
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyPrefix?: string;   // Prefix for the rate limit key
  message?: string;     // Custom error message
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 60,      // 60 requests per minute
  message: "Terlalu banyak request. Silakan coba lagi nanti.",
};

/**
 * Get client identifier from request
 */
function getClientId(req: Request): string {
  // Check for X-Forwarded-For header (behind proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Check for X-Real-IP header
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return "unknown";
}

/**
 * Rate limit middleware
 */
export function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (
    req: Request
  ): { success: true } | { success: false; response: Response } => {
    const clientId = getClientId(req);
    const key = config.keyPrefix
      ? `${config.keyPrefix}:${clientId}`
      : clientId;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // If no entry or expired, create new one
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
      return { success: true };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        success: false,
        response: Response.json(
          {
            success: false,
            message: config.message,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(entry.resetAt / 1000).toString(),
            },
          }
        ),
      };
    }

    return { success: true };
  };
}

/**
 * Pre-configured rate limiters for different use cases
 */

// Strict rate limit for login attempts (5 per minute)
export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: "login",
  message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.",
});

// Moderate rate limit for API endpoints (100 per minute)
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
  message: "Terlalu banyak request API. Silakan coba lagi nanti.",
});

// Relaxed rate limit for chat messages (30 per minute)
export const chatMessageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: "chat",
  message: "Anda mengirim pesan terlalu cepat. Harap tunggu sebentar.",
});

// Very strict rate limit for file uploads (10 per minute)
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: "upload",
  message: "Terlalu banyak upload. Silakan coba lagi nanti.",
});
