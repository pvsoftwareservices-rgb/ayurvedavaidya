import { Link } from 'react-router-dom'
import { CONTACT, SERVICES } from '../data'
import { useI18n } from '../i18n'
import { Icon } from '../ui'
import { Logo } from './Header'
import { LanguageInline } from './LanguageSwitcher'

export default function Footer() {
  const { t } = useI18n()

  const quick = [['home', '/'], ['about', '/about/'], ['programs', '/programs/'], ['journal', '/articles/'], ['contact', '/book-consultation/']]

  return <footer className="site-footer">
    <div className="footer-glow" aria-hidden="true"/>
    <div className="container footer-grid">
      <div className="footer-brand">
        <div className="footer-logo"><Logo/></div>
        <p>{t('footer.about')}</p>
        <LanguageInline light/>
      </div>
      <nav aria-label={t('footer.quick')}>
        <h2 className="footer-heading">{t('footer.quick')}</h2>
        {quick.map(([key, to]) => <Link key={key} to={to}>{t(`nav.${key}`)}</Link>)}
      </nav>
      <nav aria-label={t('footer.services')}>
        <h2 className="footer-heading">{t('footer.services')}</h2>
        {SERVICES.map((s) => <Link key={s.key} to={`/services/${s.key}/`}>{t(`services.items.${s.key}.title`)}</Link>)}
        <Link to="/book-consultation/">{t('nav.book')}</Link>
      </nav>
      <div className="footer-contact">
        <h2 className="footer-heading">{t('footer.contact')}</h2>
        <a href={CONTACT.phoneHref}><Icon name="phone"/>{CONTACT.phone}</a>
        <a href={CONTACT.emailHref}><Icon name="mail"/>{CONTACT.email}</a>
        <p className="footer-clinic"><Icon name="pin"/>{t('contact.clinicValue')}</p>
      </div>
    </div>
    <div className="footer-bottom">
      <div className="container">
        <span suppressHydrationWarning>© {new Date().getFullYear()} AyurvedaVaidya.com — {t('footer.rights')}</span>
        <span className="footer-legal"><Link to="/privacy/">{t('legal.privacy')}</Link><Link to="/terms/">{t('legal.terms')}</Link><Link to="/disclaimer/">{t('legal.disclaimer')}</Link></span>
        <span className="footer-tagline"><Icon name="leaf"/>{t('meta.tagline')}</span>
      </div>
    </div>
  </footer>
}

export function MobileActionBar() {
  const { t } = useI18n()
  return <div className="mobile-bar">
    <a href={CONTACT.phoneHref}><Icon name="phone"/>{t('nav.call')}</a>
    <a href={CONTACT.emailHref}><Icon name="mail"/>Email</a>
    <Link to="/book-consultation/" className="mobile-bar-book"><Icon name="calendar"/>{t('nav.book')}</Link>
  </div>
}
