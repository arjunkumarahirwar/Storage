import { useI18n } from '../hooks/useI18n'
import { LayersIcon, TrashIcon, XIcon } from './Icons'

interface BulkBarProps {
  count: number
  /** How many cards the current filters show — the "select all" target. */
  total: number
  onSelectAll: () => void
  onClear: () => void
  onEdit: () => void
  onDelete: () => void
  onExit: () => void
}

/** The sticky bar that appears while the administrator is picking cards. */
export function BulkBar({
  count,
  total,
  onSelectAll,
  onClear,
  onEdit,
  onDelete,
  onExit,
}: BulkBarProps) {
  const { t } = useI18n()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-ink-700 bg-ink-900/95 p-2.5 text-white shadow-lift backdrop-blur dark:border-ink-700">
        <div className="flex items-center gap-2 px-1">
          <LayersIcon className="h-4 w-4 shrink-0 text-sky-300" />
          <p className="min-w-0 flex-1 text-[12.5px] font-semibold">
            {count === 0
              ? t('Tap a card to pick it')
              : t(count === 1 ? '{count} paper selected' : '{count} papers selected', { count })}
          </p>
          <button
            type="button"
            onClick={count === total ? onClear : onSelectAll}
            className="shrink-0 rounded-lg border border-white/25 px-2 py-1 text-[11.5px] font-semibold text-white/90 transition hover:bg-white/10"
          >
            {count === total ? t('Clear') : t('All {count}', { count: total })}
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-label={t('Leave bulk edit')}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={count === 0}
            onClick={onEdit}
            className="h-10 flex-1 rounded-xl bg-white text-[12.5px] font-bold text-ink-900 transition hover:bg-white/90 disabled:opacity-40"
          >
            {t('Edit fields')}
          </button>
          <button
            type="button"
            disabled={count === 0}
            onClick={onDelete}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-danger-400/60 bg-danger-600/20 text-[12.5px] font-bold text-white transition hover:bg-danger-600/40 disabled:opacity-40"
          >
            <TrashIcon className="h-3.5 w-3.5" /> {t('Delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
