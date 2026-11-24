import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { playTimeoutChime, primeChime } from '../lib/chime'
import {
  DEFAULT_PRACTICE_MINUTES,
  clampMinutes,
  isExpired,
  isNearlyUp,
  remainingMs,
  spentMs,
} from '../lib/countdown'
import type { PracticeAttempt } from '../lib/types'

const ATTEMPTS_KEY = 'mp-pyq-practice:v1'
const RUNNING_KEY = 'mp-pyq-practice-run:v1'

export interface RunningPractice {
  paperId: string
  startedAt: number
  /** Minutes the candidate allowed themselves; older saves have none. */
  minutes: number
}

const readAttempts = (): PracticeAttempt[] => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is PracticeAttempt =>
        Boolean(row) &&
        typeof row.id === 'string' &&
        typeof row.paperId === 'string' &&
        typeof row.seconds === 'number' &&
        typeof row.score === 'number',
    )
  } catch {
    return []
  }
}

const writeAttempts = (rows: PracticeAttempt[]) => {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(rows))
  } catch {
    /* out of space — attempts stay in memory */
  }
}

const readRunning = (): RunningPractice | null => {
  try {
    const raw = localStorage.getItem(RUNNING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RunningPractice
    if (!parsed?.paperId || typeof parsed.startedAt !== 'number') return null
    return {
      paperId: parsed.paperId,
      startedAt: parsed.startedAt,
      minutes: clampMinutes(parsed.minutes ?? DEFAULT_PRACTICE_MINUTES),
    }
  } catch {
    return null
  }
}

const writeRunning = (running: RunningPractice | null) => {
  try {
    if (running) localStorage.setItem(RUNNING_KEY, JSON.stringify(running))
    else localStorage.removeItem(RUNNING_KEY)
  } catch {
    /* ignore */
  }
}

const group = (rows: PracticeAttempt[]) => {
  const map = new Map<string, PracticeAttempt[]>()
  for (const row of rows) {
    const list = map.get(row.paperId) ?? []
    list.push(row)
    map.set(row.paperId, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.at.localeCompare(a.at))
  }
  return map
}

export interface PracticeState {
  attempts: Map<string, PracticeAttempt[]>
  running: RunningPractice | null
  /** Milliseconds since the running practice started (0 when nothing runs), capped at the time allowed. */
  elapsedMs: number
  /** Milliseconds left on the clock (0 when nothing runs). */
  remainingMs: number
  /** The clock has reached zero. The run stays open so the score can be saved. */
  expired: boolean
  /** Under five minutes left — the clock turns red. */
  nearlyUp: boolean
  mode: 'account' | 'device'
  start: (paperId: string, minutes?: number) => void
  cancel: () => void
  finish: (score: number, total: number) => Promise<PracticeAttempt | null>
  remove: (attemptId: string) => Promise<void>
}

/**
 * Timed practice is self-reported: the timer runs here while the student reads
 * the PDF in Drive, then they enter their score. Guests keep attempts on the
 * device; the first sign-in copies them into the account.
 */
export function usePractice(userId: string | null): PracticeState {
  const [attempts, setAttempts] = useState<Map<string, PracticeAttempt[]>>(new Map())
  const [running, setRunning] = useState<RunningPractice | null>(() => readRunning())
  const [now, setNow] = useState(() => Date.now())
  const [mode, setMode] = useState<'account' | 'device'>('device')
  const mergedFor = useRef<string | null>(null)

  // Load whatever this student already has.
  useEffect(() => {
    let active = true

    const loadDevice = () => {
      setAttempts(group(readAttempts()))
      setMode('device')
      mergedFor.current = null
    }

    const loadAccount = async (uid: string) => {
      const { data, error } = await supabase
        .from('practice_attempts')
        .select('id, paper_id, seconds, score, total, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(500)

      if (!active) return
      if (error) {
        loadDevice()
        return
      }

      const remote: PracticeAttempt[] = (data ?? []).map((row) => ({
        id: row.id as string,
        paperId: row.paper_id as string,
        seconds: row.seconds as number,
        score: row.score as number,
        total: row.total as number,
        at: row.created_at as string,
      }))

      if (mergedFor.current !== uid) {
        mergedFor.current = uid
        const known = new Set(remote.map((row) => row.id))
        const pending = readAttempts().filter((row) => !known.has(row.id))
        if (pending.length) {
          const { data: inserted, error: mergeError } = await supabase
            .from('practice_attempts')
            .insert(
              pending.map((row) => ({
                user_id: uid,
                paper_id: row.paperId,
                seconds: row.seconds,
                score: row.score,
                total: row.total,
                created_at: row.at,
              })),
            )
            .select('id, paper_id, seconds, score, total, created_at')

          if (!mergeError) {
            writeAttempts([])
            for (const row of inserted ?? []) {
              remote.push({
                id: row.id as string,
                paperId: row.paper_id as string,
                seconds: row.seconds as number,
                score: row.score as number,
                total: row.total as number,
                at: row.created_at as string,
              })
            }
          }
        }
      }

      setAttempts(group(remote))
      setMode('account')
    }

    if (!userId) loadDevice()
    else void loadAccount(userId)

    return () => {
      active = false
    }
  }, [userId])

  // Tick the clock while a practice is running. Everything is worked out from
  // wall-clock time, so a sleeping tab wakes up on the right number.
  useEffect(() => {
    setNow(Date.now())
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const expired = running ? isExpired(running, now) : false
  const nearlyUp = running ? isNearlyUp(running, now) : false

  // Ring once when the clock hits zero — including when the tab was asleep and
  // wakes up long after the time was up.
  const rungFor = useRef<number | null>(null)
  useEffect(() => {
    if (!running) {
      rungFor.current = null
      return
    }
    if (!expired || rungFor.current === running.startedAt) return
    rungFor.current = running.startedAt
    playTimeoutChime()
  }, [running, expired])

  const start = useCallback((paperId: string, minutes: number = DEFAULT_PRACTICE_MINUTES) => {
    // The tap that starts the run is also what lets the browser ring later.
    primeChime()
    const next = { paperId, startedAt: Date.now(), minutes: clampMinutes(minutes) }
    setNow(Date.now())
    setRunning(next)
    writeRunning(next)
  }, [])

  const cancel = useCallback(() => {
    setRunning(null)
    writeRunning(null)
  }, [])

  const finish = useCallback(
    async (score: number, total: number) => {
      if (!running) return null

      const endedAt = Date.now()
      const allowed = clampMinutes(running.minutes)
      // A run that ran past the bell is saved as the full time allowed.
      const seconds = Math.min(
        259200,
        Math.max(10, Math.round(spentMs({ ...running, minutes: allowed }, endedAt) / 1000)),
      )
      const safeTotal = Math.min(1000, Math.max(1, Math.round(total)))
      const safeScore = Math.min(safeTotal, Math.max(0, Math.round(score)))
      const paperId = running.paperId
      // If saving fails the timer comes back, frozen at the time just recorded,
      // so the student can retry without losing their run.
      const restore = () =>
        setRunning({ paperId, startedAt: endedAt - seconds * 1000, minutes: allowed })

      if (mode === 'device' || !userId) {
        const row: PracticeAttempt = {
          id: `local-${endedAt}`,
          paperId,
          seconds,
          score: safeScore,
          total: safeTotal,
          at: new Date().toISOString(),
        }
        const stored = readAttempts()
        writeAttempts([row, ...stored])
        setAttempts(group([row, ...stored]))
        setRunning(null)
        writeRunning(null)
        return row
      }

      const { data, error } = await supabase
        .from('practice_attempts')
        .insert({ user_id: userId, paper_id: paperId, seconds, score: safeScore, total: safeTotal })
        .select('id, paper_id, seconds, score, total, created_at')
        .single()

      if (error || !data) {
        restore()
        throw new Error('Could not save that attempt. Check your connection and try again.')
      }

      const row: PracticeAttempt = {
        id: data.id as string,
        paperId: data.paper_id as string,
        seconds: data.seconds as number,
        score: data.score as number,
        total: data.total as number,
        at: data.created_at as string,
      }
      setAttempts((current) => {
        const next = new Map(current)
        next.set(paperId, [row, ...(next.get(paperId) ?? [])])
        return next
      })
      setRunning(null)
      writeRunning(null)
      return row
    },
    [running, mode, userId],
  )

  const remove = useCallback(
    async (attemptId: string) => {
      if (mode === 'device' || !userId) {
        const rest = readAttempts().filter((row) => row.id !== attemptId)
        writeAttempts(rest)
        setAttempts(group(rest))
        return
      }
      const { error } = await supabase
        .from('practice_attempts')
        .delete()
        .eq('user_id', userId)
        .eq('id', attemptId)
      if (error) throw new Error('Could not remove that attempt.')
      setAttempts((current) => {
        const next = new Map<string, PracticeAttempt[]>()
        for (const [paperId, list] of current) {
          next.set(
            paperId,
            list.filter((row) => row.id !== attemptId),
          )
        }
        return next
      })
    },
    [mode, userId],
  )

  return {
    attempts,
    running,
    elapsedMs: running ? spentMs(running, now) : 0,
    remainingMs: running ? remainingMs(running, now) : 0,
    expired,
    nearlyUp,
    mode,
    start,
    cancel,
    finish,
    remove,
  }
}
