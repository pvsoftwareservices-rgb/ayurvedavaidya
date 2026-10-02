import { Link } from 'react-router-dom'
import { PageHero } from '../components/Blocks'
import { CONTACT, SERVICES } from '../data'
import { useI18n, usePageTitle } from '../i18n'
import { Button, Icon } from '../ui'

/** Helpful next steps shared by the 404 and thank-you pages. */
export function HelpfulLinks({ title }) {
  const { t } = useI18n()
  const links = [['home', '/'], ['about', '/about/'], ['services', '/services/'], ['programs', '/programs/'], ['journal', '/articles/'], ['contact', '/book-consultation/']]
  return <section className="section helpful" aria-labelledby="helpful-title">
    <div className="container helpful-grid">
      <div>
        <h2 id="helpful-title" className="principles-title">{title}</h2>
        <ul className="helpful-links">
          {links.map(([key, to]) => <li key={key}><Link to={to} className="text-link">{t(`nav.${key}`)}<Icon name="arrow"/></Link></li>)}
          {SERVICES.map((s) => <li key={s.key}><Link to={`/services/${s.key}/`} className="text-link">{t(`services.items.${s.key}.title`)}<Icon name="arrow"/></Link></li>)}
        </ul>
      </div>
      <div className="helpful-contact">
        <h2 className="mini-title">{t('notFound.contactTitle')}</h2>
        <a href={CONTACT.phoneHref} className="text-link"><Icon name="phone"/>{CONTACT.phone}</a>
        <a href={CONTACT.emailHref} className="text-link"><Icon name="mail"/>{CONTACT.email}</a>
      </div>
    </div>
  </section>
}

export default function NotFound() {
  const { t } = useI18n()
  usePageTitle(t('notFound.title'))
  return <main id="main-content">
    <PageHero eyebrow="404" title={t('notFound.title')} lead={t('notFound.text')}>
      <div className="btn-row">
        <Button to="/">{t('notFound.home')}</Button>
        <Button href={CONTACT.phoneHref} variant="glass" icon="phone">{CONTACT.phone}</Button>
      </div>
    </PageHero>
    <HelpfulLinks title={t('notFound.linksTitle')}/>
  </main>
}
