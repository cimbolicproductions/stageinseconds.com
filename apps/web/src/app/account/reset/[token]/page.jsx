import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

export default function ResetPasswordTokenPage(props) {
  const token = props?.params?.token
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const email = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return (params.get('email') || '').toLowerCase()
  }, [])

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(
          `When resetting password, the response was [${res.status}] ${text}`
        )
      }
      return res.json()
    },
    onSuccess: () => {
      setDone(true)
      setError(null)
    },
    onError: err => {
      console.error(err)
      setError('Could not reset your password. Your link may have expired.')
    },
  })

  const passwordMismatch = password && confirm && password !== confirm
  const disabled =
    !email || !token || !password || passwordMismatch || mutation.isLoading

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
        <div className="max-w-[480px] mx-auto">
          <h1
            className="text-3xl md:text-[40px] text-[#0A0A0F] mb-6"
            style={{ fontFamily: 'Instrument Serif, serif' }}
          >
            Choose a new password
          </h1>
          {done ? (
            <div className="bg-white border border-[#E6E6EA] rounded-2xl p-6">
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">
                Your password has been reset. You can now sign in.
              </div>
              <a
                className="inline-block px-5 py-3 rounded-xl text-white"
                style={{
                  background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                }}
                href="/account/signin?reset=1"
              >
                Go to sign in
              </a>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={e => {
                e.preventDefault()
                setError(null)
                mutation.mutate()
              }}
              className="bg-white border border-[#E6E6EA] rounded-2xl p-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#4B5563] mb-1">
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a new password"
                    className="w-full border border-[#E6E6EA] rounded-xl px-4 py-3 outline-none focus:border-[#8B70F6]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#4B5563] mb-1">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full border border-[#E6E6EA] rounded-xl px-4 py-3 outline-none focus:border-[#8B70F6]"
                    required
                  />
                </div>
                {passwordMismatch && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                    Passwords do not match.
                  </div>
                )}
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={disabled}
                  className="w-full px-6 py-4 rounded-2xl text-white font-semibold text-lg transition transform hover:scale-[1.01]"
                  style={{
                    background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                  }}
                >
                  {mutation.isLoading ? 'Saving...' : 'Save new password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
