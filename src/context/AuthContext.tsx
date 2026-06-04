"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getAuthorizedEmails(): string[] {
  return (process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

function getAccessError(email: string | undefined): string | null {
  const authorizedEmails = getAuthorizedEmails()

  if (authorizedEmails.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      return "Configuration d'accès manquante"
    }

    console.warn(
      "NEXT_PUBLIC_AUTHORIZED_EMAILS est absente ou vide. L'accès n'est pas bloqué en développement local."
    )
    return null
  }

  if (!email || !authorizedEmails.includes(email.trim().toLowerCase())) {
    return 'Accès non autorisé'
  }

  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const accessError = session?.user ? getAccessError(session.user.email) : null
      if (accessError) {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setAuthError(accessError)
        setLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      setAuthError(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessError = session?.user ? getAccessError(session.user.email) : null
      if (accessError) {
        supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setAuthError(accessError)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) setAuthError(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Identifiants incorrects ou accès non autorisé.')

    const accessError = getAccessError(data.user?.email)
    if (accessError) {
      await supabase.auth.signOut()
      setAuthError(accessError)
      throw new Error(accessError)
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
