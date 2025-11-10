# Testing Strategy

**Last Updated**: 2025-11-09
**Status**: Test infrastructure exists, ZERO tests implemented

This document outlines the comprehensive testing strategy for stageinseconds.com to achieve production readiness.

---

## Table of Contents

- [Current State](#current-state)
- [Testing Goals](#testing-goals)
- [Testing Pyramid](#testing-pyramid)
- [Test Infrastructure](#test-infrastructure)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Testing Checklist](#testing-checklist)
- [Running Tests](#running-tests)

---

## Current State

**Infrastructure**: Configured ✅
- Vitest with jsdom environment
- @testing-library/react
- @testing-library/jest-dom
- TypeScript support

**Test Files**: ZERO ❌
- No `.test.ts` files
- No `.spec.ts` files
- No `.test.tsx` files

**Target**: 70%+ code coverage across all critical paths

---

## Testing Goals

### Primary Objectives

1. **Prevent Regressions**: Ensure changes don't break existing functionality
2. **Document Behavior**: Tests serve as living documentation
3. **Enable Refactoring**: Safely improve code structure
4. **Catch Bugs Early**: Find issues before production
5. **Build Confidence**: Deploy with certainty

### Success Metrics

- [ ] 70%+ code coverage overall
- [ ] 100% coverage on critical paths (auth, billing, photo processing)
- [ ] All 18 API endpoints have integration tests
- [ ] E2E tests for 3 critical user flows
- [ ] CI pipeline blocks merges if tests fail
- [ ] Test suite runs in < 5 minutes

---

## Testing Pyramid

```
        /\
       /E2E\         10% - Critical user flows (3-5 tests)
      /------\
     /  API   \      30% - Integration tests (18+ tests)
    /----------\
   /   Unit     \    60% - Unit tests (100+ tests)
  /--------------\
```

### Distribution

- **Unit Tests (60%)**: Fast, isolated, test individual functions
- **Integration Tests (30%)**: Test API endpoints and database interactions
- **E2E Tests (10%)**: Test complete user workflows

---

## Test Infrastructure

### Setup

Current configuration in [apps/web/vitest.config.ts](apps/web/vitest.config.ts):

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/__create/**',
      ],
    },
  },
})
```

### Additional Tools Needed

Install additional testing utilities:

```bash
cd apps/web
npm install --save-dev \
  @testing-library/user-event \
  msw \
  vitest-mock-extended \
  supertest \
  @types/supertest
```

**Tools**:
- `@testing-library/user-event` - Simulate user interactions
- `msw` (Mock Service Worker) - Mock API requests
- `vitest-mock-extended` - Enhanced mocking capabilities
- `supertest` - HTTP assertion library for API tests

---

## Unit Tests

### What to Test

Focus on pure functions and utilities that don't require external dependencies.

### Priority Files for Unit Testing

1. **Utility Functions** (if any exist in `src/utils/`)
2. **Validation Logic** (input validators in API routes)
3. **Helper Functions** (CRC32, file processing in process-photos)
4. **Authentication Logic** (password hashing, token validation)

### Example Unit Tests

#### File: `test/utils/validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe('Input Validation', () => {
  describe('validateFileUrls', () => {
    it('should accept valid HTTPS URLs', () => {
      const urls = ['https://example.com/image.jpg']
      expect(() => validateFileUrls(urls)).not.toThrow()
    })

    it('should reject HTTP URLs (SSRF protection)', () => {
      const urls = ['http://example.com/image.jpg']
      expect(() => validateFileUrls(urls)).toThrow()
    })

    it('should reject localhost URLs (SSRF protection)', () => {
      const urls = ['https://localhost/image.jpg']
      expect(() => validateFileUrls(urls)).toThrow()
    })

    it('should reject private IP addresses', () => {
      const urls = ['https://192.168.1.1/image.jpg']
      expect(() => validateFileUrls(urls)).toThrow()
    })

    it('should reject more than 30 files', () => {
      const urls = Array(31).fill('https://example.com/image.jpg')
      expect(() => validateFileUrls(urls)).toThrow()
    })
  })

  describe('validatePrompt', () => {
    it('should accept valid prompts', () => {
      expect(() => validatePrompt('Modern living room')).not.toThrow()
    })

    it('should reject empty prompts', () => {
      expect(() => validatePrompt('')).toThrow()
    })

    it('should reject excessively long prompts', () => {
      const longPrompt = 'a'.repeat(1001)
      expect(() => validatePrompt(longPrompt)).toThrow()
    })
  })
})
```

#### File: `test/auth/password.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { hash, verify } from 'argon2'

describe('Password Security', () => {
  it('should hash passwords with argon2', async () => {
    const password = 'SecurePassword123!'
    const hashed = await hash(password)

    expect(hashed).not.toBe(password)
    expect(hashed).toContain('$argon2')
  })

  it('should verify correct passwords', async () => {
    const password = 'SecurePassword123!'
    const hashed = await hash(password)
    const isValid = await verify(hashed, password)

    expect(isValid).toBe(true)
  })

  it('should reject incorrect passwords', async () => {
    const password = 'SecurePassword123!'
    const hashed = await hash(password)
    const isValid = await verify(hashed, 'WrongPassword')

    expect(isValid).toBe(false)
  })
})
```

---

## Integration Tests

### What to Test

Test API endpoints with real database interactions (using test database).

### Test Database Setup

Create `test/setup/db.ts`:

```typescript
import { Pool } from '@neondatabase/serverless'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

export const testDb = new Pool({
  connectionString: TEST_DATABASE_URL,
})

export async function setupTestDb() {
  // Run migrations or create schema
  // Seed test data if needed
}

export async function teardownTestDb() {
  // Clean up test data
  await testDb.query('TRUNCATE TABLE photo_jobs, user_credits, purchases RESTART IDENTITY CASCADE')
}

export async function createTestUser(email = 'test@example.com') {
  const user = await testDb.query(`
    INSERT INTO auth_users (id, email, name)
    VALUES (gen_random_uuid(), $1, 'Test User')
    RETURNING *
  `, [email])
  return user.rows[0]
}
```

### Priority API Endpoints to Test

Based on complexity and criticality:

1. ✅ **POST /api/process-photos** (640 lines, most complex)
2. ✅ **POST /api/billing/stripe-webhook** (critical for payments)
3. ✅ **POST /api/billing/create-checkout** (initiates purchases)
4. ✅ **PATCH /api/jobs/[id]** (authorization logic)
5. ✅ **GET /api/dashboard** (aggregation logic)
6. ✅ **POST /api/auth/signin** (authentication)
7. ✅ **POST /api/auth/signup** (user creation)
8. ⚠️ **GET /api/jobs** (simple query)
9. ⚠️ **DELETE /api/jobs/[id]** (authorization + deletion)

### Example Integration Tests

#### File: `test/api/process-photos.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { testDb, setupTestDb, teardownTestDb, createTestUser } from '../setup/db'

describe('POST /api/process-photos', () => {
  beforeEach(async () => {
    await setupTestDb()
  })

  afterEach(async () => {
    await teardownTestDb()
  })

  it('should reject unauthenticated requests', async () => {
    const response = await fetch('http://localhost:4000/api/process-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrls: ['https://example.com/image.jpg'],
        prompt: 'Modern living room',
      }),
    })

    expect(response.status).toBe(401)
  })

  it('should reject HTTP URLs (SSRF protection)', async () => {
    const user = await createTestUser()
    const session = await createTestSession(user.id)

    const response = await fetch('http://localhost:4000/api/process-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${session.sessionToken}`,
      },
      body: JSON.stringify({
        fileUrls: ['http://example.com/image.jpg'], // HTTP not HTTPS
        prompt: 'Modern living room',
      }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('HTTPS')
  })

  it('should reject localhost URLs (SSRF protection)', async () => {
    const user = await createTestUser()
    const session = await createTestSession(user.id)

    const response = await fetch('http://localhost:4000/api/process-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${session.sessionToken}`,
      },
      body: JSON.stringify({
        fileUrls: ['https://localhost/image.jpg'],
        prompt: 'Modern living room',
      }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('localhost')
  })

  it('should reject more than 30 files', async () => {
    const user = await createTestUser()
    const session = await createTestSession(user.id)

    const fileUrls = Array(31).fill('https://example.com/image.jpg')

    const response = await fetch('http://localhost:4000/api/process-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${session.sessionToken}`,
      },
      body: JSON.stringify({ fileUrls, prompt: 'Test' }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('30')
  })

  it('should create a job record in the database', async () => {
    const user = await createTestUser()
    const session = await createTestSession(user.id)

    // Mock Gemini API response
    vi.mock('google-generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(() => ({
        getGenerativeModel: vi.fn(() => ({
          generateContent: vi.fn(() => Promise.resolve({ /* mock response */ })),
        })),
      })),
    }))

    const response = await fetch('http://localhost:4000/api/process-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${session.sessionToken}`,
      },
      body: JSON.stringify({
        fileUrls: ['https://example.com/valid-image.jpg'],
        prompt: 'Modern living room',
      }),
    })

    expect(response.status).toBe(200)

    // Check database
    const jobs = await testDb.query('SELECT * FROM photo_jobs WHERE user_id = $1', [user.id])
    expect(jobs.rows.length).toBe(1)
    expect(jobs.rows[0].prompt).toBe('Modern living room')
    expect(jobs.rows[0].photo_count).toBe(1)
  })
})
```

#### File: `test/api/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testDb, setupTestDb, teardownTestDb } from '../setup/db'
import { hash } from 'argon2'

