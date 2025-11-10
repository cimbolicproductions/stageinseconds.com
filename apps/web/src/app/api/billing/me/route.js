import sql from '@/app/api/utils/sql'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ authenticated: false, freeUsed: 0, credits: 0 })
    }

    const rows =
      await sql`SELECT free_used, credits FROM user_credits WHERE user_id = ${session.user.id}`
    if (!rows.length) {
      return Response.json({ authenticated: true, freeUsed: 0, credits: 0 })
    }
    const r = rows[0]
    return Response.json({
      authenticated: true,
      freeUsed: r.free_used,
      credits: r.credits,
    })
  } catch (e) {
    console.error('billing/me error', e)
    return Response.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
