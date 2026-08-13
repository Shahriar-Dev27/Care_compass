import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

/** The app only ever needs an id, an email and something to greet you by. */
export type SessionUser = { id: string; email: string | undefined; displayName: string }

type AuthValue = {
  user: SessionUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsConfirmation: boolean }>
  signInWithGoogle: (next?: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthValue | null>(null)

const shape = (user: User | undefined): SessionUser | null =>
  user
    ? {
        id: user.id,
        email: user.email,
        displayName: (user.user_metadata?.['full_name'] as string | undefined) || user.email?.split('@')[0] || 'You',
      }
    : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined) // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(shape(data.session?.user)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(shape(session?.user)))
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn: AuthValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp: AuthValue['signUp'] = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Read by the handle_new_user trigger to name the first patient profile.
      options: { data: displayName ? { full_name: displayName } : undefined },
    })
    if (error) throw error
    // With email confirmation on, there is no session until the link is opened.
    return { needsConfirmation: !data.session }
  }

  const signInWithGoogle: AuthValue['signInWithGoogle'] = async (next = '/care') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}` },
    })
    if (error) throw error
  }

  const sendPasswordReset: AuthValue['sendPasswordReset'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` })
    if (error) throw error
  }

  const signOut: AuthValue['signOut'] = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthCtx.Provider
      value={{ user: user ?? null, loading: user === undefined, signIn, signUp, signInWithGoogle, sendPasswordReset, signOut }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthValue {
  const value = useContext(AuthCtx)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
