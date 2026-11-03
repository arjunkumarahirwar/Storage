import { useCallback, useMemo, useState } from 'react'
import { AddPapersPanel } from './components/AddPapersPanel'
import { AuthDialog } from './components/AuthDialog'
import { CategoryChips } from './components/CategoryChips'
import { ConfirmDialog } from './components/ConfirmDialog'
import { EmptyState, PaperSkeleton } from './components/EmptyState'
import { FilterTabs } from './components/FilterTabs'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HeroCard } from './components/HeroCard'
import { DeviceIcon, PlusIcon, RefreshIcon } from './components/Icons'
import { PaperCard } from './components/PaperCard'
import { Toasts } from './components/Toasts'
import { useAuth } from './hooks/useAuth'
import { usePapers } from './hooks/usePapers'
import { useProgress } from './hooks/useProgress'
import { useTheme } from './hooks/useTheme'
import { useToasts } from './hooks/useToasts'
import { driveViewUrl } from './lib/drive'
import type { Paper, ProgressFilter } from './lib/types'

const matchesQuery = (paper: Paper, tokens: string[]) => {
  if (!tokens.length) return true
  const haystack = [paper.title, paper.category, ...paper.tags].join(' ').toLowerCase()
  return tokens.every((token) => haystack.includes(token))
}

export default function App() {
  const { isDark, toggle } = useTheme()
  const { toasts, push, dismiss } = useToasts()
  const auth = useAuth()
  const { papers, loading, error, reload, addPapers, updatePaper, deletePaper } = usePapers()
  const progress = useProgress(auth.session?.user.id ?? null)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [filter, setFilter] = useState<ProgressFilter>('all')
  const [authOpen, setAuthOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null)

  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  )

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
      papers.filter(
        (paper) =>
          matchesQuery(paper, tokens) && (category === 'All' || paper.category === category),
      ),
    [papers, tokens, category],
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
        onSignIn={() => setAuthOpen(true)}
        onSignOut={() => {
          void auth.signOut()
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
