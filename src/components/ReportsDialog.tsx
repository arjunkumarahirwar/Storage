import { CheckIcon, ExternalIcon, FileIcon, PencilIcon, RefreshIcon } from './Icons'
import { Modal } from './Modal'
import { classNames, formatDate } from '../lib/format'
import { driveViewUrl } from '../lib/drive'
import { reportReasonLabel } from '../lib/types'
import type { Paper, PaperReport } from '../lib/types'

interface ReportsDialogProps {
  open: boolean
  onClose: () => void
  reports: PaperReport[]
  loading: boolean
  error: string | null
  onReload: () => void
  onResolve: (id: string) => void
  /** The paper a report points at, when it still exists. */
  paperFor: (id: string | null) => Paper | null
  onEditPaper: (paper: Paper) => void
}

const reasonTone = (report: PaperReport) =>
  report.reason === 'link_broken'
    ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'

export function ReportsDialog({
  open,
  onClose,
  reports,
  loading,
  error,
  onReload,
  onResolve,
  paperFor,
  onEditPaper,
}: ReportsDialogProps) {
  const openReports = reports.filter((report) => report.status === 'open')
  const closed = reports.filter((report) => report.status !== 'open')

  const renderRow = (report: PaperReport) => {
    const paper = paperFor(report.paper_id)
    return (
      <li
        key={report.id}
        className={classNames(
          'rounded-2xl border p-3',
          report.status === 'open'
            ? 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900'
            : 'border-ink-200/70 bg-ink-50/60 dark:border-ink-800 dark:bg-ink-900/40',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink-900 dark:text-white">
            {report.paper_title}
          </p>
          <span
            className={classNames(
              'shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold',
              report.status === 'open'
                ? reasonTone(report)
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
            )}
          >
            {report.status === 'open' ? reportReasonLabel(report.reason) : 'Resolved'}
          </span>
        </div>

        {report.details && (
          <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-ink-50 px-2 py-1.5 text-[12px] leading-snug text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {report.details}
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-ink-400 dark:text-ink-500">
          <span>Reported {formatDate(report.created_at)}</span>
          <span aria-hidden>·</span>
          <span>{report.reporter_id ? 'Signed-in student' : 'Guest'}</span>
          {!paper && (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                no longer in the library
              </span>
            </>
          )}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {paper && (
            <>
              <a
                href={driveViewUrl(paper.drive_file_id)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                <ExternalIcon className="h-3.5 w-3.5" /> Open PDF
              </a>
              <button
                type="button"
                onClick={() => onEditPaper(paper)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                <PencilIcon className="h-3.5 w-3.5" /> Fix paper
              </button>
            </>
          )}
          {report.status === 'open' && (
            <button
              type="button"
              onClick={() => onResolve(report.id)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[12px] font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckIcon className="h-3.5 w-3.5" /> Mark resolved
            </button>
          )}
        </div>
      </li>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Problem reports"
      description="What students flagged. Fix the paper, then mark it resolved."
      icon={<FileIcon className="h-4 w-4" />}
      wide
    >
      {error && (
        <p className="mb-2 flex items-center gap-2 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 px-2 py-1 text-[11.5px] font-semibold dark:border-brand-500/40"
          >
            <RefreshIcon className="h-3 w-3" /> Retry
          </button>
        </p>
      )}

      {loading && !reports.length ? (
        <p className="py-6 text-center text-[13px] text-ink-400 dark:text-ink-500">Loading…</p>
      ) : !reports.length ? (
        <p className="py-8 text-center text-[13px] text-ink-400 dark:text-ink-500">
          No reports. Every link students tried so far worked.
        </p>
      ) : (
        <div className="space-y-3">
          <section>
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
              Open · {openReports.length}
            </h3>
            {openReports.length ? (
              <ul className="space-y-2">{openReports.map(renderRow)}</ul>
            ) : (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                Nothing waiting. 🎉
              </p>
            )}
          </section>

          {closed.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
                Resolved · {closed.length}
              </h3>
              <ul className="space-y-2">{closed.slice(0, 20).map(renderRow)}</ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
