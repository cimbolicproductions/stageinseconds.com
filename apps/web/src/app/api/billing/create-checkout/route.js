import { auth } from '@/auth'

const STRIPE_API = 'https://api.stripe.com/v1'

function formBody(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

async function stripeFetch(path, options = {}) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  const res = await fetch(`${STRIPE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.headers || {}),
    },
  })
  return res
}

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return Response.json({ error: 'Sign in required' }, { status: 401 })
    }

    const { lookupKey, quantity = 1, redirectURL } = await request.json()
    if (!lookupKey) {
      return Response.json({ error: 'lookupKey is required' }, { status: 400 })
    }

    // Get price by lookup key
    const pricesRes = await stripeFetch(
      `/prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&limit=1`
    )
    if (!pricesRes.ok) {
      const t = await pricesRes.text()
      return Response.json(
        { error: `Stripe price lookup failed: ${t}` },
        { status: 400 }
      )
    }
    const prices = await pricesRes.json()
    const price = prices.data?.[0]
    if (!price) {
      return Response.json(
        { error: `Price not found for ${lookupKey}` },
        { status: 400 }
      )
    }

    // SECURITY: ensure price belongs to this app using metadata set at creation time
    if (price?.metadata?.app !== 'stageinseconds') {
      return Response.json(
        { error: 'Unknown or unmanaged price' },
        { status: 400 }
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const toAbsolute = u => {
      if (!u) return `${appUrl}/upload`
      try {
        // Ensure redirects resolve to our origin
        return new URL(u, appUrl).toString()
      } catch {
        return `${appUrl}${u.startsWith('/') ? u : `/${u}`}`
      }
    }

    const successBase = redirectURL || '/upload'
    const successUrlAbs = toAbsolute(successBase)
    const successUrl = `${successUrlAbs}${successUrlAbs.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = toAbsolute(redirectURL) || successUrlAbs

    // SECURITY: clamp quantity to reasonable bounds
    const qty = Math.min(500, Math.max(1, Number(quantity) || 1))

    // Create checkout session
    const body = formBody({
      mode: 'payment',
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': String(qty),
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: session.user.email,
      // FIX: send metadata as key/value pairs
      'metadata[user_id]': String(session.user.id),
    })

    const checkoutRes = await stripeFetch(`/checkout/sessions`, {
      method: 'POST',
      body,
    })
    if (!checkoutRes.ok) {
      const t = await checkoutRes.text()
      return Response.json(
        { error: `Stripe checkout failed: ${t}` },
        { status: 400 }
      )
    }
    const checkout = await checkoutRes.json()

    return Response.json({ url: checkout.url, id: checkout.id })
  } catch (e) {
    console.error('create-checkout error', e)
    return Response.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
