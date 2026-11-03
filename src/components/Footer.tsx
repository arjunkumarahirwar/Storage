import { ShieldIcon } from './Icons'

export function Footer({ paperCount }: { paperCount: number }) {
  return (
    <footer className="mt-10 border-t border-ink-200/80 py-6 text-center dark:border-ink-800">
      <p className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-ink-500 dark:text-ink-400">
        <ShieldIcon className="h-3.5 w-3.5" /> {paperCount} papers · always free
      </p>
      <p className="mx-auto mt-2 max-w-md text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
        Not affiliated with MP ESB. Papers belong to their original publisher. Files stay in
        Google Drive and open there; this site only stores titles, links and your own
        progress.
      </p>
    </footer>
  )
}
