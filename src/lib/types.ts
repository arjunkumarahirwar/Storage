export type SourceType = 'official' | 'own'

export interface Paper {
  id: string
  title: string
  drive_file_id: string
  category: string
  tags: string[]
  source_type: SourceType
  source_url: string | null
  /** The answer key attached to this paper (null when there is none). */
  solution_paper_id: string | null
  /**
   * The answer key's Drive file id, when the key is just a file attached to
   * this paper instead of a card of its own. No folder, title or tags.
   */
  solution_file_id: string | null
  /** Exam year, e.g. 2025. Null for material that belongs to no exam. */
  exam_year: number | null
  /** Shift number (1, 2, …) when the exam ran in shifts. */
  exam_shift: number | null
  /** Position in the library, set by dragging cards. 0 means "just added, put me on top". */
  sort_order: number
  created_at: string
  updated_at: string
}

/** Fields the admin sends when creating a paper. */
export interface NewPaper {
  title: string
  drive_file_id: string
  category: string
  tags: string[]
  source_type: SourceType
  source_url: string | null
  solution_paper_id?: string | null
  solution_file_id?: string | null
  /** Left out (or null) = read it from the title instead. */
  exam_year?: number | null
  exam_shift?: number | null
}

export interface Profile {
  id: string
  username: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export type ProgressFilter = 'all' | 'open' | 'done'

/** A student's private note and difficulty rating for one paper. */
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface NoteEntry {
  note: string
  difficulty: Difficulty | null
}

export const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Can do it quickly' },
  { value: 'medium', label: 'Medium', hint: 'Needs some thought' },
  { value: 'hard', label: 'Hard', hint: 'Revisit this one' },
]

/** What the link checker says about a Drive file. */
export type LinkStatus = 'ok' | 'restricted' | 'missing' | 'unknown'

export interface LinkHealthResult {
  status: LinkStatus
  /** ISO timestamp of the check. */
  at: string
}

/** The changes the bulk editor can make to a set of papers. */
export interface BulkPatch {
  category?: string
  addTags?: string[]
  removeTags?: string[]
  /** `undefined` leaves the year alone, `null` clears it. */
  examYear?: number | null
  examShift?: number | null
}

/** One timed practice run, self-reported after reading the PDF. */
export interface PracticeAttempt {
  id: string
  paperId: string
  seconds: number
  score: number
  total: number
  /** ISO timestamp. */
  at: string
}

/** Why a student says a paper is wrong. Mirrors paper_reports_reason_check. */
export type ReportReason =
  | 'link_broken'
  | 'wrong_file'
  | 'missing_key'
  | 'wrong_key'
  | 'other'

export interface PaperReport {
  id: string
  paper_id: string | null
  paper_title: string
  reason: ReportReason
  details: string | null
  reporter_id: string | null
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
}

/** What the report form sends. reporter_id is filled in by the database. */
export interface NewReport {
  paper_id: string
  paper_title: string
  reason: ReportReason
  details: string | null
}

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  {
    value: 'link_broken',
    label: 'The PDF does not open',
    hint: 'Drive says "file not found", or the page stays blank.',
  },
  {
    value: 'wrong_file',
    label: 'It is a different paper',
    hint: 'The PDF inside does not match the title.',
  },
  {
    value: 'missing_key',
    label: 'The answer key is missing',
    hint: 'There is no answer key for this paper.',
  },
  {
    value: 'wrong_key',
    label: 'The answer key is wrong',
    hint: 'It belongs to another shift, or the answers are wrong.',
  },
  { value: 'other', label: 'Something else', hint: 'Tell me below.' },
]

export const reportReasonLabel = (reason: ReportReason) =>
  REPORT_REASONS.find((entry) => entry.value === reason)?.label ?? 'Problem'

export interface ToastMessage {
  id: number
  text: string
  tone: 'success' | 'error' | 'info'
}
