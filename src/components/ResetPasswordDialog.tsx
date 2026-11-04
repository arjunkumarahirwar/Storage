import { useState } from 'react'
import { Modal } from './Modal'
import { AlertIcon, LoaderIcon, LockIcon } from './Icons'

interface ResetPasswordDialogProps {
  open: boolean
  onClose: () => void
  onSave: (password: string) => Promise<void>
  onSuccess: (message: string) => void
}

const inputClass =
  'h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500'

export function ResetPasswordDialog({
  open,
  onClose,
  onSave,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Use at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await onSave(password)
      onSuccess('Password updated — you are signed in.')
      setPassword('')
      setConfirm('')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose a new password"
      description="You opened a password reset link. Set a new password for your account."
      icon={<LockIcon className="h-4 w-4" />}
    >
      <form onSubmit={submit} className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            New password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            Repeat password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Type it again"
            className={inputClass}
          />
        </label>

        {error && (
          <p className="flex items-start gap-1.5 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy && <LoaderIcon className="h-4 w-4" />}
          Save new password
        </button>
      </form>
    </Modal>
  )
}
