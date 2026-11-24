import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AddPapersPanel } from './components/AddPapersPanel'
import { AuthDialog } from './components/AuthDialog'
import { BulkBar } from './components/BulkBar'
import { BulkEditDialog } from './components/BulkEditDialog'
import { LibraryCheckDialog } from './components/LibraryCheckDialog'
import { CategoryChips } from './components/CategoryChips'
import { ConfirmDialog } from './components/ConfirmDialog'
import { EmptyState, PaperSkeleton } from './components/EmptyState'
import { ExamFilters } from './components/ExamFilters'
import { FilterTabs } from './components/FilterTabs'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HeroCard } from './components/HeroCard'
import {
  ClockIcon,
  CopyIcon,
  DeviceIcon,
  GripIcon,
  LayersIcon,
  PlusIcon,
  PulseIcon,
  RefreshIcon,
} from './components/Icons'
import { NotesDialog } from './components/NotesDialog'
import { PaperCard } from './components/PaperCard'
import { PracticeDialog } from './components/PracticeDialog'
import { ProfileDialog } from './components/ProfileDialog'
import { InstallCard, OfflineBar, UpdateBar } from './components/PwaNotices'
import { RecentStrip } from './components/RecentStrip'
import { ReportDialog } from './components/ReportDialog'
import { ReportsDialog } from './components/ReportsDialog'
import { ResetPasswordDialog } from './components/ResetPasswordDialog'
import { Toasts } from './components/Toasts'
import { useAuth } from './hooks/useAuth'
import { useI18n } from './hooks/useI18n'
import { healthTargets, useLinkHealth } from './hooks/useLinkHealth'
import { usePapers } from './hooks/usePapers'
import { useNotes } from './hooks/useNotes'
import { usePractice } from './hooks/usePractice'
import { useProfile } from './hooks/useProfile'
import { usePwa } from './hooks/usePwa'
import { useProgress } from './hooks/useProgress'
import { useSettings } from './hooks/useSettings'
import { useReports } from './hooks/useReports'
import { useTheme } from './hooks/useTheme'
import { useToasts } from './hooks/useToasts'
import { driveViewUrl } from './lib/drive'
import { formatClock } from './lib/format'
import type { BulkPatch, NewReport, Paper, ProgressFilter } from './lib/types'

const listCards = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-paper-id]'))

