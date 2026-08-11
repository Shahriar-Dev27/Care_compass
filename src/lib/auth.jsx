import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from './firebase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return unsub
  }, [])

  const signOut = () => firebaseSignOut(auth)

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }

  const signUp = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return cred
  }

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  return (
    <AuthCtx.Provider value={{ user, loading: user === undefined, signOut, signInWithGoogle, signUp, signIn }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthCtx)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
