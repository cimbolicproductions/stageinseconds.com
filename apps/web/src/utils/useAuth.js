import { useCallback, useMemo } from 'react'
import { signIn, signOut } from '@auth/create/react'

function useAuth() {
  // Prefer callbackUrl param; fall back to redirect param
  const callbackOverride = useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('callbackUrl') || params.get('redirect')
  }, [])

  const signInWithCredentials = useCallback(
    options => {
      return signIn('credentials-signin', {
        ...options,
        callbackUrl: callbackOverride ?? options.callbackUrl,
      })
    },
    [callbackOverride]
  )

  const signUpWithCredentials = useCallback(
    options => {
      return signIn('credentials-signup', {
        ...options,
        callbackUrl: callbackOverride ?? options.callbackUrl,
      })
    },
    [callbackOverride]
  )

  const signInWithGoogle = useCallback(
    options => {
      return signIn('google', {
        ...options,
        callbackUrl: callbackOverride ?? options.callbackUrl,
      })
    },
    [callbackOverride]
  )
  const signInWithFacebook = useCallback(options => {
    return signIn('facebook', options)
  }, [])
  const signInWithTwitter = useCallback(options => {
    return signIn('twitter', options)
  }, [])

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    signOut,
  }
}

export default useAuth
