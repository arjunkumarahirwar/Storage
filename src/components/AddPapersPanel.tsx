import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import {
  driveViewUrl,
  parseDriveLink,
  parseTagInput,
  splitPaperLine,
} from '../lib/drive'
import { checkAgainstLibrary } from '../lib/duplicates'
import type { NewPaper, Paper, SourceType } from '../lib/types'
import { Modal } from './Modal'
import { AlertIcon, FileIcon, LinkIcon, LoaderIcon, PlusIcon, XIcon } from './Icons'

interface AddResult {
  inserted: number
  failures: { title: string; message: string }[]
}

interface AddPapersPanelProps {
  open: boolean
  onClose: () => void
  categories: string[]
  editing: Paper | null
  /** The whole library, so a paste can be checked for duplicates before saving. */
  existing: Paper[]
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
  /** Optional third pipe part: the answer key's Drive link. */
  answerLink: string
  answerFileId: string | null
  answerError?: string
  error?: string
}

export function AddPapersPanel({
  open,
  onClose,
  categories,
  editing,
  existing,
  onCreate,
  onUpdate,
  onToast,
}: AddPapersPanelProps) {
  const { t } = useI18n()
  const [raw, setRaw] = useState('')
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({})
  /** Per-row answer-key links, keyed the same way as titleOverrides. */
  const [keyOverrides, setKeyOverrides] = useState<Record<string, string>>({})
  const [category, setCategory] = useState('MP Police Constable Previous Papers')
  const [tags, setTags] = useState('')
  const [year, setYear] = useState('')
  const [shift, setShift] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('own')
  const [sourceUrl, setSourceUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** The admin has seen the "same title already exists" note and means it. */
  const [acknowledgeTitles, setAcknowledgeTitles] = useState(false)

  // Edit mode fields
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editSourceType, setEditSourceType] = useState<SourceType>('own')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [editKeyLink, setEditKeyLink] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editShift, setEditShift] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setEditTitle(editing.title)
      setEditCategory(editing.category)
      setEditTags(editing.tags.join(', '))
      setEditSourceType(editing.source_type)
      setEditSourceUrl(editing.source_url ?? '')
      setEditKeyLink(
        editing.solution_file_id ? driveViewUrl(editing.solution_file_id) : '',
      )
      setEditYear(editing.exam_year ? String(editing.exam_year) : '')
      setEditShift(editing.exam_shift ? String(editing.exam_shift) : '')
    } else {
      setRaw('')
      setTitleOverrides({})
      setAcknowledgeTitles(false)
      setTags('')
      setYear('')
      setShift('')
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
        const { title, link, answerLink } = splitPaperLine(line)
        const { fileId, error: parseError } = parseDriveLink(link)
        const { fileId: answerFileId, error: answerError } = parseDriveLink(answerLink)
        return {
          key: `${index}-${link}`,
          title,
          link,
          fileId,
          answerLink,
          answerFileId,
          answerError: answerLink ? answerError : undefined,
          error: parseError,
        }
      })
  }, [raw])

  const effectiveRows = rows.map((row) => {
    const answerLink = (keyOverrides[row.key] ?? row.answerLink).trim()
    const parsedAnswer = answerLink ? parseDriveLink(answerLink) : { fileId: null }
    const title = (titleOverrides[row.key] ?? row.title).trim()
    const answerFileId = parsedAnswer.fileId
    return {
      ...row,
      title,
      answerLink,
      answerFileId,
      answerError:
        answerLink && !parsedAnswer.fileId
          ? ('error' in parsedAnswer ? parsedAnswer.error : undefined) ??
            'Could not find a file id in this link.'
          : undefined,
      // Same Drive file as a card already in the library? Same title?
      library: checkAgainstLibrary({ title, fileId: row.fileId, answerFileId }, existing, undefined, t),
    }
  })

  const softDuplicates = effectiveRows.filter((row) => row.library.warning)

  const idCounts = effectiveRows.reduce<Record<string, number>>((acc, row) => {
    for (const id of [row.fileId, row.answerFileId]) {
      if (id) acc[id] = (acc[id] ?? 0) + 1
    }
    return acc
  }, {})

  const addProblem = (() => {
    if (!effectiveRows.length) return null
    if (effectiveRows.some((row) => !row.fileId)) return t('Fix the links marked in red first.')
    if (effectiveRows.some((row) => !row.title)) return t('Every paper needs a title.')
    if (effectiveRows.some((row) => row.fileId && idCounts[row.fileId] > 1))
      return t('The same Drive file appears twice.')
    const badKey = effectiveRows.find((row) => row.answerLink && !row.answerFileId)
    if (badKey)
      return t(
        'The answer key link for “{title}” is not a Google Drive file link.',
        { title: badKey.title || t('this paper') },
      )
    if (effectiveRows.some((row) => row.answerFileId && idCounts[row.answerFileId] > 1))
      return t('An answer key is the same file as a question paper. Attach a different PDF.')
    const blocked = effectiveRows.find((row) => row.library.blocked)
    if (blocked)
      return `${blocked.title || t('This link')}: ${blocked.library.blocked}`
    if (softDuplicates.length && !acknowledgeTitles)
      return t(
        'Some titles match a paper already in the library. Tick “add anyway” below, or change the titles.',
      )
    if (!category.trim()) return t('Pick a folder name.')
    if (sourceType === 'official' && !/^https:\/\/\S+$/i.test(sourceUrl.trim()))
      return t('Official sources need an https:// link.')
    return null
  })()

  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!effectiveRows.length) {
      setError(t('Paste at least one Google Drive link.'))
      return
    }
    if (addProblem) {
      setError(addProblem)
      return
    }

    const folder = category.trim().slice(0, 60)
    const sharedTags = parseTagInput(tags)
    const payload: NewPaper[] = []
    let answerKeyCount = 0

    for (const row of effectiveRows) {
      // The answer key rides along on the paper row as a plain Drive file id:
      // it needs no folder, title or tags of its own, and it never shows up as
      // a second card in the list.
      if (row.answerFileId) answerKeyCount += 1

      payload.push({
        title: row.title.slice(0, 180),
        drive_file_id: row.fileId as string,
        category: folder,
        tags: sharedTags,
        source_type: sourceType,
        source_url: sourceType === 'official' ? sourceUrl.trim() : null,
        exam_year: year ? Number(year) : null,
        exam_shift: shift ? Number(shift) : null,
        solution_file_id: row.answerFileId ?? null,
      })
    }

    setBusy(true)
    try {
      const result = await onCreate(payload)
      if (result.inserted > 0) {
        const paperCount = result.inserted
        const pieces = [
          t(paperCount === 1 ? '{count} paper' : '{count} papers', { count: paperCount }),
        ]
        if (answerKeyCount > 0) {
          pieces.push(
            answerKeyCount === 1
              ? t('an answer key')
              : t('{count} answer keys', { count: answerKeyCount }),
          )
        }
        onToast(t('{pieces} added to the library.', { pieces: pieces.join(` ${t('with')} `) }), 'success')
      }
      if (result.failures.length) {
        const first = result.failures[0]
        onToast(
          result.failures.length === 1
            ? `${first.title}: ${first.message}`
            : t('{count} links were skipped — {title}: {message}', {
                count: result.failures.length,
                title: first.title,
                message: first.message,
              }),
          'error',
        )
        if (result.inserted === 0) setError(result.failures[0].message)
      }
      if (result.inserted > 0) {
        setRaw('')
        setTitleOverrides({})
        setKeyOverrides({})
        onClose()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Could not save those papers.'))
    } finally {
      setBusy(false)
    }
  }

  const parsedEditKey = editKeyLink.trim() ? parseDriveLink(editKeyLink.trim()) : { fileId: null }
  const editLibraryCheck = editing
    ? checkAgainstLibrary(
        { title: editTitle, fileId: null, answerFileId: parsedEditKey.fileId },
        existing,
        editing.id,
        t,
      )
    : {}

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setError(null)
    if (!editTitle.trim()) {
      setError(t('The title cannot be empty.'))
      return
    }
    if (editSourceType === 'official' && !/^https:\/\/\S+$/i.test(editSourceUrl.trim())) {
      setError(t('Official sources need an https:// link.'))
      return
    }
    const keyLink = editKeyLink.trim()
    const parsedKey = keyLink ? parseDriveLink(keyLink) : { fileId: null }
    if (keyLink && !parsedKey.fileId) {
      setError(t('That answer key link is not a Google Drive file link.'))
      return
    }
    if (editLibraryCheck.blocked) {
      setError(editLibraryCheck.blocked)
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
        solution_file_id: parsedKey.fileId ?? null,
        // Attaching a link in the form retires any older card-based link.
        ...(parsedKey.fileId ? { solution_paper_id: null } : {}),
        exam_year: editYear ? Number(editYear) : null,
        exam_shift: editShift ? Number(editShift) : null,
      })
      onToast(t('Paper updated.'), 'success')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Could not update this paper.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? t('Edit paper') : t('Add PDFs')}
      description={
        editing
          ? t('Change the title, folder, tags or source for this paper.')
          : t(
              'Paste Google Drive links — one per line. Add a title before a pipe: Title | link.',
            )
      }
      icon={editing ? <FileIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
    >
      {editing ? (
        <form onSubmit={submitEdit} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="edit-title">
              {t('Title')}
            </label>
            <input
              id="edit-title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className={field}
              maxLength={180}
            />
            {editLibraryCheck.warning && (
              <p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-medium text-amber-700 dark:text-amber-400">
                <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {editLibraryCheck.warning}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-category">
              {t('Folder')}
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
              {t('Tags (comma separated)')}
            </label>
            <input
              id="edit-tags"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
              placeholder={t('Shift 1, 2023, Solutions')}
              className={field}
            />
          </div>
          <ExamFields
            idPrefix="edit"
            year={editYear}
            shift={editShift}
            onYear={setEditYear}
            onShift={setEditShift}
            autoHint={false}
          />
          <div>
            <label className={labelClass} htmlFor="edit-key-link">
              {t('Answer key link (optional)')}
            </label>
            <input
              id="edit-key-link"
              value={editKeyLink}
              onChange={(event) => setEditKeyLink(event.target.value)}
              placeholder="https://drive.google.com/file/d/…"
              spellCheck={false}
              className={field}
            />
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
              {t(
                "Paste the answer key PDF's Drive link. It needs no folder, title or tags — the paper's green “Answer key” button opens it.",
              )}
            </p>
            {editLibraryCheck.blocked && (
              <p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-semibold text-danger-700 dark:text-danger-300">
                <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {editLibraryCheck.blocked}
              </p>
            )}
          </div>

          <SourceFields
            type={editSourceType}
            url={editSourceUrl}
            onTypeChange={setEditSourceType}
            onUrlChange={setEditSourceUrl}
          />
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px] text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
            {t('Drive file id:')} <span className="font-mono">{editing.drive_file_id}</span>
          </p>
          <FormError message={error} />
          <Actions busy={busy} submitLabel={t('Save changes')} onCancel={onClose} />
        </form>
      ) : (
        <form onSubmit={submitAdd} className="space-y-3.5">
          <div>
            <label className={labelClass} htmlFor="links">
              {t('Drive links')}
            </label>
            <textarea
              id="links"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value)
                setTitleOverrides({})
                setKeyOverrides({})
              }}
              rows={4}
              spellCheck={false}
              placeholder={
                'MP Police Constable 2023 Shift 1 | https://drive.google.com/file/d/…/view?usp=sharing\nhttps://drive.google.com/file/d/…/view'
              }
              className="w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500"
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
              {t(
                'In Google Drive: right-click the PDF → Share → “Anyone with the link” → Copy link. Folder links will not work.',
              )}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-700 dark:text-emerald-400">
              {t('Got the answer key too? Paste it in the')}{' '}
              <span className="font-semibold">{t('Answer key')}</span>{' '}
              {t('field under each row below, or put it on the same line as a third part:')}{' '}
              <span className="font-mono text-[11px]">
                Title | paper link | answer key link
              </span>
            </p>
          </div>

          {effectiveRows.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-ink-200 bg-ink-50/60 p-2.5 dark:border-ink-700 dark:bg-ink-800/40">
              <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {t(effectiveRows.length === 1 ? '{count} link found' : '{count} links found', {
                  count: effectiveRows.length,
                })}
              </p>
              {effectiveRows.map((row) => {
                const duplicate = row.fileId ? idCounts[row.fileId] > 1 : false
                const invalid = !row.fileId || duplicate
                return (
                  <div
                    key={row.key}
                    className={[
                      'rounded-xl border bg-white p-2 dark:bg-ink-900',
                      invalid ? 'border-danger-300 dark:border-danger-500/40' : 'border-ink-200 dark:border-ink-700',
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
                        placeholder={t('Paper title (required)')}
                        aria-label={t('Paper title')}
                        className="h-8 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 text-[12.5px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-white"
                      />
                      <button
                        type="button"
                        aria-label={t('Remove link')}
                        onClick={() => {
                          const remaining = effectiveRows
                            .filter((item) => item.key !== row.key)
                            .map((item) => {
                              const parts = [item.title, item.link]
                              if (item.answerLink) parts.push(item.answerLink)
                              return item.title || item.answerLink
                                ? parts.join(' | ')
                                : item.link
                            })
                          setRaw(remaining.join('\n'))
                          setTitleOverrides({})
                          setKeyOverrides({})
                        }}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-500/15"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p
                      className={[
                        'mt-1 truncate px-1 font-mono text-[10.5px]',
                        invalid || row.library.blocked
                          ? 'text-danger-600 dark:text-danger-300'
                          : 'text-ink-400',
                      ].join(' ')}
                    >
                      {row.error
                        ? t(row.error)
                        : duplicate
                          ? t('Duplicate file in this batch')
                          : row.fileId}
                    </p>
                    {row.library.blocked && (
                      <p className="mt-0.5 flex items-start gap-1 px-1 text-[10.5px] font-semibold text-danger-700 dark:text-danger-300">
                        <AlertIcon className="mt-px h-3 w-3 shrink-0" /> {row.library.blocked}
                      </p>
                    )}
                    {!row.library.blocked && row.library.warning && (
                      <p className="mt-0.5 flex items-start gap-1 px-1 text-[10.5px] font-medium text-amber-700 dark:text-amber-400">
                        <AlertIcon className="mt-px h-3 w-3 shrink-0" /> {row.library.warning}
                      </p>
                    )}

                                        <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3 shrink-0 text-emerald-500" />
                        <input
                          value={row.answerLink}
                          onChange={(event) =>
                            setKeyOverrides((current) => ({
                              ...current,
                              [row.key]: event.target.value,
                            }))
                          }
                          placeholder={t('Answer key Drive link (optional)')}
                          aria-label={t('Answer key Drive link')}
                          spellCheck={false}
                          className={[
                            'h-7 min-w-0 flex-1 rounded-lg border px-2 font-mono text-[10.5px] text-ink-800 placeholder:font-sans placeholder:text-ink-400 focus:outline-none focus:ring-2 dark:bg-ink-800 dark:text-ink-100',
                            row.answerError
                              ? 'border-danger-300 bg-white focus:ring-danger-500/20 dark:border-danger-500/50'
                              : row.answerFileId
                                ? 'border-emerald-300 bg-emerald-50/60 focus:ring-emerald-500/20 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                                : 'border-dashed border-ink-300 bg-white focus:ring-emerald-500/20 dark:border-ink-600 dark:bg-ink-800',
                          ].join(' ')}
                        />
                        {row.answerLink && (
                          <button
                            type="button"
                            aria-label={t('Remove answer key')}
                            onClick={() =>
                              setKeyOverrides((current) => ({ ...current, [row.key]: '' }))
                            }
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-500/15"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {row.answerError ? (
                        <p className="mt-0.5 px-1 text-[10.5px] font-medium text-danger-600 dark:text-danger-300">
                          {t(row.answerError)}
                        </p>
                      ) : row.answerFileId ? (
                        <p className="mt-0.5 px-1 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400">
                          {t(
                            "✓ Answer key attached — students open it from this paper's green “Answer key” button. No extra card, folder, title or tags.",
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="category">
                {t('Folder')}
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
                {t('Tags')}
              </label>
              <input
                id="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder={t('Shift 1, 2023')}
                className={field}
              />
            </div>
          </div>

          <ExamFields
            idPrefix="add"
            year={year}
            shift={shift}
            onYear={setYear}
            onShift={setShift}
            autoHint
          />

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

          {softDuplicates.length > 0 && !effectiveRows.some((row) => row.library.blocked) && (
            <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <input
                type="checkbox"
                checked={acknowledgeTitles}
                onChange={(event) => setAcknowledgeTitles(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-300 accent-amber-600"
              />
              <span>
                {t(
                  softDuplicates.length === 1
                    ? 'One title matches a paper already in the library.'
                    : '{count} titles match papers already in the library.',
                  { count: softDuplicates.length },
                )}{' '}
                {t('Add them anyway.')}
              </span>
            </label>
          )}

          <FormError message={error} />
          <Actions busy={busy} submitLabel={t('Add to library')} onCancel={onClose} />
        </form>
      )}
    </Modal>
  )
}

function ExamFields({
  idPrefix,
  year,
  shift,
  onYear,
  onShift,
  autoHint,
}: {
  idPrefix: string
  year: string
  shift: string
  onYear: (value: string) => void
  onShift: (value: string) => void
  autoHint: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-year`}>
          {t('Exam year')}{' '}
          <span className="font-normal text-ink-400 dark:text-ink-500">{t('(optional)')}</span>
        </label>
        <input
          id={`${idPrefix}-year`}
          type="number"
          inputMode="numeric"
          min={1990}
          max={2100}
          value={year}
          onChange={(event) => onYear(event.target.value.slice(0, 4))}
          placeholder={autoHint ? t('Read from the title') : t('Not set')}
          className={field}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-shift`}>
          {t('Shift')}
        </label>
        <select
          id={`${idPrefix}-shift`}
          value={shift}
          onChange={(event) => onShift(event.target.value)}
          className={field}
        >
          <option value="">{autoHint ? t('Read from the title') : t('No shift')}</option>
          <option value="1">{t('Shift 1')}</option>
          <option value="2">{t('Shift 2')}</option>
          <option value="3">{t('Shift 3')}</option>
          <option value="4">{t('Shift 4')}</option>
        </select>
      </div>
      {autoHint && (
        <p className="text-[11.5px] leading-relaxed text-ink-400 sm:col-span-2 dark:text-ink-500">
          {t(
            'Leave both blank and the year and shift are picked out of titles like “07 Nov 2025 Shift 2”. Fill them in only when the title does not say.',
          )}
        </p>
      )}
    </div>
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
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-ink-200 p-2.5 dark:border-ink-700">
      <p className="mb-2 text-[12px] font-semibold text-ink-600 dark:text-ink-300">
        {t('Source')}
      </p>
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
                ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500/50 dark:bg-sky-500/15 dark:text-sky-200'
                : 'border-ink-200 text-ink-500 hover:border-ink-300 dark:border-ink-700 dark:text-ink-400',
            ].join(' ')}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
      {type === 'official' && (
        <input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://esb.mp.gov.in/…"
          aria-label={t('Official source link')}
          className={`${field} mt-2`}
        />
      )}
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="flex items-start gap-1.5 rounded-xl bg-danger-50 px-2.5 py-2 text-[12.5px] font-medium text-danger-700 dark:bg-danger-500/10 dark:text-danger-300">
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
  const { t } = useI18n()
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="h-10 flex-1 rounded-xl border border-ink-200 bg-white text-[13.5px] font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
      >
        {t('Cancel')}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 text-[13.5px] font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
      >
        {busy && <LoaderIcon className="h-4 w-4" />}
        {submitLabel}
      </button>
    </div>
  )
}
