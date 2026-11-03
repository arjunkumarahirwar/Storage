import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'mp-pyq-theme'

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  })
  const [isDark, setIsDark] = useState<boolean>(() =>
    choice === 'system' ? systemPrefersDark() : choice === 'dark',
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = choice === 'system' ? media.matches : choice === 'dark'
      setIsDark(dark)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [choice])

  useEffect(() => {
    if (choice === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, choice)
  }, [choice])

  const toggle = useCallback(() => {
    setChoice(isDark ? 'light' : 'dark')
  }, [isDark])

  return { choice, isDark, toggle }
}
