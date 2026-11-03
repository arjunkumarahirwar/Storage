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

export const classNames = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')
