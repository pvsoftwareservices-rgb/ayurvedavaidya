import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { CONTACT, LOGO, SERVICES } from '../data'
import { useI18n } from '../i18n'
import { Button, Icon } from '../ui'
import Picture from './Picture'
import { LanguageInline, LanguageMenu } from './LanguageSwitcher'

/** The header logo is above the fold on every page (eager, normal priority so it never competes with the LCP image); other copies load lazily. */
/** @param {{ className?: string, priority?: boolean }} props */
export function Logo({ className = '', priority = false }) {
  return <Link to="/" className={`brand ${className}`} aria-label="AyurvedaVaidya — home">
    <Picture image={LOGO} alt="AyurvedaVaidya.com — Ancient Wisdom. Modern Wellbeing." sizes="(max-width: 760px) 100px, 140px" loading={priority ? 'eager' : 'lazy'}/>
  </Link>
}

const LINKS = [['home', '/'], ['about', '/about/'], ['services', '/services/'], ['programs', '/programs/'], ['journal', '/articles/'], ['contact', '/book-consultation/']]

function useDrawerFocusTrap(open, drawerRef, onClose) {
  useEffect(() => {
    document.body.classList.toggle('nav-open', open)
    if (!open) return undefined
    const focusTimer = setTimeout(() => drawerRef.current?.querySelector('.drawer-close')?.focus(), 60)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = [...drawerRef.current.querySelectorAll('a,button:not([disabled])')]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(focusTimer); window.removeEventListener('keydown', onKey); document.body.classList.remove('nav-open') }
  }, [open, drawerRef, onClose])
}

function MegaMenu({ open, t }) {
  return <div id="services-menu" className={`mega ${open ? 'open' : ''}`} inert={!open}>
    <div className="mega-intro">
      <Icon name="leaf"/>
      <span>{t('nav.megaTag')}</span>
      <strong>{t('nav.megaTitle')}</strong>
      <Link to="/services/">{t('nav.allServices')} <Icon name="arrow"/></Link>
    </div>
    {SERVICES.map((s) => <div key={s.key} className="mega-col">
      <Link className="mega-title" to={`/services/${s.key}/`}><Icon name={s.icon}/>{t(`services.items.${s.key}.title`)}</Link>
      {t(`services.items.${s.key}.list`).slice(0, 4).map((item) => <Link key={item} to={`/services/${s.key}/`}>{item}</Link>)}
    </div>)}
  </div>
}

export default function Header() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileServices, setMobileServices] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const drawerRef = useRef(null)
  const menuButtonRef = useRef(null)
  const closeRef = useRef(() => { setOpen(false); menuButtonRef.current?.focus() })

  useEffect(() => { setOpen(false); setMegaOpen(false); setMobileServices(false) }, [pathname])
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24)
      const max = document.documentElement.scrollHeight - window.innerHeight
      document.documentElement.style.setProperty('--page-p', max > 0 ? (window.scrollY / max).toFixed(4) : '0')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!megaOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setMegaOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [megaOpen])
  useDrawerFocusTrap(open, drawerRef, closeRef.current)

  const servicesActive = pathname.startsWith('/services')

  return <>
    <a className="skip-link" href="#main-content">{t('nav.skip')}</a>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="nav-shell">
        <Logo priority/>
        <nav className="desktop-nav" aria-label="Primary">
          {LINKS.map(([key, to]) => key === 'services'
            ? <div key={key} className="menu-wrap" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMegaOpen(false) }}>
                <button type="button" className={`nav-link nav-drop ${servicesActive ? 'active' : ''}`} aria-controls="services-menu" aria-expanded={megaOpen} onClick={() => setMegaOpen((v) => !v)}>{t('nav.services')}<Icon name="chevron" className="nav-chevron"/></button>
                <MegaMenu open={megaOpen} t={t}/>
              </div>
            : <NavLink key={key} className="nav-link" to={to} end={to === '/'}>{t(`nav.${key}`)}</NavLink>)}
        </nav>
        <div className="header-actions">
          <LanguageMenu/>
          <a className="header-phone" href={CONTACT.phoneHref} aria-label={`${t('nav.call')} ${CONTACT.phone}`}><Icon name="phone"/></a>
          <Button to="/book-consultation/" variant="green" className="header-cta" icon="calendar">{t('nav.book')}</Button>
          <button ref={menuButtonRef} type="button" className="menu-toggle" aria-label={t('nav.open')} aria-expanded={open} onClick={() => setOpen(true)}><span/><span/><span/></button>
        </div>
      </div>
      <div className="header-progress" aria-hidden="true"/>
    </header>

    <div ref={drawerRef} role="dialog" aria-modal={open || undefined} aria-label={t('nav.menu')} className={`drawer ${open ? 'open' : ''}`} inert={!open}>
      <div className="drawer-top"><Logo/><button type="button" className="drawer-close" onClick={closeRef.current} aria-label={t('nav.close')}><Icon name="close"/></button></div>
      <nav aria-label="Mobile">
        {LINKS.map(([key, to], i) => key === 'services'
          ? <div key={key} className="drawer-group" style={{ '--i': i }}>
              <button type="button" aria-expanded={mobileServices} onClick={() => setMobileServices((v) => !v)}>{t('nav.services')}<Icon name="chevron" className="nav-chevron"/></button>
              <div className={`drawer-sub ${mobileServices ? 'open' : ''}`} inert={!mobileServices}>
                <Link to="/services/">{t('nav.allServices')}</Link>
                {SERVICES.map((s) => <Link key={s.key} to={`/services/${s.key}/`}>{t(`services.items.${s.key}.title`)}</Link>)}
              </div>
            </div>
          : <NavLink key={key} to={to} end={to === '/'} style={{ '--i': i }}>{t(`nav.${key}`)}</NavLink>)}
      </nav>
      <LanguageInline/>
      <div className="drawer-contact">
        <a href={CONTACT.phoneHref}><Icon name="phone"/>{CONTACT.phone}</a>
        <a href={CONTACT.emailHref}><Icon name="mail"/>{CONTACT.email}</a>
      </div>
      <Button to="/book-consultation/" icon="calendar">{t('nav.book')}</Button>
    </div>
    {open && <button type="button" className="drawer-scrim" onClick={closeRef.current} aria-label={t('nav.close')}/>}
  </>
}
