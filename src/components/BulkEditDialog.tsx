import { useEffect, useState } from 'react'
import { parseTagInput } from '../lib/drive'
import type { BulkPatch } from '../lib/types'
import { AlertIcon, LayersIcon, LoaderIcon } from './Icons'
import { Modal } from './Modal'

interface BulkEditDialogProps {
  open: boolean
  count: number
  categories: string[]
  onClose: () => void
  onApply: (patch: BulkPatch) => Promise<void>
  onSuccess: (message: string) => void
}

const field =
  'h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500'
const labelClass = 'mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300'

/**
 * One change set for many cards. Every field is "leave it alone unless you
 * fill it in", so nothing is overwritten by accident.
 */
export function BulkEditDialog({
  open,
  count,
  categories,
  onClose,
  onApply,
  onSuccess,
}: BulkEditDialogProps) {
  const [folder, setFolder] = useState('')
  const [addTags, setAddTags] = useState('')
  const [removeTags, setRemoveTags] = useState('')
  const [year, setYear] = useState('')
  const [clearYear, setClearYear] = useState(false)
  const [shift, setShift] = useState('keep')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFolder('')
    setAddTags('')
    setRemoveTags('')
    setYear('')
    setClearYear(false)
    setShift('keep')
    setError(null)
  }, [open])

  const buildPatch = (): BulkPatch | string => {
    const patch: BulkPatch = {}
    const trimmedFolder = folder.trim()
    if (trimmedFolder) patch.category = trimmedFolder.slice(0, 60)
    const add = parseTagInput(addTags)
    if (add.length) patch.addTags = add
    const remove = parseTagInput(removeTags)
    if (remove.length) patch.removeTags = remove
    if (clearYear) patch.examYear = null
    else if (year.trim()) {
      const value = Number(year)
      if (!Number.isInteger(value) || value < 1990 || value > 2100) {
        return 'The exam year should be between 1990 and 2100.'
      }
      patch.examYear = value
    }
    if (shift !== 'keep') patch.examShift = shift === 'none' ? null : Number(shift)

    if (Object.keys(patch).length === 0) return 'Fill in at least one field to change.'
    if (patch.addTags && patch.removeTags) {
      const removing = new Set(patch.removeTags.map((tag) => tag.toLowerCase()))
      if (patch.addTags.some((tag) => removing.has(tag.toLowerCase()))) {
        return 'A tag cannot be both added and removed.'
      }
    }
    return patch
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = buildPatch()
    if (typeof result === 'string') {
      setError(result)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onApply(result)
      onSuccess(`${count} ${count === 1 ? 'paper' : 'papers'} updated.`)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save those changes.')
    } finally {
      setBusy(false)
    }
  }

  const tagCount = parseTagInput(addTags).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${count} ${count === 1 ? 'paper' : 'papers'}`}
      description="Only the fields you fill in change — everything else on these cards stays as it is."
      icon={<LayersIcon className="h-4 w-4" />}
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="bulk-folder">
            Move to folder
          </label>
          <input
            id="bulk-folder"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            list="bulk-category-options"
            placeholder="Leave blank to keep the current folder"
            className={field}
            maxLength={60}
          />
          <datalist id="bulk-category-options">
            {categories.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="bulk-add-tags">
              Add tags
            </label>
            <input
              id="bulk-add-tags"
              value={addTags}
              onChange={(event) => setAddTags(event.target.value)}
              placeholder="Shift 2, 2025"
              className={field}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="bulk-remove-tags">
              Remove tags
            </label>
            <input
              id="bulk-remove-tags"
              value={removeTags}
              onChange={(event) => setRemoveTags(event.target.value)}
              placeholder="Solutions"
              className={field}
            />
          </div>
        </div>
        {tagCount > 0 && (
          <p className="-mt-1 text-[11.5px] text-ink-400 dark:text-ink-500">
            {tagCount === 1 ? 'One tag' : `${tagCount} tags`} added to each card; existing
            tags are kept, and spelling is tidied as usual.
          </p>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="bulk-year">
              Exam year
            </label>
            <input
              id="bulk-year"
              type="number"
              inputMode="numeric"
              min={1990}
              max={2100}
              value={year}
              disabled={clearYear}
              onChange={(event) => setYear(event.target.value.slice(0, 4))}
              placeholder="Leave blank to keep"
              className={`${field} disabled:opacity-50`}
            />
            <label className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500 dark:text-ink-400">
              <input
                type="checkbox"
                checked={clearYear}
                onChange={(event) => {
                  setClearYear(event.target.checked)
                  if (event.target.checked) setYear('')
                }}
                className="h-3.5 w-3.5 rounded border-ink-300 accent-brand-600"
              />
              Clear the year on these papers
            </label>
          </div>
          <div>
            <label className={labelClass} htmlFor="bulk-shift">
              Shift
            </label>
            <select
              id="bulk-shift"
              value={shift}
              onChange={(event) => setShift(event.target.value)}
              className={field}
            >
              <option value="keep">Keep each shift</option>
              <option value="none">No shift</option>
              <option value="1">Shift 1</option>
              <option value="2">Shift 2</option>
              <option value="3">Shift 3</option>
              <option value="4">Shift 4</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-1.5 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 flex-1 rounded-xl border border-ink-200 bg-white text-[13.5px] font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <LoaderIcon className="h-4 w-4" />}
            Apply to {count}
          </button>
        </div>
      </form>
    </Modal>
  )
}
