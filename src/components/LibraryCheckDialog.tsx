import { useI18n } from '../hooks/useI18n'
import { AlertIcon, CheckIcon, LinkIcon, PulseIcon, RefreshIcon, TrashIcon } from './Icons'
import { Modal } from './Modal'
import { classNames, formatDate } from '../lib/format'
import { duplicateGroups, librarySummary } from '../lib/duplicates'
import type { LinkStatus, Paper } from '../lib/types'
import type { LinkHealthState } from '../hooks/useLinkHealth'

interface LibraryCheckDialogProps {
  open: boolean
  papers: Paper[]
  health: LinkHealthState
  onClose: () => void
  onCheck: () => void
  onForget: () => void
  onEdit: (paper: Paper) => void
  onDelete: (paper: Paper) => void
}

const statusLabel: Record<LinkStatus, string> = {
  ok: 'Works',
  restricted: 'Not public',
  missing: 'Missing',
  unknown: 'Unclear',
}

const statusTone: Record<LinkStatus, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  restricted:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  missing:
    'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-500/10 dark:text-danger-300 dark:border-danger-500/30',
  unknown:
    'bg-ink-100 text-ink-600 border-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:border-ink-700',
}

export function LibraryCheckDialog({
  open,
  papers,
  health,
  onClose,
  onCheck,
  onForget,
  onEdit,
  onDelete,
}: LibraryCheckDialogProps) {
  const { t } = useI18n()
  const summary = librarySummary(papers)
  const groups = duplicateGroups(papers)

  // Every link in the library, with the card it belongs to.
  const links = papers.flatMap((paper) => {
    const rows: { paper: Paper; fileId: string; role: 'paper' | 'key' }[] = [
      { paper, fileId: paper.drive_file_id, role: 'paper' },
    ]
    if (paper.solution_file_id) {
      rows.push({ paper, fileId: paper.solution_file_id, role: 'key' })
    }
    return rows
  })

  const checked = links.filter((link) => health.results.has(link.fileId))
  const counts = { ok: 0, restricted: 0, missing: 0, unknown: 0 }
  for (const link of checked) {
    const status = health.results.get(link.fileId)?.status
    if (status) counts[status] += 1
  }
  const problems = checked.filter((link) => {
    const status = health.results.get(link.fileId)?.status
    return status === 'missing' || status === 'restricted' || status === 'unknown'
  })

  const progressPercent = health.progress.total
    ? Math.round((health.progress.done / health.progress.total) * 100)
    : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={t('Library check')}
      description={t('Are the Drive links still working, and has anything slipped in twice?')}
      icon={<PulseIcon className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label={t('Papers')} value={String(summary.total)} />
          <Tile label={t('Folders')} value={String(summary.folders)} />
          <Tile label={t('With answer key')} value={String(summary.withKey)} />
          <Tile
            label={t('No exam year')}
            value={String(summary.withoutYear)}
            tone={summary.withoutYear ? 'warn' : undefined}
          />
        </div>

        <section className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-900 dark:text-white">
                <LinkIcon className="h-3.5 w-3.5 text-emerald-500" /> {t('Link health')}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500 dark:text-ink-400">
                {health.lastChecked
                  ? t('Last checked {date}.', { date: formatDate(health.lastChecked) })
                  : t('Checks every paper and answer key the way a student opening it would.')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {checked.length > 0 && (
                <button
                  type="button"
                  onClick={onForget}
                  className="rounded-lg border border-ink-200 px-2 py-1 text-[11.5px] font-semibold text-ink-500 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
                >
                  {t('Clear')}
                </button>
              )}
              <button
                type="button"
                onClick={onCheck}
                disabled={health.checking || !links.length}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 text-[11.5px] font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                <RefreshIcon className={classNames('h-3.5 w-3.5', health.checking && 'animate-spin')} />
                {health.checking
                  ? t('Checking…')
                  : checked.length
                    ? t('Recheck')
                    : t('Check all links')}
              </button>
            </div>
          </div>

          {health.checking && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">
                {t('{done} of {total} links checked…', {
                  done: health.progress.done,
                  total: health.progress.total,
                })}
              </p>
            </div>
          )}

          {health.error && (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-2 text-[12px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {health.error}
            </p>
          )}

          {checked.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['ok', 'restricted', 'missing', 'unknown'] as LinkStatus[]).map((status) =>
                counts[status] ? (
                  <span
                    key={status}
                    className={classNames(
                      'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold',
                      statusTone[status],
                    )}
                  >
                    {counts[status]} {t(statusLabel[status]).toLowerCase()}
                  </span>
                ) : null,
              )}
            </div>
          )}

          {problems.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {problems.map((link) => {
                const status = health.results.get(link.fileId)?.status ?? 'unknown'
                return (
                  <li
                    key={`${link.paper.id}-${link.role}`}
                    className="flex items-center gap-2 rounded-xl border border-ink-200 px-2 py-1.5 dark:border-ink-700"
                  >
                    <span
                      className={classNames(
                        'shrink-0 rounded-md border px-1.5 py-0.5 text-[10.5px] font-bold',
                        statusTone[status],
                      )}
                    >
                      {t(statusLabel[status])}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-ink-800 dark:text-ink-100">
                        {link.paper.title}
                      </span>
                      <span className="block truncate text-[10.5px] text-ink-400 dark:text-ink-500">
                        {link.role === 'key' ? `${t('Answer key')} · ` : ''}
                        {status === 'missing'
                          ? t('the file is gone or the link is wrong')
                          : status === 'restricted'
                            ? t('share it as “Anyone with the link”')
                            : t('Drive did not answer — try again')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onEdit(link.paper)}
                      className="shrink-0 rounded-lg border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      {t('Edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(link.paper)}
                      aria-label={t('Delete {title}', { title: link.paper.title })}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-500/15"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {checked.length > 0 && problems.length === 0 && !health.checking && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-2 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckIcon className="h-3.5 w-3.5" /> {t('Every checked link opens for a student.')}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
          <p className="text-[13px] font-bold text-ink-900 dark:text-white">{t('Duplicates')}</p>
          {groups.length === 0 ? (
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500 dark:text-ink-400">
              {t(
                'Nothing twice: every Drive file appears once, no two titles match, and no exam slot is claimed by two cards.',
              )}
            </p>
          ) : (
            <div className="mt-2 space-y-2.5">
              {groups.map((group) => (
                <div key={group.key} className="rounded-xl border border-amber-200 p-2 dark:border-amber-500/40">
                  <p className="flex items-start gap-1.5 px-0.5 text-[11.5px] font-semibold text-amber-800 dark:text-amber-300">
                    <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {t(group.reason)}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {group.papers.map((paper) => (
                      <li
                        key={paper.id}
                        className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 dark:bg-ink-900"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-ink-800 dark:text-ink-100">
                            {paper.title}
                          </span>
                          <span className="block truncate text-[10.5px] text-ink-400 dark:text-ink-500">
                            {t('{folder} · added {date}', {
                              folder: paper.category,
                              date: formatDate(paper.created_at),
                            })}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onEdit(paper)}
                          className="shrink-0 rounded-lg border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                        >
                          {t('Edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(paper)}
                          aria-label={t('Delete {title}', { title: paper.title })}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-500/15"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-[11px] leading-relaxed text-ink-400 dark:text-ink-500">
          {t(
            'The link checker asks Google Drive about each file from our own server, because a browser is not allowed to read Drive directly. It never downloads a file — only the first part of its preview page.',
          )}
        </p>
      </div>
    </Modal>
  )
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'warn'
}) {
  return (
    <div
      className={classNames(
        'rounded-xl border px-2.5 py-2',
        tone === 'warn'
          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-800/60',
      )}
    >
      <p className="text-[17px] font-extrabold leading-none text-ink-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[10.5px] font-medium leading-tight text-ink-500 dark:text-ink-400">
        {label}
      </p>
    </div>
  )
}
