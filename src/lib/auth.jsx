import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext(null)

/** The app only ever needs an id, an email and something to greet you by. */
const shape = (user) =>
  user
    ? {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
      }
    : null

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(shape(data.session?.user)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(shape(session?.user)))
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email, password, displayName) => {
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

  const signInWithGoogle = async (next = '/care') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}` },
    })
    if (error) throw error
  }

  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthCtx.Provider
      value={{ user, loading: user === undefined, signIn, signUp, signInWithGoogle, sendPasswordReset, signOut }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthCtx)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