describe('Authentication API', () => {
  beforeEach(async () => {
    await setupTestDb()
  })

  afterEach(async () => {
    await teardownTestDb()
  })

  describe('POST /api/auth/signup', () => {
    it('should create a new user account', async () => {
      const response = await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        }),
      })

      expect(response.status).toBe(200)

      // Verify user created in database
      const user = await testDb.query('SELECT * FROM auth_users WHERE email = $1', ['newuser@example.com'])
      expect(user.rows.length).toBe(1)
      expect(user.rows[0].name).toBe('New User')
    })

    it('should reject duplicate email addresses', async () => {
      // Create first user
      await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Password1!',
        }),
      })

      // Attempt to create duplicate
      const response = await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Password2!',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should hash passwords with argon2', async () => {
      await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'secure@example.com',
          password: 'MySecurePassword123!',
        }),
      })

      const account = await testDb.query(`
        SELECT password FROM auth_accounts
        WHERE "providerAccountId" IN (SELECT id FROM auth_users WHERE email = $1)
      `, ['secure@example.com'])

      expect(account.rows[0].password).toContain('$argon2')
      expect(account.rows[0].password).not.toBe('MySecurePassword123!')
    })
  })

  describe('POST /api/auth/signin', () => {
    it('should authenticate valid credentials', async () => {
      // Create user first
      const password = 'TestPassword123!'
      const hashedPassword = await hash(password)

      const user = await testDb.query(`
        INSERT INTO auth_users (id, email, name)
        VALUES (gen_random_uuid(), $1, 'Test User')
        RETURNING *
      `, ['signin@example.com'])

      await testDb.query(`
        INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
        VALUES ($1, 'credentials', 'credentials', $1, $2)
      `, [user.rows[0].id, hashedPassword])

      const response = await fetch('http://localhost:4000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'signin@example.com',
          password: 'TestPassword123!',
        }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('set-cookie')).toContain('session')
    })

    it('should reject invalid passwords', async () => {
      // Setup user with known password
      const password = 'CorrectPassword123!'
      const hashedPassword = await hash(password)

      const user = await testDb.query(`
        INSERT INTO auth_users (id, email, name)
        VALUES (gen_random_uuid(), $1, 'Test User')
        RETURNING *
      `, ['wrongpass@example.com'])

      await testDb.query(`
        INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
        VALUES ($1, 'credentials', 'credentials', $1, $2)
      `, [user.rows[0].id, hashedPassword])

      const response = await fetch('http://localhost:4000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123!',
        }),
      })

      expect(response.status).toBe(401)
    })
  })
})
```

#### File: `test/api/billing.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { testDb, setupTestDb, teardownTestDb, createTestUser } from '../setup/db'

