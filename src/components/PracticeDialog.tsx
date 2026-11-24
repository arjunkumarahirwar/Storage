import { useEffect, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { ClockIcon, ExternalIcon, TrashIcon } from './Icons'
import { Modal } from './Modal'
import { classNames, formatClock, formatDate, formatDuration } from '../lib/format'
import { driveViewUrl } from '../lib/drive'
import {
  MAX_PRACTICE_MINUTES,
  MINUTE_STEP,
  MIN_PRACTICE_MINUTES,
  clampMinutes,
  snapMinutes,
  stepMinutes,
} from '../lib/countdown'
import type { Paper, PracticeAttempt } from '../lib/types'

interface PracticeDialogProps {
  open: boolean
  paper: Paper | null
  /** The timer that is running right now, whichever paper it belongs to. */
  runningPaperId: string | null
  runningTitle: string | null
  /** Minutes the running attempt was given. */
  runningMinutes: number
  /** Milliseconds left on that timer. */
  remainingMs: number
  /** Milliseconds worked so far, capped at the time allowed. */
  elapsedMs: number
  /** The clock has reached zero. */
  expired: boolean
  /** Under five minutes left. */
  nearlyUp: boolean
  /** The administrator's default, in minutes. */
  defaultMinutes: number
  isAdmin: boolean
  onSaveDefault: (minutes: number) => Promise<void>
  attempts: PracticeAttempt[]
  onClose: () => void
  onStart: (minutes: number) => void
  onCancelTimer: () => void
  onFinish: (score: number, total: number) => Promise<void>
  onRemoveAttempt: (id: string) => void
  onSuccess: (message: string) => void
}

const QUICK_MINUTES = [30, 60, 90, 120]

export function PracticeDialog({
  open,
  paper,
  runningPaperId,
  runningTitle,
  runningMinutes,
  remainingMs,
  elapsedMs,
  expired,
  nearlyUp,
  defaultMinutes,
  isAdmin,
  onSaveDefault,
  attempts,
  onClose,
  onStart,
  onCancelTimer,
  onFinish,
  onRemoveAttempt,
  onSuccess,
}: PracticeDialogProps) {
  const { t } = useI18n()
  const [scoring, setScoring] = useState(false)
  const [score, setScore] = useState('')
  const [total, setTotal] = useState('100')
  const [minutes, setMinutes] = useState(String(defaultMinutes))
  const [defaultDraft, setDefaultDraft] = useState(String(defaultMinutes))
  const [savingDefault, setSavingDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setScoring(false)
    setScore('')
    setTotal('100')
    setMinutes(String(snapMinutes(defaultMinutes)))
    setDefaultDraft(String(snapMinutes(defaultMinutes)))
    setError(null)
  }, [open, paper?.id, defaultMinutes])

  const thisPaperRunning = Boolean(paper && runningPaperId === paper.id)
  const otherPaperRunning = Boolean(runningPaperId && !thisPaperRunning)
  const chosenMinutes = clampMinutes(Number(minutes))
  const draftMinutes = snapMinutes(Number(defaultDraft))

  const saveDefault = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingDefault(true)
    setError(null)
    try {
      const safe = snapMinutes(Number(defaultDraft))
      await onSaveDefault(safe)
      setDefaultDraft(String(safe))
      setMinutes(String(safe))
      onSuccess('Default time saved.')
    } catch (caught) {
      setError(
        t(caught instanceof Error ? caught.message : 'Could not save the default time.'),
      )
    } finally {
      setSavingDefault(false)
    }
  }

  const saveScore = async (event: React.FormEvent) => {
    event.preventDefault()
    const totalValue = Number(total)
    const scoreValue = Number(score)
    if (!Number.isFinite(scoreValue) || scoreValue < 0) {
      setError(t('Enter the marks you scored.'))
      return
    }
    if (!Number.isFinite(totalValue) || totalValue < 1) {
      setError(t('Enter the total marks.'))
      return
    }
    if (scoreValue > totalValue) {
      setError(t('The score cannot be more than the total.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onFinish(scoreValue, totalValue)
      onSuccess(t('Practice saved — {score}/{total}.', { score: scoreValue, total: totalValue }))
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Could not save that attempt.'))
    } finally {
      setBusy(false)
    }
  }

  const stopTimer = () => {
    onCancelTimer()
    onSuccess(t('Timer stopped — nothing was saved.'))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        scoring
          ? t('Enter your score')
          : thisPaperRunning
            ? expired
              ? t('Time’s up')
              : t('Practice running')
            : t('Timed practice')
      }
      description={
        scoring
          ? t('Enter the marks you scored once you have checked your answers.')
          : thisPaperRunning
            ? expired
              ? t('The clock reached zero. Save the marks you scored.')
              : t(
                  'The clock is counting down. Open the paper in Google Drive, and come back here to stop the clock and save your score — it keeps running while you are away.',
                )
            : t(
                'Choose how long you get, start the clock and open the paper in Drive. A bell rings when the time is up, and you enter your score here.',
              )
      }
      icon={<ClockIcon className="h-4 w-4" />}
    >
      {paper && (
        <p className="mb-3 truncate rounded-xl bg-ink-50 px-3 py-2 text-[12.5px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          {paper.title}
        </p>
      )}

      {thisPaperRunning && !scoring && (
        <div className="space-y-3">
          <div
            className={classNames(
              'rounded-2xl border px-4 py-5 text-center',
              expired
                ? 'border-brand-300 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/15'
                : nearlyUp
                  ? 'border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10'
                  : 'border-brand-200 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10',
            )}
          >
            <p
              className={classNames(
                'text-[11px] font-bold uppercase tracking-[0.14em]',
                expired
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-brand-700 dark:text-brand-300',
              )}
            >
              {expired ? t('Time’s up') : t('Time left')}
            </p>
            <p
              className={classNames(
                'mt-1 font-mono text-[34px] font-bold leading-none tracking-tight tabular-nums',
                expired
                  ? 'text-brand-700 dark:text-brand-300'
                  : nearlyUp
                    ? 'text-amber-800 dark:text-amber-300'
                    : 'text-ink-900 dark:text-white',
              )}
            >
              {formatClock(remainingMs)}
            </p>
            <p className="mt-1.5 text-[11.5px] text-ink-500 dark:text-ink-400">
              {t('of {minutes} min', { minutes: runningMinutes })}
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href={paper ? driveViewUrl(paper.drive_file_id) : undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
            >
              <ExternalIcon className="h-4 w-4" /> {t('Open paper')}
            </a>
            <button
              type="button"
              onClick={() => setScoring(true)}
              className="h-10 flex-1 rounded-xl bg-brand-600 text-[13px] font-semibold text-white transition hover:bg-brand-700"
            >
              {expired ? t('Enter score') : t('Finish & enter score')}
            </button>
          </div>
          <button
            type="button"
            onClick={stopTimer}
            className="w-full text-center text-[12px] font-semibold text-ink-400 transition hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300"
          >
            {t('Cancel this practice')}
          </button>
        </div>
      )}

      {scoring && (
        <form onSubmit={saveScore} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
                {t('Marks scored')}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={score}
                onChange={(event) => setScore(event.target.value.slice(0, 4))}
                autoFocus
                className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[15px] font-semibold text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
                {t('Out of')}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={total}
                onChange={(event) => setTotal(event.target.value.slice(0, 4))}
                className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[15px] font-semibold text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
            </label>
          </div>
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px] text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
            {t('Time taken:')} <span className="font-semibold">{formatClock(elapsedMs)}</span>
          </p>
          {error && (
            <p className="rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScoring(false)}
              disabled={busy}
              className="h-11 rounded-xl border border-ink-200 px-3 text-[13px] font-semibold text-ink-600 dark:border-ink-700 dark:text-ink-300"
            >
              {t('Back')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-11 flex-1 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? t('Saving…') : t('Save attempt')}
            </button>
          </div>
        </form>
      )}

      {!thisPaperRunning && !scoring && (
        <div className="space-y-3">
          {otherPaperRunning ? (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <p>
                {t('A timer is already running on “{title}”. Finish or cancel that one first.', {
                  title: runningTitle ?? t('another paper'),
                })}
              </p>
              <button
                type="button"
                onClick={stopTimer}
                className="rounded-lg border border-amber-300 px-2 py-1 text-[11.5px] font-semibold dark:border-amber-500/40"
              >
                {t('Stop that timer')}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-ink-600 dark:text-ink-300">
                {t('Time allowed')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_MINUTES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMinutes(String(option))}
                    aria-pressed={chosenMinutes === option}
                    className={classNames(
                      'h-9 rounded-xl border px-3 text-[12.5px] font-semibold transition',
                      chosenMinutes === option
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-200'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:text-ink-300',
                    )}
                  >
                    {option} {t('min')}
                  </button>
                ))}
                <div className="flex h-9 items-center gap-0.5 rounded-xl border border-ink-200 px-1 dark:border-ink-700">
                  <button
                    type="button"
                    onClick={() => setMinutes(String(stepMinutes(chosenMinutes, -MINUTE_STEP)))}
                    disabled={chosenMinutes <= MIN_PRACTICE_MINUTES}
                    aria-label={t('Five minutes less')}
                    title={t('Five minutes less')}
                    className="grid h-7 w-9 place-items-center rounded-lg text-[12px] font-bold text-ink-600 transition hover:bg-ink-100 disabled:opacity-30 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    −5
                  </button>
                  <label className="flex items-center gap-1 px-0.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      step={MINUTE_STEP}
                      min={MIN_PRACTICE_MINUTES}
                      max={MAX_PRACTICE_MINUTES}
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value.slice(0, 3))}
                      onBlur={() => setMinutes(String(snapMinutes(chosenMinutes)))}
                      aria-label={t('Minutes')}
                      className="w-11 bg-transparent text-center text-[13px] font-semibold text-ink-900 outline-none dark:text-white"
                    />
                    <span className="text-[11.5px] text-ink-400 dark:text-ink-500">{t('min')}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMinutes(String(stepMinutes(chosenMinutes, MINUTE_STEP)))}
                    disabled={chosenMinutes >= MAX_PRACTICE_MINUTES}
                    aria-label={t('Five minutes more')}
                    title={t('Five minutes more')}
                    className="grid h-7 w-9 place-items-center rounded-lg text-[12px] font-bold text-ink-600 transition hover:bg-ink-100 disabled:opacity-30 dark:text-ink-300 dark:hover:bg-ink-800"
                  >
                    +5
                  </button>
                </div>
              </div>
              {error && (
                <p className="mt-1.5 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {error}
                </p>
              )}
              {isAdmin && (
                <form
                  onSubmit={saveDefault}
                  className="mt-2.5 rounded-xl border border-ink-200 px-2.5 py-2 dark:border-ink-700"
                >
                  <p className="text-[11.5px] font-semibold text-ink-700 dark:text-ink-200">
                    {t('Default for everyone')}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 rounded-lg border border-ink-200 px-1 dark:border-ink-700">
                      <button
                        type="button"
                        onClick={() =>
                          setDefaultDraft(
                            String(stepMinutes(draftMinutes, -MINUTE_STEP)),
                          )
                        }
                        disabled={draftMinutes <= MIN_PRACTICE_MINUTES}
                        aria-label={t('Five minutes less')}
                        className="grid h-7 w-9 place-items-center rounded-md text-[12px] font-bold text-ink-600 transition hover:bg-ink-100 disabled:opacity-30 dark:text-ink-300 dark:hover:bg-ink-800"
                      >
                        −5
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        step={MINUTE_STEP}
                        min={MIN_PRACTICE_MINUTES}
                        max={MAX_PRACTICE_MINUTES}
                        value={defaultDraft}
                        onChange={(event) => setDefaultDraft(event.target.value.slice(0, 3))}
                        onBlur={() => setDefaultDraft(String(draftMinutes))}
                        aria-label={t('Default minutes')}
                        className="h-8 w-11 bg-transparent text-center text-[13px] font-semibold text-ink-900 outline-none dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDefaultDraft(String(stepMinutes(draftMinutes, MINUTE_STEP)))
                        }
                        disabled={draftMinutes >= MAX_PRACTICE_MINUTES}
                        aria-label={t('Five minutes more')}
                        className="grid h-7 w-9 place-items-center rounded-md text-[12px] font-bold text-ink-600 transition hover:bg-ink-100 disabled:opacity-30 dark:text-ink-300 dark:hover:bg-ink-800"
                      >
                        +5
                      </button>
                    </div>
                    <span className="text-[11.5px] text-ink-400 dark:text-ink-500">{t('min')}</span>
                    <button
                      type="submit"
                      disabled={savingDefault}
                      className="ml-auto h-8 rounded-lg border border-brand-200 px-2.5 text-[11.5px] font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
                    >
                      {savingDefault ? t('Saving…') : t('Save default')}
                    </button>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-snug text-ink-400 dark:text-ink-500">
                    {t('Only the admin can change this. Every student starts here.')}
                  </p>
                </form>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={otherPaperRunning}
              onClick={() => {
                onStart(chosenMinutes)
                if (paper) window.open(driveViewUrl(paper.drive_file_id), '_blank', 'noopener')
              }}
              className="h-11 flex-1 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {t('Start & open paper')}
            </button>
            <a
              href={paper ? driveViewUrl(paper.drive_file_id) : undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 px-3 text-[13px] font-semibold text-ink-700 dark:border-ink-700 dark:text-ink-200"
            >
              {t('Open only')}
            </a>
          </div>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
            {t('Previous attempts')}
          </p>
          <ul className="space-y-1.5">
            {attempts.slice(0, 5).map((attempt) => {
              const percent = Math.round((attempt.score / attempt.total) * 100)
              return (
                <li
                  key={attempt.id}
                  className="flex items-center gap-2 rounded-xl border border-ink-200 px-2.5 py-1.5 dark:border-ink-700"
                >
                  <span
                    className={classNames(
                      'grid h-9 w-11 shrink-0 place-items-center rounded-lg text-[12.5px] font-bold',
                      percent >= 70
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : percent >= 45
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                          : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
                    )}
                  >
                    {attempt.score}/{attempt.total}
                  </span>
                  <span className="min-w-0 flex-1 text-[12px] text-ink-600 dark:text-ink-300">
                    <span className="font-semibold">{formatClock(attempt.seconds * 1000)}</span>
                    <span className="text-ink-400 dark:text-ink-500">
                      {' '}
                      · {formatDate(attempt.at)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttempt(attempt.id)}
                    aria-label={t('Remove this attempt')}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-1.5 text-[11px] text-ink-400 dark:text-ink-500">
            {t('Best {score} of {time} practised.', {
              score: Math.max(...attempts.map((a) => a.score)),
              time: formatDuration(attempts.reduce((sum, a) => sum + a.seconds, 0)),
            })}
          </p>
        </div>
      )}
    </Modal>
  )
}