const matchesQuery = (paper: Paper, tokens: string[], extra = '') => {
  if (!tokens.length) return true
  const haystack = [paper.title, paper.category, ...paper.tags, extra]
    .join(' ')
    .toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

/**
 * A filtered list is worth sharing: the search, the folder and the done/open
 * switch all live in the address, so WhatsApp can carry them.
 */
const readFiltersFromUrl = () => {
  if (typeof window === 'undefined') {
    return {
      query: '',
      category: 'All',
      filter: 'all' as ProgressFilter,
      year: null as number | null,
      shift: null as number | null,
    }
  }
  const params = new URLSearchParams(window.location.search)
  const show = params.get('show')
  const rawYear = Number(params.get('y'))
  const rawShift = Number(params.get('shift'))
  return {
    query: params.get('q') ?? '',
    category: params.get('cat') ?? 'All',
    filter: (show === 'done' || show === 'open' ? show : 'all') as ProgressFilter,
    year:
      Number.isInteger(rawYear) && rawYear >= 1990 && rawYear <= 2100 ? rawYear : null,
    shift:
      Number.isInteger(rawShift) && rawShift >= 1 && rawShift <= 4 ? rawShift : null,
  }
}

/** The ids the visitor had on the list last time they were here. */
const SEEN_KEY = 'pyq:seenPapers:v1'

const readSeenPapers = (): Set<string> | null => {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return new Set(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return null
  }
}

const REPORTED_KEY = 'pyq:reported:v1'

const readReported = (): string[] => {
  try {
    const raw = window.localStorage.getItem(REPORTED_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

export default function App() {
  const { isDark, toggle } = useTheme()
  const { toasts, push, dismiss } = useToasts()
  const { t } = useI18n()
  const auth = useAuth()
  const {
    papers,
    loading,
    error,
    reload,
    addPapers,
    updatePaper,
    deletePaper,
    bulkUpdate,
    deleteMany,
    commitOrder,
  } = usePapers()
  const progress = useProgress(auth.session?.user.id ?? null)
  const { profile, needsSetup, saveProfile } = useProfile(auth.session?.user.id ?? null)
  const reports = useReports(auth.isAdmin)
  const notes = useNotes(auth.session?.user.id ?? null)
  const practice = usePractice(auth.session?.user.id ?? null)
  const settings = useSettings()
  const health = useLinkHealth()
  const pwa = usePwa()

  const initialFilters = useMemo(readFiltersFromUrl, [])
  const [query, setQuery] = useState(initialFilters.query)
  const [category, setCategory] = useState(initialFilters.category)
  const [filter, setFilter] = useState<ProgressFilter>(initialFilters.filter)
  const [year, setYear] = useState<number | null>(initialFilters.year)
  const [shift, setShift] = useState<number | null>(initialFilters.shift)
  const [reportTarget, setReportTarget] = useState<Paper | null>(null)
  const [notesTarget, setNotesTarget] = useState<Paper | null>(null)
  const [practiceTarget, setPracticeTarget] = useState<Paper | null>(null)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => new Set(readReported()))
  const [authOpen, setAuthOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  /** Bulk edit: pick cards, then change or delete them together. */
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Everything about the card currently held: which pointer owns the drag,
  // the live order, and the order to fall back to if the drag is cancelled.
  const dragRef = useRef<{
    id: string
    pointerId: number
    startY: number
    startScroll: number
    lastY: number
    from: number
    to: number
    ids: string[]
    els: Map<string, HTMLElement>
    centers: Map<string, number>
    tops: Map<string, number>
    heights: Map<string, number>
    gap: number
    changed: boolean
  } | null>(null)
  const settleRef = useRef(false)

  // A password-reset email lands back here with #...&type=recovery
  useEffect(() => {
    const looksLikeRecovery =
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    if (looksLikeRecovery) setRecoveryOpen(true)
  }, [])

  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  )

  const papersById = useMemo(
    () => new Map(papers.map((paper) => [paper.id, paper])),
    [papers],
  )

  /**
   * The answer key a card's green pill opens. It is either a file attached
   * straight to the paper (no card of its own) or the PDF of a separate
   * solution card, which is how the first 15 pairs were made.
   */
  const answerKeyFor = useCallback(
    (paper: Paper): { fileId: string; title: string } | null => {
      if (paper.solution_file_id) {
        return { fileId: paper.solution_file_id, title: `${paper.title} — answer key` }
      }
      const card = paper.solution_paper_id
        ? papersById.get(paper.solution_paper_id)
        : null
      return card ? { fileId: card.drive_file_id, title: card.title } : null
    },
    [papersById],
  )

  // answer-key id -> the paper it belongs to
  const originalFor = useMemo(() => {
    const map = new Map<string, Paper>()
    for (const paper of papers) {
      if (paper.solution_paper_id) map.set(paper.solution_paper_id, paper)
    }
    return map
  }, [papers])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const paper of papers) {
      counts.set(paper.category, (counts.get(paper.category) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [papers])

  const inScope = useMemo(
    () =>
      papers.filter((paper) => {
        const extra = [
          paper.solution_file_id || paper.solution_paper_id ? 'answer key solution' : '',
          originalFor.has(paper.id) ? 'question paper original' : '',
        ].join(' ')
        return (
          matchesQuery(paper, tokens, extra) &&
          (category === 'All' || paper.category === category) &&
          (year === null || paper.exam_year === year) &&
          (shift === null || paper.exam_shift === shift)
        )
      }),
    [papers, tokens, category, year, shift, originalFor],
  )

  // Years newest first, shifts low to high — the order students think in.
  const examYears = useMemo(
    () =>
      [...new Set(papers.map((paper) => paper.exam_year))]
        .filter((value): value is number => typeof value === 'number')
        .sort((a, b) => b - a),
    [papers],
  )

  const examShifts = useMemo(
    () =>
      [...new Set(papers.map((paper) => paper.exam_shift))]
        .filter((value): value is number => typeof value === 'number')
        .sort((a, b) => a - b),
    [papers],
  )

  const filterCounts = useMemo(() => {
    const done = inScope.filter((paper) => progress.done.has(paper.id)).length
    return { all: inScope.length, open: inScope.length - done, done }
  }, [inScope, progress.done])

  const visible = useMemo(
    () =>
      inScope.filter((paper) => {
        if (filter === 'done') return progress.done.has(paper.id)
        if (filter === 'open') return !progress.done.has(paper.id)
        return true
      }),
    [inScope, filter, progress.done],
  )

  const lastUpdated = useMemo(() => {
    if (!papers.length) return null
    return papers.reduce(
      (latest, paper) => (paper.created_at > latest ? paper.created_at : latest),
      papers[0].created_at,
    )
  }, [papers])

  const totalDone = useMemo(
    () => papers.filter((paper) => progress.done.has(paper.id)).length,
    [papers, progress.done],
  )

  const visibleIds = useMemo(() => visible.map((paper) => paper.id), [visible])

  // Newest uploads by date, whatever order the administrator arranged the
  // library in. The ids the visitor saw last time tell us what is actually new.
  const [seenPapers] = useState<Set<string> | null>(() => readSeenPapers())

  const recentPapers = useMemo(
    () =>
      [...papers]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
    [papers],
  )

  const newPaperCount = useMemo(() => {
    if (!seenPapers || !papers.length) return 0
    const fresh = papers.filter((paper) => !seenPapers.has(paper.id)).length
    // First visit, or a library that was replaced: no badge, just the shelf.
    return fresh === papers.length ? 0 : fresh
  }, [papers, seenPapers])

  useEffect(() => {
    if (!papers.length) return
    try {
      window.localStorage.setItem(
        SEEN_KEY,
        JSON.stringify(papers.map((paper) => paper.id)),
      )
    } catch {
      // Private mode, storage full — the shelf still works.
    }
  }, [papers])

  /**
   * Cards are never re-ordered in React while a finger is down. The held card
   * is moved with a transform that follows the pointer exactly, the cards it
   * passes slide aside with a CSS transition, and only on release is the new
   * order written to the database. That is what makes the drag feel smooth.
   */
  const startDrag = useCallback(
    (paper: Paper) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!auth.isAdmin) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      event.preventDefault()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Capture is a nicety; the gesture still works without it.
      }

      const cards = listCards()
      const ids = cards.map((card) => card.dataset.paperId ?? '')
      const from = ids.indexOf(paper.id)
      if (from < 0) return

      const rects = cards.map((card) => card.getBoundingClientRect())
      const below = rects[from + 1]
      const gap = below ? Math.max(4, below.top - rects[from].bottom) : 12

      const centers = new Map<string, number>()
      const tops = new Map<string, number>()
      const heights = new Map<string, number>()
      ids.forEach((id, index) => {
        centers.set(id, rects[index].top + rects[index].height / 2)
        tops.set(id, rects[index].top)
        heights.set(id, rects[index].height)
      })
      const els = new Map<string, HTMLElement>()
      cards.forEach((card, index) => els.set(ids[index], card))

      cards.forEach((card) => {
        card.style.transition = 'transform 190ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      })
      const draggedEl = els.get(paper.id)
      if (draggedEl) {
        draggedEl.style.transition = 'none'
        draggedEl.style.zIndex = '30'
        draggedEl.style.willChange = 'transform'
      }
      document.body.style.userSelect = 'none'

      dragRef.current = {
        id: paper.id,
        pointerId: event.pointerId,
        startY: event.clientY,
        startScroll: window.scrollY,
        lastY: event.clientY,
        from,
        to: from,
        ids,
        els,
        centers,
        tops,
        heights,
        gap,
        changed: false,
      }
      setDraggingId(paper.id)
    },
    [auth.isAdmin],
  )

  const moveDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.lastY = event.clientY

    // Scrolling during the gesture must not fight the finger.
    const scrolled = window.scrollY - drag.startScroll
    const travelled = event.clientY - drag.startY
    const dy = travelled + scrolled

    const draggedEl = drag.els.get(drag.id)
    if (draggedEl) draggedEl.style.transform = `translate3d(0, ${dy}px, 0)`

    const ownCenter = drag.centers.get(drag.id) ?? 0
    const movingCenter = ownCenter + travelled

    let to = drag.from
    if (dy > 0) {
      for (let index = drag.from + 1; index < drag.ids.length; index += 1) {
        if (movingCenter > (drag.centers.get(drag.ids[index]) ?? Number.POSITIVE_INFINITY)) {
          to = index
        }
      }
    } else if (dy < 0) {
      for (let index = drag.from - 1; index >= 0; index -= 1) {
        if (movingCenter < (drag.centers.get(drag.ids[index]) ?? Number.NEGATIVE_INFINITY)) {
          to = index
        }
      }
    }

    if (to === drag.to) return
    drag.to = to
    drag.changed = to !== drag.from

    // Predict where every card will sit once the held card is dropped here,
    // then translate each one to that spot. Because the prediction uses the
    // real heights, the drop itself is invisible — no snap at the end.
    const reordered = [...drag.ids]
    reordered.splice(to, 0, reordered.splice(drag.from, 1)[0])

    let cursor = drag.tops.get(drag.ids[0]) ?? 0
    for (const id of reordered) {
      const target = cursor
      cursor += (drag.heights.get(id) ?? 0) + drag.gap
      if (id === drag.id) continue

      const card = drag.els.get(id)
      if (!card) continue

      const offset = target - (drag.tops.get(id) ?? target)
      card.style.transform =
        Math.abs(offset) > 0.5 ? `translate3d(0, ${offset}px, 0)` : ''
    }
  }, [])

  const saveOrder = useCallback(
    (ids: string[], options?: { quiet?: boolean }) => {
      void commitOrder(ids)
        .then(() => {
          if (!options?.quiet) {
            push('Order saved — everyone sees this arrangement.', 'success')
          }
        })
        .catch(() => {
          push('Could not save the new order. Check your connection and try again.', 'error')
        })
    },
    [commitOrder, push],
  )

  const settleCards = useCallback(() => {
    listCards().forEach((card) => {
      card.style.transition = 'transform 190ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      card.style.transform = ''
      card.style.zIndex = ''
      card.style.willChange = ''
    })
    window.setTimeout(() => {
      listCards().forEach((card) => {
        card.style.transition = ''
      })
    }, 240)
  }, [])

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      setDraggingId(null)
      document.body.style.userSelect = ''

      if (!drag.changed || drag.to === drag.from) {
        settleCards()
        return
      }

      const next = [...drag.ids]
      next.splice(drag.to, 0, next.splice(drag.from, 1)[0])

      // Clear the transforms in the same paint the new order lands, so nothing
      // flickers back to the old position.
      settleRef.current = true
      saveOrder(next)
    },
    [saveOrder, settleCards],
  )

  const cancelDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      setDraggingId(null)
      document.body.style.userSelect = ''
      settleCards()
    },
    [settleCards],
  )

  const nudgePaper = useCallback(
    (paper: Paper, delta: number) => {
      const from = visibleIds.indexOf(paper.id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= visibleIds.length) return
      const next = [...visibleIds]
      next.splice(to, 0, next.splice(from, 1)[0])
      // Tapping the arrows is silent; only a failure interrupts the user.
      saveOrder(next, { quiet: true })
    },
    [visibleIds, saveOrder],
  )

  // After a drop, wipe the inline transforms before the browser paints.
  useLayoutEffect(() => {
    if (!settleRef.current) return
    settleRef.current = false
    listCards().forEach((card) => {
      card.style.transition = 'none'
      card.style.transform = ''
      card.style.zIndex = ''
      card.style.willChange = ''
    })
    const frame = window.requestAnimationFrame(() => {
      listCards().forEach((card) => {
        card.style.transition = ''
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [papers])

  // While a card is held near the top or bottom edge, keep the list scrolling.
  useEffect(() => {
    if (!draggingId) return
    let frame = 0
    const tick = () => {
      const drag = dragRef.current
      if (drag) {
        const margin = 96
        const speed = 12
        if (drag.lastY < margin) window.scrollBy(0, -speed)
        else if (drag.lastY > window.innerHeight - margin) window.scrollBy(0, speed)
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [draggingId])

  // ---- shareable views: ?q=…&cat=…&show=done --------------------------------
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== 'All') params.set('cat', category)
    if (filter !== 'all') params.set('show', filter)
    if (year !== null) params.set('y', String(year))
    if (shift !== null) params.set('shift', String(shift))
    const search = params.toString()
    // The hash is left alone: a password-reset link lives there.
    const hash = window.location.hash
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${hash}`
    const current = `${window.location.pathname}${window.location.search}${hash}`
    if (next !== current) window.history.replaceState(null, '', next)
  }, [query, category, filter, year, shift])

  // A shared link can name a folder the library has since renamed.
  const categoryChecked = useRef(false)
  useEffect(() => {
    if (loading || !papers.length || categoryChecked.current) return
    categoryChecked.current = true
    if (category !== 'All' && !categories.some((entry) => entry.name === category)) {
      setCategory('All')
      push('That folder is gone — showing every paper instead.', 'info')
    }
  }, [loading, papers.length, category, categories, push])

  // The bell is rung by the timer itself; this is the line that tells a student
  // who was reading somewhere else in the app.
  const rungToastFor = useRef<number | null>(null)
  useEffect(() => {
    if (!practice.running) {
      rungToastFor.current = null
      return
    }
    if (!practice.expired || rungToastFor.current === practice.running.startedAt) return
    rungToastFor.current = practice.running.startedAt
    push('Time’s up — the clock stopped. Enter your score when you are ready.', 'info')
  }, [practice.running, practice.expired, push])

  // A timer left running on a paper that has since been deleted goes away.
  useEffect(() => {
    if (loading || !papers.length) return
    if (practice.running && !papersById.has(practice.running.paperId)) practice.cancel()
  }, [loading, papers.length, papersById, practice])

  const filtersActive =
    Boolean(query.trim()) ||
    category !== 'All' ||
    filter !== 'all' ||
    year !== null ||
    shift !== null

  const copyViewLink = useCallback(async () => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== 'All') params.set('cat', category)
    if (filter !== 'all') params.set('show', filter)
    if (year !== null) params.set('y', String(year))
    if (shift !== null) params.set('shift', String(shift))
    const search = params.toString()
    const url = `${window.location.origin}${window.location.pathname}${search ? `?${search}` : ''}`

    try {
      await navigator.clipboard.writeText(url)
      push('Link copied — it opens this exact list.', 'success')
      return
    } catch {
      // Some browsers only allow the share sheet here.
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'MP Police PYQ Library', url })
        return
      } catch {
        // The student closed the sheet, or sharing is not allowed.
      }
    }
    push('Could not copy the link — long-press the address bar instead.', 'error')
  }, [query, category, filter, year, shift, push])

  const clearFilters = useCallback(() => {
    setQuery('')
    setCategory('All')
    setFilter('all')
    setYear(null)
    setShift(null)
  }, [])

  // ---- problem reports ------------------------------------------------------
  const rememberReported = useCallback((paperId: string) => {
    setReportedIds((current) => {
      const next = new Set(current)
      next.add(paperId)
      try {
        window.localStorage.setItem(
          REPORTED_KEY,
          JSON.stringify([...next].slice(-200)),
        )
      } catch {
        // Storage is full or blocked; the report is already saved server-side.
      }
      return next
    })
  }, [])

  const sendReport = useCallback(
    async (report: NewReport) => {
      await reports.submit(report)
      rememberReported(report.paper_id)
      void reports.reload()
    },
    [reports, rememberReported],
  )

  const resolveReport = useCallback(
    (id: string) => {
      void reports
        .resolve(id)
        .then(() => push('Marked resolved.', 'success'))
        .catch((caught: unknown) =>
          push(
            caught instanceof Error ? caught.message : 'Could not close that report.',
            'error',
          ),
        )
    },
    [reports, push],
  )

  const openAdd = useCallback(() => {
    setEditing(null)
    setPanelOpen(true)
  }, [])

  const openEdit = useCallback((paper: Paper) => {
    setEditing(paper)
    setPanelOpen(true)
  }, [])

  const share = useCallback(
    async (paper: Paper) => {
      const url = driveViewUrl(paper.drive_file_id)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: paper.title, text: paper.title, url })
          return
        } catch (caught) {
          if (caught instanceof Error && caught.name === 'AbortError') return
        }
      }
      try {
        await navigator.clipboard.writeText(url)
        push('Drive link copied — paste it in WhatsApp or Telegram.', 'success')
      } catch {
        push('Could not copy automatically. Long-press the Open button to copy the link.', 'error')
      }
    },
    [push],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deletePaper(deleteTarget.id)
      push('Paper removed from the library.', 'success')
    } catch (caught) {
      push(
        caught instanceof Error ? caught.message : 'Could not delete that paper.',
        'error',
      )
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deletePaper, push])

  // A selected card can disappear (deleted from the check panel, or another
  // tab); drop those ids so the count on the bar always matches real cards.
  useEffect(() => {
    if (!selected.size) return
    const live = new Set(papers.map((paper) => paper.id))
    setSelected((current) => {
      const next = new Set(Array.from(current).filter((id) => live.has(id)))
      return next.size === current.size ? current : next
    })
  }, [papers, selected.size])

  // ---- bulk edit ----------------------------------------------------------
  const exitSelection = useCallback(() => {
    setSelecting(false)
    setSelected(new Set())
    setBulkOpen(false)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(visibleIds))
  }, [visibleIds])

  const applyBulk = useCallback(
    async (patch: BulkPatch) => {
      const ids = Array.from(selected)
      if (!ids.length) return
      await bulkUpdate(ids, patch)
      setSelected(new Set())
    },
    [bulkUpdate, selected],
  )

  const confirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selected)
    if (!ids.length) {
      setBulkDeleteOpen(false)
      return
    }
    try {
      const count = await deleteMany(ids)
      push(
        t(count === 1 ? '{count} paper removed from the library.' : '{count} papers removed from the library.', {
          count,
        }),
        'success',
      )
      setSelected(new Set())
    } catch (caught) {
      push(
        caught instanceof Error ? caught.message : 'Could not delete those papers.',
        'error',
      )
    } finally {
      setBulkDeleteOpen(false)
    }
  }, [deleteMany, push, selected])

  const openCheck = useCallback(() => {
    setCheckOpen(true)
    // First visit, or an empty cache: check the whole library straight away.
    if (papers.length && !health.results.size) {
      void health.check(healthTargets(papers))
    }
  }, [health, papers])

  return (
    <div className="min-h-full bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">
      <Header
        query={query}
        onQueryChange={setQuery}
        isDark={isDark}
        onToggleTheme={toggle}
        email={auth.email}
        isAdmin={auth.isAdmin}
        username={profile?.username ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        onSignIn={() => setAuthOpen(true)}
        onEditProfile={() => setProfileOpen(true)}
        reportCount={reports.openCount}
        onOpenReports={() => {
          setReportsOpen(true)
          void reports.reload()
        }}
        onSignOut={() => {
          void auth.signOut()
          setProfileOpen(false)
          push('Signed out. Your marks stay saved on this device.', 'info')
        }}
        onOpenBulk={() => {
          setSelected(new Set())
          setSelecting(true)
        }}
        onOpenCheck={openCheck}
      />

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        <div className="pt-4">
          {pwa.offline && <OfflineBar />}
          {pwa.updateReady && (
            <UpdateBar onRefresh={pwa.applyUpdate} onDismiss={pwa.dismissUpdate} />
          )}
          <HeroCard
            paperCount={papers.length}
            doneCount={totalDone}
            lastUpdated={lastUpdated}
            isAdmin={auth.isAdmin}
            onAdd={openAdd}
          />
          {!pwa.installed && !pwa.dismissed && (pwa.canInstall || pwa.iosHint) && (
            <InstallCard
              iosHint={pwa.iosHint && !pwa.canInstall}
              onInstall={pwa.promptInstall}
              onDismiss={pwa.dismissInstall}
            />
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-[12.5px] font-medium text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
            <span className="flex-1">
              {t('Could not load the library: {error}', { error: error ?? '' })}
            </span>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-danger-300 px-2 py-1 text-[11.5px] font-semibold dark:border-danger-500/40"
            >
              <RefreshIcon className="h-3 w-3" /> {t('Retry')}
            </button>
          </div>
        )}

        {!loading && !filtersActive && recentPapers.length > 0 && (
          <RecentStrip papers={recentPapers} newCount={newPaperCount} />
        )}

        <div className="mt-4 space-y-3">
          <CategoryChips
            categories={categories}
            total={papers.length}
            active={category}
            onChange={setCategory}
          />
          <ExamFilters
            years={examYears}
            shifts={examShifts}
            year={year}
            shift={shift}
            onYear={setYear}
            onShift={setShift}
          />
          <div className="flex items-center gap-2.5">
            <div className="flex-1">
              <FilterTabs value={filter} counts={filterCounts} onChange={setFilter} />
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={() => void copyViewLink()}
                title={t('Copy a link that opens this exact list')}
                aria-label={t('Copy a link to this filtered list')}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 text-[12px] font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 active:scale-[0.98] dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
              >
                <CopyIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('Copy link')}</span>
              </button>
            )}
            {progress.mode === 'device' && papers.length > 0 && (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                title={t('Progress is saved in this browser only')}
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-[12px] font-semibold text-ink-500 transition hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-brand-300 sm:flex"
              >
                <DeviceIcon className="h-4 w-4" /> {t('This device')}
              </button>
            )}
          </div>
          {auth.isAdmin && papers.length > 1 && !loading && !selecting && (
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-400 dark:text-ink-500">
              <GripIcon className="h-3.5 w-3.5 shrink-0" />
              {t(
                'Reorder: hold the ⠿ grip and drag a card, or tap ↑ ↓ on it. The order you set is what every student sees.',
              )}
            </p>
          )}
          {auth.isAdmin && papers.length > 0 && !loading && !selecting && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelected(new Set())
                  setSelecting(true)
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:text-white"
              >
                <LayersIcon className="h-3.5 w-3.5" /> {t('Bulk edit')}
              </button>
              <button
                type="button"
                onClick={openCheck}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:text-white"
              >
                <PulseIcon className="h-3.5 w-3.5" /> {t('Link check')}
                {health.results.size > 0 && (
                  <span
                    className={[
                      'h-1.5 w-1.5 rounded-full',
                      Array.from(health.results.values()).some(
                        (result) => result.status === 'missing' || result.status === 'restricted',
                      )
                        ? 'bg-amber-500'
                        : 'bg-emerald-500',
                    ].join(' ')}
                  />
                )}
              </button>
            </div>
          )}
          {progress.mode === 'device' && papers.length > 0 && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center gap-1.5 text-left text-[11.5px] font-medium text-ink-400 sm:hidden dark:text-ink-500"
            >
              <DeviceIcon className="h-3.5 w-3.5" />
              {t('Progress saved on this device — tap to sync with an account.')}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-2.5 sm:gap-3">
          {loading &&
            Array.from({ length: 4 }).map((_, index) => <PaperSkeleton key={index} />)}

          {!loading &&
            visible.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                done={progress.done.has(paper.id)}
                isAdmin={auth.isAdmin}
                answerKey={answerKeyFor(paper)}
                originalPaper={originalFor.get(paper.id) ?? null}
                isDragging={draggingId === paper.id}
                onMove={(delta) => nudgePaper(paper, delta)}
                canMoveUp={visibleIds[0] !== paper.id}
                canMoveDown={visibleIds[visibleIds.length - 1] !== paper.id}
                selectable={selecting}
                selected={selected.has(paper.id)}
                onToggleSelect={() => toggleSelect(paper.id)}
                health={health.statusOf(paper.drive_file_id)}
                dragHandleProps={
                  auth.isAdmin && !selecting
                    ? {
                        onPointerDown: startDrag(paper),
                        onPointerMove: moveDrag,
                        onPointerUp: endDrag,
                        onPointerCancel: cancelDrag,
                        onKeyDown: (event) => {
                          if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            nudgePaper(paper, -1)
                          } else if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            nudgePaper(paper, 1)
                          }
                        },
                      }
                    : undefined
                }
                note={notes.notes.get(paper.id)}
                attempts={practice.attempts.get(paper.id)}
                practiceRunning={practice.running?.paperId === paper.id}
                practiceExpired={
                  practice.running?.paperId === paper.id && practice.expired
                }
                onToggleDone={() => void progress.toggleDone(paper.id)}
                onShare={() => void share(paper)}
                onPractice={() => setPracticeTarget(paper)}
                onNotes={() => setNotesTarget(paper)}
                onReport={() => setReportTarget(paper)}
                reported={reportedIds.has(paper.id)}
                onEdit={() => openEdit(paper)}
                onDelete={() => setDeleteTarget(paper)}
              />
            ))}

          {!loading && !visible.length && (
            <EmptyState
              variant={papers.length ? 'search' : 'library'}
              isAdmin={auth.isAdmin}
              onAdd={openAdd}
              onClear={clearFilters}
            />
          )}
        </div>

        {!loading && !auth.isAdmin && papers.length > 0 && (
          <p className="mt-5 text-center text-[11.5px] text-ink-400 dark:text-ink-500">
            {t('{papers} in {folders} · {done} done by you', {
              papers: t(
                papers.length === 1 ? 'one paper' : '{count} papers',
                { count: papers.length },
              ),
              folders: t(
                categories.length === 1 ? 'one folder' : '{count} folders',
                { count: categories.length },
              ),
              done: filterCounts.done,
            })}
          </p>
        )}

        <Footer paperCount={papers.length} />
      </main>

      {auth.isAdmin && !selecting && (
        <button
          type="button"
          onClick={openAdd}
          aria-label={t('Add PDFs')}
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-sky-600 text-white shadow-fab transition hover:bg-sky-700 active:scale-95 sm:hidden"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

      {auth.isAdmin && selecting && (
        <BulkBar
          count={selected.size}
          total={visible.length}
          onSelectAll={selectAllVisible}
          onClear={() => setSelected(new Set())}
          onEdit={() => setBulkOpen(true)}
          onDelete={() => setBulkDeleteOpen(true)}
          onExit={exitSelection}
        />
      )}

      <BulkEditDialog
        open={bulkOpen}
        count={selected.size}
        categories={categories.map((entry) => entry.name)}
        onClose={() => setBulkOpen(false)}
        onApply={applyBulk}
        onSuccess={push}
      />

      <LibraryCheckDialog
        open={checkOpen}
        papers={papers}
        health={health}
        onClose={() => setCheckOpen(false)}
        onCheck={() => void health.check(healthTargets(papers))}
        onForget={health.forget}
        onEdit={(paper) => {
          setCheckOpen(false)
          openEdit(paper)
        }}
        onDelete={(paper) => {
          setCheckOpen(false)
          setDeleteTarget(paper)
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={t(
          selected.size === 1 ? 'Delete {count} paper?' : 'Delete {count} papers?',
          { count: selected.size },
        )}
        message={t(
          'They will be removed from the library for everyone. Your Drive files are not touched.',
        )}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
      />

     <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={auth.signInWithPassword}
        onSignUp={auth.signUpWithPassword}
        onMagicLink={auth.sendMagicLink}
        onPasswordReset={auth.sendPasswordReset}
        onSuccess={(message) => push(message, 'success')}
      />

      <ProfileDialog
        open={Boolean(auth.session) && (profileOpen || needsSetup)}
        required={needsSetup}
        profile={profile}
        email={auth.email}
        onSave={saveProfile}
        onClose={() => setProfileOpen(false)}
        onSignOut={() => {
          setProfileOpen(false)
          void auth.signOut()
          push('Signed out.', 'info')
        }}
        onSuccess={(message) => push(message, 'success')}
      />

      <ResetPasswordDialog
        open={recoveryOpen}
        onClose={() => {
          setRecoveryOpen(false)
          window.history.replaceState({}, '', window.location.pathname)
        }}
        onSave={auth.updatePassword}
        onSuccess={(message) => push(message, 'success')}
      />

      <AddPapersPanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false)
          setEditing(null)
        }}
        categories={categories.map((entry) => entry.name)}
        editing={editing}
        existing={papers}
        onCreate={addPapers}
        onUpdate={updatePaper}
        onToast={push}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('Delete this paper?')}
        message={t(
          '“{title}” will be removed from the library for everyone. Your Drive file is not touched.',
          { title: deleteTarget?.title ?? '' },
        )}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ReportDialog
        open={reportTarget !== null}
        paper={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={sendReport}
        onSuccess={push}
      />

      <ReportsDialog
        open={reportsOpen && auth.isAdmin}
        onClose={() => setReportsOpen(false)}
        reports={reports.reports}
        loading={reports.loading}
        error={reports.error}
        onReload={() => void reports.reload()}
        onResolve={resolveReport}
        paperFor={(id) => (id ? (papersById.get(id) ?? null) : null)}
        onEditPaper={(paper) => {
          setReportsOpen(false)
          openEdit(paper)
        }}
      />

      {/* The countdown pill: read out only when the time runs out, never every second. */}
      {practice.running && (
        <div
          className={[
            'fixed left-4 z-40 flex items-center gap-1.5 rounded-full border py-1.5 pl-3 pr-1.5 shadow-lift backdrop-blur',
            practice.expired
              ? 'border-violet-400 bg-violet-50/95 dark:border-violet-500/60 dark:bg-ink-900/95'
              : practice.nearlyUp
                ? 'border-amber-300 bg-white/95 dark:border-amber-500/40 dark:bg-ink-900/95'
                : 'border-violet-200 bg-white/95 dark:border-violet-500/40 dark:bg-ink-900/95',
            selecting ? 'bottom-32' : 'bottom-5',
          ].join(' ')}
          role={practice.expired ? 'status' : undefined}
          aria-label={
            practice.expired
              ? t('Time’s up')
              : t('{time} left', { time: formatClock(practice.remainingMs) })
          }
        >
          <ClockIcon
            className={[
              'h-3.5 w-3.5 shrink-0',
              practice.expired
                ? 'text-violet-600 dark:text-violet-300'
                : practice.nearlyUp
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-violet-600 dark:text-violet-300',
            ].join(' ')}
          />
          <span
            className={[
              'font-mono text-[12.5px] font-bold tabular-nums',
              practice.expired
                ? 'text-violet-700 dark:text-violet-300'
                : practice.nearlyUp
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-violet-700 dark:text-violet-300',
            ].join(' ')}
          >
            {practice.expired ? t('Time’s up') : formatClock(practice.remainingMs)}
          </span>
          <button
            type="button"
            onClick={() => {
              const paper = papersById.get(practice.running?.paperId ?? '')
              if (paper) setPracticeTarget(paper)
            }}
            className="rounded-full bg-violet-600 px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-violet-700"
          >
            {practice.expired ? t('Enter score') : t('Finish')}
          </button>
        </div>
      )}

      <NotesDialog
        open={notesTarget !== null}
        paper={notesTarget}
        entry={notesTarget ? notes.notes.get(notesTarget.id) : undefined}
        onClose={() => setNotesTarget(null)}
        onSave={notes.save}
        onSuccess={push}
      />

      <PracticeDialog
        open={practiceTarget !== null}
        paper={practiceTarget}
        runningPaperId={practice.running?.paperId ?? null}
        runningTitle={
          practice.running
            ? (papersById.get(practice.running.paperId)?.title ?? null)
            : null
        }
        runningMinutes={practice.running?.minutes ?? settings.defaultMinutes}
        remainingMs={practice.remainingMs}
        elapsedMs={practice.elapsedMs}
        expired={practice.expired}
        nearlyUp={practice.nearlyUp}
        defaultMinutes={settings.defaultMinutes}
        isAdmin={auth.isAdmin}
        onSaveDefault={settings.saveDefaultMinutes}
        attempts={
          practiceTarget ? (practice.attempts.get(practiceTarget.id) ?? []) : []
        }
        onClose={() => setPracticeTarget(null)}
        onStart={(minutes) => {
          if (practiceTarget) practice.start(practiceTarget.id, minutes)
        }}
        onCancelTimer={practice.cancel}
        onFinish={async (score, total) => {
          await practice.finish(score, total)
        }}
        onRemoveAttempt={(id) => {
          void practice
            .remove(id)
            .then(() => push('Attempt removed.', 'info'))
            .catch((caught: unknown) =>
              push(
                caught instanceof Error ? caught.message : 'Could not remove that attempt.',
                'error',
              ),
            )
        }}
        onSuccess={push}
      />

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
