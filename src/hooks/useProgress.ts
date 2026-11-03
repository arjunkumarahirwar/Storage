import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const LOCAL_KEY = 'mp-pyq-done:v1'

const readLocal = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

const writeLocal = (ids: string[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* storage may be full or blocked — progress just stays in memory */
  }
}

export interface ProgressState {
  done: Set<string>
  mode: 'account' | 'device'
  syncing: boolean
  toggleDone: (paperId: string) => Promise<void>
  ready: boolean
}

/**
 * Done marks live in Supabase for signed-in students and in localStorage for
 * guests, so nobody has to create an account just to tick a paper off.
 */
export function useProgress(userId: string | null): ProgressState {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'account' | 'device'>('device')
  const [syncing, setSyncing] = useState(false)
  const [ready, setReady] = useState(false)
  const mergedFor = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    const loadDevice = () => {
      setDone(new Set(readLocal()))
      setMode('device')
      setReady(true)
      mergedFor.current = null
    }

    const loadAccount = async (uid: string) => {
      const { data, error } = await supabase
        .from('paper_progress')
        .select('paper_id')
        .eq('user_id', uid)

      if (!active) return

      if (error) {
        // Fall back to device-only progress rather than blocking the library.
        loadDevice()
        return
      }

      const remote = new Set((data ?? []).map((row) => row.paper_id as string))

      // First sign-in on this device: carry the guest marks over to the account.
      if (mergedFor.current !== uid) {
        mergedFor.current = uid
        const pending = readLocal().filter((id) => !remote.has(id))
        if (pending.length) {
          const { error: mergeError } = await supabase.from('paper_progress').upsert(
            pending.map((paperId) => ({ user_id: uid, paper_id: paperId })),
            { onConflict: 'user_id,paper_id', ignoreDuplicates: true },
          )
          if (!mergeError) {
            writeLocal([])
            pending.forEach((id) => remote.add(id))
          }
        }
      }

      setDone(remote)
      setMode('account')
      setReady(true)
    }

    if (!userId) {
      loadDevice()
    } else {
      void loadAccount(userId)
    }

    return () => {
      active = false
    }
  }, [userId])

  const toggleDone = useCallback(
    async (paperId: string) => {
      const isDone = done.has(paperId)
      const next = new Set(done)
      if (isDone) next.delete(paperId)
      else next.add(paperId)
      setDone(next)

      if (mode === 'device' || !userId) {
        writeLocal([...next])
        return
      }

      setSyncing(true)
      try {
        if (isDone) {
          const { error } = await supabase
            .from('paper_progress')
            .delete()
            .eq('user_id', userId)
            .eq('paper_id', paperId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('paper_progress')
            .upsert(
              { user_id: userId, paper_id: paperId },
              { onConflict: 'user_id,paper_id', ignoreDuplicates: true },
            )
          if (error) throw error
        }
      } catch {
        // Roll the optimistic update back so the UI never lies.
        setDone(done)
      } finally {
        setSyncing(false)
      }
    },
    [done, mode, userId],
  )

  return { done, mode, syncing, toggleDone, ready }
}
