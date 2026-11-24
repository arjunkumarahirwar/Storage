export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const plural = (count: number, singular: string, pluralForm?: string) =>
  count === 1 ? singular : (pluralForm ?? `${singular}s`)

/** "43 min", "1 h 05 min" — for practice times. */
export const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  if (minutes < 1) return `${total} sec`
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${hours} h`
}

/** Live clock for a running timer: 12:34 or 1:02:03. */
export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

export const classNames = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')
