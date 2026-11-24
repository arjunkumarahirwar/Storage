/**
 * The duplicate guard's own checks.
 *
 * The library holds a week of papers that all say "2025 · Shift 1" — one per
 * exam day — so comparing year and shift alone flagged thirteen innocent cards.
 * A sitting is a folder *and a date* and a shift, and nothing else.
 *
 *   npm run test:duplicates
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = new URL('..', import.meta.url).pathname
const outDir = mkdtempSync(join(tmpdir(), 'pyq-duplicates-'))

const bundle = async (entry, name) => {
  const outfile = join(outDir, `${name}.mjs`)
  await build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  })
  return import(pathToFileURL(outfile).href)
}

let failures = 0
const check = (name, passed, detail = '') => {
  if (passed) console.log(`PASS  ${name}`)
  else {
    failures += 1
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const paper = (id, title, overrides = {}) => ({
  id,
  title,
  drive_file_id: `file-${id}`,
  category: 'MP Police Constable 2025 Papers',
  tags: [],
  source_type: 'own',
  source_url: null,
  exam_year: 2025,
  exam_shift: 1,
  solution_file_id: null,
  solution_paper_id: null,
  sort_order: 0,
  created_at: '2025-11-05T00:00:00.000Z',
  updated_at: '2025-11-05T00:00:00.000Z',
  ...overrides,
})

try {
  const { duplicateGroups } = await bundle('src/lib/duplicates.ts', 'duplicates')
  const { parseExamDate } = await bundle('src/lib/exam.ts', 'exam')

  // ---- reading the date out of a title --------------------------------
  check('date: "08 Nov 2025"', parseExamDate('MP Police Constable 08 Nov 2025 Shift 2') === '2025-11-08')
  check('date: one-digit day', parseExamDate('Constable 8 Nov 2025 Shift 1') === '2025-11-08')
  check('date: full month name', parseExamDate('Constable 8 november 2025') === '2025-11-08')
  check('date: numbered day/month', parseExamDate('Constable 08/11/2025 Shift 2') === '2025-11-08')
  check('date: no date in the title', parseExamDate('MP Police Constable 2025 Shift 1') === null)
  check(
    'date: a year on its own is not a date',
    parseExamDate('MP Police Constable 2025 Shift 1') === null,
  )

  // ---- the real library: a week of papers, all "2025" ------------------
  const week = [
    '08 Nov 2025',
    '07 Nov 2025',
    '06 Nov 2025',
    '04 Nov 2025',
    '03 Nov 2025',
    '02 Nov 2025',
    '01 Nov 2025',
  ]
  const library = [
    ...week.map((date, index) =>
      paper(`s1-${index}`, `MP Police Constable ${date} Shift 1`, { exam_shift: 1 }),
    ),
    ...week.slice(1).map((date, index) =>
      paper(`s2-${index}`, `MP Police Constable ${date} Shift 2`, { exam_shift: 2 }),
    ),
  ]
  check(
    'a week of papers in one folder is not a duplicate',
    duplicateGroups(library).length === 0,
    `${duplicateGroups(library).length} group(s)`,
  )

  // ---- the same sitting uploaded twice --------------------------------
  const twice = [
    paper('a', 'MP Police Constable 04 Nov 2025 Shift 1'),
    paper('b', 'Constable 04-11-2025, shift 1', { exam_shift: 1 }),
  ]
  const twiceGroups = duplicateGroups(twice)
  check('the same date and shift twice is a duplicate', twiceGroups.length === 1)
  check(
    'and the group names the date, not the year',
    twiceGroups[0]?.reason.includes('exam date and shift') === true,
    twiceGroups[0]?.reason,
  )

  // ---- neighbouring sittings are not duplicates -----------------------
  check(
    'same date, different shift is fine',
    duplicateGroups([
      paper('a', 'MP Police Constable 04 Nov 2025 Shift 1', { exam_shift: 1 }),
      paper('b', 'MP Police Constable 04 Nov 2025 Shift 2', { exam_shift: 2 }),
    ]).length === 0,
  )
  check(
    'same date and shift in a different folder is fine',
    duplicateGroups([
      paper('a', 'MP Police Constable 04 Nov 2025 Shift 1'),
      paper('b', 'PCRT Constable 04 Nov 2025 Shift 1', {
        category: 'PCRT OLD QUESTIONS',
      }),
    ]).length === 0,
  )
  check(
    'no date in either title: nothing to compare',
    duplicateGroups([
      paper('a', 'MP Police Constable 2025 Shift 1'),
      paper('b', 'MP Police Paper 2025 — shift 1', { drive_file_id: 'other' }),
    ]).length === 0,
  )

  // ---- the two checks that always ran --------------------------------
  check(
    'one Drive file on two cards',
    duplicateGroups([
      paper('a', 'CUBES 1 TO 40', { drive_file_id: 'same', exam_year: null, exam_shift: null }),
      paper('b', 'CUBES 1 to 40 (copy)', {
        drive_file_id: 'same',
        exam_year: null,
        exam_shift: null,
      }),
    ]).length === 1,
  )
  check(
    'two cards with the same title',
    duplicateGroups([
      paper('a', 'MP Police Constable 01 Nov 2025 Shift 1'),
      paper('b', 'MP Police Constable 01 Nov 2025 Shift 1', { exam_shift: 2 }),
    ]).length === 1,
  )
} finally {
  rmSync(outDir, { recursive: true, force: true })
}

if (failures) {
  console.log(`\n${failures} duplicate check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nall duplicate checks passed')
}
