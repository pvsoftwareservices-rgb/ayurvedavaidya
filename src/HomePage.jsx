import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArticleCard, ClinicGallery, ContactCTA, ProgramStack, QualificationGrid, Timeline } from './components/Blocks'
import { CLIENT_AVATARS, CLIENT_WALL, CONTACT, DOCTOR_IMAGES, IMAGES, POSTS, PROCESS_IMAGES, QUALIFICATIONS, SERVICES } from './data'
import { useI18n, usePageTitle } from './i18n'
import { Reveal, prefersReducedMotion, useScrollProgress } from './motion'
import Picture, { imageMeta } from './components/Picture'
import { Button, Eyebrow, Icon, SectionHead } from './ui'

/** One column of the hero photo wall. The set is rendered twice so the CSS drift loops seamlessly. */
function WallColumn({ photos, index }) {
  const { t } = useI18n()
  const alts = t('hero.alts')
  return <div className={`wall-col wall-col-${index}`}>
    <div className="wall-track">
      {[0, 1].map((copy) => <ul key={copy} className="wall-set" aria-hidden={copy === 1 || undefined}>
        {photos.map((photo, i) => <li key={photo.image} className="wall-tile" style={{ aspectRatio: `${imageMeta(photo.image).w} / ${imageMeta(photo.image).h}` }}>
          {/* The first copy is above the fold: load it straight away (first tile of each column at high priority); the looping duplicate waits. */}
          <Picture image={photo.image} alt={copy === 1 ? '' : alts[photo.kind]} sizes="(max-width: 760px) 34vw, 260px" loading={copy === 0 ? 'eager' : 'lazy'} fetchPriority={copy === 0 && i === 0 ? 'high' : undefined}/>
        </li>)}
      </ul>)}
    </div>
  </div>
}

function Hero() {
  const { t } = useI18n()
  const ref = useRef(null)
  useScrollProgress(ref, { mode: 'exit' })
  return <section ref={ref} className="hero" aria-labelledby="hero-title">
    <div className="hero-bg" aria-hidden="true"/>
    <div className="hero-wall" role="region" aria-label={t('hero.wallLabel')}>
      <div className="wall-grid">
        {CLIENT_WALL.map((photos, i) => <WallColumn key={photos[0].image} photos={photos} index={i}/>)}
      </div>
    </div>
    <div className="hero-namecard"><strong>{t('doctor.name')}</strong><span>{t('doctor.role')}</span></div>
    <div className="container hero-inner">
      <div className="hero-copy">
        <p className="hero-kicker"><span className="pulse" aria-hidden="true"/>{t('hero.eyebrow')}</p>
        <h1 id="hero-title">
          <span className="line"><span>{t('hero.titleA')}</span></span>
          <span className="line line-accent"><span>{t('hero.titleB')}</span></span>
        </h1>
        <p className="hero-lead">{t('hero.lead')}</p>
        <div className="hero-actions">
          <Button to="/book-consultation/" icon="calendar">{t('nav.book')}</Button>
          <Button href={CONTACT.phoneHref} variant="glass" icon="phone">{CONTACT.phone}</Button>
        </div>
        <div className="hero-trust">
          <span className="trust-faces" aria-hidden="true">{CLIENT_AVATARS.map((image) => <Picture key={image} image={image} alt="" sizes="48px" loading="eager"/>)}</span>
          <span className="trust-copy"><strong>{t('hero.trust')}</strong><small>{t('hero.trustSub')}</small></span>
        </div>
      </div>
    </div>
    <a href="#doctor" className="scroll-cue"><span>{t('hero.scroll')}</span><i aria-hidden="true"/></a>
  </section>
}

function CredentialsMarquee() {
  const { t } = useI18n()
  const ref = useRef(null)
  useScrollProgress(ref)
  const row = (items, key) => [0, 1].map((copy) => <span key={`${key}-${copy}`} className="marquee-set" aria-hidden={copy === 1 || undefined}>
    {items.map((item) => <span key={item} className="marquee-item">{item}<Icon name="leaf"/></span>)}
  </span>)
  return <section ref={ref} className="marquee" aria-label={QUALIFICATIONS.join(', ')}>
    <div className="marquee-row marquee-a">{row(QUALIFICATIONS, 'q')}</div>
    <div className="marquee-row marquee-b">{row(t('marquee'), 'd')}</div>
  </section>
}

