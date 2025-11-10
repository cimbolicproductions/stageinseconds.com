import sql from '@/app/api/utils/sql'
import { auth } from '@/auth'

const STRIPE_API = 'https://api.stripe.com/v1'

function qs(params) {
  const parts = []
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        parts.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(item)}`)
      }
    } else if (v !== undefined && v !== null) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    }
  }
  return parts.join('&')
}

async function stripeGet(path, params = {}) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return Response.json(
      { error: 'Missing STRIPE_SECRET_KEY environment variable' },
      { status: 400 }
    )
  }
  const query = Object.keys(params).length ? `?${qs(params)}` : ''
  const res = await fetch(`${STRIPE_API}${path}${query}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  return res
}

export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Sign in required' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      return Response.json({ error: 'session_id is required' }, { status: 400 })
    }

    // Retrieve checkout session with line items
    const res = await stripeGet(`/checkout/sessions/${sessionId}`, {
      expand: ['line_items.data.price'],
    })
    if (!res.ok) {
      const t = await res.text()
      return Response.json(
        { error: `Stripe retrieve failed: ${t}` },
        { status: 400 }
      )
    }
    const checkout = await res.json()

    // SECURITY: make sure this checkout session belongs to the current user
    const metaUserId = checkout?.metadata?.user_id
    const email = checkout?.customer_email
    if (
      (metaUserId && String(metaUserId) !== String(session.user.id)) ||
      (email &&
        session.user.email &&
        String(email).toLowerCase() !==
          String(session.user.email).toLowerCase())
    ) {
      return Response.json(
        { error: 'This checkout session does not belong to the current user' },
        { status: 403 }
      )
    }

    if (checkout.payment_status !== 'paid') {
      return Response.json(
        { status: checkout.payment_status || 'unpaid' },
        { status: 200 }
      )
    }

    // Idempotency: if we've already fulfilled this session, return current balances
    const existing =
      await sql`SELECT id FROM purchases WHERE stripe_session_id = ${sessionId}`
    if (existing.length) {
      const current =
        await sql`SELECT credits, free_used FROM user_credits WHERE user_id = ${session.user.id}`
      const c = current[0] || { credits: 0, free_used: 0 }
      return Response.json({
        status: 'fulfilled',
        credits: c.credits,
        freeUsed: c.free_used,
      })
    }

    const line = checkout.line_items?.data?.[0]
    const price = line?.price
    const quantity = line?.quantity || 1

    // Determine credits purchased
    let creditsPerUnit = 1
    if (price?.metadata?.credits_per_unit) {
      creditsPerUnit = Number(price.metadata.credits_per_unit) || 1
    }
    const creditsPurchased = creditsPerUnit * quantity

    // Upsert user's credits and record purchase
    // FIX: sql.transaction must get an array of queries (or a function that RETURNS an array).
    // Replace callback style with array-based transaction and use INSERT ... ON CONFLICT for upsert.
    await sql.transaction([
      sql`
        INSERT INTO user_credits (user_id, credits)
        VALUES (${session.user.id}, ${creditsPurchased})
        ON CONFLICT (user_id)
        DO UPDATE SET 
          credits = user_credits.credits + EXCLUDED.credits,
          updated_at = CURRENT_TIMESTAMP
      `,
      sql`
        INSERT INTO purchases (user_id, stripe_session_id, product_lookup_key, quantity, amount_cents, currency, credits_purchased, status)
        VALUES (${session.user.id}, ${sessionId}, ${price?.lookup_key || null}, ${quantity}, ${checkout.amount_total || 0}, ${checkout.currency || 'usd'}, ${creditsPurchased}, 'paid')
      `,
    ])

    const current =
      await sql`SELECT credits, free_used FROM user_credits WHERE user_id = ${session.user.id}`
    const c = current[0] || { credits: 0, free_used: 0 }
    return Response.json({
      status: 'fulfilled',
      credits: c.credits,
      freeUsed: c.free_used,
    })
  } catch (e) {
    console.error('billing/confirm error', e)
    return Response.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
