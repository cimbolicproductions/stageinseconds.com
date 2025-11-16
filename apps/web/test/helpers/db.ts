import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import * as schema from '../../src/db/schema'
import * as argon2 from 'argon2'
import { randomBytes } from 'crypto'

// Get test database URL from environment
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

if (!TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Please set it in your .env file for testing.'
  )
}

// Create a test database connection
const pool = new Pool({ connectionString: TEST_DATABASE_URL })
export const testDb = drizzle(pool, { schema })

/**
 * Sets up the test database by running all migrations
 */
export async function setupTestDb(): Promise<void> {
  try {
    await migrate(testDb, { migrationsFolder: './migrations' })
  } catch (error) {
    console.error('Failed to run migrations:', error)
    throw error
  }
}

/**
 * Cleans all tables in the test database
 */
export async function teardownTestDb(): Promise<void> {
  try {
    // Delete in reverse order of dependencies to avoid foreign key constraints
    await testDb.delete(schema.purchases)
    await testDb.delete(schema.photoJobs)
    await testDb.delete(schema.userCredits)
    await testDb.delete(schema.authSessions)
    await testDb.delete(schema.authAccounts)
    await testDb.delete(schema.authVerificationToken)
    await testDb.delete(schema.authUsers)
  } catch (error) {
    console.error('Failed to clean test database:', error)
    throw error
  }
}

/**
 * Creates a test user with a hashed password
 */
export async function createTestUser(
  email?: string,
  password?: string,
  name?: string
): Promise<{
  user: typeof schema.authUsers.$inferSelect
  account: typeof schema.authAccounts.$inferSelect
  plainPassword: string
}> {
  const plainPassword = password || 'TestPassword123!'
  const userEmail =
    email || `test-${randomBytes(8).toString('hex')}@example.com`
  const userName = name || 'Test User'

  // Create user
  const [user] = await testDb
    .insert(schema.authUsers)
    .values({
      email: userEmail,
      name: userName,
    })
    .returning()

  // Hash password
  const hashedPassword = await argon2.hash(plainPassword)

  // Create credentials account
  const [account] = await testDb
    .insert(schema.authAccounts)
    .values({
      userId: user.id,
      provider: 'credentials',
      type: 'credentials',
      providerAccountId: user.email,
      password: hashedPassword,
    })
    .returning()

  return { user, account, plainPassword }
}

/**
 * Creates a valid session for a user
 */
export async function createTestSession(
  userId: string,
  expiresInDays: number = 30
): Promise<typeof schema.authSessions.$inferSelect> {
  const sessionToken = randomBytes(32).toString('hex')
  const expires = new Date()
  expires.setDate(expires.getDate() + expiresInDays)

  const [session] = await testDb
    .insert(schema.authSessions)
    .values({
      userId,
      sessionToken,
      expires,
    })
    .returning()

  return session
}

/**
 * Grants credits to a user
 */
export async function grantCredits(
  userId: string,
  amount: number
): Promise<void> {
  // Check if user credits record exists
  const existingCredits = await testDb.query.userCredits.findFirst({
    where: (credits, { eq }) => eq(credits.userId, userId),
  })

  if (existingCredits) {
    // Update existing credits
    await testDb
      .update(schema.userCredits)
      .set({
        credits: sql`credits + ${amount}`,
        updatedAt: new Date(),
      })
      .where(sql`user_id = ${userId}`)
  } else {
    // Create new credits record
    await testDb.insert(schema.userCredits).values({
      userId,
      credits: amount.toString(),
      freeUsed: 0,
    })
  }
}

/**
 * Creates a test photo job
 */
export async function createTestJob(
  userId: string,
  overrides?: Partial<typeof schema.photoJobs.$inferInsert>
): Promise<typeof schema.photoJobs.$inferSelect> {
  const [job] = await testDb
    .insert(schema.photoJobs)
    .values({
      userId,
      prompt: 'Test prompt',
      photoCount: 5,
      cost: '5.00',
      status: 'pending',
      downloadUrl: null,
      groupName: null,
      ...overrides,
    })
    .returning()

  return job
}

/**
 * Creates a test purchase record
 */
export async function createTestPurchase(
  userId: string,
  overrides?: Partial<typeof schema.purchases.$inferInsert>
): Promise<typeof schema.purchases.$inferSelect> {
  const [purchase] = await testDb
    .insert(schema.purchases)
    .values({
      userId,
      stripeSessionId: `cs_test_${randomBytes(16).toString('hex')}`,
      amount: '10.00',
      creditsPurchased: '20.00',
      status: 'completed',
      ...overrides,
    })
    .returning()

  return purchase
}

/**
 * Gets user credits
 */
export async function getUserCredits(
  userId: string
): Promise<typeof schema.userCredits.$inferSelect | undefined> {
  return testDb.query.userCredits.findFirst({
    where: (credits, { eq }) => eq(credits.userId, userId),
  })
}

/**
 * Closes the database connection pool
 */
export async function closeTestDb(): Promise<void> {
  await pool.end()
}
