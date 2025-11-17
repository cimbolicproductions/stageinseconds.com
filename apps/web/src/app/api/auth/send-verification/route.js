import sql from '@/app/api/utils/sql'
import { SendVerificationSchema } from '@/schemas/api'
import { logError, logEvent, logWarn } from '@/app/api/utils/logger.js'

function generateToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '')
    }
  } catch {
    // Fallback to Math.random if crypto not available
  }
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  )
}

async function sendEmail({ to, subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@localhost'

  // ... keep provider send logic the same when key is present ...
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email provider error: [${res.status}] ${text}`)
  }
  return res.json()
}

export async function POST(request) {
  let body
  try {
    body = await request.json().catch(() => ({}))

    // Validate input using Zod schema
    const validation = SendVerificationSchema.safeParse(body)
    if (!validation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // NEW: fail fast if email provider is not configured to avoid silent success
    if (!process.env.RESEND_API_KEY) {
      logWarn(
        'Missing RESEND_API_KEY; email sending is not configured',
        request,
        {
          apiRoute: 'send-verification',
          email,
        }
      )
      return Response.json(
        {
          error:
            'Email sending is not configured. Ask the owner to set RESEND_API_KEY and EMAIL_FROM.',
        },
        { status: 501 }
      )
    }

    // Check if user exists; don't reveal existence in response
    const users =
      await sql`SELECT id, email, COALESCE("emailVerified" IS NOT NULL, false) as verified FROM auth_users WHERE LOWER(email) = ${email} LIMIT 1`
    const user = users[0]

    // Always create a token even if user missing to avoid enumeration
    const token = generateToken()
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    await sql`INSERT INTO auth_verification_token(identifier, token, expires) VALUES(${email}, ${token}, ${expires})`

    const baseUrl =
      process.env.AUTH_URL ||
      process.env.APP_BASE_URL ||
      new URL(request.url).origin
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <h2 style="color:#0A0A0F">Confirm your email</h2>
        <p>Thanks for signing up for StageInSeconds. Please confirm your email to activate your account.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#6F5EF7;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;">Confirm email</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${verifyUrl}</p>
        <p style="color:#6B7280;font-size:12px">This link expires in 24 hours.</p>
      </div>
    `

    // Only send if user exists; if not, still return success silently
    if (user?.email) {
      await sendEmail({ to: email, subject: 'Confirm your email', html })
      logEvent('verification_email_sent', request, { email, userId: user.id })
    } else {
      logWarn('No user found for email; skipping verification email', request, {
        apiRoute: 'send-verification',
        email,
      })
    }

    return Response.json({ ok: true })
  } catch (error) {
    logError(error, request, {
      apiRoute: 'send-verification',
      email: body?.email,
      statusCode: 500,
    })
    return Response.json(
      { error: 'Failed to send verification' },
      { status: 500 }
    )
  }
}
