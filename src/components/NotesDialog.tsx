import { useEffect, useState } from 'react'
import { NoteIcon } from './Icons'
import { Modal } from './Modal'
import { classNames } from '../lib/format'
import { DIFFICULTIES } from '../lib/types'
import type { Difficulty, NoteEntry, Paper } from '../lib/types'

interface NotesDialogProps {
  open: boolean
  paper: Paper | null
  entry: NoteEntry | undefined
  onClose: () => void
  onSave: (paperId: string, entry: NoteEntry) => Promise<void>
  onSuccess: (message: string) => void
}

export function NotesDialog({
  open,
  paper,
  entry,
  onClose,
  onSave,
  onSuccess,
}: NotesDialogProps) {
  const [note, setNote] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNote(entry?.note ?? '')
    setDifficulty(entry?.difficulty ?? null)
    setError(null)
  }, [open, paper?.id, entry])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!paper) return
    setBusy(true)
    setError(null)
    try {
      await onSave(paper.id, { note, difficulty })
      onSuccess(!note.trim() && !difficulty ? 'Note cleared.' : 'Saved — only you can see this.')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the note.')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    if (!paper) return
    setBusy(true)
    setError(null)
    try {
      await onSave(paper.id, { note: '', difficulty: null })
      onSuccess('Note cleared.')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not clear the note.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your notes"
      description="Private to you — a reminder of what to revise, and how hard this paper felt."
      icon={<NoteIcon className="h-4 w-4" />}
    >
      <form onSubmit={save} className="space-y-3">
        {paper && (
          <p className="truncate rounded-xl bg-ink-50 px-3 py-2 text-[12.5px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {paper.title}
          </p>
        )}

        <div>
          <p className="mb-1 text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            How did it feel?
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {DIFFICULTIES.map((option) => {
              const active = difficulty === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDifficulty(active ? null : option.value)}
                  className={classNames(
                    'rounded-xl border px-2 py-2 text-center transition',
                    active
                      ? option.value === 'easy'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : option.value === 'hard'
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400',
                  )}
                >
                  <span className="block text-[13px] font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-tight opacity-80">
                    {option.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            Note
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 2000))}
            rows={5}
            maxLength={2000}
            placeholder="Sectional cut-offs, silly mistakes, topics to revise…"
            className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13.5px] leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500"
          />
          <span className="mt-0.5 block text-right text-[10.5px] text-ink-400 dark:text-ink-500">
            {note.length}/2000
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {(entry?.note || entry?.difficulty) && (
            <button
              type="button"
              onClick={() => void clear()}
              disabled={busy}
              className="h-11 rounded-xl border border-ink-200 px-3 text-[13px] font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
