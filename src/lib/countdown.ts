/**
 * The practice clock.
 *
 * A paper is not a stopwatch: the candidate says how long they get (120 minutes
 * by default, the real exam length), and the clock counts *down* to zero. These
 * are the pure bits — no React, no storage — so they can be checked in a script.
 */

/** What the administrator sets once, and what every attempt starts from. */
export const DEFAULT_PRACTICE_MINUTES = 120

/** Anything shorter than five minutes is not a practice run; five hours is plenty. */
export const MIN_PRACTICE_MINUTES = 5
export const MAX_PRACTICE_MINUTES = 300

/** Whole minutes, inside the limits. Garbage falls back to the default. */
export const clampMinutes = (value: number | string | null | undefined): number => {
  const minutes = typeof value === 'string' ? Number(value) : value
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return DEFAULT_PRACTICE_MINUTES
  }
  return Math.min(MAX_PRACTICE_MINUTES, Math.max(MIN_PRACTICE_MINUTES, Math.round(minutes)))
}

export interface TimedRun {
  /** `Date.now()` when the candidate tapped start. */
  startedAt: number
  /** Minutes they allowed themselves. */
  minutes: number
}

export const runMs = (run: TimedRun) => clampMinutes(run.minutes) * 60000

/** Milliseconds left on the clock — never below zero. */
export const remainingMs = (run: TimedRun, now: number) =>
  Math.max(0, runMs(run) - Math.max(0, now - run.startedAt))

/** How long they have actually been working, capped at the time allowed. */
export const spentMs = (run: TimedRun, now: number) => runMs(run) - remainingMs(run, now)

export const isExpired = (run: TimedRun, now: number) => remainingMs(run, now) === 0

/** Under five minutes left — the clock turns red. */
export const isNearlyUp = (run: TimedRun, now: number) => {
  const left = remainingMs(run, now)
  return left > 0 && left <= 5 * 60000
}