function MeetDoctor() {
  const { t } = useI18n()
  const about = t('doctor.about')
  return <section id="doctor" className="doctor" aria-labelledby="doctor-title">
    <div className="container doctor-grid">
      <div className="doctor-media">
        <Reveal variant="clip" className="doctor-photo">
          <Picture image={DOCTOR_IMAGES.desk} alt={t('doctor.portraitAlt')} sizes="(max-width: 900px) 92vw, 520px"/>
        </Reveal>
        <div className="doctor-badge"><Icon name="shield"/><span><strong>{t('intro.badge')}</strong>Ayurveda Clinic</span></div>
      </div>
      <div className="doctor-copy">
        <Reveal variant="up"><Eyebrow>{t('intro.eyebrow')}</Eyebrow><h2 id="doctor-title">{t('intro.title')}</h2></Reveal>
        <Reveal variant="up" delay={100}><p className="doctor-lead">{about[0]}</p></Reveal>
        {about.slice(1).map((para, i) => <Reveal key={para} variant="fade" delay={140 + i * 60}><p>{para}</p></Reveal>)}
        <h3 className="mini-title">{t('intro.qualTitle')}</h3>
        <QualificationGrid/>
        <h3 className="mini-title">{t('intro.journeyTitle')}</h3>
        <Timeline/>
        <Button to="/about/" variant="green">{t('intro.cta')}</Button>
      </div>
    </div>
  </section>
}

function ServicePanels() {
  const { t } = useI18n()
  const [active, setActive] = useState(0)
  return <section className="services" aria-labelledby="services-title">
    <div className="container">
      <Reveal variant="up"><SectionHead id="services-title" eyebrow={t('services.eyebrow')} title={t('services.title')} lead={t('services.lead')} light>
        <Button to="/services/" variant="glass">{t('services.viewAll')}</Button>
      </SectionHead></Reveal>
      <div className="panels">
        {SERVICES.map((s, i) => {
          const item = t(`services.items.${s.key}`)
          return <Reveal key={s.key} variant="up" delay={i * 90} className={`panel-wrap ${active === i ? 'is-active' : ''}`}>
            <Link className="panel" to={`/services/${s.key}/`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
              <Picture image={s.image} alt="" sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 520px"/>
              <span className="panel-shade" aria-hidden="true"/>
              <span className="panel-num">0{i + 1}</span>
              <span className="panel-vertical" aria-hidden="true">{item.title}</span>
              <span className="panel-body">
                <span className="panel-icon"><Icon name={s.icon}/></span>
                <span className="panel-title">{item.title}</span>
                <span className="panel-sub">{item.subtitle}</span>
                <span className="panel-list">{item.list.slice(0, 4).map((x) => <span key={x}><Icon name="check"/>{x}</span>)}</span>
                <span className="panel-link">{t('common.explore')} <Icon name="arrow"/></span>
              </span>
            </Link>
          </Reveal>
        })}
      </div>
    </div>
  </section>
}

function ConsultationProcess() {
  const { t } = useI18n()
  const ref = useRef(null)
  const [step, setStep] = useState(0)
  const steps = t('process.steps')
  const onProgress = useCallback((p) => setStep(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999))), [steps.length])
  useScrollProgress(ref, { mode: 'pin', onProgress })
  return <section ref={ref} className="process" aria-labelledby="process-title" style={{ '--steps': steps.length }}>
    <div className="process-sticky">
      <div className="container process-grid">
        <div className="process-copy">
          <Eyebrow>{t('process.eyebrow')}</Eyebrow>
          <h2 id="process-title">{t('process.title')}</h2>
          <p className="section-lead">{t('process.lead')}</p>
          <ol className="process-steps">
            {steps.map((s, i) => <li key={s.title} className={i === step ? 'is-active' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="step-num">0{i + 1}</span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
              <Picture image={PROCESS_IMAGES[i]} className="step-thumb" alt="" sizes="120px"/>
            </li>)}
          </ol>
          <div className="process-bar" aria-hidden="true"><span/></div>
        </div>
        <div className="process-visual" aria-hidden="true">
          {PROCESS_IMAGES.map((image, i) => <Picture key={image} image={image} alt="" sizes="(max-width: 900px) 92vw, 560px" className={i === step ? 'is-active' : i < step ? 'is-past' : ''}/>)}
          <span className="process-count">{t('common.step')} 0{step + 1} <small>/ 0{steps.length}</small></span>
        </div>
      </div>
    </div>
  </section>
}

