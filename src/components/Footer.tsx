import { useI18n } from '../hooks/useI18n'
import { ShieldIcon } from './Icons'

export function Footer({ paperCount }: { paperCount: number }) {
  const { t } = useI18n()
  return (
    <footer className="mt-10 border-t border-ink-200/80 py-6 text-center dark:border-ink-800">
      <p className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-ink-500 dark:text-ink-400">
        <ShieldIcon className="h-3.5 w-3.5" />{' '}
        {t('{count} papers · always free', { count: paperCount })}
      </p>
      <p className="mx-auto mt-2 max-w-md text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
        {t(
          'Not affiliated with MP ESB. Papers belong to their original publisher. Files stay in Google Drive and open there; this site only stores titles, links, your progress, your private notes and your practice scores.',
        )}
      </p>
    </footer>
  )
}