describe('Billing API', () => {
  beforeEach(async () => {
    await setupTestDb()
  })

  afterEach(async () => {
    await teardownTestDb()
  })

  describe('POST /api/billing/create-checkout', () => {
    it('should create a Stripe checkout session', async () => {
      const user = await createTestUser()
      const session = await createTestSession(user.id)

      // Mock Stripe
      vi.mock('stripe', () => ({
        default: vi.fn(() => ({
          checkout: {
            sessions: {
              create: vi.fn(() => Promise.resolve({
                id: 'cs_test_123',
                url: 'https://checkout.stripe.com/test',
              })),
            },
          },
        })),
      }))

      const response = await fetch('http://localhost:4000/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${session.sessionToken}`,
        },
        body: JSON.stringify({
          amount: 50,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.url).toContain('stripe.com')
    })
  })

  describe('POST /api/billing/stripe-webhook', () => {
    it('should add credits on successful payment', async () => {
      const user = await createTestUser()

      // Mock Stripe webhook event
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            amount_total: 5000, // $50.00
            metadata: {
              app: 'stageinseconds',
            },
            customer_email: user.email,
          },
        },
      }

      const response = await fetch('http://localhost:4000/api/billing/stripe-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'mock_signature',
        },
        body: JSON.stringify(event),
      })

      // Check credits were added
      const credits = await testDb.query('SELECT credits FROM user_credits WHERE user_id = $1', [user.id])
      expect(credits.rows[0].credits).toBe('50.00')
    })

    it('should prevent duplicate credit grants', async () => {
      const user = await createTestUser()

      // Process payment once
      const sessionId = 'cs_test_duplicate_123'

      // First webhook
      await processStripeWebhook(sessionId, user.email, 50.00)

      const creditsAfterFirst = await testDb.query('SELECT credits FROM user_credits WHERE user_id = $1', [user.id])
      expect(creditsAfterFirst.rows[0].credits).toBe('50.00')

      // Second webhook (duplicate)
      await processStripeWebhook(sessionId, user.email, 50.00)

      const creditsAfterSecond = await testDb.query('SELECT credits FROM user_credits WHERE user_id = $1', [user.id])
      expect(creditsAfterSecond.rows[0].credits).toBe('50.00') // Should NOT be 100.00
    })
  })
})
```

---

## E2E Tests

### What to Test

Complete user workflows from browser perspective.

### Tool: Playwright

Install Playwright:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Critical User Flows

1. **Sign Up → Purchase Credits → Process Photos**
2. **Sign In → View Dashboard → Download Results**
3. **Process Photos → Update Group Name → Delete Job**

### Example E2E Tests

#### File: `test/e2e/user-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Complete User Journey', () => {
  test('User can sign up, buy credits, and process photos', async ({ page }) => {
    // 1. Sign Up
    await page.goto('http://localhost:4000/account/signup')
    await page.fill('input[name="email"]', 'e2e@example.com')
    await page.fill('input[name="password"]', 'SecurePassword123!')
    await page.fill('input[name="name"]', 'E2E Test User')
    await page.click('button[type="submit"]')

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/)

    // 2. Purchase Credits
    await page.click('text=Buy Credits')
    await page.click('text=$50') // Click $50 credit option

    // Mock Stripe checkout (or use test mode)
    // For real E2E, complete Stripe test checkout flow

    // 3. Process Photos
    await page.goto('http://localhost:4000/process')
    await page.setInputFiles('input[type="file"]', ['test/fixtures/sample-room.jpg'])
    await page.fill('textarea[name="prompt"]', 'Modern living room with natural lighting')
    await page.click('button:has-text("Process Photos")')

    // Wait for processing
    await page.waitForSelector('text=Processing complete', { timeout: 60000 })

    // 4. Verify Result
    await expect(page.locator('text=Download')).toBeVisible()
  })
})

