import { classNames } from '../lib/format'

interface ExamFiltersProps {
  years: number[]
  shifts: number[]
  year: number | null
  shift: number | null
  onYear: (value: number | null) => void
  onShift: (value: number | null) => void
}

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={classNames(
        'h-7 rounded-lg border px-2 text-[11.5px] font-semibold transition active:scale-95',
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Year and shift live one level below the folder chips: they only appear once
 * the library actually holds more than one of them, so a single-exam library
 * does not show a filter that cannot filter anything.
 */
export function ExamFilters({
  years,
  shifts,
  year,
  shift,
  onYear,
  onShift,
}: ExamFiltersProps) {
  const showYears = years.length > 1 || year !== null
  const showShifts = shifts.length > 1 || shift !== null
  if (!showYears && !showShifts) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {showYears && (
        <div className="flex items-center gap-1">
          <span className="mr-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
            Year
          </span>
          <Chip active={year === null} onClick={() => onYear(null)} label="All years">
            All
          </Chip>
          {years.map((value) => (
            <Chip
              key={value}
              active={year === value}
              onClick={() => onYear(year === value ? null : value)}
              label={`Only ${value} papers`}
            >
              {value}
            </Chip>
          ))}
        </div>
      )}

      {showShifts && (
        <div className="flex items-center gap-1">
          <span className="mr-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
            Shift
          </span>
          <Chip active={shift === null} onClick={() => onShift(null)} label="Every shift">
            Any
          </Chip>
          {shifts.map((value) => (
            <Chip
              key={value}
              active={shift === value}
              onClick={() => onShift(shift === value ? null : value)}
              label={`Only shift ${value} papers`}
            >
              {value}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
