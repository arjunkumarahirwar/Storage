import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { preferredLang, translate } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

const STORAGE_KEY = 'pyq:lang:v1'

export interface I18nValue {
  lang: Lang
  /** English text in, the chosen language out (English if there is no entry). */
  t: (text: string, vars?: Record<string, string | number>) => string
  setLang: (lang: Lang) => void
  toggleLang: () => void
}

const I18nContext = createContext<I18nValue>({
  lang: 'en',
  t: (text) => text,
  setLang: () => {},
  toggleLang: () => {},
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(preferredLang)

  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en'
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* private mode — the choice lasts this visit */
    }
  }, [lang])

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars),
    [lang],
  )

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t,
      setLang: setLangState,
      toggleLang: () => setLangState((current) => (current === 'hi' ? 'en' : 'hi')),
    }),
    [lang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
