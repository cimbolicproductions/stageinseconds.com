import sql from '@/app/api/utils/sql'
import argon2 from 'argon2'

export async function POST(request) {
  try {
    const { email, token, password } = await request.json()
    const normalizedEmail = (email || '').toLowerCase().trim()

    if (!normalizedEmail || !token || !password) {
      return Response.json(
        { error: 'Email, token, and password are required' },
        { status: 400 }
      )
    }

    // Validate token
    const now = new Date()
    const rows =
      await sql`SELECT identifier, token, expires FROM auth_verification_token WHERE identifier = ${normalizedEmail} AND token = ${token} LIMIT 1`
    const record = rows[0]
    if (!record) {
      return Response.json({ error: 'Invalid or used token' }, { status: 400 })
    }
    if (new Date(record.expires) < now) {
      return Response.json({ error: 'Token expired' }, { status: 400 })
    }

    // Fetch user id
    const users =
      await sql`SELECT id FROM auth_users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1`
    const user = users[0]
    if (!user?.id) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Hash password and update all credentials providers for this user
    const hash = await argon2.hash(password)

    await sql`UPDATE auth_accounts SET password = ${hash} WHERE "userId" = ${user.id} AND provider LIKE 'credentials%'`

    // Clean up tokens for this email
    await sql`DELETE FROM auth_verification_token WHERE identifier = ${normalizedEmail}`

    return Response.json({ ok: true })
  } catch (error) {
    console.error('/api/auth/reset-password error', error)
    return Response.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
