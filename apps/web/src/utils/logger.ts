import pino from 'pino'
import type { Logger } from 'pino'

// Get log level from environment variable or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info'
const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const isTest = nodeEnv === 'test'

// Create base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: isTest ? 'silent' : logLevel,
  // Serialize errors properly with stack traces
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  // Add base context that appears in all logs
  base: {
    env: nodeEnv,
    pid: process.pid,
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
}

// Create the logger with environment-specific configuration
let logger: Logger

if (isProduction) {
  // Production: JSON logging for log aggregation services
  // Optional: Add LogTail/BetterStack transport if token is provided
  const logtailToken = process.env.LOGTAIL_TOKEN

  if (logtailToken) {
    // Use LogTail/BetterStack transport
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Logtail } = require('@logtail/node')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LogtailTransport } = require('@logtail/pino')

    const logtail = new Logtail(logtailToken)

    logger = pino(baseConfig, new LogtailTransport(logtail))
  } else {
    // Standard JSON logging
    logger = pino(baseConfig)
  }
} else if (isTest) {
  // Test: Silent logging unless explicitly set to a different level
  logger = pino(baseConfig)
} else {
  // Development: Pretty printing with colors
  logger = pino({
    ...baseConfig,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  })
}

// Helper function to create a child logger with context
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context)
}

// Helper function to sanitize URLs by removing sensitive query parameters
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const sensitiveParams = [
      'token',
      'api_key',
      'apikey',
      'key',
      'secret',
      'password',
      'access_token',
    ]

    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]')
      }
    })

    return urlObj.toString()
  } catch {
    // If URL parsing fails, return original (might be a relative URL)
    return url
  }
}

// Helper function to log errors with proper context
export function logError(
  error: Error | unknown,
  context: {
    requestId?: string
    userId?: string
    path?: string
    method?: string
    statusCode?: number
    [key: string]: unknown
  }
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))

  logger.error(
    {
      ...context,
      err: errorObj,
      errorMessage: errorObj.message,
      errorStack: errorObj.stack,
    },
    `Error: ${errorObj.message}`
  )
}

// Helper function to log important business events
export function logEvent(
  eventName: string,
  data: {
    userId?: string
    requestId?: string
    [key: string]: unknown
  }
): void {
  logger.info(
    {
      ...data,
      event: eventName,
    },
    `Event: ${eventName}`
  )
}

export default logger
