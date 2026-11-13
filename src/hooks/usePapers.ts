import { useCallback, useEffect, useRef, useState } from 'react'
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
  /** Moves the cards around locally while a card is held, without touching the database. */
  previewOrder: (orderedVisibleIds: string[]) => void
  /** Same as previewOrder, then saves the new arrangement for everybody. */
  commitOrder: (orderedVisibleIds: string[]) => Promise<void>
}

const isDuplicate = (message: string) =>
  /duplicate key|unique constraint/i.test(message)

/**
 * Puts the visible cards into `orderedVisibleIds` order while every hidden card
 * keeps its slot, then renumbers the whole library 1..n.
 *
 * Works for the filtered views too: dragging inside "MATHS MATERIAL" only
 * shuffles those five cards, the rest stay exactly where they were.
 */
const withOrder = (papers: Paper[], orderedVisibleIds: string[]): Paper[] => {
  const byId = new Map(papers.map((paper) => [paper.id, paper]))
  const visible = new Set(orderedVisibleIds)
  const queue = orderedVisibleIds
    .map((id) => byId.get(id))
    .filter((paper): paper is Paper => Boolean(paper))

  let cursor = 0
  const reordered = papers.map((paper) =>
    visible.has(paper.id) ? (queue[cursor++] ?? paper) : paper,
  )

  return reordered.map((paper, index) => ({ ...paper, sort_order: index + 1 }))
}

export function usePapers(): PapersState {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mirrors `papers` so callbacks always see the freshest order without
  // depending on render timing (drag + drop fires many updates per second).
  const papersRef = useRef<Paper[]>([])

  const applyPapers = useCallback((next: Paper[]) => {
    papersRef.current = next
    setPapers(next)
  }, [])

  const reload = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('papers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }
    setError(null)
    applyPapers((data ?? []) as Paper[])
    setLoading(false)
  }, [applyPapers])

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
        applyPapers([...inserted].reverse().concat(papersRef.current))
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
          applyPapers([single as Paper, ...papersRef.current])
          result.inserted += 1
        }
      }

      return result
    },
    [applyPapers],
  )

  const updatePaper = useCallback(
    async (id: string, patch: Partial<NewPaper>) => {
      const { data, error: updateError } = await supabase
        .from('papers')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()

      if (updateError) throw updateError
      if (data) {
        applyPapers(
          papersRef.current.map((paper) => (paper.id === id ? (data as Paper) : paper)),
        )
      }
    },
    [applyPapers],
  )

  const deletePaper = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('papers').delete().eq('id', id)
      if (deleteError) throw deleteError
      applyPapers(papersRef.current.filter((paper) => paper.id !== id))
    },
    [applyPapers],
  )

  const previewOrder = useCallback(
    (orderedVisibleIds: string[]) => {
      applyPapers(withOrder(papersRef.current, orderedVisibleIds))
    },
    [applyPapers],
  )

  const commitOrder = useCallback(
    async (orderedVisibleIds: string[]) => {
      const previous = papersRef.current
      const next = withOrder(previous, orderedVisibleIds)
      applyPapers(next)

      const { error: orderError } = await supabase.rpc('reorder_papers', {
        p_ids: next.map((paper) => paper.id),
        p_orders: next.map((paper) => paper.sort_order),
      })

      if (orderError) {
        applyPapers(previous)
        throw orderError
      }
    },
    [applyPapers],
  )

  return {
    papers,
    loading,
    error,
    reload,
    addPapers,
    updatePaper,
    deletePaper,
    previewOrder,
    commitOrder,
  }
}
