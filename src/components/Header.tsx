import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { LANGS } from '../lib/i18n'
import { Avatar } from './Avatar'
import {
  AlertIcon,
  LayersIcon,
  LogOutIcon,
  MoonIcon,
  PulseIcon,
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
  username: string | null
  avatarUrl: string | null
  onSignIn: () => void
  onSignOut: () => void
  onEditProfile: () => void
  /** How many student reports are still open (administrator only). */
  reportCount?: number
  onOpenReports?: () => void
  /** Administrator tools: pick many cards at once, and check the Drive links. */
  onOpenBulk?: () => void
  onOpenCheck?: () => void
}

export function Header({
  query,
  onQueryChange,
  isDark,
  onToggleTheme,
  email,
  isAdmin,
  username,
  avatarUrl,
  onSignIn,
  onSignOut,
  onEditProfile,
  reportCount = 0,
  onOpenReports,
  onOpenBulk,
  onOpenCheck,
}: HeaderProps) {
  const { lang, t, setLang } = useI18n()
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
                {t('MP Police')}
              </p>
              <h1 className="truncate text-[15px] font-bold leading-tight text-ink-900 dark:text-white">
                {t('PYQ Library')}
              </h1>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* English / हिंदी — one tap, the whole screen follows. */}
            <button
              type="button"
              onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
              aria-label={lang === 'hi' ? t('Switch to English') : t('Switch to Hindi')}
              title={t('Language')}
              className="flex h-9 items-center overflow-hidden rounded-full border border-ink-200 text-[11px] font-bold transition hover:bg-ink-100 active:scale-95 dark:border-ink-700 dark:hover:bg-ink-800"
            >
              {LANGS.map((option) => (
                <span
                  key={option.value}
                  className={
                    option.value === lang
                      ? 'grid h-full place-items-center bg-brand-600 px-2 text-white'
                      : 'grid h-full place-items-center px-2 text-ink-500 dark:text-ink-400'
                  }
                >
                  {option.short}
                </span>
              ))}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
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
                  <Avatar
                    url={avatarUrl}
                    name={username ?? email}
                    className="h-7 w-7 text-[10px] ring-1 ring-black/5"
                  />
                  <span className="max-w-[82px] truncate sm:max-w-[140px]">
                    {username ? `@${username}` : isAdmin ? t('Admin') : email.split('@')[0]}
                  </span>
                </button>

                {menuOpen && (
                  <div className="animate-pop-in absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift dark:border-ink-700 dark:bg-ink-900">
                    <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          url={avatarUrl}
                          name={username ?? email}
                          className="h-10 w-10 text-[13px] ring-1 ring-black/5"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                            {username ? `@${username}` : t('No username yet')}
                          </p>
                          <p className="truncate text-[12px] text-ink-500 dark:text-ink-400">
                            {email}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {isAdmin ? (
                          <>
                            <ShieldIcon className="h-3.5 w-3.5" /> {t('Library administrator')}
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-3.5 w-3.5" /> {t('Student account')}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onEditProfile()
                      }}
                      className="flex w-full items-center gap-2 border-b border-ink-100 px-4 py-3 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                    >
                      <UserIcon className="h-4 w-4" /> {t('Edit profile')}
                    </button>
                    {isAdmin && onOpenReports && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onOpenReports()
                        }}
                        className="flex w-full items-center gap-2 border-b border-ink-100 px-4 py-3 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                      >
                        <AlertIcon className="h-4 w-4" />
                        <span className="flex-1">{t('Problem reports')}</span>
                        {reportCount > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                            {reportCount}
                          </span>
                        )}
                      </button>
                    )}
                    {isAdmin && onOpenBulk && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onOpenBulk()
                        }}
                        className="flex w-full items-center gap-2 border-b border-ink-100 px-4 py-3 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                      >
                        <LayersIcon className="h-4 w-4" /> {t('Bulk edit')}
                      </button>
                    )}
                    {isAdmin && onOpenCheck && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onOpenCheck()
                        }}
                        className="flex w-full items-center gap-2 border-b border-ink-100 px-4 py-3 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                      >
                        <PulseIcon className="h-4 w-4" /> {t('Library check')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onSignOut()
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                    >
                      <LogOutIcon className="h-4 w-4" /> {t('Sign out')}
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
                {t('Sign in')}
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
            placeholder={t('Search papers, shifts, years, solutions…')}
            aria-label={t('Search papers')}
            className="h-11 w-full rounded-2xl border border-ink-200 bg-ink-50 pl-10 pr-10 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500 dark:focus:bg-ink-900 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label={t('Clear search')}
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
