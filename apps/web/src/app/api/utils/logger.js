import logger, {
  logError as baseLogError,
  logEvent as baseLogEvent,
} from '../../../utils/logger.ts'

/**
 * Extract request context for logging
 * @param {Request} request - The request object
 * @returns {Object} - Context object with request information
 */
function getRequestContext(request) {
  const url = new URL(request.url)
  return {
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get('user-agent'),
    // Extract requestId from headers if available
    requestId: request.headers.get('x-request-id'),
  }
}

/**
 * Log an error in an API route
 * @param {Error|unknown} error - The error to log
 * @param {Request} request - The request object
 * @param {Object} additionalContext - Additional context to log
 */
export function logError(error, request, additionalContext = {}) {
  const context = {
    ...getRequestContext(request),
    ...additionalContext,
  }

  baseLogError(error, context)
}

/**
 * Log an important business event
 * @param {string} eventName - The name of the event
 * @param {Request} request - The request object
 * @param {Object} data - Additional event data
 */
export function logEvent(eventName, request, data = {}) {
  const context = {
    ...getRequestContext(request),
    ...data,
  }

  baseLogEvent(eventName, context)
}

/**
 * Log a warning
 * @param {string} message - The warning message
 * @param {Request} request - The request object
 * @param {Object} additionalContext - Additional context
 */
export function logWarn(message, request, additionalContext = {}) {
  const context = {
    ...getRequestContext(request),
    ...additionalContext,
  }

  logger.warn(context, message)
}

/**
 * Log an info message
 * @param {string} message - The info message
 * @param {Request} request - The request object
 * @param {Object} additionalContext - Additional context
 */
export function logInfo(message, request, additionalContext = {}) {
  const context = {
    ...getRequestContext(request),
    ...additionalContext,
  }

  logger.info(context, message)
}

export default logger
