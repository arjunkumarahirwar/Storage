import { useState } from 'react'
import { Modal } from './Modal'
import { AlertIcon, LoaderIcon, LockIcon } from './Icons'

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<{ needsEmailConfirm: boolean }>
  onMagicLink: (email: string) => Promise<void>
  onSuccess: (message: string) => void
}

const inputClass =
  'h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500'

export function AuthDialog({
  open,
  onClose,
  onSignIn,
  onSignUp,
  onMagicLink,
  onSuccess,
}: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'password' | 'magic' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reset = () => {
    setPassword('')
    setError(null)
    setNotice(null)
    setBusy(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const withPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy('password')
    try {
      if (mode === 'signin') {
        await onSignIn(email, password)
        onSuccess('Signed in — welcome back.')
        close()
      } else {
        const { needsEmailConfirm } = await onSignUp(email, password)
        if (needsEmailConfirm) {
          setNotice('Account created. Check your inbox to confirm your email, then sign in.')
        } else {
          onSuccess('Account created — you are signed in.')
          close()
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const withMagicLink = async () => {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    setBusy('magic')
    try {
      await onMagicLink(email)
      setNotice(`Sign-in link sent to ${email.trim()}. Open it on this device to finish signing in.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the link.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === 'signin' ? 'Sign in' : 'Create an account'}
      description="Students can track progress without an account. Sign in to keep your Done marks on every device — or as the library admin, to add and delete papers."
      icon={<LockIcon className="h-4 w-4" />}
    >
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
        {(['signin', 'signup'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value)
              setError(null)
              setNotice(null)
            }}
            className={[
              'rounded-lg py-1.5 text-[13px] font-semibold transition',
              mode === value
                ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
            ].join(' ')}
          >
            {value === 'signin' ? 'Sign in' : 'New account'}
          </button>
        ))}
      </div>

      <form onSubmit={withPassword} className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            Password
          </span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            className={inputClass}
          />
        </label>

        {error && (
          <p className="flex items-start gap-1.5 rounded-xl bg-brand-50 px-2.5 py-2 text-[12.5px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}
        {notice && (
          <p className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[12.5px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy === 'password' && <LoaderIcon className="h-4 w-4" />}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="my-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        <span className="h-px flex-1 bg-ink-100 dark:bg-ink-800" /> or
        <span className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
      </div>

      <button
        type="button"
        onClick={withMagicLink}
        disabled={busy !== null}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
      >
        {busy === 'magic' && <LoaderIcon className="h-4 w-4" />}
        Email me a sign-in link
      </button>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
        Only the library administrator’s email can add or delete papers. Progress marks are
        private to each account.
      </p>
    </Modal>
  )
}
