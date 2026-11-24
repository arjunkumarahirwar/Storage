import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AddPapersPanel } from './components/AddPapersPanel'
import { AuthDialog } from './components/AuthDialog'
import { CategoryChips } from './components/CategoryChips'
import { ConfirmDialog } from './components/ConfirmDialog'
import { EmptyState, PaperSkeleton } from './components/EmptyState'
import { FilterTabs } from './components/FilterTabs'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HeroCard } from './components/HeroCard'
import { DeviceIcon, GripIcon, PlusIcon, RefreshIcon } from './components/Icons'
import { PaperCard } from './components/PaperCard'
import { ProfileDialog } from './components/ProfileDialog'
import { ResetPasswordDialog } from './components/ResetPasswordDialog'
import { Toasts } from './components/Toasts'
import { useAuth } from './hooks/useAuth'
import { usePapers } from './hooks/usePapers'
import { useProfile } from './hooks/useProfile'
import { useProgress } from './hooks/useProgress'
import { useTheme } from './hooks/useTheme'
import { useToasts } from './hooks/useToasts'
import { driveViewUrl } from './lib/drive'
import type { Paper, ProgressFilter } from './lib/types'

const listCards = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-paper-id]'))

const matchesQuery = (paper: Paper, tokens: string[], extra = '') => {
  if (!tokens.length) return true
  const haystack = [paper.title, paper.category, ...paper.tags, extra]
    .join(' ')
    .toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

export default function App() {
  const { isDark, toggle } = useTheme()
  const { toasts, push, dismiss } = useToasts()
  const auth = useAuth()
  const {
    papers,
    loading,
    error,
    reload,
    addPapers,
    updatePaper,
    deletePaper,
    commitOrder,
  } = usePapers()
  const progress = useProgress(auth.session?.user.id ?? null)
  const { profile, needsSetup, saveProfile } = useProfile(auth.session?.user.id ?? null)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [filter, setFilter] = useState<ProgressFilter>('all')
  const [authOpen, setAuthOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

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

  // paper id -> its answer key card
  const solutionFor = useCallback(
    (paper: Paper) =>
      paper.solution_paper_id ? (papersById.get(paper.solution_paper_id) ?? null) : null,
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
          paper.solution_paper_id ? 'answer key solution' : '',
          originalFor.has(paper.id) ? 'question paper original' : '',
        ].join(' ')
        return (
          matchesQuery(paper, tokens, extra) &&
          (category === 'All' || paper.category === category)
        )
      }),
    [papers, tokens, category, originalFor],
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
        onSignOut={() => {
          void auth.signOut()
          setProfileOpen(false)
          push('Signed out. Your marks stay saved on this device.', 'info')
        }}
      />

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        <div className="pt-4">
          <HeroCard
            paperCount={papers.length}
            doneCount={totalDone}
            lastUpdated={lastUpdated}
            isAdmin={auth.isAdmin}
            onAdd={openAdd}
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-[12.5px] font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <span className="flex-1">Could not load the library: {error}</span>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-300 px-2 py-1 text-[11.5px] font-semibold dark:border-brand-500/40"
            >
              <RefreshIcon className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <CategoryChips
            categories={categories}
            total={papers.length}
            active={category}
            onChange={setCategory}
          />
          <div className="flex items-center gap-2.5">
            <div className="flex-1">
              <FilterTabs value={filter} counts={filterCounts} onChange={setFilter} />
            </div>
            {progress.mode === 'device' && papers.length > 0 && (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                title="Progress is saved in this browser only"
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-[12px] font-semibold text-ink-500 transition hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-brand-300 sm:flex"
              >
                <DeviceIcon className="h-4 w-4" /> This device
              </button>
            )}
          </div>
          {auth.isAdmin && papers.length > 1 && !loading && (
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-400 dark:text-ink-500">
              <GripIcon className="h-3.5 w-3.5 shrink-0" />
              Reorder: hold the ⠿ grip and drag a card, or tap ↑ ↓ on it. The
              order you set is what every student sees.
            </p>
          )}
          {progress.mode === 'device' && papers.length > 0 && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center gap-1.5 text-left text-[11.5px] font-medium text-ink-400 sm:hidden dark:text-ink-500"
            >
              <DeviceIcon className="h-3.5 w-3.5" />
              Progress saved on this device — tap to sync with an account.
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
                solution={solutionFor(paper)}
                originalPaper={originalFor.get(paper.id) ?? null}
                isDragging={draggingId === paper.id}
                onMove={(delta) => nudgePaper(paper, delta)}
                canMoveUp={visibleIds[0] !== paper.id}
                canMoveDown={visibleIds[visibleIds.length - 1] !== paper.id}
                dragHandleProps={
                  auth.isAdmin
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
                onToggleDone={() => void progress.toggleDone(paper.id)}
                onShare={() => void share(paper)}
                onEdit={() => openEdit(paper)}
                onDelete={() => setDeleteTarget(paper)}
              />
            ))}

          {!loading && !visible.length && (
            <EmptyState
              variant={papers.length ? 'search' : 'library'}
              isAdmin={auth.isAdmin}
              onAdd={openAdd}
              onClear={() => {
                setQuery('')
                setCategory('All')
                setFilter('all')
              }}
            />
          )}
        </div>

        {!loading && !auth.isAdmin && papers.length > 0 && (
          <p className="mt-5 text-center text-[11.5px] text-ink-400 dark:text-ink-500">
            {papers.length} {papers.length === 1 ? 'paper' : 'papers'} in{' '}
            {categories.length} {categories.length === 1 ? 'folder' : 'folders'} ·{' '}
            {filterCounts.done} done by you
          </p>
        )}

        <Footer paperCount={papers.length} />
      </main>

      {auth.isAdmin && (
        <button
          type="button"
          onClick={openAdd}
          aria-label="Add PDFs"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-fab transition hover:bg-brand-700 active:scale-95 sm:hidden"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}

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
        papers={papers}
        onCreate={addPapers}
        onUpdate={updatePaper}
        onToast={push}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this paper?"
        message={`“${deleteTarget?.title ?? ''}” will be removed from the library for everyone. Your Drive file is not touched.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
