import { Link } from 'react-router-dom'
import { PageHero } from '../components/Blocks'
import { CONTACT } from '../data'
import { useI18n, usePageTitle } from '../i18n'

const LEGAL_TYPES = ['privacy', 'terms', 'disclaimer']

function LegalSection({ section }) {
  return <section className="legal-section">
    <h2>{section.title}</h2>
    {section.body?.map((para) => <p key={para}>{para}</p>)}
    {section.list && <ul className="legal-list">{section.list.map((item) => <li key={item}>{item}</li>)}</ul>}
    {section.after?.map((para) => <p key={para}>{para}</p>)}
  </section>
}

export default function LegalPage({ type }) {
  const { t, lang } = useI18n()
  const title = t(`legal.${type}`)
  const page = t(`legal.pages.${type}`)
  usePageTitle(title)
  return <main id="main-content">
    <PageHero eyebrow={t('legal.eyebrow')} title={title} lead={page.lead} crumbs={[[title, `/${type}/`]]}/>
    <section className="section legal-page">
      <div className="container legal-body">
        <p className="legal-updated">{t('legal.updatedLabel')}: {t('legal.updated')}</p>
        {lang !== 'en' && <p className="legal-note">{t('legal.englishOnly')}</p>}
        {page.sections.map((section) => <LegalSection key={section.title} section={section}/>)}
        <section className="legal-section">
          <h2>{t('legal.contactTitle')}</h2>
          <p>{t('legal.contactText')}</p>
          <p><a href={CONTACT.emailHref}>{CONTACT.email}</a> · <a href={CONTACT.phoneHref}>{CONTACT.phone}</a></p>
        </section>
        <p className="legal-related">{t('legal.related')}: {LEGAL_TYPES.filter((x) => x !== type).map((x, i) => <span key={x}>{i > 0 && ' · '}<Link to={`/${x}/`}>{t(`legal.${x}`)}</Link></span>)}</p>
      </div>
    </section>
  </main>
}
