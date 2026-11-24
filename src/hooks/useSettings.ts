import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_PRACTICE_MINUTES, clampMinutes } from '../lib/countdown'

const CACHE_KEY = 'mp-pyq-settings:v1'

/**
 * The administrator's default practice time, for everyone.
 *
 * It lives in the `app_settings` table so the whole library agrees on it, and
 * the last value is copied to the device so the timer still starts on the
 * admin's number when the network is gone.
 */
export interface SettingsState {
  defaultMinutes: number
  saveDefaultMinutes: (minutes: number) => Promise<void>
}

const readCache = (): number => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return DEFAULT_PRACTICE_MINUTES
    const parsed = JSON.parse(raw) as { defaultMinutes?: number }
    return clampMinutes(parsed?.defaultMinutes)
  } catch {
    return DEFAULT_PRACTICE_MINUTES
  }
}

const writeCache = (minutes: number) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ defaultMinutes: minutes }))
  } catch {
    /* private mode — the value still holds for this visit */
  }
}

export function useSettings(): SettingsState {
  const [defaultMinutes, setDefaultMinutes] = useState<number>(readCache)

  useEffect(() => {
    let active = true
    void supabase
      .from('app_settings')
      .select('key, value')
      .eq('key', 'practice_default_minutes')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return
        const minutes = clampMinutes(Number(data.value))
        setDefaultMinutes(minutes)
        writeCache(minutes)
      })
    return () => {
      active = false
    }
  }, [])

  const saveDefaultMinutes = useCallback(async (minutes: number) => {
    const safe = clampMinutes(minutes)
    // RLS refuses this for anyone but the administrator.
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'practice_default_minutes', value: safe })

    if (error) throw new Error('Could not save the default time. Only the admin can change it.')
    setDefaultMinutes(safe)
    writeCache(safe)
  }, [])

  return { defaultMinutes, saveDefaultMinutes }
}
