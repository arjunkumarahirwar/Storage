import type { KeyboardEvent, PointerEvent } from 'react'
import { useI18n } from '../hooks/useI18n'
import { driveDownloadUrl, driveViewUrl } from '../lib/drive'
import { classNames, formatDate } from '../lib/format'
import type { LinkStatus, NoteEntry, Paper, PracticeAttempt } from '../lib/types'
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  ExternalIcon,
  FileIcon,
  GripIcon,
  LinkIcon,
  NoteIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from './Icons'

export interface DragHandleProps {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}

interface PaperCardProps {
  paper: Paper
  done: boolean
  isAdmin: boolean
  /** The answer key attached to this paper, if any. */
  answerKey?: { fileId: string; title: string } | null
  /** When this card IS an answer key: the paper it belongs to. */
  originalPaper?: Paper | null
  isDragging?: boolean
  /** Present only for the administrator — enables drag / arrow-key reordering. */
  dragHandleProps?: DragHandleProps
  /** Arrow buttons on the side rail (administrator only). */
  onMove?: (delta: -1 | 1) => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  /** This student's private note and rating, if they made one. */
  note?: NoteEntry
  /** This student's timed practice runs, newest first. */
  attempts?: PracticeAttempt[]
  /** Bulk edit is on: show a tick box instead of the drag rail. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  /** The administrator's last link check for this paper's Drive file. */
  health?: LinkStatus | null
  practiceRunning?: boolean
  /** That timer has reached zero. */
  practiceExpired?: boolean
  onToggleDone: () => void
  onShare: () => void
  onPractice: () => void
  onNotes: () => void
  onReport: () => void
  /** True once this student has already flagged this paper from this device. */
  reported?: boolean
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
  answerKey,
  originalPaper,
  isDragging = false,
  dragHandleProps,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
  note,
  attempts,
  selectable = false,
  selected = false,
  onToggleSelect,
  health,
  practiceRunning = false,
  practiceExpired = false,
  onToggleDone,
  onShare,
  onPractice,
  onNotes,
  onReport,
  reported = false,
  onEdit,
  onDelete,
}: PaperCardProps) {
  const { t } = useI18n()
  const viewUrl = driveViewUrl(paper.drive_file_id)
  const downloadUrl = driveDownloadUrl(paper.drive_file_id)
  const recent = isRecent(paper.created_at)

  return (
    <article
      data-paper-id={paper.id}
      className={classNames(
        'group relative flex flex-col rounded-2xl border p-3.5 shadow-card transition sm:p-4',
        done
          ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/25 dark:bg-emerald-500/[0.06]'
          : 'border-ink-200/90 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700',
        selected &&
          'border-brand-400 ring-2 ring-brand-500/25 dark:border-brand-500/60 dark:ring-brand-500/20',
        isDragging &&
          'border-brand-400 shadow-2xl ring-2 ring-brand-500/30 dark:border-brand-500/60',
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <button
            type="button"
            onClick={onToggleSelect}
            role="checkbox"
            aria-checked={selected}
            aria-label={`${selected ? 'Unselect' : 'Select'} ${paper.title}`}
            className={classNames(
              'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition',
              selected
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-300 bg-white text-transparent hover:border-brand-400 dark:border-ink-600 dark:bg-ink-800',
            )}
          >
            <CheckIcon className="h-3.5 w-3.5" />
          </button>
        )}
        {!selectable && isAdmin && dragHandleProps && (
          <div className="-ml-1 flex w-6 shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              {...dragHandleProps}
              aria-label={t('Drag {title} up or down to reorder', { title: paper.title })}
              title={t('Drag {title} up or down to reorder', { title: paper.title })}
              className="grid h-9 w-6 cursor-grab touch-none select-none place-items-center rounded-lg border border-ink-200 bg-white text-ink-400 shadow-card transition hover:border-ink-300 hover:bg-ink-100 hover:text-ink-700 active:cursor-grabbing dark:border-ink-700 dark:bg-ink-800 dark:text-ink-400 dark:hover:text-white"
            >
              <GripIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMove?.(-1)}
              disabled={!canMoveUp}
              aria-label={t('Move {title} up', { title: paper.title })}
              title={t('Move up')}
              className="grid h-6 w-6 place-items-center rounded-md border border-ink-200/80 bg-white text-ink-400 transition hover:border-ink-300 hover:bg-ink-100 hover:text-ink-700 disabled:border-transparent disabled:bg-transparent disabled:opacity-25 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-400 dark:hover:text-white"
            >
              <ChevronUpIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove?.(1)}
              disabled={!canMoveDown}
              aria-label={t('Move {title} down', { title: paper.title })}
              title={t('Move down')}
              className="grid h-6 w-6 place-items-center rounded-md border border-ink-200/80 bg-white text-ink-400 transition hover:border-ink-300 hover:bg-ink-100 hover:text-ink-700 disabled:border-transparent disabled:bg-transparent disabled:opacity-25 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-400 dark:hover:text-white"
            >
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={t('Open {title} in Google Drive', { title: paper.title })}
          className="relative grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 text-sky-500 transition hover:border-sky-300 hover:text-sky-600 dark:border-sky-500/20 dark:from-sky-500/15 dark:via-ink-900 dark:to-blue-500/10 dark:text-sky-300"
        >
          <FileIcon className="h-6 w-6" />
          <span className="absolute bottom-1 text-[8px] font-extrabold uppercase tracking-wider">
            PDF
          </span>
          {health && health !== 'ok' && (
            <span
              title={
                health === 'missing'
                  ? 'Link check: this Drive file is gone'
                  : health === 'restricted'
                    ? 'Link check: this file is not shared publicly'
                    : 'Link check: Drive could not be reached'
              }
              className={classNames(
                'absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-ink-900',
                health === 'missing'
                  ? 'bg-brand-600'
                  : health === 'restricted'
                    ? 'bg-amber-500'
                    : 'bg-ink-400',
              )}
            />
          )}
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
                {t('New')}
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
            {answerKey && (
              <a
                href={driveViewUrl(answerKey.fileId)}
                target="_blank"
                rel="noreferrer noopener"
                title={t('Answer key: {title}', { title: answerKey.title })}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                <CheckIcon className="h-3 w-3" /> {t('Answer key')}
              </a>
            )}
            {originalPaper && (
              <a
                href={driveViewUrl(originalPaper.drive_file_id)}
                target="_blank"
                rel="noreferrer noopener"
                title={t('Question paper: {title}', { title: originalPaper.title })}
                className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink-600 transition hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
              >
                <FileIcon className="h-3 w-3" /> {t('Question paper')}
              </a>
            )}
            <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {paper.category}
            </span>
            {note?.difficulty && (
              <span
                title={t('Your difficulty rating')}
                className={classNames(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold',
                  note.difficulty === 'easy'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : note.difficulty === 'hard'
                      ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
                )}
              >
                <NoteIcon className="h-3 w-3" />
                {note.difficulty === 'easy'
                  ? t('Easy')
                  : note.difficulty === 'hard'
                    ? t('Hard')
                    : t('Medium')}
              </span>
            )}
            {practiceRunning && (
              <span
                className={
                  practiceExpired
                    ? 'inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                }
              >
                <ClockIcon className="h-3 w-3" />{' '}
                {practiceExpired ? t('Time’s up') : t('Timer running')}
              </span>
            )}
            {!practiceRunning && attempts && attempts.length > 0 && (
              <span
                title={t('Timed attempts')}
                className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-1.5 py-0.5 text-[11px] font-semibold text-ink-500 dark:border-ink-700 dark:text-ink-400"
              >
                <ClockIcon className="h-3 w-3" /> {t('Best')}{' '}
                {Math.max(...attempts.map((attempt) => attempt.score))}/
                {attempts[0].total} · {attempts.length}×
              </span>
            )}
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
                {t('Official ESB page')}
              </a>
            ) : (
              <span>{t('Own work')}</span>
            )}
            <span aria-hidden>·</span>
            <span>{t('Added {date}', { date: formatDate(paper.created_at) })}</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={onPractice}
              title={t('Practise this paper against the clock')}
              className="inline-flex items-center gap-1 rounded font-semibold text-ink-400 underline decoration-dotted underline-offset-2 transition hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300"
            >
              <ClockIcon className="h-3 w-3" /> {t('Practice')}
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={onNotes}
              title={t('Your private note and difficulty rating')}
              className={classNames(
                'inline-flex items-center gap-1 rounded font-semibold underline decoration-dotted underline-offset-2 transition',
                note?.note
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-ink-400 hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300',
              )}
            >
              <NoteIcon className="h-3 w-3" /> {t('Notes')}
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={onReport}
              title={t('Tell the admin something is wrong with this paper')}
              className={classNames(
                'inline-flex items-center gap-1 rounded font-semibold underline decoration-dotted underline-offset-2 transition',
                reported
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-ink-400 hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300',
              )}
            >
              <AlertIcon className="h-3 w-3" />
              {reported ? t('Reported') : t('Report a problem')}
            </button>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3 dark:border-ink-800">
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-600 px-2.5 text-[12.5px] font-semibold text-white sm:px-3 transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <ExternalIcon className="h-4 w-4" /> {t('Open')}
        </a>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] font-semibold text-ink-700 sm:px-3 transition hover:bg-ink-50 active:scale-[0.98] dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          <DownloadIcon className="h-4 w-4" /> {t('Download')}
        </a>
        <button
          type="button"
          onClick={onShare}
          aria-label={t('Share {title}', { title: paper.title })}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-500 transition hover:bg-ink-50 hover:text-ink-800 active:scale-95 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          aria-label={
            done
              ? t('Mark {title} as not done', { title: paper.title })
              : t('Mark {title} as done', { title: paper.title })
          }
          className={classNames(
            'inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border px-2.5 text-[12.5px] font-semibold transition active:scale-[0.98]',
            done
              ? 'border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600 dark:border-emerald-400/40'
              : 'border-ink-200 bg-white text-ink-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300',
          )}
        >
          <CheckIcon className="h-3.5 w-3.5" /> {done ? t('Done') : t('Mark')}
        </button>
      </div>
    </article>
  )
}
