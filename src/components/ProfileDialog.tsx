import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { USERNAME_PATTERN } from '../hooks/useProfile'
import type { Profile } from '../lib/types'
import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { AlertIcon, LoaderIcon, UserIcon } from './Icons'

interface ProfileDialogProps {
  open: boolean
  /** true = first sign-in, the dialog cannot be dismissed until it is filled in. */
  required: boolean
  profile: Profile | null
  email: string | null
  onSave: (input: { username: string; file: File | null }) => Promise<void>
  onClose: () => void
  onSignOut: () => void
  onSuccess: (message: string) => void
}

const inputClass =
  'h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500'

export function ProfileDialog({
  open,
  required,
  profile,
  email,
  onSave,
  onClose,
  onSignOut,
  onSuccess,
}: ProfileDialogProps) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Start each visit from what is already saved.
  useEffect(() => {
    if (!open) return
    setUsername(profile?.username ?? '')
    setFile(null)
    setPreview(null)
    setError(null)
  }, [open, profile])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const cleaned = username.trim().replace(/^@+/, '')
  const usernameOk = USERNAME_PATTERN.test(cleaned)
  const hasPicture = Boolean(file || profile?.avatar_url)
  const canSave = usernameOk && hasPicture && !busy

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!chosen) return
    if (!chosen.type.startsWith('image/')) {
      setError(t('Please choose a picture (JPG, PNG or WebP).'))
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(chosen)
    setPreview(URL.createObjectURL(chosen))
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!usernameOk) {
      setError(t('Use 3–24 letters, numbers, dots or underscores — no spaces.'))
      return
    }
    if (!hasPicture) {
      setError(t('Please add a profile picture.'))
      return
    }
    setBusy(true)
    try {
      await onSave({ username: cleaned, file })
      onSuccess(t(required ? 'Profile created — welcome!' : 'Profile updated.'))
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Could not save your profile.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!required}
      title={required ? t('Finish your profile') : t('Your profile')}
      description={
        required
          ? t('Pick a username and a profile picture. You only do this once.')
          : t('Change the name and picture other people see.')
      }
      icon={<UserIcon className="h-4 w-4" />}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-ink-300 bg-ink-50 text-ink-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-500"
            aria-label={t('Choose a profile picture')}
          >
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : profile?.avatar_url ? (
              <Avatar url={profile.avatar_url} name={cleaned || 'You'} className="h-full w-full" />
            ) : (
              <UserIcon className="h-8 w-8" />
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink-950/60 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
              {hasPicture ? t('Change') : t('Add photo')}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink-800 dark:text-ink-100">
              {t('Profile picture')}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">
              {t(
                'A square photo works best. It is cropped and shrunk automatically, so a camera photo is fine.',
              )}
            </p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="mt-2 h-8 rounded-lg border border-ink-200 px-2.5 text-[12px] font-semibold text-ink-600 transition hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {hasPicture ? t('Choose another photo') : t('Choose photo')}
            </button>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={pickFile}
            className="hidden"
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-600 dark:text-ink-300">
            {t('Username')}
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-ink-400">
              @
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="arjun_2025"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={24}
              className={`${inputClass} pl-8`}
            />
          </div>
          <span className="mt-1 block text-[11.5px] text-ink-400 dark:text-ink-500">
            {t('3–24 letters, numbers, dots or underscores. This is what classmates see.')}
          </span>
        </label>

        {email && (
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px] text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
            {t('Signed in as {email}', { email })}
          </p>
        )}

        {error && (
          <p className="flex items-start gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-[12px] font-medium text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
            <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[14px] font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <LoaderIcon className="h-4 w-4 animate-spin" />}
          {busy ? t('Saving…') : required ? t('Create my profile') : t('Save changes')}
        </button>

        {required && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full text-center text-[12px] font-semibold text-ink-400 transition hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300"
          >
            {t('Sign out instead')}
          </button>
        )}
      </form>
    </Modal>
  )
}
