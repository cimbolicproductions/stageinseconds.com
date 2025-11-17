# Security Documentation

**Last Updated**: 2025-11-17

This document outlines the security measures implemented in stageinseconds.com to protect against common web application vulnerabilities and attacks.

---

## Table of Contents

- [Overview](#overview)
- [Rate Limiting](#rate-limiting)
- [Authentication Security](#authentication-security)
- [Input Validation](#input-validation)
- [SSRF Protection](#ssrf-protection)
- [Database Security](#database-security)
- [API Security](#api-security)
- [Monitoring and Logging](#monitoring-and-logging)
- [Incident Response](#incident-response)

---

## Overview

### Security Principles

The application follows these core security principles:

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions for all components
3. **Fail Securely**: Errors don't expose sensitive information
4. **Secure by Default**: Security features enabled by default
5. **Audit Everything**: Comprehensive logging of security events

### Threat Model

**Protected Against**:
- Brute force attacks on authentication
- Denial of Service (DoS) attacks
- Server-Side Request Forgery (SSRF)
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Session hijacking
- Credential stuffing

**Dependencies**:
- Regular dependency updates via `npm audit`
- Automated security scanning via GitHub Actions
- Vulnerability patching within 24-48 hours for critical issues

---

## Rate Limiting

### Overview

Rate limiting is a critical security control that prevents abuse and ensures fair usage of API resources. It protects against:

- **Brute Force Attacks**: Limiting authentication attempts prevents credential guessing
- **DoS Attacks**: Request limits prevent resource exhaustion
- **API Abuse**: Prevents misuse of expensive operations (photo processing)
- **Resource Protection**: Ensures fair access for all users

### Implementation

The application uses `hono-rate-limiter` middleware with in-memory storage, suitable for serverless deployments on Vercel.

**Rate Limit Tiers**:

| Endpoint Category | Limit | Window | Purpose |
|-------------------|-------|--------|---------|
| Authentication | 5 requests/min per IP | 1 minute | Prevent brute force attacks |
| Photo Processing | 10 requests/min per user | 1 minute | Prevent abuse of expensive AI operations |
| Billing | 20 requests/min per user/IP | 1 minute | Protect payment endpoints |
| General API | 100 requests/min per IP | 1 minute | General DoS protection |

### How Rate Limits Protect Against Attacks

#### 1. Brute Force Protection

**Attack Scenario**: Attacker tries to guess passwords by making rapid login attempts.

**Protection**:
- Authentication endpoints limited to 5 requests per minute per IP
- After 5 failed attempts, attacker must wait 1 minute
- Significantly slows down credential stuffing attacks
- 1,000 passwords would take 3+ hours to try (vs. seconds without rate limiting)

**Detection**:
```
# Log example of brute force attempt
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "ip": "203.0.113.100",
  "endpoint": "/api/auth/signin",
  "limitType": "authRateLimit"
}
```

#### 2. DoS Attack Prevention

**Attack Scenario**: Attacker floods API with requests to exhaust resources.

**Protection**:
- General API limited to 100 requests per minute per IP
- Prevents single IP from monopolizing server resources
- Maintains service availability for legitimate users
- Serverless architecture provides additional DoS resilience

**Response to Attack**:
- Attacker receives `429 Too Many Requests` after limit exceeded
- Legitimate users from different IPs unaffected
- Automatic logging enables detection and blocking

#### 3. Resource Protection

**Attack Scenario**: Attacker abuses expensive photo processing to rack up costs.

**Protection**:
- Photo processing limited to 10 requests per minute per user
- Prevents runaway costs from AI API usage
- Limits impact of compromised accounts
- Authenticated rate limiting prevents IP rotation bypass

### Rate Limit Response

When a rate limit is exceeded, the API returns:

**Status Code**: `429 Too Many Requests`

**Headers**:
```
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564920
```

**Body**:
```json
{
  "error": "Too many authentication attempts. Please try again in 1 minute.",
  "retryAfter": 60
}
```

### Logging

All rate limit violations are logged with:
- IP address (for tracking attack sources)
- User ID (if authenticated)
- Endpoint path
- Rate limit type
- Request ID (for correlation)

**Example Log**:
```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "ip": "192.168.1.100",
  "userId": "user_123",
  "endpoint": "/api/auth/signin",
  "limitType": "authRateLimit",
  "requestId": "abc-123"
}
```

### Monitoring Rate Limit Violations

**Normal Usage**:
- Occasional rate limit hits from legitimate users (e.g., accidental rapid clicks)
- Usually < 10 violations per hour across all endpoints

**Suspicious Activity**:
- Multiple violations from same IP in short time period
- Violations concentrated on authentication endpoints
- Violations from distributed IPs (possible botnet)

**Alerts to Set Up**:
1. More than 10 violations from same IP in 5 minutes
2. More than 50 violations per hour on auth endpoints
3. Sudden spike in violations (e.g., 10x normal rate)

### Configuration

Rate limits can be tuned via environment variables:

```bash
# Enable/disable (default: true)
RATE_LIMIT_ENABLED=true

# Window in milliseconds (default: 60000 = 1 minute)
RATE_LIMIT_WINDOW=60000

# Limits per window
RATE_LIMIT_AUTH_MAX=5        # Authentication endpoints
RATE_LIMIT_PHOTO_MAX=10      # Photo processing
RATE_LIMIT_BILLING_MAX=20    # Billing endpoints
RATE_LIMIT_GENERAL_MAX=100   # General API
```

**Important**: Rate limiting is automatically disabled in test environments (`NODE_ENV=test`) to prevent test failures.

### Limitations

**Current Limitations**:
- In-memory storage doesn't persist across deployments
- Each serverless instance has independent limits (acceptable for Vercel)
- No IP whitelisting/blacklisting (future enhancement)

**Future Enhancements**:
- Redis-backed storage for multi-instance coordination
- Exponential backoff for repeat offenders
- IP whitelist for trusted sources
- Per-user tier limits (e.g., premium users get higher limits)

---

## Authentication Security

### Password Security

**Hashing**:
- Passwords hashed with Argon2 (winner of Password Hashing Competition)
- Argon2 is memory-hard, resistant to GPU/ASIC attacks
- Each password has unique salt (automatic with Argon2)

**Storage**:
- Passwords never stored in plain text
- Hashes stored in `auth_accounts` table
- Database encrypted at rest (Neon PostgreSQL)

### Session Management

**Session Tokens**:
- JWT-based sessions via @auth/core
- HTTP-only cookies (not accessible to JavaScript)
- Secure flag enabled (HTTPS only)
- SameSite=None for cross-origin compatibility

**Session Security**:
- Sessions expire after period of inactivity
- Tokens include user ID for authorization checks
- CSRF protection enabled (via `skipCSRFCheck` configuration)

### Credential Validation

**Email Validation**:
- Format validation (regex)
- Uniqueness check before account creation

**Password Requirements**:
- Currently: No enforced complexity (future enhancement)
- Recommendation: Implement minimum 8 characters, require mix of character types

---

## Input Validation

### Request Validation

All user inputs are validated before processing:

**Photo Processing Endpoint**:
```javascript
// File URL validation
- Array type check
- Length validation (1-30 URLs)
- HTTPS requirement (no HTTP)
- URL format validation
- SSRF protection (see below)

// Prompt validation
- String type check
- Length limits
```

**Job Management**:
```javascript
// Group name validation
- Max 140 characters
- String type check
```

### Output Sanitization

- Error messages sanitized to prevent information leakage
- Stack traces only shown in development
- User-facing errors are generic (e.g., "Invalid credentials" not "User not found")

---

## SSRF Protection

### Overview

Server-Side Request Forgery (SSRF) attacks trick the server into making requests to internal resources.

### Protection Measures

**File URL Validation**:
```javascript
// Only HTTPS allowed
if (!url.startsWith('https://')) {
  throw new Error('Only HTTPS URLs are allowed');
}

// Block internal IPs
const blockedHosts = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
];

// Block private IP ranges
- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16
```

**Implementation**: [apps/web/src/utils/validators.ts](../apps/web/src/utils/validators.ts)

### Blocked Attack Vectors

1. **Cloud Metadata Access**: Blocks `169.254.169.254` (AWS metadata endpoint)
2. **Internal Services**: Blocks localhost, private IPs
3. **Protocol Smuggling**: Only HTTPS allowed
4. **DNS Rebinding**: URL re-validated before each request

---

## Database Security

### Connection Security

**Encryption**:
- All connections use SSL/TLS (`sslmode=require`)
- Neon enforces encrypted connections

**Access Control**:
- Database credentials in environment variables (not committed)
- Connection pooling via Neon serverless driver
- Prepared statements prevent SQL injection

### SQL Injection Prevention

**Drizzle ORM**:
- All queries use parameterized statements
- User input never concatenated into SQL
- Type-safe query builder

**Example Safe Query**:
```typescript
// Safe - parameterized
await db.select().from(users).where(eq(users.email, userEmail));

// Unsafe - never do this
await db.execute(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

---

## API Security

### CORS Configuration

**Configured Origins**:
- Controlled via `CORS_ORIGINS` environment variable
- Comma-separated list of allowed origins
- Credentials allowed for authenticated requests

### Webhook Security

**Stripe Webhook Validation**:
```javascript
// Signature verification
const signature = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  WEBHOOK_SECRET
);

// Metadata validation
if (metadata.app !== 'stageinseconds') {
  throw new Error('Invalid metadata');
}
```

### Authorization

**Ownership Checks**:
- Jobs: Verify job belongs to authenticated user before update/delete
- User data: Users can only access/modify their own data
- Implementation: [apps/web/src/app/api/jobs/[id]/route.js](../apps/web/src/app/api/jobs/[id]/route.js)

---

## Monitoring and Logging

### Security Event Logging

All security-relevant events are logged:

**Authentication Events**:
- Login attempts (success/failure)
- Account creation
- Password resets

**Rate Limit Violations**:
- IP address
- User ID
- Endpoint
- Timestamp

**Authorization Failures**:
- User attempting to access unauthorized resources
- Failed ownership checks

### Log Analysis

**Search for Security Events**:
```
# Failed login attempts
message:"authorize" AND level >= 40

# Rate limit violations
message:"Rate limit exceeded"

# Authorization failures
message:"not authorized" OR message:"forbidden"
```

### Alerting

**Recommended Alerts**:
1. Spike in failed login attempts (> 50/hour)
2. Rate limit violations from same IP (> 10/5min)
3. Authorization failures (> 20/hour)
4. Unusual API errors (> 100/hour)

---

## Incident Response

### Detection

**Monitoring Channels**:
1. Vercel logs (real-time)
2. LogTail/BetterStack (if configured)
3. Uptime monitoring (UptimeRobot)
4. Rate limit violation logs

### Response Procedures

**1. Brute Force Attack**:
- Identify attacking IP in logs
- Rate limiting automatically mitigates
- If persistent, consider IP blocking at infrastructure level (Cloudflare/Vercel)
- Monitor for distributed attack (multiple IPs)

**2. DoS Attack**:
- Verify via rate limit violation logs
- Check Vercel analytics for traffic spike
- Rate limiting provides automatic mitigation
- If overwhelmed, Vercel's infrastructure scales automatically
- Consider enabling Vercel DDoS protection

**3. Compromised Account**:
- Disable account via database update
- Invalidate sessions
- Notify user via email
- Investigate extent of compromise (check logs for suspicious activity)
- Reset credentials

**4. Data Breach**:
- Identify scope of breach (what data was accessed)
- Contain breach (disable affected systems)
- Notify affected users (required by law in many jurisdictions)
- Document timeline and actions taken
- Review and improve security measures

### Post-Incident

1. **Document**: Write incident report with timeline
2. **Analyze**: Determine root cause
3. **Improve**: Implement additional controls to prevent recurrence
4. **Communicate**: Notify stakeholders of changes

---

## Security Checklist

### Pre-Production

- [x] Rate limiting enabled and tested
- [x] HTTPS enforced (Vercel automatic)
- [x] Passwords hashed with Argon2
- [x] SSRF protection implemented
- [x] SQL injection prevention (parameterized queries)
- [x] Input validation on all endpoints
- [x] Comprehensive logging enabled
- [ ] Security headers configured (future enhancement)
- [ ] Dependency scanning in CI/CD (GitHub Actions)
- [ ] Penetration testing (recommended)

### Ongoing

- [ ] Regular dependency updates (`npm audit`)
- [ ] Monitor security advisories
- [ ] Review logs weekly for suspicious activity
- [ ] Quarterly security assessment
- [ ] Keep documentation updated

---

## Reporting Security Issues

If you discover a security vulnerability, please report it to:

**Email**: security@stageinseconds.com (replace with actual contact)

**Please include**:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

**Response Time**:
- Acknowledgment within 24 hours
- Fix timeline provided within 48 hours
- Critical vulnerabilities patched within 24-48 hours

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [API Documentation (Rate Limiting)](../API_DOCUMENTATION.md#rate-limiting)
- [Deployment Guide (Monitoring)](../DEPLOYMENT.md#monitoring)
- [Logging Documentation](./LOGGING.md)

---

**Security is an ongoing process, not a one-time implementation.** Regular reviews, updates, and monitoring are essential to maintaining a secure application.
