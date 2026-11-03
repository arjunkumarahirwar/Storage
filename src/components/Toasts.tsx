import type { ToastMessage } from '../lib/types'
import { AlertIcon, CheckIcon, XIcon } from './Icons'

interface ToastsProps {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={[
            'animate-slide-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-[13px] font-medium shadow-lift',
            toast.tone === 'success'
              ? 'border-emerald-200 bg-white text-emerald-800 dark:border-emerald-500/30 dark:bg-ink-900 dark:text-emerald-200'
              : toast.tone === 'error'
                ? 'border-brand-200 bg-white text-brand-700 dark:border-brand-500/30 dark:bg-ink-900 dark:text-brand-200'
                : 'border-ink-200 bg-white text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
          ].join(' ')}
        >
          <span className="mt-0.5 shrink-0">
            {toast.tone === 'success' ? (
              <CheckIcon className="h-4 w-4" />
            ) : toast.tone === 'error' ? (
              <AlertIcon className="h-4 w-4" />
            ) : (
              <span className="block h-4 w-4 rounded-full bg-ink-300 dark:bg-ink-600" />
            )}
          </span>
          <p className="flex-1 leading-snug">{toast.text}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-0.5 text-ink-400 transition hover:text-ink-700 dark:hover:text-white"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
