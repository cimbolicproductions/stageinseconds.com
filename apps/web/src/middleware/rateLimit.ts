import { rateLimiter } from 'hono-rate-limiter'
import type { Context, MiddlewareHandler } from 'hono'
import logger from '../utils/logger'

// Environment configuration
const isTest = process.env.NODE_ENV === 'test'
const isRateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false' && !isTest

// Rate limit windows and maximums (configurable via environment variables)
const RATE_LIMIT_WINDOW = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW || '60000',
  10
) // 1 minute
const AUTH_MAX_REQUESTS = Number.parseInt(
  process.env.RATE_LIMIT_AUTH_MAX || '5',
  10
)
const PHOTO_MAX_REQUESTS = Number.parseInt(
  process.env.RATE_LIMIT_PHOTO_MAX || '10',
  10
)
const BILLING_MAX_REQUESTS = Number.parseInt(
  process.env.RATE_LIMIT_BILLING_MAX || '20',
  10
)
const GENERAL_MAX_REQUESTS = Number.parseInt(
  process.env.RATE_LIMIT_GENERAL_MAX || '100',
  10
)

/**
 * Extract IP address from request, handling proxy headers correctly
 */
function getClientIp(c: Context): string {
  // Check x-forwarded-for header (for proxies like Vercel, Cloudflare)
  const forwardedFor = c.req.header('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  // Check x-real-ip header (alternative proxy header)
  const realIp = c.req.header('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to direct connection IP (not available in serverless)
  return 'unknown'
}

/**
 * Get user ID from authenticated session
 */
async function getUserId(c: Context): Promise<string | null> {
  try {
    // Get session from Auth.js
    const session = c.get('session')
    if (session?.user?.id) {
      return session.user.id
    }
  } catch {
    // Session not available
  }
  return null
}

/**
 * Custom rate limit handler that logs violations and returns proper response
 */
function createRateLimitHandler(limitType: string, customMessage?: string) {
  return async (c: Context) => {
    const requestId = c.get('requestId')
    const ip = getClientIp(c)
    const userId = await getUserId(c)
    const endpoint = c.req.path

    // Log rate limit violation
    logger.warn(
      {
        requestId,
        ip,
        userId,
        endpoint,
        limitType,
      },
      'Rate limit exceeded'
    )

    // Calculate retry after (window in seconds)
    const retryAfterSeconds = Math.ceil(RATE_LIMIT_WINDOW / 1000)

    // Return 429 response with appropriate headers
    return c.json(
      {
        error: customMessage || 'Too many requests. Please try again later.',
        retryAfter: retryAfterSeconds,
      },
      429,
      {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Reset': String(
          Math.floor((Date.now() + RATE_LIMIT_WINDOW) / 1000)
        ),
      }
    )
  }
}

/**
 * Authentication rate limiter - 5 requests per minute per IP
 * Protects against brute force attacks on login/signup endpoints
 */
export function authRateLimit(): MiddlewareHandler {
  if (!isRateLimitEnabled) {
    return async (c, next) => next()
  }

  return rateLimiter({
    windowMs: RATE_LIMIT_WINDOW,
    limit: AUTH_MAX_REQUESTS,
    standardHeaders: 'draft-6',
    keyGenerator: c => getClientIp(c),
    handler: createRateLimitHandler(
      'authRateLimit',
      'Too many authentication attempts. Please try again in 1 minute.'
    ),
  })
}

/**
 * Photo processing rate limiter - 10 requests per minute per user
 * Protects expensive photo processing operations from abuse
 */
export function photoProcessingRateLimit(): MiddlewareHandler {
  if (!isRateLimitEnabled) {
    return async (c, next) => next()
  }

  return rateLimiter({
    windowMs: RATE_LIMIT_WINDOW,
    limit: PHOTO_MAX_REQUESTS,
    standardHeaders: 'draft-6',
    keyGenerator: async c => {
      const userId = await getUserId(c)
      // If authenticated, use userId, otherwise fall back to IP
      return userId || getClientIp(c)
    },
    handler: createRateLimitHandler(
      'photoProcessingRateLimit',
      'Too many photo processing requests. Please try again in 1 minute.'
    ),
  })
}

/**
 * Billing rate limiter - 20 requests per minute per user/IP
 * Protects payment endpoints from abuse
 */
export function billingRateLimit(): MiddlewareHandler {
  if (!isRateLimitEnabled) {
    return async (c, next) => next()
  }

  return rateLimiter({
    windowMs: RATE_LIMIT_WINDOW,
    limit: BILLING_MAX_REQUESTS,
    standardHeaders: 'draft-6',
    keyGenerator: async c => {
      const userId = await getUserId(c)
      // If authenticated, use userId, otherwise fall back to IP
      return userId || getClientIp(c)
    },
    handler: createRateLimitHandler(
      'billingRateLimit',
      'Too many billing requests. Please try again in 1 minute.'
    ),
  })
}

/**
 * General API rate limiter - 100 requests per minute per IP
 * Provides baseline protection for all API endpoints
 */
export function generalApiRateLimit(): MiddlewareHandler {
  if (!isRateLimitEnabled) {
    return async (c, next) => next()
  }

  return rateLimiter({
    windowMs: RATE_LIMIT_WINDOW,
    limit: GENERAL_MAX_REQUESTS,
    standardHeaders: 'draft-6',
    keyGenerator: c => getClientIp(c),
    handler: createRateLimitHandler(
      'generalApiRateLimit',
      'Too many requests. Please try again in 1 minute.'
    ),
  })
}
