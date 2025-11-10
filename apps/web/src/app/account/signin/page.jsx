import { useState, useMemo, useEffect } from 'react'
import useAuth from '@/utils/useAuth'
import useUser from '@/utils/useUser'

export default function SignInPage() {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { signInWithCredentials } = useAuth()
  const { data: user, loading: userLoading } = useUser()

  // NEW: support both callbackUrl and redirect params, default to /upload
  const resolvedCallbackUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/upload'
    const params = new URLSearchParams(window.location.search)
    return params.get('callbackUrl') || params.get('redirect') || '/upload'
  }, [])

  // NEW: surface messages from email verification and password reset
  const flash = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const p = new URLSearchParams(window.location.search)
    const verified = p.get('verified')
    const reason = p.get('reason')
    const reset = p.get('reset')
    return { verified, reason, reset }
  }, [])

  // If already authenticated, take them to the callback immediately
  useEffect(() => {
    if (!userLoading && user && typeof window !== 'undefined') {
      window.location.replace(resolvedCallbackUrl)
    }
  }, [user, userLoading, resolvedCallbackUrl])

  const onSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      // Use redirect: false and manually navigate for reliability
      const result = await signInWithCredentials({
        email,
        password,
        callbackUrl: resolvedCallbackUrl,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      // Always take the user to the desired destination to avoid provider interstitials
      if (typeof window !== 'undefined') {
        setTimeout(() => window.location.replace(resolvedCallbackUrl), 100)
      }
    } catch (err) {
      const errorMessages = {
        OAuthSignin:
          'Couldn’t start sign-in. Please try again or use a different method.',
        OAuthCallback: 'Sign-in failed after redirecting. Please try again.',
        OAuthCreateAccount:
          'Couldn’t create an account with this sign-in method. Try another option.',
        EmailCreateAccount:
          'This email can’t be used to create an account. It may already exist.',
        Callback: 'Something went wrong during sign-in. Please try again.',
        OAuthAccountNotLinked:
          'This account is linked to a different sign-in method. Try using that instead.',
        CredentialsSignin:
          'Incorrect email or password. Try again or reset your password.',
        AccessDenied: 'You don’t have permission to sign in.',
        Configuration:
          'Sign-in isn’t working right now. Please try again later.',
        Verification: 'Your sign-in link has expired. Request a new one.',
      }

      setError(
        errorMessages[err.message] || 'Something went wrong. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Consistent header with transparent logo, name, and tagline */}
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
          <a href="/" className="text-sm text-[#0D0D0D]">
            Home
          </a>
        </div>
      </header>

      <section className="py-16 px-6">
        <div className="max-w-[480px] mx-auto">
          <h1
            className="text-3xl md:text-[40px] text-[#0A0A0F] mb-6"
            style={{ fontFamily: 'Instrument Serif, serif' }}
          >
            Sign in to start your free trial
          </h1>
          {/* NEW: flash messages */}
          {flash.verified === '1' && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">
              Your email is verified. You can sign in now.
            </div>
          )}
          {flash.verified === '0' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 mb-4">
              {flash.reason === 'expired'
                ? 'Your verification link expired. Please sign up again or resend the link.'
                : 'Invalid verification link. Please try again.'}
            </div>
          )}
          {flash.reset === '1' && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">
              Password reset successful. Please sign in.
            </div>
          )}
          <form
            noValidate
            onSubmit={onSubmit}
            className="bg-white border border-[#E6E6EA] rounded-2xl p-6"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#4B5563] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-[#E6E6EA] rounded-xl px-4 py-3 outline-none focus:border-[#8B70F6]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#4B5563] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full border border-[#E6E6EA] rounded-xl px-4 py-3 outline-none focus:border-[#8B70F6]"
                  required
                />
                {/* NEW: forgot password link */}
                <div className="mt-2 text-right">
                  <a href="/account/reset" className="text-sm text-[#6F5EF7]">
                    Forgot your password?
                  </a>
                </div>
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 rounded-2xl text-white font-semibold text-lg transition transform hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-sm text-[#6B7280] text-center">
                New here?{' '}
                <a
                  className="text-[#6F5EF7]"
                  href={`/account/signup${typeof window !== 'undefined' ? window.location.search : ''}`}
                >
                  Create an account
                </a>
              </p>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
