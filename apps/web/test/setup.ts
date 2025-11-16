import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { setupTestDb, teardownTestDb, closeTestDb } from './helpers/db'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

/**
 * Global test setup for integration tests
 * This file is automatically loaded by Vitest before running tests
 */

// Setup MSW server for mocking external API calls
export const server = setupServer(...handlers)

// Start MSW server before all tests
beforeAll(async () => {
  // Only start MSW if not testing against live server
  // MSW should only intercept external APIs (Stripe, Gemini), not our own server
  server.listen({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests (our server)
  })

  // Run database migrations
  await setupTestDb()
})

// Clean database before each test to ensure isolation
beforeEach(async () => {
  await teardownTestDb()
})

// Reset MSW handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Cleanup after all tests
afterAll(async () => {
  // Stop MSW server
  server.close()

  // Close database connections
  await closeTestDb()
})