test.describe('Dashboard Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto('http://localhost:4000/account/signin')
    await page.fill('input[name="email"]', 'existing@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
  })

  test('User can rename job group', async ({ page }) => {
    await page.goto('http://localhost:4000/dashboard')

    // Find first job and click rename
    await page.click('[data-testid="job-item"]:first-child button:has-text("Rename")')
    await page.fill('input[name="groupName"]', 'Sunset Villa Project')
    await page.click('button:has-text("Save")')

    // Verify renamed
    await expect(page.locator('text=Sunset Villa Project')).toBeVisible()
  })

  test('User can delete a job', async ({ page }) => {
    await page.goto('http://localhost:4000/dashboard')

    const jobCount = await page.locator('[data-testid="job-item"]').count()

    // Delete first job
    await page.click('[data-testid="job-item"]:first-child button:has-text("Delete")')
    await page.click('button:has-text("Confirm")')

    // Verify job removed
    await expect(page.locator('[data-testid="job-item"]')).toHaveCount(jobCount - 1)
  })
})
```

---

## Testing Checklist

### Phase 1: Unit Tests (Week 1)
- [ ] Password hashing and verification
- [ ] Input validation functions
- [ ] URL validation (SSRF protection)
- [ ] File size validation
- [ ] Prompt validation
- [ ] CRC32 helper (if extracted)
- [ ] Date/time utilities

### Phase 2: Integration Tests - Critical (Week 2)
- [ ] POST /api/process-photos (all validation cases)
- [ ] POST /api/billing/stripe-webhook (payment processing)
- [ ] POST /api/billing/create-checkout (session creation)
- [ ] POST /api/auth/signup (user creation)
- [ ] POST /api/auth/signin (authentication)
- [ ] PATCH /api/jobs/[id] (authorization checks)
- [ ] GET /api/dashboard (data aggregation)

### Phase 3: Integration Tests - Standard (Week 2-3)
- [ ] GET /api/jobs (pagination, filtering)
- [ ] DELETE /api/jobs/[id] (authorization + deletion)
- [ ] GET /api/user (user profile)
- [ ] PATCH /api/user (profile updates)
- [ ] POST /api/upload (file upload validation)

### Phase 4: E2E Tests (Week 3)
- [ ] Complete sign-up flow
- [ ] Complete sign-in flow
- [ ] Purchase credits flow (with Stripe test mode)
- [ ] Process photos flow
- [ ] Dashboard management (rename, delete)
- [ ] Download results flow

### Phase 5: CI/CD Integration (Week 4)
- [ ] GitHub Actions workflow for tests
- [ ] Coverage reports uploaded
- [ ] Branch protection requires passing tests
- [ ] Automated test runs on every PR

---

## Running Tests

### Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npm test -- process-photos.test.ts
```

