import { useState } from 'react'
import { Modal } from './Modal'
import { TrashIcon } from './Icons'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onCancel()
      }}
      title={title}
      icon={<TrashIcon className="h-[18px] w-[18px]" />}
    >
      <p className="text-[13.5px] leading-relaxed text-ink-600 dark:text-ink-300">{message}</p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-10 flex-1 rounded-xl border border-ink-200 bg-white text-[13.5px] font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="h-10 flex-1 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
