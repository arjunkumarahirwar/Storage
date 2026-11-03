import { driveDownloadUrl, driveViewUrl } from '../lib/drive'
import { classNames, formatDate } from '../lib/format'
import type { Paper } from '../lib/types'
import {
  CheckIcon,
  DownloadIcon,
  ExternalIcon,
  FileIcon,
  LinkIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from './Icons'

interface PaperCardProps {
  paper: Paper
  done: boolean
  isAdmin: boolean
  onToggleDone: () => void
  onShare: () => void
  onEdit: () => void
  onDelete: () => void
}

const isRecent = (iso: string) => {
  const created = new Date(iso).getTime()
  return Number.isFinite(created) && Date.now() - created < 1000 * 60 * 60 * 24 * 10
}

export function PaperCard({
  paper,
  done,
  isAdmin,
  onToggleDone,
  onShare,
  onEdit,
  onDelete,
}: PaperCardProps) {
  const viewUrl = driveViewUrl(paper.drive_file_id)
  const downloadUrl = driveDownloadUrl(paper.drive_file_id)
  const recent = isRecent(paper.created_at)

  return (
    <article
      className={classNames(
        'group relative flex flex-col rounded-2xl border p-3.5 shadow-card transition sm:p-4',
        done
          ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/25 dark:bg-emerald-500/[0.06]'
          : 'border-ink-200/90 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700',
      )}
    >
      <div className="flex items-start gap-3">
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${paper.title} in Google Drive`}
          className="relative grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 text-sky-500 transition hover:border-sky-300 hover:text-sky-600 dark:border-sky-500/20 dark:from-sky-500/15 dark:via-ink-900 dark:to-blue-500/10 dark:text-sky-300"
        >
          <FileIcon className="h-6 w-6" />
          <span className="absolute bottom-1 text-[8px] font-extrabold uppercase tracking-wider">
            PDF
          </span>
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3
              className={classNames(
                'min-w-0 flex-1 text-[14.5px] font-semibold leading-snug',
                done
                  ? 'text-ink-600 dark:text-ink-300'
                  : 'text-ink-900 dark:text-white',
              )}
            >
              {paper.title}
            </h3>

            {recent && !done && (
              <span className="mt-0.5 shrink-0 rounded-full bg-brand-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                New
              </span>
            )}

            {isAdmin && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label={`Edit ${paper.title}`}
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label={`Delete ${paper.title}`}
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {paper.category}
            </span>
            {paper.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-ink-200 px-1.5 py-0.5 text-[11px] font-medium text-ink-500 dark:border-ink-700 dark:text-ink-400"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11.5px] text-ink-400 dark:text-ink-500">
            <LinkIcon className="h-3 w-3" />
            {paper.source_type === 'official' && paper.source_url ? (
              <a
                href={paper.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-ink-500 underline decoration-ink-300 decoration-dotted underline-offset-2 transition hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-300"
              >
                Official ESB page
              </a>
            ) : (
              <span>Own work</span>
            )}
            <span aria-hidden>·</span>
            <span>Added {formatDate(paper.created_at)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3 dark:border-ink-800">
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[12.5px] font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <ExternalIcon className="h-4 w-4" /> Open
        </a>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition hover:bg-ink-50 active:scale-[0.98] dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          <DownloadIcon className="h-4 w-4" /> Download
        </a>
        <button
          type="button"
          onClick={onShare}
          aria-label={`Share ${paper.title}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-500 transition hover:bg-ink-50 hover:text-ink-800 active:scale-95 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          aria-label={done ? `Mark ${paper.title} as not done` : `Mark ${paper.title} as done`}
          className={classNames(
            'inline-flex h-8 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[12.5px] font-semibold transition active:scale-[0.98]',
            done
              ? 'border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600 dark:border-emerald-400/40'
              : 'border-ink-200 bg-white text-ink-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300',
          )}
        >
          <CheckIcon className="h-3.5 w-3.5" /> {done ? 'Done' : 'Mark'}
        </button>
      </div>
    </article>
  )
}
