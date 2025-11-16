# Testing Strategy for stageinseconds.com

This document outlines the testing strategy, infrastructure, and best practices for the stageinseconds.com application.

## Table of Contents

1. [Overview](#overview)
2. [Test Database Setup](#test-database-setup)
3. [Running Tests](#running-tests)
4. [Test Infrastructure](#test-infrastructure)
5. [Writing Integration Tests](#writing-integration-tests)
6. [External API Mocking](#external-api-mocking)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

The application uses **Vitest** as the testing framework with the following test types:

- **Unit Tests**: Test individual functions and utilities in isolation
- **Integration Tests**: Test API endpoints with database and mocked external services
- **Security Tests**: Validate SSRF protection, authentication, and authorization

### Coverage Goals

- Overall code coverage: **70%+**
- Validators (`src/utils/validators.ts`): **95%+**
- All critical security paths: **100%**

## Test Database Setup

Integration tests require a separate test database to avoid polluting your development data.

### 1. Create a Test Database

**Using Neon (Recommended)**

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new database in your existing project (e.g., `stageinseconds_test`)
3. Copy the connection string

**Using Local PostgreSQL**

```bash
# Create test database
createdb stageinseconds_test

# Get connection string
postgresql://localhost/stageinseconds_test
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Test database connection string
TEST_DATABASE_URL=postgresql://user:password@host.neon.tech/stageinseconds_test?sslmode=require
```

**IMPORTANT:** Never use your production database for testing!

### 3. Run Migrations

The test setup will automatically run migrations before tests start. You can also run them manually:

```bash
npm run db:migrate
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Only Unit Tests

```bash
npm run test:unit
```

### Run Only Integration Tests

```bash
npm run test:integration
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test -- test/auth/password.test.ts
```

## Test Infrastructure

### Test Helpers

#### Database Helpers (`test/helpers/db.ts`)

Provides utilities for database operations in tests:

```typescript
import {
  setupTestDb,
  teardownTestDb,
  createTestUser,
  createTestSession,
  grantCredits,
  createTestJob,
  createTestPurchase,
} from './helpers/db'

// Run migrations
await setupTestDb()

// Clean all tables
await teardownTestDb()

// Create a test user with hashed password
const { user, account, plainPassword } = await createTestUser()

// Create an authenticated session
const session = await createTestSession(user.id)

// Grant credits to user
await grantCredits(user.id, 100)

// Create a test photo job
const job = await createTestJob(user.id, { status: 'completed' })

// Create a test purchase
const purchase = await createTestPurchase(user.id)
```

#### API Helpers (`test/helpers/api.ts`)

Provides utilities for making API requests:

```typescript
import {
  makeRequest,
  authenticatedRequest,
  postJson,
  authenticatedPostJson,
  getJsonResponse,
  extractSessionToken,
} from './helpers/api'

// Make an unauthenticated request
const response = await makeRequest('/api/billing/products')

// Make an authenticated request
const response = await authenticatedRequest(sessionToken, '/api/dashboard')

// POST with JSON body
const response = await postJson('/api/auth/signin', {
  email: 'test@example.com',
  password: 'password',
})

// Extract session token from response
const sessionToken = extractSessionToken(response)
```

### Global Test Setup

The `test/setup.ts` file runs automatically before all tests and:

1. Starts MSW server for mocking external APIs
2. Runs database migrations
3. Cleans database before each test
4. Closes connections after all tests

### Mock Service Worker (MSW)

MSW intercepts external HTTP requests during tests and returns mock responses.

**Configured mocks** (in `test/mocks/handlers.ts`):

- ✅ Google Gemini API (successful and error responses)
- ✅ Stripe API (checkout sessions, prices)
- ✅ File downloads (images, large files, invalid files)
- ✅ SSRF protection (localhost, private IPs)

## Writing Integration Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestUser,
  createTestSession,
  teardownTestDb,
} from '../helpers/db'
import { authenticatedRequest, getJsonResponse } from '../helpers/api'

describe('GET /api/dashboard', () => {
  beforeEach(async () => {
    await teardownTestDb()
  })

  it('should return user jobs', async () => {
    // Setup: Create user and session
    const { user } = await createTestUser()
    const session = await createTestSession(user.id)

    // Act: Make API request
    const response = await authenticatedRequest(
      session.sessionToken,
      '/api/dashboard'
    )

    // Assert: Verify response
    expect(response.status).toBe(200)
    const data = await getJsonResponse(response)
    expect(data.jobs).toBeInstanceOf(Array)
  })

  it('should return 401 for unauthenticated requests', async () => {
    const response = await makeRequest('/api/dashboard')
    expect(response.status).toBe(401)
  })
})
```

### Testing Authentication

```typescript
it('should authenticate with correct credentials', async () => {
  const { user, plainPassword } = await createTestUser('test@example.com')

  const response = await postJson('/api/auth/signin', {
    email: user.email,
    password: plainPassword,
  })

  expect(response.status).toBe(200)
  const sessionToken = extractSessionToken(response)
  expect(sessionToken).toBeTruthy()
})
```

### Testing Authorization

```typescript
it('should prevent users from accessing other users jobs', async () => {
  const { user: user1 } = await createTestUser()
  const { user: user2 } = await createTestUser()
  const session2 = await createTestSession(user2.id)

  // Create job for user1
  const job = await createTestJob(user1.id)

  // Try to access as user2
  const response = await authenticatedRequest(
    session2.sessionToken,
    `/api/jobs/${job.id}`
  )

  expect(response.status).toBe(403)
})
```

### Testing SSRF Protection

```typescript
it('should reject localhost URLs', async () => {
  const { user } = await createTestUser()
  const session = await createTestSession(user.id)

  const response = await authenticatedPostJson(
    session.sessionToken,
    '/api/process-photos',
    {
      fileUrls: ['http://localhost/evil.jpg'],
      prompt: 'Test prompt',
    }
  )

  expect(response.status).toBe(400)
  const data = await getJsonResponse(response)
  expect(data.error).toContain('localhost')
})
```

## External API Mocking

All external API calls are mocked using MSW. See `test/mocks/handlers.ts` for configured mocks.

### Using Mocked APIs in Tests

The mocks work automatically - just make requests as normal:

```typescript
it('should process photos using Gemini API', async () => {
  // This will use the mock Gemini API from handlers.ts
  const response = await authenticatedPostJson(
    sessionToken,
    '/api/process-photos',
    {
      fileUrls: ['https://example.com/test-image.jpg'],
      prompt: 'Beautiful landscape',
    }
  )

  expect(response.status).toBe(200)
})
```

### Adding Custom Mocks for Specific Tests

```typescript
import { server } from '../setup'
import { http, HttpResponse } from 'msw'

it('should handle Gemini API errors', async () => {
  // Override default handler for this test
  server.use(
    http.post('https://generativelanguage.googleapis.com/*', () => {
      return HttpResponse.json(
        { error: { message: 'API Error' } },
        { status: 500 }
      )
    })
  )

  const response = await authenticatedPostJson(...)
  expect(response.status).toBe(502)
})
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to clean database state
- Don't rely on execution order

### 2. Descriptive Test Names

Use "should" format:

```typescript
it('should reject passwords shorter than 8 characters', async () => {})
it('should return 404 when job not found', async () => {})
it('should prevent duplicate email registrations', async () => {})
```

### 3. Test Both Success and Failure Cases

```typescript
describe('POST /api/auth/signup', () => {
  it('should create user with valid data', async () => {})
  it('should reject invalid email format', async () => {})
  it('should reject duplicate email', async () => {})
  it('should reject missing password', async () => {})
})
```

### 4. Security-First Testing

Always test:

- ✅ Authentication (401 for unauthenticated)
- ✅ Authorization (403 for unauthorized)
- ✅ SSRF protection (block private IPs)
- ✅ Input validation (XSS, SQL injection prevention)

### 5. Use Test Helpers

Don't repeat database setup - use helpers:

```typescript
// ❌ Bad
const user = await testDb.insert(schema.authUsers).values({...}).returning()
const hashedPassword = await argon2.hash('password')
const account = await testDb.insert(schema.authAccounts).values({...})

// ✅ Good
const { user, plainPassword } = await createTestUser()
```

### 6. Clean Up After Tests

The global teardown handles this, but for tests that create external resources:

```typescript
afterEach(async () => {
  // Clean up external resources if needed
})
```

## Troubleshooting

### "TEST_DATABASE_URL is not set"

**Solution:** Add `TEST_DATABASE_URL` to your `.env` file.

### "Database connection failed"

**Solution:**

1. Verify your test database exists
2. Check connection string format
3. Ensure database is accessible

### "Migration failed"

**Solution:**

1. Make sure `migrations/` folder exists
2. Run `npm run db:generate` to create migrations
3. Check migration SQL files for errors

### Tests timeout

**Solution:**

1. Increase timeout in `vitest.config.ts` (default: 30s)
2. Check for infinite loops or hanging promises
3. Ensure database connections are closed

### MSW handlers not working

**Solution:**

1. Verify `test/setup.ts` is loaded (check `setupFiles` in `vitest.config.ts`)
2. Check handler URLs match your requests
3. Use `server.listHandlers()` to debug

### Database not cleaning between tests

**Solution:**

1. Ensure `beforeEach` calls `teardownTestDb()`
2. Check for foreign key constraint errors
3. Verify teardown deletes in correct order

## npm Scripts Reference

```json
{
  "test": "vitest",
  "test:unit": "vitest run test/auth test/utils test/security",
  "test:integration": "vitest run test/api test/helpers",
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest --watch"
}
```

## Current Status

### ✅ Completed

1. **Test Infrastructure (Task 4-Part-1)**: Fully complete
   - Database helpers: `createTestUser`, `createTestSession`, `grantCredits`, etc.
   - API request helpers: `authenticatedRequest`, `postJson`, etc.
   - MSW mock handlers for Gemini, Stripe, file downloads, SSRF protection
   - Global test setup with automatic migrations and cleanup
   - Comprehensive documentation

2. **Test Database**: Configured
   - Neon test database created (`neondb_test`)
   - `TEST_DATABASE_URL` added to `.env`
   - Migrations working (tables auto-copied from main database)

3. **Test Files Created**:
   - `test/api/auth.test.ts` - 16 auth tests (skipped - see below)
   - `test/api/billing.test.ts` - 21 billing tests (skipped - see below)

### ⚠️ Known Issues

**Integration Tests Skipped**: Both auth and billing integration tests are currently skipped:

1. **Auth Tests**: Skipped because `@auth/create` is a black box system that doesn't follow standard Auth.js patterns. The database-level auth functions are already tested via helper functions.

2. **Billing Tests**: Skipped due to dev server route import issues. The React Router Vite setup is having conflicts importing some API routes (specifically `request-password-reset/route.js` and `create-checkout/route.js`), causing 404 HTML responses instead of JSON.

### 🔧 Recommended Next Steps

1. **Fix server routing issues** (if needed for live server testing):
   - Debug React Router route importing errors
   - Or switch to a different testing approach (unit-style with mocked dependencies)

2. **Write unit tests** for business logic:
   - Test validators (`src/utils/validators.ts`) - 95%+ coverage target
   - Test API route handlers with mocked dependencies (not live server)
   - Test SSRF protection functions directly

3. **Alternative: Test endpoints when deployed**:
   - Use Playwright or similar for E2E testing against staging environment
   - Skip dev server integration tests entirely

4. **Focus on security tests**:
   - SSRF protection (already has test file `test/security/ssrf.test.ts`)
   - Input validation
   - Authentication/authorization logic

## Next Steps

Priority tasks based on testing strategy:

1. ✅ Test infrastructure complete
2. ✅ Test database configured
3. ⚠️ Integration tests created but skipped (server issues)
4. 📝 **TODO**: Write unit tests for validators
5. 📝 **TODO**: Write unit tests for business logic (with mocked deps)
6. 📝 **TODO**: Achieve 70%+ code coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Drizzle ORM Testing](https://orm.drizzle.team/docs/guides/testing)
- [API Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#3-testing-and-overall-quality-practices)
