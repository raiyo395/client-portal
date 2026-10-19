import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { reportActionError } from '../lib/actionFeedback'
import type { Profile } from '../types'

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  retryProfile: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileRetryCount, setProfileRetryCount] = useState(0)

  // Track the Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) {
          reportActionError('Restore auth session', error)
          setProfile(null)
          setLoading(false)
          return
        }
        setSession(data.session)
        if (!data.session) setLoading(false)
      },
      (caught: unknown) => {
        reportActionError('Restore auth session', caught)
        setLoading(false)
      },
    )

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setLoading(true)
      setSession(newSession)
      if (!newSession) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Load the profile (role) whenever the signed-in user changes.
  // Done outside onAuthStateChange on purpose: calling Supabase inside that callback can deadlock.
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single()
      .then(
        ({ data, error }) => {
          if (cancelled) return
          if (error) reportActionError('Load account profile', error)
          setProfile(error ? null : (data as Profile | null) ?? null)
          setLoading(false)
        },
        (caught: unknown) => {
          if (cancelled) return
          reportActionError('Load account profile', caught)
          setProfile(null)
          setLoading(false)
        },
      )
    return () => {
      cancelled = true
    }
  }, [userId, profileRetryCount])

  const retryProfile = () => {
    setLoading(true)
    setProfileRetryCount((count) => count + 1)
  }

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? reportActionError('Sign in', error) : null
  }

  const signUp: AuthContextValue['signUp'] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return error ? reportActionError('Sign up', error) : null
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return error ? reportActionError('Sign out', error) : null
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, retryProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
