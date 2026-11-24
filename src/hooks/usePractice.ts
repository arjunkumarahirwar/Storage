import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PracticeAttempt } from '../lib/types'

const ATTEMPTS_KEY = 'mp-pyq-practice:v1'
const RUNNING_KEY = 'mp-pyq-practice-run:v1'

export interface RunningPractice {
  paperId: string
  startedAt: number
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
    return parsed
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
  /** Milliseconds since the running practice started (0 when nothing runs). */
  elapsedMs: number
  mode: 'account' | 'device'
  start: (paperId: string) => void
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
  const [elapsedMs, setElapsedMs] = useState(0)
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

  // Tick the clock while a practice is running.
  useEffect(() => {
    if (!running) {
      setElapsedMs(0)
      return
    }
    const tick = () => setElapsedMs(Date.now() - running.startedAt)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const start = useCallback((paperId: string) => {
    const next = { paperId, startedAt: Date.now() }
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
      const seconds = Math.min(259200, Math.max(10, Math.round((endedAt - running.startedAt) / 1000)))
      const safeTotal = Math.min(1000, Math.max(1, Math.round(total)))
      const safeScore = Math.min(safeTotal, Math.max(0, Math.round(score)))
      const paperId = running.paperId
      // If saving fails the timer comes back, frozen at the time just recorded,
      // so the student can retry without losing their run.
      const restore = () => setRunning({ paperId, startedAt: endedAt - seconds * 1000 })

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

  return { attempts, running, elapsedMs, mode, start, cancel, finish, remove }
}
