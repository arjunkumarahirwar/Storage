import { useEffect, useMemo, useState } from 'react'
import { parseDriveLink, parseTagInput, splitTitleAndLink } from '../lib/drive'
import type { NewPaper, Paper, SourceType } from '../lib/types'
import { Modal } from './Modal'
import { AlertIcon, FileIcon, LoaderIcon, PlusIcon, XIcon } from './Icons'

interface AddResult {
  inserted: number
  failures: { title: string; message: string }[]
}

interface AddPapersPanelProps {
  open: boolean
  onClose: () => void
  categories: string[]
  editing: Paper | null
  onCreate: (rows: NewPaper[]) => Promise<AddResult>
  onUpdate: (id: string, patch: Partial<NewPaper>) => Promise<void>
  onToast: (message: string, tone: 'success' | 'error' | 'info') => void
}

const field =
  'h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500'
const labelClass = 'mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300'

interface ParsedRow {
  key: string
  title: string
  link: string
  fileId: string | null
  error?: string
}

export function AddPapersPanel({
  open,
  onClose,
  categories,
  editing,
  onCreate,
  onUpdate,
  onToast,
}: AddPapersPanelProps) {
  const [raw, setRaw] = useState('')
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({})
  const [category, setCategory] = useState('MP Police Constable Previous Papers')
  const [tags, setTags] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('own')
  const [sourceUrl, setSourceUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit mode fields
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editSourceType, setEditSourceType] = useState<SourceType>('own')
  const [editSourceUrl, setEditSourceUrl] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setEditTitle(editing.title)
      setEditCategory(editing.category)
      setEditTags(editing.tags.join(', '))
      setEditSourceType(editing.source_type)
      setEditSourceUrl(editing.source_url ?? '')
    } else {
      setRaw('')
      setTitleOverrides({})
      setTags('')
      setSourceType('own')
      setSourceUrl('')
      setCategory((current) => current || 'MP Police Constable Previous Papers')
    }
  }, [open, editing])

  const rows = useMemo<ParsedRow[]>(() => {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const { title, link } = splitTitleAndLink(line)
        const { fileId, error: parseError } = parseDriveLink(link)
        return { key: `${index}-${link}`, title, link, fileId, error: parseError }
      })
  }, [raw])

  const effectiveRows = rows.map((row) => ({
    ...row,
    title: (titleOverrides[row.key] ?? row.title).trim(),
  }))

  const idCounts = effectiveRows.reduce<Record<string, number>>((acc, row) => {
    if (row.fileId) acc[row.fileId] = (acc[row.fileId] ?? 0) + 1
    return acc
  }, {})

  const addProblem = (() => {
    if (!effectiveRows.length) return null
    if (effectiveRows.some((row) => !row.fileId)) return 'Fix the links marked in red first.'
    if (effectiveRows.some((row) => !row.title)) return 'Every paper needs a title.'
    if (effectiveRows.some((row) => row.fileId && idCounts[row.fileId] > 1))
      return 'The same Drive file appears twice.'
    if (!category.trim()) return 'Pick a folder name.'
    if (sourceType === 'official' && !/^https:\/\/\S+$/i.test(sourceUrl.trim()))
      return 'Official sources need an https:// link.'
    return null
  })()

  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!effectiveRows.length) {
      setError('Paste at least one Google Drive link.')
      return
    }
    if (addProblem) {
      setError(addProblem)
      return
    }

    const payload: NewPaper[] = effectiveRows.map((row) => ({
      title: row.title.slice(0, 180),
      drive_file_id: row.fileId as string,
      category: category.trim().slice(0, 60),
      tags: parseTagInput(tags),
      source_type: sourceType,
      source_url: sourceType === 'official' ? sourceUrl.trim() : null,
    }))

    setBusy(true)
    try {
      const result = await onCreate(payload)
      if (result.inserted > 0) {
        onToast(
          `${result.inserted} ${result.inserted === 1 ? 'paper' : 'papers'} added to the library.`,
          'success',
        )
      }
      if (result.failures.length) {
        const first = result.failures[0]
        onToast(
          result.failures.length === 1
            ? `${first.title}: ${first.message}`
            : `${result.failures.length} links were skipped — ${first.title}: ${first.message}`,
          'error',
        )
        if (result.inserted === 0) setError(result.failures[0].message)
      }
      if (result.inserted > 0) {
        setRaw('')
        setTitleOverrides({})
        onClose()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save those papers.')
    } finally {
      setBusy(false)
    }
  }

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setError(null)
    if (!editTitle.trim()) {
      setError('The title cannot be empty.')
      return
    }
    if (editSourceType === 'official' && !/^https:\/\/\S+$/i.test(editSourceUrl.trim())) {
      setError('Official sources need an https:// link.')
      return
    }
    setBusy(true)
    try {
      await onUpdate(editing.id, {
        title: editTitle.trim().slice(0, 180),
        category: editCategory.trim().slice(0, 60) || 'Previous papers',
        tags: parseTagInput(editTags),
        source_type: editSourceType,
        source_url: editSourceType === 'official' ? editSourceUrl.trim() : null,
      })
      onToast('Paper updated.', 'success')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this paper.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'Edit paper' : 'Add PDFs'}
      description={
        editing
          ? 'Change the title, folder, tags or source for this paper.'
          : 'Paste Google Drive links — one per line. Add a title before a pipe: Title | link.'
      }
      icon={editing ? <FileIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
    >
      {editing ? (
        <form onSubmit={submitEdit} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="edit-title">
              Title
            </label>
            <input
              id="edit-title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className={field}
              maxLength={180}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-category">
              Folder
            </label>
            <input
              id="edit-category"
              value={editCategory}
              onChange={(event) => setEditCategory(event.target.value)}
              list="category-options"
              className={field}
              maxLength={60}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-tags">
              Tags (comma separated)
            </label>
            <input
              id="edit-tags"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
              placeholder="Shift 1, 2023, Solutions"
              className={field}
            />
          </div>
          <SourceFields
            type={editSourceType}
            url={editSourceUrl}
            onTypeChange={setEditSourceType}
            onUrlChange={setEditSourceUrl}
          />
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px] text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
            Drive file id: <span className="font-mono">{editing.drive_file_id}</span>
          </p>
          <FormError message={error} />
          <Actions busy={busy} submitLabel="Save changes" onCancel={onClose} />
        </form>
      ) : (
        <form onSubmit={submitAdd} className="space-y-3.5">
          <div>
            <label className={labelClass} htmlFor="links">
              Drive links
            </label>
            <textarea
              id="links"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value)
                setTitleOverrides({})
              }}
              rows={4}
              spellCheck={false}
              placeholder={
                'MP Police Constable 2023 Shift 1 | https://drive.google.com/file/d/…/view?usp=sharing\nhttps://drive.google.com/file/d/…/view'
              }
              className="w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500"
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
              In Google Drive: right-click the PDF → Share → “Anyone with the link” → Copy
              link. Folder links will not work.
            </p>
          </div>

          {effectiveRows.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-ink-200 bg-ink-50/60 p-2.5 dark:border-ink-700 dark:bg-ink-800/40">
              <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {effectiveRows.length} {effectiveRows.length === 1 ? 'link' : 'links'} found
              </p>
              {effectiveRows.map((row) => {
                const duplicate = row.fileId ? idCounts[row.fileId] > 1 : false
                const invalid = !row.fileId || duplicate
                return (
                  <div
                    key={row.key}
                    className={[
                      'rounded-xl border bg-white p-2 dark:bg-ink-900',
                      invalid ? 'border-brand-300 dark:border-brand-500/40' : 'border-ink-200 dark:border-ink-700',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        value={titleOverrides[row.key] ?? row.title}
                        onChange={(event) =>
                          setTitleOverrides((current) => ({
                            ...current,
                            [row.key]: event.target.value,
                          }))
                        }
                        placeholder="Paper title (required)"
                        aria-label="Paper title"
                        className="h-8 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 text-[12.5px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                      />
                      <button
                        type="button"
                        aria-label="Remove link"
                        onClick={() => {
                          const remaining = effectiveRows
                            .filter((item) => item.key !== row.key)
                            .map((item) => (item.title ? `${item.title} | ${item.link}` : item.link))
                          setRaw(remaining.join('\n'))
                          setTitleOverrides({})
                        }}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p
                      className={[
                        'mt-1 truncate px-1 font-mono text-[10.5px]',
                        invalid ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400',
                      ].join(' ')}
                    >
                      {row.error ?? (duplicate ? 'Duplicate file in this batch' : row.fileId)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="category">
                Folder
              </label>
              <input
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                list="category-options"
                className={field}
                maxLength={60}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tags">
                Tags
              </label>
              <input
                id="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Shift 1, 2023"
                className={field}
              />
            </div>
          </div>

          <datalist id="category-options">
            {categories.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>

          <SourceFields
            type={sourceType}
            url={sourceUrl}
            onTypeChange={setSourceType}
            onUrlChange={setSourceUrl}
          />

          <FormError message={error} />
          <Actions busy={busy} submitLabel="Add to library" onCancel={onClose} />
        </form>
      )}
    </Modal>
  )
}

function SourceFields({
  type,
  url,
  onTypeChange,
  onUrlChange,
}: {
  type: SourceType
  url: string
  onTypeChange: (value: SourceType) => void
  onUrlChange: (value: string) => void
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-2.5 dark:border-ink-700">
      <p className="mb-2 text-[12px] font-semibold text-ink-600 dark:text-ink-300">Source</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            { value: 'own', label: 'Own work' },
            { value: 'official', label: 'Official ESB page' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onTypeChange(option.value)}
            className={[
              'rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition',
              type === option.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-200'
                : 'border-ink-200 text-ink-500 hover:border-ink-300 dark:border-ink-700 dark:text-ink-400',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
      {type === 'official' && (
        <input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://esb.mp.gov.in/…"
          aria-label="Official source link"
          className={`${field} mt-2`}
        />
      )}
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="flex items-start gap-1.5 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
      <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {message}
    </p>
  )
}

function Actions({
  busy,
  submitLabel,
  onCancel,
}: {
  busy: boolean
  submitLabel: string
  onCancel: () => void
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
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
        {submitLabel}
      </button>
    </div>
  )
}
