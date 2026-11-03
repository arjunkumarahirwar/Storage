import { useEffect, type ReactNode } from 'react'
import { XIcon } from './Icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, description, icon, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="animate-fade-in absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'animate-slide-up relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-200 bg-white shadow-lift dark:border-ink-700 dark:bg-ink-900 sm:rounded-3xl',
          wide ? 'sm:max-w-lg' : 'sm:max-w-md',
        ].join(' ')}
      >
        <div className="flex items-start gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          {icon && (
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-ink-900 dark:text-white">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500 dark:text-ink-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
