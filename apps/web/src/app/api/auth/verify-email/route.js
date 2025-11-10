import sql from '@/app/api/utils/sql'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const email = (url.searchParams.get('email') || '').toLowerCase().trim()
    const token = url.searchParams.get('token') || ''

    if (!email || !token) {
      return new Response('Missing email or token', { status: 400 })
    }

    const now = new Date()
    const rows =
      await sql`SELECT identifier, token, expires FROM auth_verification_token WHERE identifier = ${email} AND token = ${token} LIMIT 1`
    const record = rows[0]
    if (!record) {
      return Response.redirect(
        `${url.origin}/account/signin?verified=0&reason=invalid`,
        302
      )
    }
    if (new Date(record.expires) < now) {
      return Response.redirect(
        `${url.origin}/account/signin?verified=0&reason=expired`,
        302
      )
    }

    // Mark user as verified
    await sql`UPDATE auth_users SET "emailVerified" = ${now} WHERE LOWER(email) = ${email}`

    // Clean up tokens for this email
    await sql`DELETE FROM auth_verification_token WHERE identifier = ${email}`

    return Response.redirect(`${url.origin}/account/signin?verified=1`, 302)
  } catch (error) {
    console.error('/api/auth/verify-email error', error)
    return new Response('Verification failed', { status: 500 })
  }
}
