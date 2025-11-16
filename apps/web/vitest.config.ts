import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env file for tests
dotenv.config({ path: path.resolve(__dirname, '.env') })

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Load setup files - setupTests.ts for unit tests, test/setup.ts for integration tests
    setupFiles: ['./test/setupTests.ts', './test/setup.ts'],
    // Use TEST_DATABASE_URL for integration tests
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '__create/**',
        'src/entry.client.tsx',
        'src/entry.server.tsx',
        '**/*.config.{js,ts}',
      ],
      thresholds: {
        'src/utils/validators.ts': {
          lines: 95,
          functions: 100,
          branches: 95,
          statements: 95,
        },
      },
    },
    // Increase timeout for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  cacheDir: './.vitest',
})
