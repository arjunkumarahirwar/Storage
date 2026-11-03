import { BookIcon, PlusIcon, SearchIcon } from './Icons'

interface EmptyStateProps {
  variant: 'library' | 'search'
  isAdmin: boolean
  onAdd: () => void
  onClear: () => void
}

export function EmptyState({ variant, isAdmin, onAdd, onClear }: EmptyStateProps) {
  const isSearch = variant === 'search'

  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-300 bg-white/60 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900/40">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
        {isSearch ? <SearchIcon className="h-6 w-6" /> : <BookIcon className="h-6 w-6" />}
      </span>
      <h3 className="mt-3 text-[15px] font-bold text-ink-900 dark:text-white">
        {isSearch ? 'No papers match that' : 'The library is empty'}
      </h3>
      <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-ink-500 dark:text-ink-400">
        {isSearch
          ? 'Try a different year, shift number or clear the search to see every paper.'
          : isAdmin
            ? 'Paste your Google Drive links to publish the first papers. Students can open them straight away.'
            : 'Papers will appear here as soon as the administrator adds them.'}
      </p>
      {isSearch ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 h-9 rounded-full border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
        >
          Clear search
        </button>
      ) : (
        isAdmin && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white transition hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" /> Add PDFs
          </button>
        )
      )}
    </div>
  )
}

export function PaperSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-ink-200/80 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900 sm:p-4">
      <div className="flex gap-3">
        <div className="h-14 w-12 rounded-xl bg-ink-100 dark:bg-ink-800" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-3/4 rounded bg-ink-100 dark:bg-ink-800" />
          <div className="h-3 w-1/2 rounded bg-ink-100 dark:bg-ink-800" />
          <div className="h-3 w-2/5 rounded bg-ink-100 dark:bg-ink-800" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 flex-1 rounded-xl bg-ink-100 dark:bg-ink-800" />
        <div className="h-8 flex-1 rounded-xl bg-ink-100 dark:bg-ink-800" />
        <div className="h-8 w-8 rounded-xl bg-ink-100 dark:bg-ink-800" />
      </div>
    </div>
  )
}
