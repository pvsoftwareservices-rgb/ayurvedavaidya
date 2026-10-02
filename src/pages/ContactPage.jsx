import { PageHero } from '../components/Blocks'
import { CONTACT, IMAGES } from '../data'
import { useI18n, usePageTitle } from '../i18n'
import { Reveal, tilt } from '../motion'
import { Eyebrow, Icon } from '../ui'
import BookingForm from './BookingForm'

function ContactCards() {
  const { t } = useI18n()
  const cards = [
    { icon: 'phone', label: t('contact.phoneLabel'), value: CONTACT.phone, href: CONTACT.phoneHref },
    { icon: 'mail', label: t('contact.emailLabel'), value: CONTACT.email, href: CONTACT.emailHref },
    { icon: 'pin', label: t('contact.clinicLabel'), value: t('contact.clinicValue') },
    { icon: 'video', label: t('contact.modesLabel'), value: t('contact.modesValue') },
  ]
  return <div className="contact-cards">
    {cards.map((c, i) => {
      const inner = <><span className="contact-icon"><Icon name={c.icon}/></span><span><small>{c.label}</small><strong>{c.value}</strong></span></>
      return <Reveal key={c.label} variant="up" delay={i * 80}>
        {c.href ? <a className="contact-card tilt" href={c.href} {...tilt}>{inner}</a> : <div className="contact-card tilt" {...tilt}>{inner}</div>}
      </Reveal>
    })}
  </div>
}

export default function ContactPage() {
  const { t } = useI18n()
  usePageTitle(t('contact.title'))
  return <main id="main-content">
    <PageHero eyebrow={t('contact.eyebrow')} title={t('contact.title')} lead={t('contact.lead')} image={IMAGES.booking} crumbs={[[t('nav.book'), '/book-consultation/']]}/>
    <section className="section contact-section">
      <div className="container">
        <ContactCards/>
        <div className="booking-grid">
          <Reveal variant="left" className="booking-aside">
            <Eyebrow>{t('contact.expectTitle')}</Eyebrow>
            <ol className="expect-list">{t('contact.expectList').map((x, i) => <li key={x}><span>0{i + 1}</span>{x}</li>)}</ol>
            <div className="form-note"><Icon name="shield"/><span>{t('contact.emergency')}</span></div>
          </Reveal>
          <BookingForm/>
        </div>
      </div>
    </section>
  </main>
}