---

## Coverage Goals

### Overall Target: 70%+

| Category | Target | Priority |
|----------|--------|----------|
| Critical Paths | 100% | HIGHEST |
| API Endpoints | 90% | HIGH |
| Utilities | 80% | MEDIUM |
| UI Components | 60% | LOW |

### Critical Paths (Must be 100% covered):
- [src/app/api/process-photos/route.js](apps/web/src/app/api/process-photos/route.js)
- [src/app/api/billing/stripe-webhook/route.js](apps/web/src/app/api/billing/stripe-webhook/route.js)
- [src/auth.js](apps/web/src/auth.js)

---

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: stageinseconds_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: ./apps/web

      - name: Run database migrations
        run: npm run db:migrate
        working-directory: ./apps/web
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stageinseconds_test

      - name: Run unit tests
        run: npm test -- --coverage
        working-directory: ./apps/web
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stageinseconds_test

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/web/coverage/coverage-final.json

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: ./apps/web

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./apps/web
      - run: npm run lint
        working-directory: ./apps/web
```

---

## Next Steps

1. Start with Unit Tests (easiest wins)
2. Add Integration Tests for top 5 critical endpoints
3. Complete remaining Integration Tests
4. Add E2E tests for 3 critical flows
5. Set up CI/CD pipeline
6. Enforce coverage minimums

**Estimated Effort**: 1-2 weeks with focused development

**Success Criteria**: All checkboxes above are checked, CI pipeline is green, 70%+ coverage achieved.
