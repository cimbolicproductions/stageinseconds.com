# Database Schema Documentation

**Database**: PostgreSQL (Neon Serverless recommended)
**Last Updated**: 2025-11-09

This document describes the database schema for stageinseconds.com and provides migration guidance.

---

## Table of Contents

- [Overview](#overview)
- [Database Tables](#database-tables)
- [Schema SQL](#schema-sql)
- [Migration Strategy](#migration-strategy)
- [Setting Up Locally](#setting-up-locally)
- [Seed Data](#seed-data)

---

## Overview

The application uses PostgreSQL with 6 primary tables:

1. **Authentication Tables** (4 tables - managed by @auth/core)
   - `auth_users` - User accounts
   - `auth_accounts` - Authentication provider accounts
   - `auth_sessions` - Active user sessions
   - `auth_verification_token` - Email verification tokens

2. **Application Tables** (2 tables - custom business logic)
   - `photo_jobs` - Photo processing jobs
   - `user_credits` - User credit balances and tracking

3. **Additional Tables**
   - `purchases` - Purchase transaction records

---

## Database Tables

### 1. auth_users

Stores user account information.

**Columns**:
```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  "emailVerified" TIMESTAMP,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_id ON auth_users(id);
```

**Notes**:
- `id` is a UUID generated automatically
- `email` must be unique
- `emailVerified` is nullable (email verification not yet implemented)
- `image` can store avatar/profile picture URL

---

### 2. auth_accounts

Stores authentication provider accounts linked to users.

**Columns**:
```sql
CREATE TABLE auth_accounts (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  provider VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  access_token TEXT,
  expires_at INTEGER,
  refresh_token TEXT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type VARCHAR(255),
  password TEXT, -- Argon2 hashed password for credentials provider
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("providerAccountId", provider)
);
```

**Indexes**:
```sql
CREATE INDEX idx_auth_accounts_user_id ON auth_accounts("userId");
CREATE INDEX idx_auth_accounts_provider_account ON auth_accounts("providerAccountId", provider);
```

**Notes**:
- Links users to their authentication methods
- Currently uses `credentials` provider (email/password)
- `password` field stores Argon2 hashed password
- Supports future OAuth providers (Google, GitHub, etc.)
- Composite unique constraint on `providerAccountId` + `provider`

---

### 3. auth_sessions

Stores active user sessions for JWT token validation.

**Columns**:
```sql
CREATE TABLE auth_sessions (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_auth_sessions_token ON auth_sessions("sessionToken");
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions("userId");
```

**Notes**:
- One session token per active login
- Sessions expire based on `expires` timestamp
- Automatically deleted when user is deleted (CASCADE)

---

### 4. auth_verification_token

Stores email verification tokens (not currently used but required by adapter).

**Columns**:
```sql
CREATE TABLE auth_verification_token (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

**Indexes**:
```sql
CREATE INDEX idx_auth_verification_token ON auth_verification_token(identifier, token);
```

**Notes**:
- Composite primary key on `identifier` (email) and `token`
- Used for email verification flow (not yet implemented)
- Tokens should be deleted after use

---

### 5. photo_jobs

Stores photo processing jobs and their status.

**Columns**:
```sql
CREATE TABLE photo_jobs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  photo_count INTEGER NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  download_url TEXT,
  group_name VARCHAR(140), -- Optional user-defined group label
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE INDEX idx_photo_jobs_user_id ON photo_jobs(user_id);
CREATE INDEX idx_photo_jobs_status ON photo_jobs(status);
CREATE INDEX idx_photo_jobs_created_at ON photo_jobs(created_at DESC);
```

**Status Values**:
- `pending` - Job created, not yet started
- `processing` - AI processing in progress
- `completed` - Job finished successfully
- `failed` - Job failed (error during processing)

**Notes**:
- `user_id` can be NULL for demo jobs (see admin endpoints)
- `cost` is in USD (e.g., 5.00 = $5.00)
- `download_url` contains the ZIP file URL with processed photos
- `group_name` max length 140 chars (user-defined organization)
- `updated_at` changes when job status updates or group_name is modified

**Referenced in**:
- [src/app/api/process-photos/route.js:96](apps/web/src/app/api/process-photos/route.js#L96) - Insert new job
- [src/app/api/dashboard/route.js:24](apps/web/src/app/api/dashboard/route.js#L24) - Query user jobs
- [src/app/api/jobs/[id]/route.js:47](apps/web/src/app/api/jobs/[id]/route.js#L47) - Update group_name

---

### 6. user_credits

Stores user credit balances for the credit-based billing system.

**Columns**:
```sql
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  credits DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  free_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_user_credits_user_id ON user_credits(user_id);
```

**Notes**:
- One record per user
- `credits` is the paid credit balance (in USD, e.g., 10.00 = $10.00)
- `free_used` tracks free trial usage (not currently implemented)
- Upserts on purchase using `ON CONFLICT (user_id) DO UPDATE`
- Updated via transactions when credits are added or spent

**Referenced in**:
- [src/app/api/billing/confirm/route.js:116](apps/web/src/app/api/billing/confirm/route.js#L116) - Add credits on purchase
- [src/app/api/billing/confirm/route.js:130](apps/web/src/app/api/billing/confirm/route.js#L130) - Query user credits

---

### 7. purchases

Stores Stripe purchase transaction records.

**Columns**:
```sql
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  credits_purchased DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_purchases_stripe_session ON purchases(stripe_session_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
```

**Status Values**:
- `pending` - Checkout session created
- `completed` - Payment successful, credits added
- `failed` - Payment failed

**Notes**:
- `stripe_session_id` is unique to prevent duplicate credit grants
- `amount` is the USD amount charged
- `credits_purchased` is the credit amount granted (usually same as amount)

---

## Schema SQL

Complete schema creation script:

```sql
-- ==================================
-- 1. AUTHENTICATION TABLES
-- ==================================

-- Users table
CREATE TABLE auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  "emailVerified" TIMESTAMP,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_id ON auth_users(id);

-- Accounts table (providers: credentials, google, etc.)
CREATE TABLE auth_accounts (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  provider VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  access_token TEXT,
  expires_at INTEGER,
  refresh_token TEXT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type VARCHAR(255),
  password TEXT, -- Argon2 hashed password for credentials provider
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("providerAccountId", provider)
);

CREATE INDEX idx_auth_accounts_user_id ON auth_accounts("userId");
CREATE INDEX idx_auth_accounts_provider_account ON auth_accounts("providerAccountId", provider);

-- Sessions table
CREATE TABLE auth_sessions (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_auth_sessions_token ON auth_sessions("sessionToken");
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions("userId");

-- Verification tokens (for email verification)
CREATE TABLE auth_verification_token (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX idx_auth_verification_token ON auth_verification_token(identifier, token);

-- ==================================
-- 2. APPLICATION TABLES
-- ==================================

-- Photo processing jobs
CREATE TABLE photo_jobs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  photo_count INTEGER NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  download_url TEXT,
  group_name VARCHAR(140),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_photo_jobs_user_id ON photo_jobs(user_id);
CREATE INDEX idx_photo_jobs_status ON photo_jobs(status);
CREATE INDEX idx_photo_jobs_created_at ON photo_jobs(created_at DESC);

-- User credits and billing
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  credits DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  free_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_credits_user_id ON user_credits(user_id);

-- Purchase transactions
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  credits_purchased DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_purchases_stripe_session ON purchases(stripe_session_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);

-- ==================================
-- 3. TRIGGERS (Optional)
-- ==================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_users_updated_at
  BEFORE UPDATE ON auth_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_jobs_updated_at
  BEFORE UPDATE ON photo_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration Strategy

### Recommended Tools

Choose one of the following migration tools:

#### Option 1: Prisma (Recommended for TypeScript projects)

**Pros**:
- Type-safe database access
- Automatic migration generation
- Great TypeScript integration
- Visual database browser

**Setup**:
```bash
npm install prisma @prisma/client --save-dev
npx prisma init
```

Create `prisma/schema.prisma` based on the SQL schema above, then:
```bash
npx prisma migrate dev --name init
```

#### Option 2: Drizzle ORM (Lightweight alternative)

**Pros**:
- Lightweight and fast
- SQL-like syntax
- TypeScript-first
- No code generation

**Setup**:
```bash
npm install drizzle-orm drizzle-kit --save-dev
```

#### Option 3: node-pg-migrate (Raw SQL migrations)

**Pros**:
- No ORM required
- Full SQL control
- Lightweight

**Setup**:
```bash
npm install node-pg-migrate --save-dev
```

---

### Migration Steps

1. **Export current schema** (if database already exists):
   ```bash
   pg_dump -h your-host -U your-user -d your-db --schema-only > current-schema.sql
   ```

2. **Create initial migration**:
   - Save the complete schema SQL above as `migrations/001_initial_schema.sql`

3. **Add migration to package.json**:
   ```json
   {
     "scripts": {
       "db:migrate": "node-pg-migrate up",
       "db:migrate:down": "node-pg-migrate down"
     }
   }
   ```

4. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

---

## Setting Up Locally

### Step 1: Create PostgreSQL Database

**Using Neon (recommended)**:
1. Go to https://console.neon.tech
2. Create a new project
3. Copy the connection string
4. Add to `.env` as `DATABASE_URL`

**Using Local PostgreSQL**:
```bash
# Create database
createdb stageinseconds

# Set connection string in .env
DATABASE_URL=postgresql://localhost/stageinseconds
```

### Step 2: Run Schema Creation

**Option A: Using psql**:
```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

**Option B: Using migration tool**:
```bash
npm run db:migrate
```

### Step 3: Verify Tables Created

```bash
psql $DATABASE_URL -c "\dt"
```

Expected output:
```
                List of relations
 Schema |          Name           | Type  |  Owner
--------+-------------------------+-------+----------
 public | auth_accounts           | table | postgres
 public | auth_sessions           | table | postgres
 public | auth_users              | table | postgres
 public | auth_verification_token | table | postgres
 public | photo_jobs              | table | postgres
 public | purchases               | table | postgres
 public | user_credits            | table | postgres
```

---

## Seed Data

### Development Seed Script

Create `scripts/seed-dev.sql`:

```sql
-- Create test user
INSERT INTO auth_users (id, name, email, "emailVerified")
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Create credentials account with test password (password: "test123")
INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'credentials', 'credentials', '550e8400-e29b-41d4-a716-446655440000', '$argon2id$v=19$m=65536,t=3,p=4$test_hash_here')
ON CONFLICT ("providerAccountId", provider) DO NOTHING;

-- Give test user some credits
INSERT INTO user_credits (user_id, credits, free_used)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 100.00, 0)
ON CONFLICT (user_id) DO NOTHING;

-- Create sample completed job
INSERT INTO photo_jobs (user_id, prompt, photo_count, cost, status, download_url, group_name)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Modern living room with natural lighting', 5, 25.00, 'completed', 'https://example.com/demo.zip', 'Sample Project');
```

Run with:
```bash
psql $DATABASE_URL -f scripts/seed-dev.sql
```

---

## Rollback Strategy

### Manual Rollback

```sql
-- Drop all tables (DANGER: destroys all data)
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS user_credits CASCADE;
DROP TABLE IF EXISTS photo_jobs CASCADE;
DROP TABLE IF EXISTS auth_verification_token CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS auth_accounts CASCADE;
DROP TABLE IF EXISTS auth_users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

### Migration Tool Rollback

```bash
# With node-pg-migrate
npm run db:migrate:down

# With Prisma
npx prisma migrate reset
```

---

## Backup Strategy

### Automated Backups (Neon)

Neon provides automatic backups. Configure in your project settings.

### Manual Backup

```bash
# Full backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Schema only
pg_dump $DATABASE_URL --schema-only > schema-backup.sql

# Data only
pg_dump $DATABASE_URL --data-only > data-backup.sql
```

### Restore from Backup

```bash
psql $DATABASE_URL < backup-20250109.sql
```

---

## Monitoring Queries

### Check table sizes:
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check user count:
```sql
SELECT COUNT(*) FROM auth_users;
```

### Check active sessions:
```sql
SELECT COUNT(*) FROM auth_sessions WHERE expires > NOW();
```

### Check job statistics:
```sql
SELECT
  status,
  COUNT(*) as count,
  SUM(cost) as total_cost
FROM photo_jobs
GROUP BY status;
```

---

## Next Steps

1. Choose a migration tool (Prisma recommended)
2. Create `migrations/001_initial_schema.sql` from the schema SQL above
3. Run initial migration
4. Add seed data for development
5. Document migration process in deployment guide
6. Set up automated backups

**Related Documentation**:
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) - Migration is Priority 1, Task 2
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment-specific migration steps
- [.env.example](./.env.example) - Database connection string configuration
