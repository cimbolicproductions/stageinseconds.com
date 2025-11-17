# API Documentation

**Last Updated**: 2025-11-09
**Base URL**: `https://stageinseconds.com` (production) or `http://localhost:4000` (development)

This document provides comprehensive documentation for all API endpoints in the stageinseconds.com application.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Request Validation](#request-validation)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Billing](#billing-endpoints)
  - [Photo Processing](#photo-processing-endpoints)
  - [Job Management](#job-management-endpoints)
  - [User Management](#user-management-endpoints)
  - [Admin](#admin-endpoints)

---

## Overview

### API Architecture

- **Framework**: Hono (lightweight web framework)
- **Authentication**: @auth/core with JWT sessions
- **Database**: PostgreSQL via Neon Serverless
- **Response Format**: JSON
- **Request Format**: JSON (with `Content-Type: application/json`)

### Base Response Structure

**Success**:
```json
{
  "data": { ... },
  "status": "success"
}
```

**Error**:
```json
{
  "error": "Error message description",
  "status": "error"
}
```

---

## Authentication

All endpoints (except public routes) require authentication via session cookies.

### Session Cookie

Name: `authjs.session-token` (or platform-specific)
- Set automatically on sign-in/sign-up
- HTTP-only, Secure, SameSite=None
- Expires based on session expiration

### Protected Routes

Routes requiring authentication return `401 Unauthorized` if no valid session exists.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 502 | Bad Gateway | External service (AI, Stripe) failed |

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "details": "Optional additional context"
}
```

---

## Request Validation

All API endpoints use **Zod** for type-safe request validation. Invalid requests receive a `400 Bad Request` response with detailed field-level error information.

### Validation Error Response

When a request fails validation, the API returns:

**Status Code**: `400 Bad Request`

**Response Body**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Common Validation Rules

#### Email Validation
- Must be a valid email format
- Maximum 255 characters
- Automatically converted to lowercase
- Leading/trailing whitespace not allowed

#### Password Validation (Sign Up)
- Minimum 8 characters
- Maximum 128 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number

#### Password Validation (Sign In)
- Minimum 1 character (any password)
- Maximum 128 characters

#### URL Validation (File URLs)
- Must use HTTPS protocol only (HTTP rejected)
- Must not point to private/internal resources (SSRF protection):
  - No localhost, 127.0.0.1, 0.0.0.0, ::1
  - No private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  - No cloud metadata endpoints (169.254.169.254)

#### Array Validation (File URLs)
- Minimum 1 item required
- Maximum 30 items allowed

#### String Length Validation
- **Prompt**: Maximum 500 characters (optional)
- **Group Name**: Maximum 140 characters (optional)
- **Name**: Maximum 100 characters (optional)

#### Number Validation
- **Quantity** (billing): Integer, 1-500 range

---

## Rate Limiting

**Current Status**: Implemented with configurable limits

All API endpoints are protected by rate limiting to prevent abuse and ensure fair usage. Rate limits are enforced per IP address for unauthenticated endpoints and per user ID for authenticated endpoints.

### Rate Limit Tiers

| Endpoint Category | Limit | Window | Key | Endpoints |
|-------------------|-------|--------|-----|-----------|
| Authentication | 5 requests | 1 minute | IP Address | `/api/auth/signin`, `/api/auth/signup`, `/api/auth/send-verification` |
| Photo Processing | 10 requests | 1 minute | User ID (or IP) | `/api/process-photos` |
| Billing | 20 requests | 1 minute | User ID (or IP) | `/api/billing/create-checkout`, `/api/billing/stripe-webhook` |
| General API | 100 requests | 1 minute | IP Address | All other `/api/*` endpoints |

### Rate Limit Response

When you exceed the rate limit, the API returns a `429 Too Many Requests` response:

**Status Code**: `429 Too Many Requests`

**Headers**:
```
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564920
```

**Response Body**:
```json
{
  "error": "Too many authentication attempts. Please try again in 1 minute.",
  "retryAfter": 60
}
```

### Rate Limit Headers

All API responses include rate limit headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the window
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets
- `Retry-After`: (Only on 429 responses) Seconds to wait before retrying

### Handling Rate Limits in Client Code

**Best Practices**:

1. **Check rate limit headers** in all responses to track remaining requests
2. **Implement exponential backoff** when receiving 429 responses
3. **Respect the Retry-After header** before making another request
4. **Distribute requests evenly** instead of bursting all at once

**Example Client Code** (JavaScript):

```javascript
async function makeApiRequest(url, options) {
  const response = await fetch(url, options);

  // Check if rate limited
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeApiRequest(url, options);
  }

  // Log remaining requests
  const remaining = response.headers.get('X-RateLimit-Remaining');
  console.log(`Requests remaining: ${remaining}`);

  return response;
}
```

### Rate Limit Configuration

Rate limits can be configured via environment variables:

```bash
# Enable/disable rate limiting (default: true, false in test environment)
RATE_LIMIT_ENABLED=true

# Rate limit window in milliseconds (default: 60000 = 1 minute)
RATE_LIMIT_WINDOW=60000

# Maximum requests per window for each tier
RATE_LIMIT_AUTH_MAX=5        # Authentication endpoints
RATE_LIMIT_PHOTO_MAX=10      # Photo processing
RATE_LIMIT_BILLING_MAX=20    # Billing endpoints
RATE_LIMIT_GENERAL_MAX=100   # General API endpoints
```

### IP Address Detection

Rate limiting uses the following priority for IP address detection:

1. `x-forwarded-for` header (first IP in list) - for proxied requests (Vercel, Cloudflare)
2. `x-real-ip` header - alternative proxy header
3. `unknown` - fallback if no IP can be determined

### Security Considerations

1. **Brute Force Protection**: Authentication endpoints are strictly limited (5/min) to prevent credential stuffing and brute force attacks
2. **Resource Protection**: Photo processing is limited (10/min) to prevent abuse of expensive AI operations
3. **DoS Prevention**: General API rate limit (100/min) protects against denial of service attacks
4. **Logging**: All rate limit violations are logged with IP address, user ID, and endpoint for monitoring

### Test Environment

Rate limiting is **automatically disabled** in test environments (`NODE_ENV=test`) to prevent interference with automated tests. In production, rate limiting is always enabled unless explicitly disabled via `RATE_LIMIT_ENABLED=false`.

---

## Endpoints

---

## Authentication Endpoints

### POST /api/auth/signin

Authenticate a user with email and password.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

Sets session cookie automatically.

**Error Responses**:
- `401`: Invalid credentials
- `400`: Missing email or password

**Example**:
```bash
curl -X POST https://stageinseconds.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

---

### POST /api/auth/signup

Create a new user account.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Doe" // optional
}
```

**Success Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "Jane Doe"
  }
}
```

**Error Responses**:
- `400`: Email already exists
- `400`: Invalid email format
- `400`: Password too weak (if validation added)

**Notes**:
- Password is hashed with Argon2 before storage
- Email must be unique
- Session cookie is set automatically

---

### POST /api/auth/signout

Sign out the current user.

**Authentication**: Required

**Request Body**: None

**Success Response** (200):
```json
{
  "status": "success"
}
```

Clears session cookie.

---

### POST /api/auth/send-verification

Send email verification link (not fully implemented).

**Authentication**: Required

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Status**: Endpoint exists but email sending not implemented

---

### POST /api/auth/request-password-reset

Request password reset email (not fully implemented).

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Status**: Endpoint exists but email sending not implemented

---

### POST /api/auth/reset-password

Reset password with token (not fully implemented).

**Authentication**: Not required

**Request Body**:
```json
{
  "token": "reset-token-here",
  "newPassword": "NewSecurePassword123!"
}
```

**Status**: Endpoint exists but not fully functional

---

## Billing Endpoints

### GET /api/billing/products

Get available credit packages and pricing.

**Authentication**: Not required (public pricing)

**Query Parameters**: None

**Success Response** (200):
```json
{
  "offers": [
    {
      "id": "price_1234567890",
      "lookupKey": "PAYG_IMAGE_CREDIT",
      "currency": "usd",
      "unitAmount": 100,
      "productName": "Pay as you go",
      "metadata": {
        "app": "stageinseconds",
        "type": "payg",
        "credits_per_unit": "1"
      }
    },
    {
      "id": "price_0987654321",
      "lookupKey": "PACK_20_CREDITS",
      "currency": "usd",
      "unitAmount": 1800,
      "productName": "20‑photo pack",
      "metadata": {
        "app": "stageinseconds",
        "type": "pack",
        "credits_per_unit": "20"
      }
    }
  ]
}
```

**Notes**:
- Prices are in cents (e.g., 100 = $1.00, 1800 = $18.00)
- Available packages:
  - Pay as you go: $1.00 per photo
  - 20-photo pack: $18.00 (10% discount)
  - 50-photo pack: $40.00 (20% discount)
  - 100-photo pack: $75.00 (25% discount)

---

### POST /api/billing/create-checkout

Create a Stripe checkout session for purchasing credits.

**Authentication**: Required

**Request Body**:
```json
{
  "lookupKey": "PACK_20_CREDITS",
  "quantity": 1,
  "redirectURL": "/upload" // optional, defaults to /upload
}
```

**Success Response** (200):
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Error Responses**:
- `401`: Not authenticated
- `400`: Invalid lookupKey
- `400`: Price not found
- `400`: Price metadata validation failed (security check)

**Security**:
- Validates price belongs to app via metadata check
- Prevents checkout for unmanaged prices

**Example**:
```bash
curl -X POST https://stageinseconds.com/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"lookupKey":"PACK_20_CREDITS","quantity":1}'
```

**Notes**:
- Redirects user to Stripe-hosted checkout page
- After payment, Stripe redirects to `redirectURL` with `?session_id=...`
- Webhook handles credit addition asynchronously

---

### POST /api/billing/stripe-webhook

Stripe webhook handler for payment events.

**Authentication**: Stripe signature verification

**Headers**:
```
stripe-signature: t=timestamp,v1=signature
```

**Request Body**: Stripe webhook event (JSON)

**Handled Events**:
- `checkout.session.completed` - Payment successful, add credits

**Success Response** (200):
```json
{
  "received": true
}
```

**Error Responses**:
- `400`: Invalid signature
- `400`: Metadata validation failed (security)

**Security**:
- Verifies Stripe signature to prevent spoofing
- Checks metadata `app: "stageinseconds"` to prevent cross-app credit grants
- Prevents duplicate credit grants via `stripe_session_id` uniqueness in `purchases` table

**Implementation Details**:
1. Verifies webhook signature
2. Checks if session already processed (duplicate prevention)
3. Adds credits to `user_credits` table via upsert
4. Records purchase in `purchases` table
5. Returns success

---

### GET /api/billing/me

Get current user's credit balance.

**Authentication**: Required

**Query Parameters**: None

**Success Response** (200):
```json
{
  "authenticated": true,
  "freeUsed": 0,
  "credits": 50.00
}
```

**Unauthenticated Response** (200):
```json
{
  "authenticated": false,
  "freeUsed": 0,
  "credits": 0
}
```

**Notes**:
- `credits` is a decimal (e.g., 50.00 = $50.00 in credits)
- `freeUsed` tracks free trial usage (not currently implemented)

---

### POST /api/billing/create-customer-portal-session

Create Stripe customer portal session for managing billing.

**Authentication**: Required

**Request Body**: None or optional redirect URL

**Success Response** (200):
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

**Notes**: Allows users to view invoices, update payment methods, etc.

---

## Photo Processing Endpoints

### POST /api/process-photos

Process photos with AI enhancement.

**Authentication**: Required

**Request Body**:
```json
{
  "fileUrls": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "prompt": "Modern living room with natural lighting"
}
```

**Validation Rules**:
- `fileUrls`: Array of 1-30 HTTPS URLs
  - Must use HTTPS (not HTTP)
  - Cannot be localhost, 127.0.0.1, or private IPs (SSRF protection)
  - Must be valid URLs
- `prompt`: String, max length not enforced but recommended < 500 chars

**Success Response** (200):
```json
{
  "status": "completed",
  "downloadUrl": "https://storage.example.com/job-123.zip",
  "jobId": 123,
  "cost": 5.00,
  "photoCount": 5
}
```

**Error Responses**:
- `401`: Not authenticated
- `400`: Invalid file URLs (validation failure)
- `400`: HTTP URL not allowed (SSRF protection)
- `400`: Localhost/private IP not allowed (SSRF protection)
- `400`: More than 30 files
- `400`: File too large (> 15MB per file)
- `400`: Invalid file type (must be image)
- `502`: Google Gemini API error
- `500`: Internal server error

**Security Features**:
1. **SSRF Protection**:
   - Only HTTPS URLs allowed
   - Blocks localhost, 127.0.0.1, 0.0.0.0
   - Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x)
   - URL validation with multiple checks

2. **File Validation**:
   - Content-Type verification
   - File size limit enforcement (15MB)
   - Downloads files to verify they're accessible

3. **Input Sanitization**:
   - Array type checking
   - String validation
   - Length limits

**Processing Flow**:
1. Validates authentication and input
2. Downloads images from provided URLs
3. Sends to Google Gemini API for processing
4. Creates ZIP file with results
5. Uploads ZIP to storage
6. Creates job record in database
7. Returns download URL

**Example**:
```bash
curl -X POST https://stageinseconds.com/api/process-photos \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "fileUrls": ["https://example.com/room.jpg"],
    "prompt": "Modern living room"
  }'
```

**File Location**: [apps/web/src/app/api/process-photos/route.js:96](apps/web/src/app/api/process-photos/route.js) (640 lines, most complex endpoint)

---

### POST /api/upload

Upload photos to temporary storage before processing.

**Authentication**: Required

**Request Body**: FormData with files

**Success Response** (200):
```json
{
  "urls": [
    "https://api.createanything.com/uploads/file1.jpg",
    "https://api.createanything.com/uploads/file2.jpg"
  ]
}
```

**Notes**:
- Uses external service (`api.createanything.com`) for file uploads
- Returns URLs that can be passed to `/api/process-photos`

---

## Job Management Endpoints

### GET /api/dashboard

Get user's dashboard data including jobs and statistics.

**Authentication**: Required

**Query Parameters**:
- `id` (optional): Get specific job by ID

**Success Response - All Jobs** (200):
```json
{
  "jobs": [
    {
      "id": 123,
      "prompt": "Modern living room",
      "photo_count": 5,
      "cost": 5.00,
      "status": "completed",
      "download_url": "https://storage.example.com/job-123.zip",
      "created_at": "2025-01-09T12:00:00Z",
      "updated_at": "2025-01-09T12:05:00Z",
      "group_name": "Downtown Apartment"
    }
  ],
  "stats": {
    "total_jobs": 10,
    "total_spent": 50.00,
    "this_month_spent": 25.00
  },
  "credits": {
    "free_used": 0,
    "credits": 45.00
  }
}
```

**Success Response - Single Job** (200):
```json
{
  "job": {
    "id": 123,
    "prompt": "Modern living room",
    "photo_count": 5,
    "cost": 5.00,
    "status": "completed",
    "download_url": "https://storage.example.com/job-123.zip",
    "created_at": "2025-01-09T12:00:00Z",
    "updated_at": "2025-01-09T12:05:00Z",
    "group_name": "Downtown Apartment"
  }
}
```

**Notes**:
- Returns last 50 jobs ordered by creation date (most recent first)
- Stats include total jobs, total spent, and this month's spending
- Credits balance included for convenience

---

### GET /api/jobs

Get list of user's jobs.

**Authentication**: Required

**Query Parameters**: None

**Success Response** (200):
```json
{
  "jobs": [
    {
      "id": 123,
      "prompt": "Modern living room",
      "photo_count": 5,
      "cost": 5.00,
      "status": "completed",
      "download_url": "https://storage.example.com/job-123.zip",
      "created_at": "2025-01-09T12:00:00Z",
      "group_name": "Project A"
    }
  ]
}
```

---

### PATCH /api/jobs/[id]

Update a job (currently only supports renaming group).

**Authentication**: Required

**URL Parameters**:
- `id`: Job ID (integer)

**Request Body**:
```json
{
  "groupName": "Sunset Villa Project"
}
```

**Validation**:
- `groupName`: Max 140 characters

**Success Response** (200):
```json
{
  "job": {
    "id": 123,
    "prompt": "Modern living room",
    "photo_count": 5,
    "cost": 5.00,
    "status": "completed",
    "download_url": "https://storage.example.com/job-123.zip",
    "created_at": "2025-01-09T12:00:00Z",
    "updated_at": "2025-01-09T12:10:00Z",
    "group_name": "Sunset Villa Project"
  }
}
```

**Error Responses**:
- `401`: Not authenticated
- `400`: Invalid job ID
- `400`: Group name too long (> 140 chars)
- `404`: Job not found
- `403`: Job belongs to different user (authorization failure)

**Security**:
- Verifies job belongs to authenticated user before allowing update
- Authorization check at [apps/web/src/app/api/jobs/[id]/route.js:42](apps/web/src/app/api/jobs/[id]/route.js#L42)

**Example**:
```bash
curl -X PATCH https://stageinseconds.com/api/jobs/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"groupName":"New Project Name"}'
```

---

### DELETE /api/jobs/[id]

Delete a job.

**Authentication**: Required

**URL Parameters**:
- `id`: Job ID (integer)

**Request Body**: None

**Success Response** (200):
```json
{
  "status": "deleted"
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: Job belongs to different user
- `404`: Job not found

**Security**:
- Verifies job ownership before deletion

---

## User Management Endpoints

### GET /api/user

Get current user's profile information.

**Authentication**: Required

**Query Parameters**: None

**Success Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "image": "https://example.com/avatar.jpg",
  "emailVerified": null
}
```

**Error Responses**:
- `401`: Not authenticated

---

### PATCH /api/user

Update user profile.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "New Name",
  "image": "https://example.com/new-avatar.jpg"
}
```

**Success Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "New Name",
    "image": "https://example.com/new-avatar.jpg"
  }
}
```

**Notes**:
- Email cannot be changed via this endpoint
- Only `name` and `image` are updatable

---

## Admin Endpoints

### POST /api/admin/send-demo

Send demo to real estate agent (admin only).

**Authentication**: Required (should be admin-only but not currently enforced)

**Request Body**:
```json
{
  "agentId": "agent-123",
  "agentName": "Jane Smith",
  "agentPhone": "+1234567890",
  "photoName": "living-room-1",
  "prompt": "Modern staging with natural light"
}
```

**Success Response** (200):
```json
{
  "status": "sent",
  "demoJobId": 456,
  "downloadUrl": "https://demo.stageinseconds.com/agent-123-demo.jpg"
}
```

**Notes**:
- Creates a demo job with cost $0.00
- Should be protected with admin-only middleware (not currently implemented)

---

## Response Headers

All API responses include:

```
Content-Type: application/json
```

CORS headers (if configured):
```
Access-Control-Allow-Origin: <configured origins>
Access-Control-Allow-Credentials: true
```

---

## Testing Endpoints

### Development Only

The following endpoints are for testing/development:

**GET /api/__create/ssr-test** - Server-side rendering test endpoint

---

## Changelog

### Version 1.0 (2025-01-09)
- Initial API documentation
- All 18 endpoints documented
- Security features documented
- Examples added

---

## Common Request Examples

### Sign Up and Process Photos

```bash
# 1. Sign up
curl -X POST https://stageinseconds.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"SecurePass123!","name":"John Doe"}' \
  -c cookies.txt

# 2. Check credits
curl https://stageinseconds.com/api/billing/me \
  -b cookies.txt

# 3. Get pricing
curl https://stageinseconds.com/api/billing/products

# 4. Create checkout (buy credits)
curl -X POST https://stageinseconds.com/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"lookupKey":"PACK_20_CREDITS","quantity":1}'

# 5. Process photos (after buying credits)
curl -X POST https://stageinseconds.com/api/process-photos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "fileUrls":["https://example.com/room.jpg"],
    "prompt":"Modern living room with natural lighting"
  }'

# 6. Check dashboard
curl https://stageinseconds.com/api/dashboard \
  -b cookies.txt
```

---

## Security Best Practices

When using the API:

1. **Always use HTTPS** in production
2. **Validate all inputs** on client side before sending
3. **Handle errors gracefully** with user-friendly messages
4. **Never expose** Stripe keys or session tokens
5. **Implement rate limiting** on client side to avoid hitting server limits
6. **Use secure cookies** for session management
7. **Validate file URLs** before passing to `/api/process-photos`

---

## Support

For API issues or questions:
- Review [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
- Check [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data structure
- See [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) for testing endpoints

---

## Appendix: Full Endpoint List

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/auth/signin | No | Sign in with credentials |
| POST | /api/auth/signup | No | Create new account |
| POST | /api/auth/signout | Yes | Sign out current user |
| POST | /api/auth/send-verification | Yes | Send email verification |
| POST | /api/auth/request-password-reset | No | Request password reset |
| POST | /api/auth/reset-password | No | Reset password with token |
| GET | /api/billing/products | No | Get pricing and packages |
| POST | /api/billing/create-checkout | Yes | Create Stripe checkout |
| POST | /api/billing/stripe-webhook | Signature | Handle Stripe events |
| GET | /api/billing/me | Yes | Get user credit balance |
| POST | /api/billing/create-customer-portal-session | Yes | Access billing portal |
| POST | /api/process-photos | Yes | Process photos with AI |
| POST | /api/upload | Yes | Upload photos to temp storage |
| GET | /api/dashboard | Yes | Get dashboard data |
| GET | /api/jobs | Yes | List user jobs |
| PATCH | /api/jobs/[id] | Yes | Update job (rename group) |
| DELETE | /api/jobs/[id] | Yes | Delete job |
| GET | /api/user | Yes | Get user profile |
| PATCH | /api/user | Yes | Update user profile |
| POST | /api/admin/send-demo | Yes | Send demo (admin only) |

**Total**: 20 documented endpoints
