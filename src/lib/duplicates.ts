import { parseExamDate } from './exam'
import type { Paper } from './types'

/** Lets the caller turn a message into the reader's language; identity by default. */
export type Translate = (text: string, vars?: Record<string, string | number>) => string

const plain: Translate = (text, vars) =>
  vars
    ? text.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in vars ? String(vars[key]) : whole,
      )
    : text

/**
 * Duplicate hunting. Two papers are duplicates when they point at the same
 * Drive file, when their titles say the same thing, or when they claim the
 * same exam slot (year + shift + folder) — the last one catches the same paper
 * uploaded twice under two slightly different titles.
 */

/** Lowercase, punctuation-free, squashed — "08 Nov 2025 — Shift 2" ≈ "08 nov 2025 shift 2". */
export const normaliseTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export interface FileOwner {
  paper: Paper
  /** Is this file the paper itself, or an answer key attached to it? */
  role: 'paper' | 'key'
}

/** Every Drive file the library already knows about, keyed by file id. */
export const fileOwners = (papers: Paper[], ignoreId?: string): Map<string, FileOwner> => {
  const owners = new Map<string, FileOwner>()
  for (const paper of papers) {
    if (paper.id === ignoreId) continue
    if (paper.drive_file_id) owners.set(paper.drive_file_id, { paper, role: 'paper' })
    if (paper.solution_file_id) owners.set(paper.solution_file_id, { paper, role: 'key' })
  }
  return owners
}

/** The paper whose title matches, if any (ignoring the row being edited). */
export const titleOwner = (title: string, papers: Paper[], ignoreId?: string) => {
  const target = normaliseTitle(title)
  if (!target) return null
  return (
    papers.find((paper) => paper.id !== ignoreId && normaliseTitle(paper.title) === target) ??
    null
  )
}

export interface LinkCheck {
  /** A hard stop: this file is already in the library. */
  blocked?: string
  /** Worth a second look, but the admin may still mean it. */
  warning?: string
}

/** Checks one row from the Add panel (or the edit form) against the library. */
export const checkAgainstLibrary = (
  input: { title: string; fileId: string | null; answerFileId?: string | null },
  papers: Paper[],
  ignoreId?: string,
  t: Translate = plain,
): LinkCheck => {
  const owners = fileOwners(papers, ignoreId)

  if (input.fileId) {
    const owner = owners.get(input.fileId)
    if (owner?.role === 'paper') {
      return {
        blocked: t('Already in the library as “{title}”.', { title: owner.paper.title }),
      }
    }
    if (owner?.role === 'key') {
      return {
        blocked: t('That file is already the answer key of “{title}”.', {
          title: owner.paper.title,
        }),
      }
    }
  }

  if (input.answerFileId) {
    const owner = owners.get(input.answerFileId)
    if (owner?.role === 'key') {
      return {
        blocked: t('That answer key is already attached to “{title}”.', {
          title: owner.paper.title,
        }),
      }
    }
    if (owner?.role === 'paper') {
      return {
        blocked: t('That file is already a paper: “{title}”.', { title: owner.paper.title }),
      }
    }
  }

  const twin = titleOwner(input.title, papers, ignoreId)
  if (twin) {
    return {
      warning: t('A paper called “{title}” is already in the library.', { title: twin.title }),
    }
  }
  return {}
}

export interface DuplicateGroup {
  key: string
  reason: string
  papers: Paper[]
}

/**
 * Everything in the library that looks like it got there twice. Only groups
 * with two or more papers are returned, and a paper appears in at most one
 * group so the list stays readable.
 */
export const duplicateGroups = (papers: Paper[]): DuplicateGroup[] => {
  const groups: DuplicateGroup[] = []
  const seen = new Set<string>()

  const collect = (key: string, reason: string, matches: Paper[]) => {
    const fresh = matches.filter((paper) => !seen.has(paper.id))
    if (fresh.length < 2) return
    for (const paper of fresh) seen.add(paper.id)
    groups.push({ key, reason, papers: fresh })
  }

  const byFile = new Map<string, Paper[]>()
  for (const paper of papers) {
    const list = byFile.get(paper.drive_file_id) ?? []
    list.push(paper)
    byFile.set(paper.drive_file_id, list)
  }
  for (const [fileId, matches] of byFile) {
    collect(`file-${fileId}`, 'The same Drive file is used by more than one card.', matches)
  }

  const byTitle = new Map<string, Paper[]>()
  for (const paper of papers) {
    const key = normaliseTitle(paper.title)
    if (!key) continue
    const list = byTitle.get(key) ?? []
    list.push(paper)
    byTitle.set(key, list)
  }
  for (const [title, matches] of byTitle) {
    collect(`title-${title}`, 'These cards have the same title.', matches)
  }

  // A sitting is one folder, one date and one shift. Two papers of the same
  // year share a shift (the exam runs for days), so the year alone is not a
  // slot — without a date in the title there is nothing to compare, and the
  // file / title checks above already cover the real duplicates.
  const bySlot = new Map<string, Paper[]>()
  for (const paper of papers) {
    if (!paper.exam_shift) continue
    const date = parseExamDate(paper.title)
    if (!date) continue
    const key = `${paper.category}|${date}|${paper.exam_shift}`
    const list = bySlot.get(key) ?? []
    list.push(paper)
    bySlot.set(key, list)
  }
  for (const [slot, matches] of bySlot) {
    collect(
      `slot-${slot}`,
      'Two cards claim the same exam date and shift in the same folder — probably the same paper uploaded twice.',
      matches,
    )
  }

  return groups
}

/** Small health numbers for the check panel. */
export const librarySummary = (papers: Paper[]) => ({
  total: papers.length,
  folders: new Set(papers.map((paper) => paper.category)).size,
  withKey: papers.filter((paper) => paper.solution_file_id || paper.solution_paper_id).length,
  withoutYear: papers.filter((paper) => !paper.exam_year).length,
  duplicateGroups: duplicateGroups(papers).length,
})
