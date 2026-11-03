import { useEffect, useRef, useState } from 'react'
import {
  LogOutIcon,
  MoonIcon,
  SearchIcon,
  ShieldIcon,
  SunIcon,
  UserIcon,
  XIcon,
} from './Icons'

interface HeaderProps {
  query: string
  onQueryChange: (value: string) => void
  isDark: boolean
  onToggleTheme: () => void
  email: string | null
  isAdmin: boolean
  onSignIn: () => void
  onSignOut: () => void
}

export function Header({
  query,
  onQueryChange,
  isDark,
  onToggleTheme,
  email,
  isAdmin,
  onSignIn,
  onSignOut,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/85 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/85">
      <div className="mx-auto w-full max-w-3xl px-4 pb-3 pt-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
                MP Police
              </p>
              <h1 className="truncate text-[15px] font-bold leading-tight text-ink-900 dark:text-white">
                PYQ Library
              </h1>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition hover:bg-ink-100 active:scale-95 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
            </button>

            {email ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-ink-200 pl-1 pr-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-100 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[11px] font-bold uppercase text-white">
                    {email.slice(0, 2)}
                  </span>
                  <span className="max-w-[82px] truncate sm:max-w-[140px]">
                    {isAdmin ? 'Admin' : email.split('@')[0]}
                  </span>
                </button>

                {menuOpen && (
                  <div className="animate-pop-in absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift dark:border-ink-700 dark:bg-ink-900">
                    <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        Signed in
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                        {email}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {isAdmin ? (
                          <>
                            <ShieldIcon className="h-3.5 w-3.5" /> Library administrator
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-3.5 w-3.5" /> Student account
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onSignOut()
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                    >
                      <LogOutIcon className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="h-9 rounded-full border border-brand-200 px-3.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search papers, shifts, years, solutions…"
            aria-label="Search papers"
            className="h-11 w-full rounded-2xl border border-ink-200 bg-ink-50 pl-10 pr-10 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500 dark:focus:bg-ink-900 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink-400 transition hover:bg-ink-200/70 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
