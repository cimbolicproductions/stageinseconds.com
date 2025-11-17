# Logging and Error Tracking

This document explains how logging works in the stageinseconds.com application, how to use it effectively, and how to set up optional log aggregation services.

## Table of Contents

- [Overview](#overview)
- [Log Levels](#log-levels)
- [Local Development](#local-development)
- [Production Logging](#production-logging)
- [Log Aggregation Services](#log-aggregation-services)
- [Searching and Filtering Logs](#searching-and-filtering-logs)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The application uses [Pino](https://getpino.io/), a fast and low-overhead Node.js logger, for structured logging. Pino provides:

- **Fast performance**: One of the fastest Node.js loggers available
- **Structured logging**: JSON format for easy parsing and filtering
- **Multiple log levels**: trace, debug, info, warn, error, fatal
- **Context enrichment**: Automatic request correlation, user tracking, etc.
- **Pretty printing**: Human-readable logs in development
- **Production ready**: JSON logs optimized for log aggregation

### Architecture

```
┌─────────────────┐
│  API Routes     │  → Use logError(), logEvent(), logWarn()
└────────┬────────┘
         │
┌────────▼────────┐
│  Logger Utils   │  → apps/web/src/app/api/utils/logger.js
└────────┬────────┘
         │
┌────────▼────────┐
│  Pino Logger    │  → apps/web/src/utils/logger.ts
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────────┐
│ Console│  │ LogTail/   │ (optional)
│ (dev) │  │ BetterStack│
└───────┘  └───────────┘
```

## Log Levels

Pino supports the following log levels (in order of severity):

### `trace` (10)
**When to use**: Very detailed debugging information, typically disabled in production.
```javascript
logger.trace({ userId, data }, 'Processing user data');
```

### `debug` (20)
**When to use**: Debugging information useful during development.
```javascript
logger.debug({ query, results }, 'Database query completed');
```

### `info` (30) - Default in production
**When to use**: Important business events that should be logged in production.
```javascript
logEvent('user_signup', request, { userId, email });
logEvent('payment_success', request, { userId, amount, stripeSessionId });
logEvent('photo_processing_completed', request, { userId, jobId, photoCount });
```

### `warn` (40)
**When to use**: Warning conditions that might need attention but aren't errors.
```javascript
logWarn('Missing optional configuration', request, { config: 'RESEND_API_KEY' });
logWarn('Rate limit approaching', request, { userId, requestCount });
```

### `error` (50)
**When to use**: Errors that need attention and investigation.
```javascript
logError(error, request, { apiRoute: 'process-photos', userId, statusCode: 500 });
```

### `fatal` (60)
**When to use**: Critical errors that require immediate action (automatically handled for uncaught exceptions).
```javascript
logger.fatal({ err: error }, 'Application crash');
```

## Local Development

### Viewing Logs

In development (`NODE_ENV=development`), logs are pretty-printed to the console with colors and formatted timestamps:

```bash
npm run dev
```

**Example output:**
```
[14:23:45] INFO: POST /api/process-photos 200 1234ms
  requestId: "abc123"
  method: "POST"
  path: "/api/process-photos"
  statusCode: 200
  duration: 1234
  userAgent: "Mozilla/5.0..."

[14:23:46] INFO: Event: photo_processing_completed
  userId: "user_123"
  jobId: "job_456"
  photoCount: 5
  cost: 5.0
```

### Adjusting Log Level

Set the `LOG_LEVEL` environment variable in your `.env` file:

```bash
# Show all logs including debug messages
LOG_LEVEL=debug

# Only show info, warn, error, fatal (production default)
LOG_LEVEL=info

# Only show errors and fatal messages
LOG_LEVEL=error
```

## Production Logging

### JSON Logging

In production (`NODE_ENV=production`), logs are output as JSON for easy parsing by log aggregation services:

```json
{
  "level": 30,
  "time": 1699564825000,
  "pid": 1234,
  "env": "production",
  "requestId": "abc123",
  "method": "POST",
  "path": "/api/process-photos",
  "statusCode": 200,
  "duration": 1234,
  "msg": "POST /api/process-photos 200 1234ms"
}
```

### Viewing Production Logs

**Option 1: Server logs (self-hosted)**
```bash
# View logs from your server
pm2 logs stageinseconds
# or
journalctl -u stageinseconds -f
# or
docker logs -f stageinseconds
```

**Option 2: Log aggregation service (recommended)**
- Use BetterStack/LogTail, Papertrail, or similar service
- See [Log Aggregation Services](#log-aggregation-services) below

## Log Aggregation Services

For production deployments, we recommend using a log aggregation service for centralized logging, searching, and alerting.

### BetterStack / LogTail (Recommended)

**Free tier**: 1GB/month, 3-day retention

**Setup:**

1. Sign up at [https://betterstack.com/logs](https://betterstack.com/logs) or [https://logtail.com](https://logtail.com)

2. Create a new source and copy your source token

3. Add the token to your `.env` file:
   ```bash
   LOGTAIL_TOKEN=your-logtail-source-token-here
   ```

4. Restart your application:
   ```bash
   npm run dev  # or your production start command
   ```

5. Logs will now automatically stream to LogTail/BetterStack

**Features:**
- Live tailing of logs
- Full-text search
- Filtering by level, request ID, user ID, etc.
- Alerts and notifications
- SQL-like query language

### Papertrail (Alternative)

**Free tier**: 50MB/day, 48-hour search, 7-day archives

**Setup:**

1. Sign up at [https://papertrailapp.com](https://papertrailapp.com)

2. Get your log destination (e.g., `logs.papertrailapp.com:12345`)

3. Install Pino Papertrail transport:
   ```bash
   npm install pino-papertrail
   ```

4. Update `apps/web/src/utils/logger.ts` to add Papertrail transport (see Pino docs)

### File-based Logging (Self-hosted, Free)

For completely free logging without external services:

1. Install pino-roll for log rotation:
   ```bash
   npm install pino-roll
   ```

2. Update your logger configuration to write to files with rotation

3. Use `logrotate` or similar tools to manage log files

## Searching and Filtering Logs

### Log Context Fields

All logs include context for easy filtering:

**Request context:**
- `requestId`: Unique ID for each request (for tracing)
- `method`: HTTP method (GET, POST, etc.)
- `path`: Request path
- `statusCode`: Response status code
- `duration`: Request duration in milliseconds
- `userAgent`: Client user agent

**User context:**
- `userId`: Authenticated user ID
- `email`: User email (when authenticated)

**Business context:**
- `jobId`: Photo processing job ID
- `stripeSessionId`: Stripe checkout session ID
- `photoCount`: Number of photos processed
- `cost`: Cost of the operation
- `credits`: User credits consumed

**Error context:**
- `err.message`: Error message
- `err.stack`: Error stack trace
- `errorType`: Custom error classification
- `apiRoute`: Which API route threw the error

### Example Queries

**BetterStack/LogTail:**
```sql
-- Find all errors for a specific user
userId = "user_123" AND level >= 50

-- Find slow requests (>1 second)
duration > 1000

-- Find all payment events
event = "checkout_session_created"

-- Find errors in photo processing
apiRoute = "process-photos" AND level >= 50

-- Trace a specific request
requestId = "abc123"
```

**Papertrail:**
```
userId:user_123 level:error
duration:>1000
event:checkout_session_created
```

## Best Practices

### What to Log

**✅ DO log:**
- Important business events (user signup, payments, job completion)
- All errors with full context
- Warnings that might indicate problems
- Slow requests or operations
- Authentication/authorization events
- Rate limiting events

**❌ DON'T log:**
- Passwords or secrets
- Credit card numbers
- Full request bodies (may contain sensitive data)
- Personal identifiable information (PII) unless necessary
- Tokens or API keys
- Session cookies

### Privacy and Security

The logger automatically sanitizes URLs to remove sensitive query parameters:
- `token`, `api_key`, `apikey`, `key`, `secret`, `password`, `access_token`

**Example:**
```javascript
// Original: https://example.com/api/data?token=abc123&foo=bar
// Sanitized: https://example.com/api/data?token=[REDACTED]&foo=bar
```

### Using Loggers in API Routes

**Import the logger helpers:**
```javascript
import { logError, logEvent, logWarn, logInfo } from '@/app/api/utils/logger.js';
```

**Log errors:**
```javascript
try {
  // Your code
} catch (error) {
  logError(error, request, {
    apiRoute: 'my-route',
    userId: session?.user?.id,
    statusCode: 500,
  });
  return Response.json({ error: 'Internal error' }, { status: 500 });
}
```

**Log business events:**
```javascript
logEvent('user_signup', request, {
  userId: newUser.id,
  email: newUser.email,
});
```

**Log warnings:**
```javascript
if (!process.env.RESEND_API_KEY) {
  logWarn('Email service not configured', request, {
    apiRoute: 'send-verification',
  });
}
```

### Request Correlation

Every request gets a unique `requestId` that's included in all logs. Use this to trace a request through your entire application:

1. Request comes in → `requestId` is generated
2. All logs for that request include the same `requestId`
3. Search logs by `requestId` to see the full request lifecycle

## Troubleshooting

### Logs not appearing

**Check log level:**
```bash
# In .env
LOG_LEVEL=debug
```

**Check NODE_ENV:**
```bash
# Should be 'development' for pretty logs, 'production' for JSON
NODE_ENV=development
```

### LogTail/BetterStack not receiving logs

1. Verify token is correct in `.env`
2. Check network connectivity
3. Verify the `@logtail/pino` package is installed
4. Check LogTail dashboard for error messages
5. Restart your application after adding the token

### Too many logs

**Increase log level in production:**
```bash
LOG_LEVEL=info  # or warn, or error
```

**Filter out noisy routes:**
Update the HTTP logging middleware in `__create/index.ts` to skip certain paths.

### Performance impact

Pino is designed to be extremely fast, but if you're concerned:

1. Use appropriate log levels (avoid `debug`/`trace` in production)
2. Don't log in tight loops
3. Use asynchronous logging (Pino does this by default)
4. Consider sampling high-volume logs

## Additional Resources

- [Pino Documentation](https://getpino.io/)
- [BetterStack Documentation](https://betterstack.com/docs/logs/)
- [Papertrail Documentation](https://www.papertrail.com/help/)
- [Structured Logging Best Practices](https://www.datadoghq.com/blog/structured-logging/)
