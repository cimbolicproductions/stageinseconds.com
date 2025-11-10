import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

export default function VerifySentPage() {
  const email = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const p = new URLSearchParams(window.location.search)
    return (p.get('email') || '').toLowerCase()
  }, [])

  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const resend = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(
          `When sending verification, the response was [${res.status}] ${text}`
        )
      }
      return res.json()
    },
    onSuccess: () => {
      setMessage('Verification email resent.')
      setError(null)
    },
    onError: err => {
      console.error(err)
      setError('Could not resend verification. Please try again.')
    },
  })

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#F5F6FA] h-16 px-6 border-b border-[#E6E6EA]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-full">
          <a href="/" className="flex items-center min-w-0">
            <img
              src="https://ucarecdn.com/1ca97820-b9c3-4d00-94b1-9130ba303fa0/-/format/auto/"
              alt="StageInSeconds logo"
              className="h-8 md:h-9 lg:h-10 w-auto object-contain shrink-0"
              loading="eager"
              decoding="async"
            />
            <div className="ml-3 hidden sm:block leading-tight">
              <span className="block text-[#0A0A0F] font-semibold text-sm md:text-base tracking-[-0.01em]">
                StageInSeconds
              </span>
              <span className="hidden md:block text-[#6B7280] text-xs">
                Because buyers don’t wait.
              </span>
            </div>
          </a>
          <a href="/account/signin" className="text-sm text-[#0D0D0D]">
            Sign in
          </a>
        </div>
      </header>

      <section className="py-16 px-6">
        <div className="max-w-[560px] mx-auto">
          <h1
            className="text-3xl md:text-[40px] text-[#0A0A0F] mb-3"
            style={{ fontFamily: 'Instrument Serif, serif' }}
          >
            Check your email
          </h1>
          <div className="bg-white border border-[#E6E6EA] rounded-2xl p-6">
            <p className="text-[#4B5563] mb-3">
              We sent a verification link to {email || 'your email'}. Click the
              link to activate your account.
            </p>
            {message && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-3">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 mb-3">
                {error}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => resend.mutate()}
                disabled={!email || resend.isLoading}
                className="px-5 py-3 rounded-xl text-white"
                style={{
                  background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                }}
              >
                {resend.isLoading ? 'Resending...' : 'Resend verification'}
              </button>
              <a href="/account/signin" className="text-[#6F5EF7]">
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
