import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  serial,
  integer,
  decimal,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ==================================
// 1. AUTHENTICATION TABLES
// ==================================

/**
 * Users table - stores user account information
 */
export const authUsers = pgTable(
  'auth_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: timestamp('emailVerified'),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => {
    return {
      emailIdx: uniqueIndex('idx_auth_users_email').on(table.email),
      idIdx: index('idx_auth_users_id').on(table.id),
    }
  }
)

/**
 * Accounts table - stores authentication provider accounts
 */
export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: serial('id').primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    scope: text('scope'),
    sessionState: text('session_state'),
    tokenType: varchar('token_type', { length: 255 }),
    password: text('password'), // Argon2 hashed password for credentials provider
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => {
    return {
      userIdIdx: index('idx_auth_accounts_user_id').on(table.userId),
      providerAccountIdx: index('idx_auth_accounts_provider_account').on(
        table.providerAccountId,
        table.provider
      ),
      providerAccountUnique: uniqueIndex(
        'auth_accounts_provider_account_unique'
      ).on(table.providerAccountId, table.provider),
    }
  }
)

/**
 * Sessions table - stores active user sessions
 */
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: serial('id').primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    expires: timestamp('expires').notNull(),
    sessionToken: varchar('sessionToken', { length: 255 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => {
    return {
      sessionTokenIdx: uniqueIndex('idx_auth_sessions_token').on(
        table.sessionToken
      ),
      userIdIdx: index('idx_auth_sessions_user_id').on(table.userId),
    }
  }
)

/**
 * Verification tokens - for email verification
 */
export const authVerificationToken = pgTable(
  'auth_verification_token',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires').notNull(),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.identifier, table.token] }),
      identifierTokenIdx: index('idx_auth_verification_token').on(
        table.identifier,
        table.token
      ),
    }
  }
)

// ==================================
// 2. APPLICATION TABLES
// ==================================

/**
 * Photo jobs table - stores photo processing jobs
 */
export const photoJobs = pgTable(
  'photo_jobs',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').references(() => authUsers.id, {
      onDelete: 'cascade',
    }),
    prompt: text('prompt').notNull(),
    photoCount: integer('photo_count').notNull(),
    cost: decimal('cost', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    downloadUrl: text('download_url'),
    groupName: varchar('group_name', { length: 140 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => {
    return {
      userIdIdx: index('idx_photo_jobs_user_id').on(table.userId),
      statusIdx: index('idx_photo_jobs_status').on(table.status),
      createdAtIdx: index('idx_photo_jobs_created_at').on(table.createdAt),
    }
  }
)

/**
 * User credits table - stores credit balances
 */
export const userCredits = pgTable(
  'user_credits',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    credits: decimal('credits', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    freeUsed: integer('free_used').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => {
    return {
      userIdIdx: uniqueIndex('idx_user_credits_user_id').on(table.userId),
    }
  }
)

/**
 * Purchases table - stores Stripe purchase transactions
 */
export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    stripeSessionId: varchar('stripe_session_id', { length: 255 })
      .notNull()
      .unique(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    creditsPurchased: decimal('credits_purchased', {
      precision: 10,
      scale: 2,
    }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => {
    return {
      stripeSessionIdx: uniqueIndex('idx_purchases_stripe_session').on(
        table.stripeSessionId
      ),
      userIdIdx: index('idx_purchases_user_id').on(table.userId),
    }
  }
)
