import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteMeta } from '../seo'
import en from './en'

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'ru', label: 'Русский', short: 'RU' },
]

// English ships with the page; Spanish and Russian are separate chunks loaded only when chosen.
const LOADERS = { es: () => import('./es'), ru: () => import('./ru') }
const CODES = LANGUAGES.map((l) => l.code)
const STORAGE_KEY = 'av-language'
const DEFAULT_LANGUAGE = 'en'

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && CODES.includes(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function lookup(dictionary, path) {
  return path.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dictionary)
}

const I18nContext = createContext(null)

/** @param {{ children: import('react').ReactNode }} props */
export function LanguageProvider({ children }) {
  // Pages are pre-rendered in English, so the first client render must be English too (hydration match);
  // a remembered language is applied right after hydration, once its dictionary has loaded.
  const [lang, setLangState] = useState(DEFAULT_LANGUAGE)
  const [dictionaries, setDictionaries] = useState(/** @type {Record<string, any>} */ ({ en }))

  const activate = useCallback(async (code) => {
    if (code !== DEFAULT_LANGUAGE && LOADERS[code]) {
      try {
        const dictionary = (await LOADERS[code]()).default
        setDictionaries((loaded) => ({ ...loaded, [code]: dictionary }))
      } catch {
        return // chunk failed to load (offline): stay in the current language
      }
    }
    setLangState(code)
  }, [])

  useEffect(() => {
    const stored = readStoredLanguage()
    if (stored !== DEFAULT_LANGUAGE) activate(stored)
  }, [activate])

  const setLang = useCallback((code) => {
    if (!CODES.includes(code)) return
    activate(code)
    try { window.localStorage.setItem(STORAGE_KEY, code) } catch { /* storage unavailable: keep in memory only */ }
  }, [activate])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const value = useMemo(() => {
    const dictionary = dictionaries[lang] ?? en
    /** Returns the translated value (string, array or object) with an English fallback. */
    const t = (path) => lookup(dictionary, path) ?? lookup(en, path) ?? path
    return { lang, setLang, t }
  }, [lang, setLang, dictionaries])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside LanguageProvider')
  return context
}

/** Sets the document title for the current route: the SEO title in English, otherwise the translated page title. */
export function usePageTitle(title) {
  const { t, lang } = useI18n()
  const { pathname } = useLocation()
  useEffect(() => {
    const brand = t('meta.brand')
    const seoTitle = lang === DEFAULT_LANGUAGE ? getRouteMeta(pathname)?.title : null
    document.title = seoTitle ?? (title ? `${title} | ${brand}` : `${brand} | ${t('meta.homeTitle')}`)
  }, [title, t, lang, pathname])
}
