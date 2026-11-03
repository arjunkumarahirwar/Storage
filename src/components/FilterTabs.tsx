import type { ProgressFilter } from '../lib/types'

interface FilterTabsProps {
  value: ProgressFilter
  counts: Record<ProgressFilter, number>
  onChange: (value: ProgressFilter) => void
}

const OPTIONS: { value: ProgressFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Not done' },
  { value: 'done', label: 'Done' },
]

export function FilterTabs({ value, counts, onChange }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter papers by progress"
      className="flex items-center gap-1 rounded-2xl border border-ink-200 bg-ink-100/70 p-1 dark:border-ink-700 dark:bg-ink-900"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold transition',
              selected
                ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
            ].join(' ')}
          >
            {option.label}
            <span
              className={[
                'rounded-full px-1.5 text-[10.5px] font-bold leading-4',
                selected
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200'
                  : 'bg-ink-200/80 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
              ].join(' ')}
            >
              {counts[option.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
