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

export interface ToastMessage {
  id: number
  text: string
  tone: 'success' | 'error' | 'info'
}
