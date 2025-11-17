/**
 * Client-side logger for frontend errors
 * Logs errors to the console and optionally sends them to a backend endpoint
 */

interface LogContext {
  userId?: string
  path?: string
  userAgent?: string
  [key: string]: unknown
}

interface ErrorLogData {
  message: string
  stack?: string
  context: LogContext
  timestamp: string
  level: 'error' | 'warn' | 'info'
}

class ClientLogger {
  private isDevelopment = import.meta.env.DEV

  /**
   * Log an error on the client side
   */
  error(error: Error | unknown, context: LogContext = {}): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    const logData: ErrorLogData = {
      message: errorObj.message,
      stack: errorObj.stack,
      context: {
        ...context,
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      },
      timestamp: new Date().toISOString(),
      level: 'error',
    }

    // Always log to console in development
    if (this.isDevelopment) {
      console.error('[Client Error]', errorObj, logData.context)
    } else {
      // In production, use standard console.error
      console.error('[Client Error]', errorObj)
    }

    // Optionally send to backend logging endpoint
    this.sendToBackend(logData)
  }

  /**
   * Log a warning on the client side
   */
  warn(message: string, context: LogContext = {}): void {
    const logData: ErrorLogData = {
      message,
      context: {
        ...context,
        path: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
      level: 'warn',
    }

    if (this.isDevelopment) {
      console.warn('[Client Warning]', message, logData.context)
    } else {
      console.warn('[Client Warning]', message)
    }

    this.sendToBackend(logData)
  }

  /**
   * Log an info message on the client side
   */
  info(message: string, context: LogContext = {}): void {
    const logData: ErrorLogData = {
      message,
      context: {
        ...context,
        path: window.location.pathname,
      },
      timestamp: new Date().toISOString(),
      level: 'info',
    }

    if (this.isDevelopment) {
      console.info('[Client Info]', message, logData.context)
    }
  }

  /**
   * Send log data to backend endpoint
   * This is optional and only sends critical errors
   */
  private sendToBackend(logData: ErrorLogData): void {
    // Only send errors (not warnings or info) to backend
    if (logData.level !== 'error') {
      return
    }

    // Use navigator.sendBeacon for reliability (works even when page is closing)
    // Fallback to fetch if sendBeacon is not available
    try {
      const endpoint = '/api/logs/client'
      // eslint-disable-next-line no-undef
      const blob = new Blob([JSON.stringify(logData)], {
        type: 'application/json',
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, blob)
      } else {
        // Fallback to fetch (but don't await it)
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logData),
          keepalive: true,
        }).catch(() => {
          // Silently fail - don't want to cause errors in error logging
        })
      }
    } catch {
      // Silently fail - don't want to cause errors in error logging
    }
  }
}

export const clientLogger = new ClientLogger()

/**
 * Set up global error handlers
 */
if (typeof window !== 'undefined') {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    clientLogger.error(event.reason, {
      type: 'unhandledRejection',
    })
  })

  // Catch global errors
  window.addEventListener('error', event => {
    clientLogger.error(event.error || event.message, {
      type: 'globalError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })
}
