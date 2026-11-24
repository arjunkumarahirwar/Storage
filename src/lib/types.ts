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
}

export interface Profile {
  id: string
  username: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export type ProgressFilter = 'all' | 'open' | 'done'

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
