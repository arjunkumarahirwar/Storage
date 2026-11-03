import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthState {
  session: Session | null
  email: string | null
  isAdmin: boolean
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<{ needsEmailConfirm: boolean }>
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAdmin: () => Promise<void>
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async () => {
    const { data, error } = await supabase.rpc('is_library_admin')
    if (error) {
      // A missing RPC or a guest session simply means "not an admin".
      setIsAdmin(false)
      return
    }
    setIsAdmin(data === true)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setLoading(false)
        if (data.session) void checkAdmin()
      })
      .catch(() => {
        if (active) setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        // Defer: Supabase warns against calling its API synchronously inside this callback.
        window.setTimeout(() => {
          void checkAdmin()
        }, 0)
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [checkAdmin])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
  }, [])

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) throw error
    // With "Confirm email" turned off Supabase returns a session straight away.
    return { needsEmailConfirm: !data.session }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
  }, [])

  return {
    session,
    email: session?.user.email ?? null,
    isAdmin,
    loading,
    signInWithPassword,
    signUpWithPassword,
    sendMagicLink,
    signOut,
    refreshAdmin: checkAdmin,
  }
}
