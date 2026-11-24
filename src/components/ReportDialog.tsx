import { useEffect, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { AlertIcon, CheckIcon, LoaderIcon } from './Icons'
import { Modal } from './Modal'
import { classNames } from '../lib/format'
import { REPORT_REASONS } from '../lib/types'
import type { NewReport, Paper, ReportReason } from '../lib/types'

interface ReportDialogProps {
  open: boolean
  paper: Paper | null
  onClose: () => void
  onSubmit: (report: NewReport) => Promise<void>
  onSuccess: (message: string) => void
}

export function ReportDialog({
  open,
  paper,
  onClose,
  onSubmit,
  onSuccess,
}: ReportDialogProps) {
  const { t } = useI18n()
  const [reason, setReason] = useState<ReportReason>('link_broken')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Every fresh open starts blank.
  useEffect(() => {
    if (!open) return
    setReason('link_broken')
    setDetails('')
    setSent(false)
    setError(null)
  }, [open, paper?.id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!paper) return
    setError(null)
    setBusy(true)
    try {
      await onSubmit({
        paper_id: paper.id,
        paper_title: paper.title,
        reason,
        details: details.trim() ? details.trim() : null,
      })
      setSent(true)
      onSuccess(t('Report sent — thank you. It will be checked soon.'))
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t('Could not send the report. Try again.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sent ? t('Report sent') : t('Report a problem')}
      description={
        sent
          ? undefined
          : t('Nothing to sign in for. Tell me what is wrong with this PDF and it will be fixed.')
      }
      icon={<AlertIcon className="h-4 w-4" />}
    >
      {sent ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckIcon className="mt-px h-4 w-4 shrink-0" />
            <span>
              {t('Your report for')}{' '}
              <span className="font-semibold">{paper?.title}</span>{' '}
              {t('has been saved. If the link is broken it will be replaced with a working one.')}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-brand-600 text-[14px] font-semibold text-white transition hover:bg-brand-700"
          >
            {t('Done')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2.5">
          {paper && (
            <p className="truncate rounded-xl bg-ink-50 px-3 py-2 text-[12.5px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {paper.title}
            </p>
          )}

          <div className="space-y-1.5">
            {REPORT_REASONS.map((entry) => (
              <label
                key={entry.value}
                className={classNames(
                  'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition',
                  reason === entry.value
                    ? 'border-brand-400 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10'
                    : 'border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-ink-600',
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  checked={reason === entry.value}
                  onChange={() => setReason(entry.value)}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink-800 dark:text-ink-100">
                    {t(entry.label)}
                  </span>
                  <span className="block text-[11.5px] leading-snug text-ink-500 dark:text-ink-400">
                    {t(entry.hint)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
              {t('Anything else? (optional)')}
            </span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, 600))}
              rows={3}
              maxLength={600}
              placeholder={t('For example: the PDF opens but pages 4–7 are missing.')}
              className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500"
            />
            <span className="mt-0.5 block text-right text-[10.5px] text-ink-400 dark:text-ink-500">
              {details.length}/600
            </span>
          </label>

          {error && (
            <p className="flex items-start gap-1.5 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !paper}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <LoaderIcon className="h-4 w-4" />}
            {t('Send report')}
          </button>
        </form>
      )}
    </Modal>
  )
}
