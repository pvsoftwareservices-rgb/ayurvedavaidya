import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useI18n } from '../i18n'
import { Icon } from '../ui'
import Flag from './Flag'

/** Compact dropdown used in the header. */
export function LanguageMenu() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      rootRef.current?.querySelector('.lang-toggle')?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const choose = (code) => { setLang(code); setOpen(false) }

  return <div className="lang" ref={rootRef}>
    <button type="button" className="lang-toggle" aria-haspopup="true" aria-expanded={open} aria-label={`${t('nav.language')}: ${current.label}`} onClick={() => setOpen((v) => !v)}>
      <span>{current.short}</span><Icon name="chevron" className="lang-chevron"/>
    </button>
    <div className={`lang-menu ${open ? 'open' : ''}`} inert={!open} role="group" aria-label={t('nav.language')}>
      {LANGUAGES.map((l) => <button key={l.code} type="button" lang={l.code} aria-pressed={l.code === lang} onClick={() => choose(l.code)}>
        <Flag code={l.flag}/><span>{l.label}</span>{l.code === lang && <Icon name="check" className="lang-check"/>}
      </button>)}
    </div>
  </div>
}

/** Segmented control used in the mobile drawer and footer. */
export function LanguageInline({ light = false }) {
  const { lang, setLang, t } = useI18n()
  return <div className={`lang-inline ${light ? 'is-light' : ''}`} role="group" aria-label={t('nav.language')}>
    <Icon name="globe"/>
    {LANGUAGES.map((l) => <button key={l.code} type="button" lang={l.code} aria-pressed={l.code === lang} onClick={() => setLang(l.code)} title={l.label}><Flag code={l.flag}/>{l.short}</button>)}
  </div>
}
