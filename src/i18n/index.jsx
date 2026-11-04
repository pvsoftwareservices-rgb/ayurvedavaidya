import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteMeta } from '../seo'
import en from './en'

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', flag: 'gb' },
  { code: 'de', label: 'Deutsch', short: 'DE', flag: 'de' },
  { code: 'fr', label: 'Français', short: 'FR', flag: 'fr' },
  { code: 'it', label: 'Italiano', short: 'IT', flag: 'it' },
  { code: 'es', label: 'Español', short: 'ES', flag: 'es' },
  { code: 'ar', label: 'العربية', short: 'AR', flag: 'ae', dir: 'rtl' },
  { code: 'ru', label: 'Русский', short: 'RU', flag: 'ru' },
  { code: 'ja', label: '日本語', short: 'JA', flag: 'jp' },
  { code: 'zh', label: '中文', short: 'ZH', flag: 'cn' },
  { code: 'nl', label: 'Nederlands', short: 'NL', flag: 'nl' },
  { code: 'pt', label: 'Português', short: 'PT', flag: 'pt' },
  { code: 'hi', label: 'हिन्दी', short: 'HI', flag: 'in' },
]

// English ships with the page; every other language is a separate chunk loaded only when chosen.
const LOADERS = {
  de: () => import('./de'), fr: () => import('./fr'), it: () => import('./it'), es: () => import('./es'),
  ar: () => import('./ar'), ru: () => import('./ru'), ja: () => import('./ja'), zh: () => import('./zh'),
  nl: () => import('./nl'), pt: () => import('./pt'), hi: () => import('./hi'),
}
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

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr'
  }, [lang])

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
