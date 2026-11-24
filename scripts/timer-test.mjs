/**
 * The practice clock's own checks: it must count *down*, stop at zero, and
 * never hand the database a nonsense time.
 *
 *   npm run test:timer
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = new URL('..', import.meta.url).pathname
const outDir = mkdtempSync(join(tmpdir(), 'pyq-timer-'))

let failures = 0
const check = (name, passed, detail = '') => {
  if (passed) console.log(`PASS  ${name}`)
  else {
    failures += 1
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

try {
  const outfile = join(outDir, 'countdown.mjs')
  await build({
    entryPoints: [join(root, 'src/lib/countdown.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  })
  const c = await import(pathToFileURL(outfile).href)

  // ---- the default the administrator sets -----------------------------
  check('default is 120 minutes', c.DEFAULT_PRACTICE_MINUTES === 120)
  check('clamp: empty means the default', c.clampMinutes(undefined) === 120)
  check('clamp: a string works', c.clampMinutes('45') === 45)
  check('clamp: too small becomes 5', c.clampMinutes(1) === 5)
  check('clamp: too big becomes 300', c.clampMinutes(999) === 300)
  check('clamp: decimals round', c.clampMinutes(59.6) === 60)
  check('clamp: rubbish becomes the default', c.clampMinutes('abc') === 120)

  // ---- the −5 / +5 stepper --------------------------------------------
  check('step: 120 − 5 is 115', c.stepMinutes(120, -5) === 115)
  check('step: 115 − 5 is 110', c.stepMinutes(115, -5) === 110)
  check('step: 5 − 5 stays at 5', c.stepMinutes(5, -5) === 5)
  check('step: 300 + 5 stays at 300', c.stepMinutes(300, 5) === 300)
  check('step: 30 + 5 is 35', c.stepMinutes(30, 5) === 35)
  check('step: a typed 117 snaps to 115', c.stepMinutes(117, 0) === 115)
  check('step: a typed 118 snaps to 120', c.stepMinutes(118, 0) === 120)
  check('step: snap keeps 5', c.snapMinutes(7) === 5)
  check('step: snap keeps 300', c.snapMinutes(298) === 300)
  check('step: every stop is a multiple of five', [120, 115, 110, 105, 100].every(
    (value) => c.stepMinutes(value, -5) % 5 === 0,
  ))

  // ---- counting down ---------------------------------------------------
  const start = 1_700_000_000_000
  const run = { startedAt: start, minutes: 120 }

  check('a fresh run starts at the full time', c.remainingMs(run, start) === 120 * 60000)
  check(
    'one minute in, 119 are left',
    c.remainingMs(run, start + 60000) === 119 * 60000,
  )
  check('time spent is capped at the time allowed', c.spentMs(run, start + 1000) === 1000)
  check('nothing is spent before the start', c.spentMs(run, start - 5000) === 0)
  check('the clock stops at zero', c.remainingMs(run, start + 999 * 60000) === 0)
  check(
    'the run stays at zero hours later',
    c.remainingMs(run, start + 10 * 3600 * 1000) === 0,
  )
  check('spent never passes the limit', c.spentMs(run, start + 10 * 3600 * 1000) === 120 * 60000)

  check('not expired one second before the end', !c.isExpired(run, start + 120 * 60000 - 1000))
  check('expired exactly on the hour', c.isExpired(run, start + 120 * 60000))
  check('expired after the hour', c.isExpired(run, start + 121 * 60000))
  check('red in the last five minutes', c.isNearlyUp(run, start + 116 * 60000))
  check('not red with six minutes left', !c.isNearlyUp(run, start + 114 * 60000))
  check('not red once it is over', !c.isNearlyUp(run, start + 130 * 60000))

  // ---- a short run, and one saved before minutes were stored ----------
  check(
    'a 30 minute run ends after 30 minutes',
    c.isExpired({ startedAt: start, minutes: 30 }, start + 30 * 60000),
  )
  check(
    'a run stored without minutes falls back to 120',
    c.remainingMs({ startedAt: start }, start + 60000) === 119 * 60000,
  )

  // ---- what gets saved -------------------------------------------------
  const seconds = (ms) => Math.min(259200, Math.max(10, Math.round(ms / 1000)))
  check('a two minute attempt is saved as 120 s', seconds(c.spentMs(run, start + 120000)) === 120)
  check(
    'an attempt that ran over is saved as the full 7200 s',
    seconds(c.spentMs(run, start + 130 * 60000)) === 7200,
  )
  check('an instant save still clears the database minimum', seconds(0) === 10)
} finally {
  rmSync(outDir, { recursive: true, force: true })
}

if (failures) {
  console.log(`\n${failures} timer check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nall timer checks passed')
}
