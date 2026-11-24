/**
 * Everything about the "exam" a PDF belongs to: which year, which shift, and
 * what its tags should look like.
 *
 * Titles in this library carry the date: "MP Police Constable 07 Nov 2025
 * Shift 2". Reading them back means the admin never has to fill the year and
 * shift by hand — the form still lets them override it.
 */

export interface ExamInfo {
  year: number | null
  shift: number | null
}

const YEAR_RE = /(?:19|20)\d{2}/
const SHIFT_RE = /shift\s*-?\s*(\d)/i

export const parseExamInfo = (title: string): ExamInfo => {
  const yearMatch = YEAR_RE.exec(title)
  const year = yearMatch ? Number(yearMatch[0]) : null

  const shiftMatch = SHIFT_RE.exec(title)
  const shift = shiftMatch ? Number(shiftMatch[1]) : null

  return {
    year: year !== null && year >= 1990 && year <= 2100 ? year : null,
    shift: shift !== null && shift >= 1 && shift <= 4 ? shift : null,
  }
}

export const examLabel = (info: ExamInfo): string => {
  if (info.year && info.shift) return `${info.year} · Shift ${info.shift}`
  if (info.year) return String(info.year)
  if (info.shift) return `Shift ${info.shift}`
  return ''
}

/**
 * One spelling per idea. The keys are what the tags looked like before (and
 * what the admin might still type); the values are what is stored.
 * This mirrors the mapping in supabase/schema.sql.
 */
const CANONICAL_TAGS: Record<string, string> = {
  batta: 'Batta',
  squares: 'Squares',
  'squares 1 to 50': 'Squares',
  cubes: 'Cubes',
  'cubes 1 to 40': 'Cubes',
  tables: 'Tables',
  'multiple tables': 'Tables',
  'multiple tables 1 to 50': 'Tables',
  'prime numbers': 'Prime numbers',
  'prime numbers between 1 to 1000': 'Prime numbers',
  'maths formula': 'Maths formula',
  'maths formulae': 'Maths formula',
  'math formula': 'Maths formula',
}

/**
 * Tags that only repeat something the card already shows: the folder, the
 * title, the year / shift filter or the green "Answer key" button.
 */
const STRUCTURAL_TAGS: RegExp[] = [
  /^shift\s*-?\s*\d$/,
  /^\d{1,2}\s+[a-z]{3,9}\s+(19|20)\d{2}$/,
  /^(solution|solutions|question paper|answer key)$/,
  /^(19|20)\d{2}$/,
]

const isStructural = (tag: string) => STRUCTURAL_TAGS.some((re) => re.test(tag))

/**
 * Trims, de-duplicates (ignoring case), applies the canonical spelling and
 * drops structural tags. Also keeps the row inside the database limits:
 * 12 tags and 300 characters in total.
 */
export const normaliseTags = (tags: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  let length = 0

  for (const raw of tags) {
    const clean = raw.replace(/\s+/g, ' ').trim()
    if (!clean) continue

    const key = clean.toLowerCase()
    if (isStructural(key)) continue

    const display = CANONICAL_TAGS[key] ?? clean
    const unique = display.toLowerCase()
    if (seen.has(unique)) continue

    // +1 for the comma the database counts between tags.
    if (length + display.length + (out.length ? 1 : 0) > 300) break

    seen.add(unique)
    out.push(display)
    length += display.length + (out.length > 1 ? 1 : 0)
    if (out.length === 12) break
  }

  return out
}
