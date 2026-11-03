import { formatDate, plural } from '../lib/format'
import { BookIcon, PlusIcon } from './Icons'

interface HeroCardProps {
  paperCount: number
  doneCount: number
  lastUpdated: string | null
  isAdmin: boolean
  onAdd: () => void
}

export function HeroCard({ paperCount, doneCount, lastUpdated, isAdmin, onAdd }: HeroCardProps) {
  const percent = paperCount ? Math.round((doneCount / paperCount) * 100) : 0

  return (
    <section className="relative overflow-hidden rounded-3xl border border-ink-200/90 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-500/10 blur-2xl dark:bg-brand-500/15"
      />
      <div className="relative flex items-start gap-3.5">
        <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-2 text-white shadow-md">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(120deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 9px)',
            }}
          />
          <div className="relative flex h-full flex-col items-center justify-center rounded-lg border border-white/40 px-1 text-center leading-none">
            <span className="text-[7px] font-bold uppercase tracking-[0.12em] opacity-90">
              MP Police
            </span>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-tight">
              Constable
            </span>
            <span className="mt-1 text-[6.5px] font-semibold uppercase opacity-90">
              Previous year
            </span>
            <span className="mt-0.5 text-[6.5px] font-semibold uppercase opacity-90">
              papers 2023 &amp; 25
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-600 dark:text-brand-400">
            <BookIcon className="h-3.5 w-3.5" />
            MP ESB · Constable
          </p>
          <h2 className="mt-1 text-[19px] font-extrabold leading-snug tracking-tight text-ink-900 dark:text-white sm:text-xl">
            MP Police Constable Previous Papers
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-500 dark:text-ink-400">
            {paperCount} {plural(paperCount, 'PDF')}
            {lastUpdated ? ` · Updated ${formatDate(lastUpdated)}` : ''}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] sm:flex"
          >
            <PlusIcon className="h-4 w-4" /> Add PDFs
          </button>
        )}
      </div>

      <div className="relative mt-4">
        <div className="flex items-end justify-between text-[12px] font-semibold text-ink-500 dark:text-ink-400">
          <span>Your progress</span>
          <span className="text-ink-800 dark:text-ink-100">
            {doneCount} of {paperCount} done
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Papers completed"
          />
        </div>
      </div>
    </section>
  )
}
