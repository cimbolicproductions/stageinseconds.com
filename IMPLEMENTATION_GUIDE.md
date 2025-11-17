# Implementation Guide: Production Readiness Tasks

**Last Updated**: 2025-11-09

This guide provides detailed prompts to give Claude Code for implementing each production readiness task. Use these prompts in order to systematically address all critical gaps.

---

## Table of Contents

- [How to Use This Guide](#how-to-use-this-guide)
- [Priority 1: Critical Tasks](#priority-1-critical-tasks)
  - [Task 1: Add ESLint and Prettier](#task-1-add-eslint-and-prettier)
  - [Task 2: Create Database Migrations](#task-2-create-database-migrations)
  - [Task 3: Write Unit Tests](#task-3-write-unit-tests)
  - [Task 4: Write Integration Tests](#task-4-write-integration-tests)
  - [Task 5: Set Up CI/CD Pipeline](#task-5-set-up-cicd-pipeline)
  - [Task 6: Add Error Tracking](#task-6-add-error-tracking)
- [Priority 2: Important Tasks](#priority-2-important-tasks)
- [Verification Steps](#verification-steps)

---

## How to Use This Guide

### General Workflow

1. **Copy the prompt** for the task you want to complete
2. **Paste it into Claude Code** as your message
3. **Let Claude implement** the changes
4. **Review the changes** Claude makes
5. **Test the implementation** using the verification steps
6. **Move to the next task** once verified

### Tips for Best Results

- **One task at a time**: Don't combine multiple tasks in one prompt
- **Review changes carefully**: Especially for configuration files
- **Run tests after each task**: Ensure nothing breaks
- **Commit frequently**: After each successful task completion

---

## Priority 1: Critical Tasks

### Task 1: Add ESLint and Prettier

**Estimated Time**: 30 minutes

**Prompt for Claude Code**:

```
I need to add ESLint and Prettier to this project to enforce code quality and consistent formatting.

Requirements:
1. Install ESLint with TypeScript support for the web app
2. Install Prettier for code formatting
3. Create .eslintrc.js with these rules:
   - Extend recommended TypeScript and React rules
   - No unused variables (error)
   - No console.log in production (warn)
   - Prefer const over let (warn)
4. Create .prettierrc with:
   - Semi: false
   - Single quotes: true
   - Tab width: 2
   - Trailing comma: es5
5. Create .eslintignore and .prettierignore files
6. Install husky and lint-staged for pre-commit hooks
7. Configure git hooks to:
   - Run prettier on staged files
   - Run eslint on staged files
   - Block commit if linting fails
8. Add npm scripts to package.json:
   - "lint": run eslint on all files
   - "lint:fix": run eslint with --fix
   - "format": run prettier on all files
   - "format:check": check if files are formatted
9. Fix any existing linting errors in the codebase

Location: apps/web/

Do NOT change any business logic, only add linting/formatting configuration.
```

**Verification**:
```bash
cd apps/web
npm run lint
npm run format:check
git add .
git commit -m "test" # Should trigger pre-commit hooks
```

---

### Task 2: Create Database Migrations

**Estimated Time**: 1 hour

**Prompt for Claude Code**:

```
I need to set up database migrations using Drizzle ORM for this project.

Current state:
- Using Neon PostgreSQL with @neondatabase/serverless
- Manual schema management (no migrations)
- Database schema documented in DATABASE_SCHEMA.md

Requirements:
1. Install Drizzle ORM and drizzle-kit:
   - drizzle-orm
   - drizzle-kit
   - @neondatabase/serverless (already installed)

2. Create drizzle.config.ts in apps/web/ with:
   - Connection to DATABASE_URL
   - Schema path: src/db/schema.ts
   - Migrations folder: migrations/
   - Driver: neon-serverless

3. Create src/db/schema.ts with ALL tables from DATABASE_SCHEMA.md:
   - auth_users (with UUID id, email, name, emailVerified, image, timestamps)
   - auth_accounts (with userId foreign key, provider, type, providerAccountId, password, tokens, timestamps)
   - auth_sessions (with userId foreign key, sessionToken, expires, timestamps)
   - auth_verification_token (with identifier, token, expires)
   - photo_jobs (with user_id foreign key, prompt, photo_count, cost, status, download_url, group_name, timestamps)
   - user_credits (with user_id foreign key unique, credits, free_used, timestamps)
   - purchases (with user_id foreign key, stripe_session_id unique, amount, credits_purchased, status, timestamps)

4. Generate initial migration:
   - Run: npx drizzle-kit generate:pg

5. Create migration runner at src/db/migrate.ts:
   - Reads DATABASE_URL from process.env
   - Runs migrations using drizzle-kit migrate
   - Logs migration status

6. Update package.json scripts:
   - "db:generate": "drizzle-kit generate:pg"
   - "db:migrate": "tsx src/db/migrate.ts"
   - "db:studio": "drizzle-kit studio"
   - "db:push": "drizzle-kit push:pg"

7. Update existing code to use Drizzle:
   - Replace raw SQL in src/app/api/utils/sql.js with Drizzle queries where possible
   - Keep backward compatibility (don't break existing code)
   - Add Drizzle client export in src/db/index.ts

8. Add README section documenting:
   - How to generate migrations
   - How to run migrations
   - How to rollback migrations

IMPORTANT: Use the EXACT schema from DATABASE_SCHEMA.md - match all column names, types, constraints, and indexes.

Location: apps/web/
```

**Verification**:
```bash
cd apps/web
npm run db:generate  # Should generate migration files
npm run db:migrate   # Should run migrations successfully
npm run db:studio    # Should open Drizzle Studio
```

---

### Task 3: Write Unit Tests

**Estimated Time**: 2-3 hours

**Prompt for Claude Code**:

```
I need comprehensive unit tests for utility functions and business logic.

Current state:
- Vitest configured but ZERO test files
- No test coverage

Requirements:

1. Create test files for authentication logic:
   File: test/auth/password.test.ts
   - Test password hashing with argon2
   - Test password verification (correct password)
   - Test password verification (incorrect password)
   - Test that passwords are never stored in plain text

2. Create test files for input validation:
   File: test/utils/validation.test.ts
   - Test URL validation (HTTPS only, no localhost, no private IPs)
   - Test file URL array validation (1-30 files)
   - Test prompt validation (non-empty string)
   - Test group name validation (max 140 chars)
   - Test email validation
   - Test job ID validation (must be integer)

3. Create test files for SSRF protection:
   File: test/security/ssrf.test.ts
   - Test blocking HTTP URLs (only HTTPS allowed)
   - Test blocking localhost (localhost, 127.0.0.1, 0.0.0.0)
   - Test blocking private IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
   - Test allowing valid HTTPS URLs
   - Test blocking data: URIs
   - Test blocking file:// URIs

4. Extract validation logic from API routes into reusable functions:
   File: src/utils/validators.ts
   Functions to create:
   - validateFileUrls(urls: string[]): void (throws if invalid)
   - validatePrompt(prompt: string): void (throws if invalid)
   - validateGroupName(name: string): void (throws if invalid)
   - validateEmail(email: string): void (throws if invalid)
   - isPrivateIP(hostname: string): boolean
   - isSafeUrl(url: string): boolean

5. Update API routes to use these validation functions:
   - apps/web/src/app/api/process-photos/route.js (use validateFileUrls, validatePrompt)
   - apps/web/src/app/api/jobs/[id]/route.js (use validateGroupName)

6. Configure test coverage in vitest.config.ts:
   - Require 80% coverage for src/utils/
   - Require 100% coverage for src/utils/validators.ts
   - Exclude test files, config files, and __create from coverage

7. Add test npm scripts to package.json:
   - "test:unit": run only unit tests
   - "test:coverage": run with coverage report

Test all edge cases and error conditions. Use descriptive test names.

Location: apps/web/
```

**Verification**:
```bash
cd apps/web
npm run test:unit
npm run test:coverage
# Check coverage report - should be 80%+ for utils
```

---

### Task 4: Write Integration Tests

**Estimated Time**: 4-6 hours

**Prompt for Claude Code (Part 1 - Test Infrastructure)**:

```
I need to set up integration testing infrastructure for API endpoints.

Requirements:

1. Create test database setup utilities:
   File: test/helpers/db.ts
   Functions:
   - setupTestDb(): Promise<void> - Runs migrations on test database
   - teardownTestDb(): Promise<void> - Cleans all tables
   - createTestUser(email?: string): Promise<User> - Creates test user with hashed password
   - createTestSession(userId: string): Promise<Session> - Creates valid session for user
   - grantCredits(userId: string, amount: number): Promise<void> - Adds credits to user

2. Create API testing utilities:
   File: test/helpers/api.ts
   Functions:
   - makeRequest(path: string, options?: RequestInit): Promise<Response> - Fetch wrapper for API
   - authenticatedRequest(sessionToken: string, path: string, options?: RequestInit): Promise<Response>

3. Configure test environment:
   - Add TEST_DATABASE_URL to .env.example
   - Update vitest.config.ts to use TEST_DATABASE_URL
   - Add setup/teardown hooks in test/setup.ts

4. Install additional test dependencies:
   - @testing-library/react (already installed)
   - msw (Mock Service Worker) for mocking external APIs
   - supertest for HTTP assertions

5. Create MSW handlers for external services:
   File: test/mocks/handlers.ts
   Mock handlers for:
   - Google Gemini API (successful response)
   - Stripe API (checkout session creation)
   - File upload service (successful upload)

6. Document test database setup in TESTING_STRATEGY.md:
   - How to create test database
   - How to run integration tests
   - Environment variables needed

Location: apps/web/
```

**Prompt for Claude Code (Part 2 - Auth Tests)**:

```
Now write integration tests for authentication endpoints.

File: test/api/auth.test.ts

Test coverage needed:

1. POST /api/auth/signup
   - ✅ Should create new user with valid email/password
   - ✅ Should hash password with argon2
   - ✅ Should reject duplicate email addresses
   - ✅ Should reject invalid email format
   - ✅ Should reject missing email or password
   - ✅ Should create user record in auth_users table
   - ✅ Should create account record in auth_accounts table
   - ✅ Should set session cookie on successful signup

2. POST /api/auth/signin
   - ✅ Should authenticate with correct email/password
   - ✅ Should reject incorrect password
   - ✅ Should reject non-existent email
   - ✅ Should set session cookie on successful signin
   - ✅ Should create session record in auth_sessions table

3. POST /api/auth/signout
   - ✅ Should clear session cookie
   - ✅ Should delete session from database
   - ✅ Should require authentication

Use the test helpers from test/helpers/db.ts and test/helpers/api.ts.
Use beforeEach to setup clean database state.
Use afterEach to teardown test data.

Location: apps/web/
```

**Prompt for Claude Code (Part 3 - Billing Tests)**:

```
Write integration tests for billing endpoints.

File: test/api/billing.test.ts

Test coverage needed:

1. GET /api/billing/products
   - ✅ Should return pricing offers for unauthenticated users
   - ✅ Should include all 4 pricing tiers (PAYG, 20-pack, 50-pack, 100-pack)
   - ✅ Should include price metadata (credits_per_unit, type)

2. POST /api/billing/create-checkout
   - ✅ Should create Stripe checkout session for authenticated user
   - ✅ Should reject unauthenticated requests (401)
   - ✅ Should validate lookupKey exists
   - ✅ Should verify price metadata app="stageinseconds" (security check)
   - ✅ Should include user email in Stripe session

3. GET /api/billing/me
   - ✅ Should return credits and free_used for authenticated user
   - ✅ Should return 0 credits for new user
   - ✅ Should return authenticated: false for unauthenticated requests

4. POST /api/billing/stripe-webhook (CRITICAL - test thoroughly)
   - ✅ Should add credits on checkout.session.completed event
   - ✅ Should verify Stripe signature (mock this)
   - ✅ Should validate metadata app="stageinseconds"
   - ✅ Should prevent duplicate credit grants (same stripe_session_id)
   - ✅ Should record purchase in purchases table
   - ✅ Should upsert user_credits (create if not exists, update if exists)
   - ✅ Should handle webhook replay attacks

Mock Stripe API calls using MSW handlers.
Test both success and failure scenarios.

Location: apps/web/
```

**Prompt for Claude Code (Part 4 - Photo Processing Tests)**:

```
Write integration tests for the photo processing endpoint - this is the MOST COMPLEX endpoint with 640 lines.

File: test/api/process-photos.test.ts

Test coverage needed:

1. Authentication
   - ✅ Should reject unauthenticated requests (401)

2. Input Validation - File URLs
   - ✅ Should reject HTTP URLs (only HTTPS allowed)
   - ✅ Should reject localhost URLs (SSRF protection)
   - ✅ Should reject 127.0.0.1 URLs (SSRF protection)
   - ✅ Should reject private IP addresses (10.x, 192.168.x, 172.16-31.x)
   - ✅ Should reject more than 30 files (400)
   - ✅ Should reject empty file array (400)
   - ✅ Should reject non-array fileUrls (400)
   - ✅ Should accept valid HTTPS URLs

3. Input Validation - Prompt
   - ✅ Should reject empty prompt
   - ✅ Should reject missing prompt
   - ✅ Should accept valid prompt string

4. File Processing
   - ✅ Should reject files larger than 15MB
   - ✅ Should reject invalid content types (non-images)
   - ✅ Should download and validate images

5. Job Creation
   - ✅ Should create job record in photo_jobs table
   - ✅ Should set user_id to authenticated user
   - ✅ Should set status to 'pending'
   - ✅ Should record photo_count
   - ✅ Should calculate cost

6. AI Processing (mock Gemini API)
   - ✅ Should call Google Gemini API with correct parameters
   - ✅ Should handle Gemini API errors gracefully (502)
   - ✅ Should update job status to 'completed' on success
   - ✅ Should update job status to 'failed' on error

7. Response
   - ✅ Should return job ID
   - ✅ Should return download URL
   - ✅ Should return cost and photo count

Mock Google Gemini API using MSW.
Mock file downloads using MSW.
Test both happy path and error scenarios.

Location: apps/web/
```

**Prompt for Claude Code (Part 5 - Job Management Tests)**:

```
Write integration tests for job management endpoints.

File: test/api/jobs.test.ts

Test coverage needed:

1. GET /api/dashboard
   - ✅ Should return user's jobs (last 50, ordered by created_at DESC)
   - ✅ Should return stats (total_jobs, total_spent, this_month_spent)
   - ✅ Should return credits balance
   - ✅ Should only show jobs belonging to authenticated user
   - ✅ Should require authentication (401)
   - ✅ Should handle user with no jobs (empty array)

2. GET /api/dashboard?id=123
   - ✅ Should return single job by ID
   - ✅ Should return 404 if job not found
   - ✅ Should return 403 if job belongs to different user

3. PATCH /api/jobs/[id]
   - ✅ Should update group_name (max 140 chars)
   - ✅ Should reject group_name > 140 chars (400)
   - ✅ Should return 404 if job not found
   - ✅ Should return 403 if job belongs to different user (CRITICAL security test)
   - ✅ Should update updated_at timestamp
   - ✅ Should require authentication (401)

4. DELETE /api/jobs/[id]
   - ✅ Should delete job
   - ✅ Should return 404 if job not found
   - ✅ Should return 403 if job belongs to different user (CRITICAL security test)
   - ✅ Should require authentication (401)

Create test jobs with createTestJob() helper function.
Test authorization checks thoroughly - users should NEVER access other users' jobs.

Location: apps/web/
```

**Verification**:
```bash
cd apps/web
npm run test:integration
npm run test:coverage
# Check that all API endpoints have test coverage
```

---

### Task 5: Set Up CI/CD Pipeline

**Estimated Time**: 1 hour

**Prompt for Claude Code**:

```
I need to set up a GitHub Actions CI/CD pipeline for automated testing and deployment.

Requirements:

1. Create GitHub Actions workflow for testing:
   File: .github/workflows/test.yml
   Triggers: Push to main, pull requests
   Jobs:
   - Setup Node.js 20
   - Install dependencies (npm ci)
   - Run linting (npm run lint)
   - Run type checking (npm run type-check)
   - Setup PostgreSQL service for tests
   - Run database migrations on test DB
   - Run unit tests (npm run test:unit)
   - Run integration tests (npm run test:integration)
   - Upload coverage to Codecov
   - Fail if coverage < 70%

2. Create GitHub Actions workflow for deployment (Vercel):
   File: .github/workflows/deploy.yml
   Triggers: Push to main (after tests pass)
   Jobs:
   - Deploy to Vercel production
   - Comment on PR with deployment URL
   - Run smoke tests on deployed URL

3. Create GitHub Actions workflow for security:
   File: .github/workflows/security.yml
   Triggers: Daily cron, pull requests
   Jobs:
   - Run npm audit
   - Check for known vulnerabilities
   - Fail if high/critical vulnerabilities found

4. Add branch protection rules documentation:
   File: .github/BRANCH_PROTECTION.md
   Document recommended settings:
   - Require pull request before merging
   - Require status checks (tests, linting)
   - Require branches to be up to date
   - Require linear history

5. Update README.md with CI/CD badges:
   - Test status badge
   - Coverage badge
   - Deployment status badge

6. Create dependabot configuration:
   File: .github/dependabot.yml
   - Check for npm dependency updates weekly
   - Auto-create PRs for security updates

Environment secrets needed (document in .github/SECRETS.md):
- CODECOV_TOKEN (for coverage uploads)
- VERCEL_TOKEN (for deployments)
- TEST_DATABASE_URL (for GitHub Actions PostgreSQL)

Location: Root directory
```

**Verification**:
```bash
# Push to GitHub and verify:
# 1. Tests run automatically on PR
# 2. Coverage is uploaded
# 3. Branch protection prevents merge if tests fail
```

---

### Task 6: Add Error Tracking and Logging

**Estimated Time**: 45 minutes

**Prompt for Claude Code**:

```
I need to add comprehensive error tracking and logging using FREE tools for production error monitoring.

Requirements:

1. Install Pino logging packages (100% FREE):
   - pino (fast, low-overhead logger)
   - pino-pretty (pretty printing for development)
   - pino-http (HTTP logging middleware for Hono)
   - @logtail/pino (OPTIONAL: for free log aggregation)

2. Create logger configuration:
   File: apps/web/src/utils/logger.ts
   - Create Pino logger instance with structured logging
   - Different log levels: error, warn, info, debug, trace
   - Pretty printing in development (pino-pretty)
   - JSON logging in production (for log aggregation)
   - Context enrichment: requestId, userId, path, method
   - Error serialization with stack traces
   - Optional: Integration with BetterStack/LogTail (free tier: 1GB/month)

3. Integrate Pino in server:
   File: apps/web/__create/index.ts
   - Import and initialize Pino logger
   - Add pino-http middleware for automatic request/response logging
   - Create error handler middleware that logs all errors
   - Capture all unhandled exceptions and log them
   - Add request correlation IDs for tracing

4. Integrate logging in React:
   File: apps/web/src/entry.client.tsx
   - Create client-side error logger (console or send to API endpoint)
   - Add error boundary that logs React errors
   - Optional: Send critical frontend errors to backend logging endpoint

5. Update API routes to use structured logging:
   Update all API routes to:
   - Log errors using logger.error() before returning error response
   - Include request context (userId, requestId, path, method)
   - Add custom fields for filtering (apiRoute, statusCode, errorType)
   - Log important events: user signup, payment success, job creation

6. Update .env.example:
   - Add LOG_LEVEL (defaults to 'info')
   - Add LOGTAIL_TOKEN (optional, for free log aggregation)
   - Document NODE_ENV usage (determines pretty vs JSON logging)

7. Create documentation:
   File: docs/LOGGING.md
   - How logging works in this application
   - Log levels and when to use them (error, warn, info, debug)
   - How to view logs locally (pino-pretty output)
   - How to view logs in production (file-based or log aggregation)
   - Optional: Setting up BetterStack/LogTail (free tier)
   - Optional: Setting up Papertrail (free tier)
   - How to search and filter logs
   - Best practices for logging (what to log, what not to log)
   - Understanding log context and correlation IDs

8. Update DEPLOYMENT.md:
   - Add logging section with instructions for viewing logs in production
   - Document free log aggregation options (BetterStack, Papertrail, file-based)

IMPORTANT:
- Pino is 100% FREE and one of the fastest Node.js loggers
- BetterStack/LogTail free tier: 1GB/month (enough for hobby projects)
- Papertrail free tier: 50MB/day (plenty for small apps)
- File-based logging is completely free (requires log rotation)
- Do NOT log passwords, credit cards, or sensitive data
- Structured logging (JSON) makes it easy to search and filter

Location: apps/web/
```

**Verification**:
```bash
cd apps/web
# Start dev server and verify pretty logs appear
npm run dev
# Trigger a test error and verify it's logged with context
# Make API requests and verify request/response logging
```

---

## Priority 2: Important Tasks

### Task 7: Add Rate Limiting

**Prompt for Claude Code**:

```
I need to add rate limiting to API endpoints to prevent abuse.

Requirements:

1. Install rate limiting library:
   - @hono/rate-limiter or similar for Hono

2. Create rate limiting middleware:
   File: apps/web/src/middleware/rateLimit.ts
   Configurations:
   - Authentication endpoints: 5 requests/minute per IP
   - Photo processing: 10 requests/minute per user
   - Billing endpoints: 20 requests/minute per user
   - General API: 100 requests/minute per IP

3. Apply rate limiting to routes:
   - POST /api/auth/signin (5/min per IP)
   - POST /api/auth/signup (5/min per IP)
   - POST /api/process-photos (10/min per user)
   - POST /api/billing/* (20/min per user)

4. Return proper HTTP status code:
   - 429 Too Many Requests
   - Include Retry-After header

5. Add rate limit info to API_DOCUMENTATION.md

6. Add tests for rate limiting:
   File: test/middleware/rateLimit.test.ts
   - Test that limits are enforced
   - Test that limits reset after time window
   - Test different limits for different routes

Location: apps/web/
```

---

### Task 8: Add Request Validation Middleware

**Prompt for Claude Code**:

```
I need centralized request validation middleware using Zod schemas.

Requirements:

1. Install Zod:
   - zod
   - @hono/zod-validator

2. Create Zod schemas for all API endpoints:
   File: apps/web/src/schemas/api.ts
   Schemas needed:
   - ProcessPhotosSchema (fileUrls, prompt)
   - UpdateJobSchema (groupName)
   - CreateCheckoutSchema (lookupKey, quantity, redirectURL)
   - SignUpSchema (email, password, name)
   - SignInSchema (email, password)

3. Create validation middleware:
   File: apps/web/src/middleware/validate.ts
   - Validates request body against Zod schema
   - Returns 400 with detailed error messages on validation failure
   - Type-safe request.body after validation

4. Update API routes to use validation middleware:
   - Remove manual validation code
   - Use validated types from schemas
   - Reduce code duplication

5. Add tests for validation:
   File: test/middleware/validate.test.ts
   - Test valid inputs pass
   - Test invalid inputs are rejected with clear error messages

Location: apps/web/
```

---

## Verification Steps

After completing all tasks, run this comprehensive verification:

```bash
# 1. Code Quality
cd apps/web
npm run lint                 # Should pass with no errors
npm run format:check         # Should pass
npm run type-check           # Should pass

# 2. Tests
npm run test:unit           # Should pass, 80%+ coverage
npm run test:integration    # Should pass
npm run test:coverage       # Should show 70%+ overall coverage

# 3. Database
npm run db:generate         # Should work
npm run db:migrate          # Should apply migrations
npm run db:studio           # Should open Drizzle Studio

# 4. Build
npm run build               # Should build successfully

# 5. Git Hooks
git add .
git commit -m "test"        # Should run pre-commit hooks

# 6. CI/CD (after pushing to GitHub)
# - Check GitHub Actions run successfully
# - Check coverage uploaded to Codecov
# - Check deployment to Vercel succeeds
```

---

## Progress Tracking

Use this checklist to track your progress:

### Week 1: Foundation
- [ ] Task 1: ESLint and Prettier ⏱️ 30min
- [ ] Task 2: Database Migrations ⏱️ 1hr
- [ ] Commit: "Add code quality tools and database migrations"

### Week 2: Testing Infrastructure
- [ ] Task 3: Unit Tests ⏱️ 2-3hrs
- [ ] Task 4 Part 1: Test Infrastructure ⏱️ 1hr
- [ ] Task 4 Part 2: Auth Tests ⏱️ 1hr
- [ ] Commit: "Add unit tests and test infrastructure"

### Week 3: Integration Testing
- [ ] Task 4 Part 3: Billing Tests ⏱️ 2hrs
- [ ] Task 4 Part 4: Photo Processing Tests ⏱️ 2hrs
- [ ] Task 4 Part 5: Job Management Tests ⏱️ 1hr
- [ ] Commit: "Add comprehensive integration tests"

### Week 4: Operations
- [ ] Task 5: CI/CD Pipeline ⏱️ 1hr
- [ ] Task 6: Error Tracking ⏱️ 45min
- [ ] Task 7: Rate Limiting ⏱️ 1hr
- [ ] Task 8: Request Validation ⏱️ 1hr
- [ ] Commit: "Add CI/CD, monitoring, and security"

### Final Verification
- [ ] All tests passing
- [ ] 70%+ code coverage
- [ ] CI/CD pipeline green
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Ready for production deployment

---

## Tips for Success

1. **Start with quick wins**: ESLint/Prettier are fast and provide immediate value
2. **Test incrementally**: Don't write all tests at once
3. **Commit frequently**: After each completed task
4. **Review changes**: Claude is excellent but always review generated code
5. **Ask for clarification**: If Claude's implementation isn't clear, ask for explanation
6. **Run tests often**: Catch issues early
7. **Update docs**: Keep documentation in sync with implementation

---

## Getting Unstuck

If you encounter issues:

1. **Check error messages carefully**: They usually point to the problem
2. **Review the documentation**: DATABASE_SCHEMA.md, API_DOCUMENTATION.md, etc.
3. **Verify environment variables**: Missing env vars cause many issues
4. **Check dependencies**: Make sure all packages are installed
5. **Ask Claude for help**: Provide error messages and context

Example prompt when stuck:
```
I'm getting this error when running [task]:
[paste error message]

Here's what I've tried:
1. [what you tried]
2. [what you tried]

Please help me debug this issue.
```

---

## Success Criteria

You'll know you're production-ready when:

✅ All tests pass with 70%+ coverage
✅ ESLint and Prettier configured with pre-commit hooks
✅ Database migrations working
✅ CI/CD pipeline green on GitHub Actions
✅ Error tracking and logging configured (Pino)
✅ Rate limiting active on API endpoints
✅ Request validation using Zod schemas
✅ No high/critical security vulnerabilities
✅ Build succeeds without errors
✅ Documentation updated and accurate

**Estimated total time**: 3-4 weeks with focused work

---

Good luck! Follow the prompts in order and you'll have a production-ready application in no time. 🚀
