export type SourceType = 'official' | 'own'

export interface Paper {
  id: string
  title: string
  drive_file_id: string
  category: string
  tags: string[]
  source_type: SourceType
  source_url: string | null
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
}

export type ProgressFilter = 'all' | 'open' | 'done'

export interface ToastMessage {
  id: number
  text: string
  tone: 'success' | 'error' | 'info'
}
