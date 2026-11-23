import { classNames } from '../lib/format'

interface AvatarProps {
  url: string | null | undefined
  name: string
  className?: string
}

/** Round avatar: the uploaded picture, or initials when there is none yet. */
export function Avatar({ url, name, className }: AvatarProps) {
  const initials = name.replace(/^@+/, '').trim().slice(0, 2).toUpperCase() || '?'

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={classNames(
          'shrink-0 rounded-full bg-ink-100 object-cover dark:bg-ink-800',
          className,
        )}
      />
    )
  }

  return (
    <span
      className={classNames(
        'grid shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold uppercase text-white',
        className,
      )}
    >
      {initials}
    </span>
  )
}
