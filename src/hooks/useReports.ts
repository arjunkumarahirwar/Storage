import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NewReport, PaperReport } from '../lib/types'

export interface ReportsState {
  reports: PaperReport[]
  loading: boolean
  error: string | null
  /** Reports that still need a look. */
  openCount: number
  reload: () => Promise<void>
  submit: (report: NewReport) => Promise<void>
  resolve: (id: string) => Promise<void>
}

/**
 * Students only ever write. The inbox (read + resolve) is fetched for the
 * administrator alone — the database refuses the rows to everyone else, so
 * asking for them as a guest would just return an empty list.
 */
export function useReports(isAdmin: boolean): ReportsState {
  const [reports, setReports] = useState<PaperReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const adminRef = useRef(isAdmin)
  adminRef.current = isAdmin

  const reload = useCallback(async () => {
    if (!adminRef.current) {
      setReports([])
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('paper_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }
    setError(null)
    setReports((data ?? []) as PaperReport[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, isAdmin])

  const submit = useCallback(async (report: NewReport) => {
    const { error: insertError } = await supabase.from('paper_reports').insert({
      paper_id: report.paper_id,
      paper_title: report.paper_title,
      reason: report.reason,
      details: report.details,
    })
    if (insertError) throw insertError
  }, [])

  const resolve = useCallback(
    async (id: string) => {
      const { data, error: updateError } = await supabase
        .from('paper_reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (updateError) throw updateError
      if (data) {
        setReports((current) =>
          current.map((report) => (report.id === id ? (data as PaperReport) : report)),
        )
      }
    },
    [],
  )

  const openCount = reports.filter((report) => report.status === 'open').length

  return { reports, loading, error, openCount, reload, submit, resolve }
}
