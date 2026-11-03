import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NewPaper, Paper } from '../lib/types'

interface AddResult {
  inserted: number
  failures: { title: string; message: string }[]
}

export interface PapersState {
  papers: Paper[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  addPapers: (rows: NewPaper[]) => Promise<AddResult>
  updatePaper: (id: string, patch: Partial<NewPaper>) => Promise<void>
  deletePaper: (id: string) => Promise<void>
}

const isDuplicate = (message: string) =>
  /duplicate key|unique constraint/i.test(message)

export function usePapers(): PapersState {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('papers')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }
    setError(null)
    setPapers((data ?? []) as Paper[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const addPapers = useCallback(
    async (rows: NewPaper[]): Promise<AddResult> => {
      const result: AddResult = { inserted: 0, failures: [] }
      if (!rows.length) return result

      const { data, error: insertError } = await supabase
        .from('papers')
        .insert(rows)
        .select('*')

      if (!insertError) {
        const inserted = (data ?? []) as Paper[]
        setPapers((current) => [...inserted].reverse().concat(current))
        result.inserted = inserted.length
        return result
      }

      // Bulk insert is all-or-nothing: retry one by one so a single duplicate
      // or bad row does not stop the rest.
      for (const row of rows) {
        const { data: single, error: rowError } = await supabase
          .from('papers')
          .insert(row)
          .select('*')
          .single()

        if (rowError) {
          result.failures.push({
            title: row.title,
            message: isDuplicate(rowError.message) ? 'Already in the library' : rowError.message,
          })
        } else if (single) {
          setPapers((current) => [single as Paper, ...current])
          result.inserted += 1
        }
      }

      return result
    },
    [],
  )

  const updatePaper = useCallback(async (id: string, patch: Partial<NewPaper>) => {
    const { data, error: updateError } = await supabase
      .from('papers')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError
    if (data) {
      setPapers((current) =>
        current.map((paper) => (paper.id === id ? (data as Paper) : paper)),
      )
    }
  }, [])

  const deletePaper = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('papers').delete().eq('id', id)
    if (deleteError) throw deleteError
    setPapers((current) => current.filter((paper) => paper.id !== id))
  }, [])

  return { papers, loading, error, reload, addPapers, updatePaper, deletePaper }
}
