interface CategoryChipsProps {
  categories: { name: string; count: number }[]
  total: number
  active: string
  onChange: (category: string) => void
}

const ALL = 'All'

export function CategoryChips({ categories, total, active, onChange }: CategoryChipsProps) {
  const chips = [{ name: ALL, count: total }, ...categories]

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-2">
        {chips.map((chip) => {
          const selected = active === chip.name
          return (
            <button
              key={chip.name}
              type="button"
              onClick={() => onChange(chip.name)}
              aria-pressed={selected}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]',
                selected
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-ink-600 dark:hover:text-white',
              ].join(' ')}
            >
              <span className="max-w-[190px] truncate">{chip.name}</span>
              <span
                className={[
                  'rounded-full px-1.5 py-px text-[11px] font-bold',
                  selected
                    ? 'bg-white/20 text-white'
                    : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                ].join(' ')}
              >
                {chip.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
