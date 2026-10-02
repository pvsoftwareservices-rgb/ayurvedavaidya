import { Breadcrumbs, ClinicGallery, ContactCTA, QualificationGrid, Timeline } from '../components/Blocks'
import Picture from '../components/Picture'
import { CONTACT, DOCTOR_IMAGES, QUALIFICATIONS } from '../data'
import { useI18n, usePageTitle } from '../i18n'
import { Reveal, tilt } from '../motion'
import { Button, Eyebrow, Icon } from '../ui'

export default function AboutPage() {
  const { t } = useI18n()
  usePageTitle(t('doctor.name'))
  const about = t('doctor.about')
  return <main id="main-content">
    <section className="profile-hero">
      <div className="container profile-grid">
        <div className="profile-copy">
          <Breadcrumbs trail={[[t('nav.about'), '/about/']]}/>
          <Eyebrow light>{t('about.eyebrow')}</Eyebrow>
          <h1>{t('doctor.name')}</h1>
          <p className="profile-headline">{t('doctor.headline')}</p>
          <p className="profile-quals">{QUALIFICATIONS.join(' · ')}</p>
          <p className="profile-lead">{t('about.lead')}</p>
          <div className="btn-row">
            <Button to="/book-consultation/" icon="calendar">{t('nav.book')}</Button>
            <Button href={CONTACT.phoneHref} variant="glass" icon="phone">{CONTACT.phone}</Button>
          </div>
        </div>
        <div className="profile-photo">
          <div className="arch-ring" aria-hidden="true"/>
          <figure className="arch"><Picture image={DOCTOR_IMAGES.profile} alt={t('doctor.profileAlt')} sizes="(max-width: 900px) 80vw, 460px" priority/></figure>
        </div>
      </div>
    </section>

    <section className="section bio">
      <div className="container bio-grid">
        <Reveal variant="left" className="bio-aside">
          <h2>{t('about.bioTitle')}</h2>
          <blockquote className="pull-quote"><Icon name="quote"/>{t('about.quote')}<cite>— {t('about.quoteBy')}</cite></blockquote>
        </Reveal>
        <div className="bio-text">
          {about.map((para, i) => <Reveal key={para} variant="up" delay={i * 80}><p className={i === 0 ? 'doctor-lead' : ''}>{para}</p></Reveal>)}
          <h3 className="mini-title">{t('intro.qualTitle')}</h3>
          <QualificationGrid/>
          <h3 className="mini-title">{t('intro.journeyTitle')}</h3>
          <Timeline/>
        </div>
      </div>
    </section>

    <section className="section principles">
      <div className="container">
        <Reveal variant="up"><h2 className="principles-title">{t('about.principlesTitle')}</h2></Reveal>
        <div className="principle-grid">
          {t('about.principles').map((p, i) => <Reveal key={p.title} variant="scale" delay={i * 110}>
            <article className="principle-card tilt" {...tilt}>
              <span className="principle-icon"><Icon name={['heart', 'leaf', 'spark'][i]}/></span>
              <span className="principle-num">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          </Reveal>)}
        </div>
      </div>
    </section>

    <ClinicGallery/>
    <ContactCTA/>
  </main>
}
