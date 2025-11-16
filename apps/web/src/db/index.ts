import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from './schema'

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Create Drizzle instance
export const db = drizzle(pool, { schema })

// Export all schema tables for convenience
export * from './schema'
