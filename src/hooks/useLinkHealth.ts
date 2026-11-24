import { useCallback, useEffect, useRef, useState } from 'react'
import type { LinkHealthResult, LinkStatus, Paper } from '../lib/types'

const KEY = 'pyq:linkHealth:v1'
const CHUNK = 12
/** Results older than this are shown faded and re-checked quietly. */
const STALE_MS = 1000 * 60 * 60 * 24 * 7

type Results = Map<string, LinkHealthResult>

const readStored = (): Results => {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const results: Results = new Map()
    if (!parsed || typeof parsed !== 'object') return results
    for (const [id, value] of Object.entries(parsed)) {
      const entry = value as Partial<LinkHealthResult>
      if (
        (entry?.status === 'ok' ||
          entry?.status === 'restricted' ||
          entry?.status === 'missing' ||
          entry?.status === 'unknown') &&
        typeof entry.at === 'string'
      ) {
        results.set(id, { status: entry.status, at: entry.at })
      }
    }
    return results
  } catch {
    return new Map()
  }
}

const writeStored = (results: Results) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(results)))
  } catch {
    /* private mode — the report just does not survive a reload */
  }
}

const isStale = (result: LinkHealthResult) => Date.now() - new Date(result.at).getTime() > STALE_MS

export interface LinkHealthState {
  results: Results
  checking: boolean
  /** How many of the requested links have been checked so far. */
  progress: { done: number; total: number }
  error: string | null
  lastChecked: string | null
  check: (ids: string[]) => Promise<void>
  forget: () => void
  statusOf: (fileId: string) => LinkStatus | null
  isStale: (fileId: string) => boolean
}

/**
 * Checks Drive links through /api/link-health (Drive cannot be read from the
 * browser). Runs in small batches so a big library does not time out, and the
 * last answer per file is kept in localStorage so reopening the panel is
 * instant.
 */
export function useLinkHealth(): LinkHealthState {
  const [results, setResults] = useState<Results>(() => readStored())
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  useEffect(() => {
    writeStored(results)
  }, [results])

  const check = useCallback(async (ids: string[]) => {
    if (running.current) return
    const unique = Array.from(new Set(ids.filter(Boolean)))
    if (!unique.length) return

    running.current = true
    setChecking(true)
    setError(null)
    setProgress({ done: 0, total: unique.length })

    const collected: [string, LinkHealthResult][] = []
    let failure: string | null = null

    for (let index = 0; index < unique.length; index += CHUNK) {
      const batch = unique.slice(index, index + CHUNK)
      try {
        const response = await fetch('/api/link-health', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: batch }),
        })
        if (!response.ok) throw new Error(`The checker answered ${response.status}.`)
        const payload = (await response.json()) as {
          results?: { id: string; status: LinkStatus }[]
        }
        const at = new Date().toISOString()
        for (const entry of payload.results ?? []) {
          if (entry?.id && entry.status) collected.push([entry.id, { status: entry.status, at }])
        }
        // Anything the function did not answer for is simply unknown.
        const answered = new Set((payload.results ?? []).map((entry) => entry.id))
        for (const id of batch) {
          if (!answered.has(id)) collected.push([id, { status: 'unknown', at }])
        }
      } catch {
        failure = 'The link checker could not be reached. Try again in a moment.'
        const at = new Date().toISOString()
        for (const id of batch) collected.push([id, { status: 'unknown', at }])
      }
      setProgress({ done: Math.min(unique.length, index + batch.length), total: unique.length })
    }

    setResults((current) => {
      const next = new Map(current)
      for (const [id, result] of collected) next.set(id, result)
      return next
    })
    setError(failure)
    setChecking(false)
    running.current = false
  }, [])

  const forget = useCallback(() => {
    setResults(new Map())
    setError(null)
  }, [])

  const statusOf = useCallback(
    (fileId: string) => results.get(fileId)?.status ?? null,
    [results],
  )

  const staleOf = useCallback(
    (fileId: string) => {
      const result = results.get(fileId)
      return result ? isStale(result) : false
    },
    [results],
  )

  const lastChecked = (() => {
    let newest = 0
    for (const result of results.values()) {
      const at = new Date(result.at).getTime()
      if (Number.isFinite(at) && at > newest) newest = at
    }
    return newest ? new Date(newest).toISOString() : null
  })()

  return {
    results,
    checking,
    progress,
    error,
    lastChecked,
    check,
    forget,
    statusOf,
    isStale: staleOf,
  }
}

/** The Drive file ids a health check should cover: the papers and their keys. */
export const healthTargets = (papers: Paper[]) => {
  const ids: string[] = []
  for (const paper of papers) {
    if (paper.drive_file_id) ids.push(paper.drive_file_id)
    if (paper.solution_file_id) ids.push(paper.solution_file_id)
  }
  return ids
}