function ProgramsSection() {
  const { t } = useI18n()
  return <section className="programs" aria-labelledby="programs-title">
    <div className="container stack-grid">
      <div className="stack-intro">
        <Reveal variant="left">
          <SectionHead id="programs-title" eyebrow={t('programs.eyebrow')} title={t('programs.title')} lead={t('programs.lead')}/>
          <Button to="/programs/" variant="green">{t('programs.viewAll')}</Button>
        </Reveal>
      </div>
      <ProgramStack/>
    </div>
  </section>
}

function OnlineConsult() {
  const { t } = useI18n()
  const ref = useRef(null)
  useScrollProgress(ref)
  return <section ref={ref} className="online" aria-labelledby="online-title">
    <div className="container online-grid">
      <div className="online-media"><Picture image={IMAGES.online} alt="" sizes="(max-width: 900px) 92vw, 600px"/><span className="online-live"><Icon name="video"/>{t('online.eyebrow')}</span></div>
      <Reveal variant="right" className="online-copy">
        <Eyebrow>{t('online.eyebrow')}</Eyebrow>
        <h2 id="online-title">{t('online.title')}</h2>
        <p className="section-lead">{t('online.lead')}</p>
        <ul className="check-list">{t('online.points').map((p) => <li key={p}><Icon name="check"/>{p}</li>)}</ul>
        <div className="btn-row">
          <Button to="/book-consultation/" icon="video">{t('online.cta')}</Button>
          <Button href={CONTACT.emailHref} variant="outline" icon="mail">{CONTACT.email}</Button>
        </div>
      </Reveal>
    </div>
  </section>
}

const AUTOPLAY_MS = 6500

function Testimonials() {
  const { t } = useI18n()
  const items = t('testimonials.items')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const go = (dir) => setIndex((i) => (i + dir + items.length) % items.length)

  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined
    const id = setTimeout(() => setIndex((i) => (i + 1) % items.length), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [index, paused, items.length])

  const current = items[index]
  const initials = (name) => name.split(' ').map((n) => n[0]).join('').slice(0, 2)
  return <section className="testimonials" aria-labelledby="testimonials-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className="container testimonial-grid">
      <Reveal variant="left">
        <SectionHead id="testimonials-title" eyebrow={t('testimonials.eyebrow')} title={t('testimonials.title')}/>
        <div className="t-controls">
          <button type="button" onClick={() => go(-1)} aria-label={t('testimonials.prev')}><Icon name="left"/></button>
          <span className="t-count">{String(index + 1).padStart(2, '0')} <small>/ {String(items.length).padStart(2, '0')}</small></span>
          <button type="button" onClick={() => go(1)} aria-label={t('testimonials.next')}><Icon name="right"/></button>
        </div>
      </Reveal>
      <Reveal variant="scale" delay={120} className="t-stage">
        <Icon name="quote" className="t-quote-mark"/>
        <figure key={index} className="t-slide" aria-live="polite">
          <blockquote>{current.quote}</blockquote>
          <figcaption><span className={`t-avatar t-avatar-${index}`} aria-hidden="true">{initials(current.name)}</span><span><strong>{current.name}</strong><small>{current.city}</small></span><span className="stars" aria-label="5 / 5">★★★★★</span></figcaption>
        </figure>
        <div className="t-dots">
          {items.map((item, i) => <button type="button" key={item.name} className={i === index ? 'is-active' : ''} aria-label={`${t('testimonials.show')} ${i + 1}`} aria-pressed={i === index} onClick={() => setIndex(i)}><span style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}/></button>)}
        </div>
      </Reveal>
    </div>
  </section>
}

function Journal() {
  const { t } = useI18n()
  return <section className="journal" aria-labelledby="journal-title">
    <div className="container">
      <Reveal variant="up"><SectionHead id="journal-title" eyebrow={t('journal.eyebrow')} title={t('journal.title')} lead={t('journal.lead')}>
        <Button to="/articles/" variant="outline">{t('journal.viewAll')}</Button>
      </SectionHead></Reveal>
      <div className="article-grid">{POSTS.map((post, i) => <ArticleCard key={post.slug} post={post} delay={i * 110}/>)}</div>
    </div>
  </section>
}

export default function HomePage() {
  usePageTitle('')
  return <main id="main-content" className="homepage">
    <Hero/>
    <CredentialsMarquee/>
    <MeetDoctor/>
    <ServicePanels/>
    <ConsultationProcess/>
    <ClinicGallery/>
    <ProgramsSection/>
    <OnlineConsult/>
    <Testimonials/>
    <Journal/>
    <ContactCTA/>
  </main>
}

