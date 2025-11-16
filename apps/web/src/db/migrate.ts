import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import { Pool } from '@neondatabase/serverless'

// Load environment variables
config()

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  console.log('🔄 Running migrations...')

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    await migrate(db, { migrationsFolder: './migrations' })
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
