import { useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { DownloadIcon, RefreshIcon, ShieldIcon, XIcon } from './Icons'

/** The "add it to your home screen" card under the hero. */
export function InstallCard({
  iosHint,
  onInstall,
  onDismiss,
}: {
  iosHint: boolean
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  onDismiss: () => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  const install = async () => {
    setBusy(true)
    try {
      const outcome = await onInstall()
      if (outcome === 'unavailable') onDismiss()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="relative mt-3 overflow-hidden rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50 via-white to-white p-3 pr-9 dark:border-brand-500/30 dark:from-brand-500/10 dark:via-ink-900 dark:to-ink-900">
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('Not now')}
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-white/70 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <ShieldIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink-900 dark:text-white">
            {t('Keep the papers on your home screen')}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-600 dark:text-ink-300">
            {iosHint ? (
              t(
                'On iPhone or iPad: tap the Share button, then Add to Home Screen. It opens like an app and keeps the last list of papers readable without a network.',
              )
            ) : (
              t(
                'Install the library — it opens without the browser bars and keeps the last list of papers readable when your network drops.',
              )
            )}
          </p>
          {!iosHint && (
            <button
              type="button"
              onClick={() => void install()}
              disabled={busy}
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[12px] font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              <DownloadIcon className="h-3.5 w-3.5" />{' '}
              {busy ? t('Opening…') : t('Install app')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/** Amber strip: the phone is offline, so the list comes from the cache. */
export function OfflineBar() {
  const { t } = useI18n()
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <p className="leading-relaxed">
        <span className="font-bold">{t('You are offline.')}</span>{' '}
        {t(
          'This is the list saved on your device. Papers open from Google Drive, so you will need a connection to read one.',
        )}
      </p>
    </div>
  )
}

/** A newer build has taken over — one tap reloads into it. */
export function UpdateBar({
  onRefresh,
  onDismiss,
}: {
  onRefresh: () => void
  onDismiss: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] font-medium text-ink-700 shadow-card dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200">
      <RefreshIcon className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
      <p className="min-w-0 flex-1 leading-relaxed">{t('A new version is ready.')}</p>
      <button
        type="button"
        onClick={onRefresh}
        className="h-7 shrink-0 rounded-lg bg-brand-600 px-2.5 text-[11.5px] font-bold text-white transition hover:bg-brand-700"
      >
        {t('Refresh')}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('Dismiss')}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 dark:hover:bg-ink-800"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
