import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import useUser from '@/utils/useUser'

export default function useBilling() {
  const { refetch: refetchUser } = useUser()

  const { data: me, refetch: refetchMe } = useQuery({
    queryKey: ['billing/me'],
    queryFn: async () => {
      const res = await fetch('/api/billing/me')
      if (!res.ok) throw new Error('Failed to load credits')
      return res.json()
    },
  })

  const { data: products } = useQuery({
    queryKey: ['billing/products'],
    queryFn: async () => {
      const res = await fetch('/api/billing/products')
      if (!res.ok) throw new Error('Failed to load products')
      return res.json()
    },
  })

  const createCheckout = useMutation({
    mutationFn: async ({ lookupKey, quantity }) => {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey, quantity, redirectURL: '/upload' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Checkout failed')
      return data
    },
    onSuccess: data => {
      if (data?.url) {
        window.open(data.url, '_blank', 'popup,noopener,noreferrer')
      }
    },
  })

  // Handle Stripe return to grant credits
  useEffect(() => {
    const url = new URL(window.location.href)
    const sid = url.searchParams.get('session_id')
    if (sid) {
      fetch(`/api/billing/confirm?session_id=${encodeURIComponent(sid)}`)
        .then(() => Promise.all([refetchMe(), refetchUser()]))
        .catch(() => {})
        .finally(() => {
          url.searchParams.delete('session_id')
          window.history.replaceState({}, '', url.toString())
        })
    }
  }, [refetchMe, refetchUser])

  return { me, products, createCheckout, refetchMe }
}
