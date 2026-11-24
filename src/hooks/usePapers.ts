import { useCallback, useEffect, useRef, useState } from 'react'
import { parseExamInfo, normaliseTags } from '../lib/exam'
import { supabase } from '../lib/supabase'
import type { BulkPatch, NewPaper, Paper } from '../lib/types'

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
  /** Applies the same change to several papers at once (bulk edit). */
  bulkUpdate: (ids: string[], patch: BulkPatch) => Promise<number>
  deleteMany: (ids: string[]) => Promise<number>
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

  /**
   * If a newly added PDF is titled "<paper> Solution" and a paper with that
   * exact title exists, attach it as that paper's answer key automatically.
   * The admin can always change it later from Edit.
   */
  const autoLinkSolutions = useCallback(
    async (added: Paper[]) => {
      if (!added.length) return
      const library = papersRef.current
      const byTitle = new Map(
        library.map((paper) => [paper.title.trim().toLowerCase(), paper]),
      )
      const links: { id: string; solution_paper_id: string }[] = []

      for (const paper of added) {
        const match = /^(.*?)\s+solution$/i.exec(paper.title.trim())
        if (!match) continue
        const target = byTitle.get(match[1].trim().toLowerCase())
        if (!target || target.id === paper.id || target.solution_paper_id) continue
        links.push({ id: target.id, solution_paper_id: paper.id })
      }
      if (!links.length) return

      const saved: { id: string; solution_paper_id: string }[] = []
      for (const link of links) {
        const { error: linkError } = await supabase
          .from('papers')
          .update({ solution_paper_id: link.solution_paper_id })
          .eq('id', link.id)
        if (!linkError) saved.push(link)
      }
      if (!saved.length) return

      applyPapers(
        papersRef.current.map((paper) => {
          const link = saved.find((entry) => entry.id === paper.id)
          return link ? { ...paper, solution_paper_id: link.solution_paper_id } : paper
        }),
      )
    },
    [applyPapers],
  )

  const addPapers = useCallback(
    async (rows: NewPaper[]): Promise<AddResult> => {
      const result: AddResult = { inserted: 0, failures: [] }
      if (!rows.length) return result

      // The year and shift are read from the title unless the form said
      // otherwise, and the tags are tidied so one idea has one spelling.
      const prepared: NewPaper[] = rows.map((row) => {
        const parsed = parseExamInfo(row.title)
        return {
          ...row,
          tags: normaliseTags(row.tags),
          exam_year: row.exam_year ?? parsed.year,
          exam_shift: row.exam_shift ?? parsed.shift,
        }
      })

      const { data, error: insertError } = await supabase
        .from('papers')
        .insert(prepared)
        .select('*')

      if (!insertError) {
        const inserted = (data ?? []) as Paper[]
        applyPapers([...inserted].reverse().concat(papersRef.current))
        result.inserted = inserted.length
        await autoLinkSolutions(inserted)
        return result
      }

      // Bulk insert is all-or-nothing: retry one by one so a single duplicate
      // or bad row does not stop the rest.
      const addedOneByOne: Paper[] = []
      for (const row of prepared) {
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
          addedOneByOne.push(single as Paper)
          result.inserted += 1
        }
      }

      await autoLinkSolutions(addedOneByOne)
      return result
    },
    [applyPapers, autoLinkSolutions],
  )

  const updatePaper = useCallback(
    async (id: string, patch: Partial<NewPaper>) => {
      const clean: Partial<NewPaper> = {
        ...patch,
        ...(patch.tags ? { tags: normaliseTags(patch.tags) } : {}),
      }

      const { data, error: updateError } = await supabase
        .from('papers')
        .update(clean)
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

  /**
   * Bulk edit. Folder, year and shift are one update for the whole selection;
   * tags are per row because each card keeps its own list. Every changed row
   * comes back from the database, so the cards redraw with what was saved.
   */
  const bulkUpdate = useCallback(
    async (ids: string[], patch: BulkPatch) => {
      const selected = papersRef.current.filter((paper) => ids.includes(paper.id))
      if (!selected.length) return 0

      const addTags = normaliseTags(patch.addTags ?? [])
      const removeTags = new Set(normaliseTags(patch.removeTags ?? []).map((tag) => tag.toLowerCase()))
      const touchesTags = addTags.length > 0 || removeTags.size > 0

      const shared: Partial<NewPaper> = {}
      if (patch.category !== undefined) shared.category = patch.category
      if (patch.examYear !== undefined) shared.exam_year = patch.examYear
      if (patch.examShift !== undefined) shared.exam_shift = patch.examShift

      const fresh: Paper[] = []

      if (!touchesTags && Object.keys(shared).length) {
        const { data, error: bulkError } = await supabase
          .from('papers')
          .update(shared)
          .in('id', ids)
          .select('*')
        if (bulkError) throw bulkError
        fresh.push(...((data ?? []) as Paper[]))
      } else if (touchesTags) {
        const results = await Promise.all(
          selected.map((paper) => {
            const kept = paper.tags.filter((tag) => !removeTags.has(tag.toLowerCase()))
            const merged = normaliseTags([...kept, ...addTags])
            return supabase
              .from('papers')
              .update({ ...shared, tags: merged })
              .eq('id', paper.id)
              .select('*')
              .single()
          }),
        )
        const failure = results.find((result) => result.error)
        if (failure?.error) throw failure.error
        for (const result of results) {
          if (result.data) fresh.push(result.data as Paper)
        }
      }

      if (fresh.length) {
        const byId = new Map(fresh.map((paper) => [paper.id, paper]))
        applyPapers(
          papersRef.current.map((paper) => byId.get(paper.id) ?? paper),
        )
      }
      return fresh.length
    },
    [applyPapers],
  )

  const deleteMany = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return 0
      const { error: deleteError } = await supabase.from('papers').delete().in('id', ids)
      if (deleteError) throw deleteError
      const gone = new Set(ids)
      applyPapers(papersRef.current.filter((paper) => !gone.has(paper.id)))
      return ids.length
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

      if (!orderError) return

      // Fallback: the row level security policies already restrict updates to
      // the administrator, so a plain update per row saves the same order even
      // if the database function is missing or has not been deployed yet.
      const results = await Promise.all(
        next.map((paper) =>
          supabase
            .from('papers')
            .update({ sort_order: paper.sort_order })
            .eq('id', paper.id),
        ),
      )
      const failure = results.find((result) => result.error)

      if (failure?.error) {
        applyPapers(previous)
        throw failure.error
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
    bulkUpdate,
    deleteMany,
    previewOrder,
    commitOrder,
  }
}
