import { useI18n } from '../hooks/useI18n'
import { driveViewUrl } from '../lib/drive'
import { classNames, formatDate } from '../lib/format'
import type { Paper } from '../lib/types'

interface RecentStripProps {
  /** Newest papers first. */
  papers: Paper[]
  /** How many of them the visitor has not seen on this device yet. */
  newCount: number
}

const isFresh = (iso: string) => {
  const created = new Date(iso).getTime()
  return Number.isFinite(created) && Date.now() - created < 1000 * 60 * 60 * 24 * 7
}

/**
 * A shelf, not a second list: the newest uploads sit above the folder chips
 * as compact tiles so a returning student can see at a glance what is new,
 * whatever order the administrator has arranged the main list in.
 */
export function RecentStrip({ papers, newCount }: RecentStripProps) {
  const { t } = useI18n()
  if (!papers.length) return null

  return (
    <section className="mt-4" aria-label={t('Recently added papers')}>
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400 dark:text-ink-500">
          {t('Recently added')}
        </h2>
        {newCount > 0 && (
          <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {t('{count} new', { count: newCount })}
          </span>
        )}
      </div>

      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {papers.map((paper) => (
          <a
            key={paper.id}
            href={driveViewUrl(paper.drive_file_id)}
            target="_blank"
            rel="noreferrer noopener"
            className={classNames(
              'group flex w-[164px] shrink-0 snap-start flex-col gap-1.5 rounded-xl border p-2.5 transition',
              'border-ink-200 bg-white hover:border-brand-300 hover:shadow-card',
              'dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/50',
            )}
          >
            <div className="flex items-center gap-1">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-sky-500 dark:text-sky-400">
                PDF
              </span>
              <span className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
                {paper.category}
              </span>
              {isFresh(paper.created_at) && (
                <span className="ml-auto shrink-0 rounded-full bg-brand-50 px-1 py-px text-[9px] font-bold uppercase text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  New
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink-800 group-hover:text-brand-700 dark:text-ink-100 dark:group-hover:text-brand-300">
              {paper.title}
            </p>
            <p className="mt-auto text-[10.5px] text-ink-400 dark:text-ink-500">
              {t('Added {date}', { date: formatDate(paper.created_at) })}
            </p>
          </a>
        ))}
      </div>
    </section>
  )
}
