import sql from '@/app/api/utils/sql'

function generateToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '')
    }
  } catch (_) {}
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  )
}

async function sendEmail({ to, subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@localhost'

  if (!RESEND_API_KEY) {
    console.log(
      '[request-password-reset] Missing RESEND_API_KEY; logging email instead'
    )
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('HTML:\n', html)
    return { ok: true, id: 'demo' }
  }

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
  try {
    const body = await request.json().catch(() => ({}))
    const email = (body.email || '').toLowerCase().trim()
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    // NEW: fail fast if email provider is not configured to avoid silent success
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        '[request-password-reset] Missing RESEND_API_KEY; email sending is not configured'
      )
      return Response.json(
        {
          error:
            'Email sending is not configured. Ask the owner to set RESEND_API_KEY and EMAIL_FROM.',
        },
        { status: 501 }
      )
    }

    // Find user; do not leak existence
    const users =
      await sql`SELECT id FROM auth_users WHERE LOWER(email) = ${email} LIMIT 1`
    const user = users[0]

    // Create token regardless; only send if user exists
    const token = generateToken()
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour
    await sql`INSERT INTO auth_verification_token(identifier, token, expires) VALUES(${email}, ${token}, ${expires})`

    const baseUrl =
      process.env.AUTH_URL ||
      process.env.APP_BASE_URL ||
      new URL(request.url).origin
    const resetUrl = `${baseUrl}/account/reset/${encodeURIComponent(token)}?email=${encodeURIComponent(email)}`

    if (user?.id) {
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.6; max-width: 520px; margin: 0 auto;">
          <h2 style="color:#0A0A0F">Reset your password</h2>
          <p>We received a request to reset your password. Click the button below to choose a new password.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#6F5EF7;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;">Reset password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p style="color:#6B7280;font-size:12px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        </div>
      `
      await sendEmail({ to: email, subject: 'Reset your password', html })
    } else {
      console.log(
        `[request-password-reset] No user for ${email}; skipping provider send`
      )
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('/api/auth/request-password-reset error', error)
    return Response.json({ error: 'Failed to request reset' }, { status: 500 })
  }
}
