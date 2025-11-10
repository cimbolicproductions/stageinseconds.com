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
    return Response.json(
      { error: 'Missing STRIPE_SECRET_KEY environment variable' },
      { status: 400 }
    )
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

const OFFERS = [
  {
    lookup_key: 'PAYG_IMAGE_CREDIT',
    name: 'Pay as you go',
    description: 'Buy exactly what you need',
    type: 'payg',
    currency: 'usd',
    unit_amount: 100, // $1.00
    credits_per_unit: 1,
  },
  {
    lookup_key: 'PACK_20_CREDITS',
    name: '20‑photo pack',
    description: 'Save 10%',
    type: 'pack',
    currency: 'usd',
    unit_amount: 1800, // $18.00
    credits_per_unit: 20,
  },
  {
    lookup_key: 'PACK_50_CREDITS',
    name: '50‑photo pack',
    description: 'Save 20%',
    type: 'pack',
    currency: 'usd',
    unit_amount: 4000, // $40.00
    credits_per_unit: 50,
  },
  {
    lookup_key: 'PACK_100_CREDITS',
    name: '100‑photo pack',
    description: 'Save 25%',
    type: 'pack',
    currency: 'usd',
    unit_amount: 7500, // $75.00
    credits_per_unit: 100,
  },
]

async function ensurePricesExist() {
  // Try to fetch by lookup_keys
  const params = OFFERS.map(
    o => `lookup_keys[]=${encodeURIComponent(o.lookup_key)}`
  ).join('&')
  const res = await stripeFetch(`/prices?limit=100&${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Stripe list prices failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  const foundByLookup = new Map()
  for (const p of data.data || []) {
    if (p.lookup_key) foundByLookup.set(p.lookup_key, p)
  }

  const created = []
  for (const offer of OFFERS) {
    if (foundByLookup.has(offer.lookup_key)) {
      created.push(foundByLookup.get(offer.lookup_key))
      continue
    }
    // Create product then price with lookup_key
    const productRes = await stripeFetch(`/products`, {
      method: 'POST',
      body: formBody({
        name: offer.name,
        description: offer.description,
        // FIX: metadata must be key-value pairs, not a JSON string
        'metadata[app]': 'stageinseconds',
        'metadata[offer]': offer.lookup_key,
      }),
    })
    if (!productRes.ok) {
      const t = await productRes.text()
      throw new Error(`Stripe create product failed: ${productRes.status} ${t}`)
    }
    const product = await productRes.json()

    const priceRes = await stripeFetch(`/prices`, {
      method: 'POST',
      body: formBody({
        unit_amount: offer.unit_amount,
        currency: offer.currency,
        product: product.id,
        lookup_key: offer.lookup_key,
        // FIX: metadata must be key-value pairs, not a JSON string
        'metadata[app]': 'stageinseconds',
        'metadata[type]': offer.type,
        'metadata[credits_per_unit]': String(offer.credits_per_unit),
      }),
    })
    if (!priceRes.ok) {
      const t = await priceRes.text()
      throw new Error(`Stripe create price failed: ${priceRes.status} ${t}`)
    }
    const price = await priceRes.json()
    created.push(price)
  }
  return created
}

export async function GET() {
  try {
    const session = await auth()
    // We allow unauthenticated users to view offers (for pricing UI), but they will be forced to sign in at checkout.

    const prices = await ensurePricesExist()
    const offers = prices.map(p => ({
      id: p.id,
      lookupKey: p.lookup_key,
      currency: p.currency,
      unitAmount: p.unit_amount,
      productName:
        p.product?.name ||
        OFFERS.find(o => o.lookup_key === p.lookup_key)?.name,
      metadata: p.metadata || {},
    }))

    return Response.json({ offers })
  } catch (e) {
    console.error('billing/products error', e)
    return Response.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
