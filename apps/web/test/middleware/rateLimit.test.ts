import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Hono } from 'hono'

describe('Rate Limiting - Simple Integration Test', () => {
  beforeEach(() => {
    // Enable rate limiting for tests
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true')
    vi.stubEnv('RATE_LIMIT_AUTH_MAX', '3') // Small limit for faster tests
    vi.stubEnv('RATE_LIMIT_WINDOW', '60000') // 1 minute
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should import rate limit middleware without errors', async () => {
    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    expect(authRateLimit).toBeDefined()
    expect(typeof authRateLimit).toBe('function')
  })

  it('should create middleware that can be applied to routes', async () => {
    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    const app = new Hono()

    // This should not throw
    app.use('/api/test', authRateLimit())
    app.post('/api/test', c => c.json({ success: true }))

    // Make a request
    const res = await app.request('/api/test', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
    })

    expect(res.status).toBe(200)
  })

  it('should apply rate limiting when enabled', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true')
    vi.stubEnv('RATE_LIMIT_AUTH_MAX', '3')

    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    const app = new Hono()

    app.use('/api/test', authRateLimit())
    app.post('/api/test', c => c.json({ success: true }))

    const ip = '192.168.1.10'

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/api/test', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      })
      expect(res.status).toBe(200)
    }

    // 4th request should be rate limited
    const blockedRes = await app.request('/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
    })
    expect(blockedRes.status).toBe(429)

    // Check response includes proper error message and headers
    const body = await blockedRes.json()
    expect(body.error).toBeDefined()
    expect(body.retryAfter).toBeDefined()
    expect(blockedRes.headers.get('Retry-After')).toBeTruthy()
  })

  it('should include proper headers in 429 responses', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true')
    vi.stubEnv('RATE_LIMIT_AUTH_MAX', '2')

    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    const app = new Hono()

    app.use('/api/test', authRateLimit())
    app.post('/api/test', c => c.json({ success: true }))

    const ip = '203.0.113.99'

    // Exhaust limit
    for (let i = 0; i < 2; i++) {
      await app.request('/api/test', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      })
    }

    // Get rate limited response
    const res = await app.request('/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
    })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy()

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error).toContain('authentication')
    expect(body.retryAfter).toBeDefined()
  })

  it('should have different rate limiters for different categories', async () => {
    const {
      authRateLimit,
      photoProcessingRateLimit,
      billingRateLimit,
      generalApiRateLimit,
    } = await import('../../src/middleware/rateLimit')

    expect(authRateLimit).toBeDefined()
    expect(photoProcessingRateLimit).toBeDefined()
    expect(billingRateLimit).toBeDefined()
    expect(generalApiRateLimit).toBeDefined()

    // Verify they are all functions
    expect(typeof authRateLimit).toBe('function')
    expect(typeof photoProcessingRateLimit).toBe('function')
    expect(typeof billingRateLimit).toBe('function')
    expect(typeof generalApiRateLimit).toBe('function')
  })

  it('should extract IP from x-forwarded-for header', async () => {
    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    const app = new Hono()

    app.use('/api/test', authRateLimit())
    app.post('/api/test', c => c.json({ success: true }))

    // Make request with x-forwarded-for header
    const res = await app.request('/api/test', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.1',
      },
    })

    expect(res.status).toBe(200)
  })

  it('should handle x-forwarded-for with multiple IPs', async () => {
    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    const app = new Hono()

    app.use('/api/test', authRateLimit())
    app.post('/api/test', c => c.json({ success: true }))

    // Make request with multiple IPs (proxy chain)
    const res = await app.request('/api/test', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.2, 198.51.100.1, 192.0.2.1',
      },
    })

    expect(res.status).toBe(200)
  })

  it('should fallback to x-real-ip header', async () => {
    const { authRateLimit } = await import('../../src/middleware/rateLimit')
    const app = new Hono()

    app.use('/api/test', authRateLimit())
    app.post('/api/test', c => c.json({ success: true }))

    // Make request with x-real-ip instead of x-forwarded-for
    const res = await app.request('/api/test', {
      method: 'POST',
      headers: {
        'x-real-ip': '203.0.113.3',
      },
    })

    expect(res.status).toBe(200)
  })

  it('should handle missing IP address gracefully', async () => {
    const { generalApiRateLimit } = await import(
      '../../src/middleware/rateLimit'
    )
    const app = new Hono()

    app.use('/api/test', generalApiRateLimit())
    app.get('/api/test', c => c.json({ success: true }))

    // Make request without IP headers
    const res = await app.request('/api/test')

    expect(res.status).toBe(200)
  })
})
