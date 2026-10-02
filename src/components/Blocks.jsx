import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, GALLERY, IMAGES, PROGRAMS, QUALIFICATIONS } from '../data'
import { useI18n } from '../i18n'
import { Reveal, tilt, useScrollProgress } from '../motion'
import { Button, Eyebrow, Icon, SectionHead } from '../ui'
import Picture, { imageMeta } from './Picture'

/** Visible breadcrumb trail (the matching BreadcrumbList JSON-LD comes from src/seo.js). trail: [label, path][] after Home. */
/** @param {{ trail: [string, string][], light?: boolean }} props */
export function Breadcrumbs({ trail, light = true }) {
  const { t } = useI18n()
  return <nav className={`breadcrumbs ${light ? 'is-light' : ''}`} aria-label={t('nav.breadcrumb')}>
    <ol>
      <li><Link to="/">{t('nav.home')}</Link></li>
      {trail.map(([label, to], i) => <li key={label}>{i < trail.length - 1 ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}</li>)}
    </ol>
  </nav>
}

/** Inner-page hero. Its background image is the page's LCP element, so it loads eagerly at high priority. */
/** @param {{ eyebrow: string, title: string, lead?: string, image?: string, crumbs?: [string, string][], children?: import('react').ReactNode }} props */
export function PageHero({ eyebrow, title, lead = undefined, image = undefined, crumbs = undefined, children = null }) {
  const ref = useRef(null)
  useScrollProgress(ref, { mode: 'exit' })
  return <section ref={ref} className="page-hero">
    <div className="page-hero-bg" aria-hidden="true"><Picture image={image || IMAGES.hero} alt="" sizes="100vw" priority/></div>
    <div className="container page-hero-inner">
      {crumbs && <Breadcrumbs trail={crumbs}/>}
      <Eyebrow light>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      {lead && <p>{lead}</p>}
      {children}
    </div>
  </section>
}

export function QualificationGrid() {
  const { t } = useI18n()
  // Codes such as "MD (Ayu.)" contain dots, so look them up on the object rather than via a dot path.
  const labels = t('doctor.qualifications')
  return <ul className="qual-grid">
    {QUALIFICATIONS.map((code, i) => <Reveal as="li" key={code} variant="scale" delay={i * 70}>
      <div className="qual-card tilt" {...tilt}><strong>{code}</strong><span>{labels[code]}</span></div>
    </Reveal>)}
  </ul>
}

export function Timeline() {
  const { t } = useI18n()
  return <ol className="timeline">
    {t('doctor.roles').map((role, i) => <Reveal as="li" key={role.title} variant="left" delay={i * 120}>
      <span className="timeline-dot" aria-hidden="true"/>
      <span className="timeline-period">{role.period}</span>
      <h4>{role.title}</h4>
      <p className="timeline-org">{role.org}</p>
      <p>{role.text}</p>
    </Reveal>)}
  </ol>
}

function Lightbox({ index, onClose, onStep }) {
  const { t } = useI18n()
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const closeRef = useRef(null)
  const image = GALLERY[index]
  const captions = t('gallery.captions')

  useEffect(() => { setZoomed(false) }, [index])
  useEffect(() => {
    const previous = /** @type {HTMLElement | null} */ (document.activeElement)
    closeRef.current?.focus()
    document.body.classList.add('nav-open')
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('nav-open'); previous?.focus?.() }
  }, [onClose, onStep])

  const toggleZoom = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`)
    setZoomed((z) => !z)
  }

  return <div className="lightbox" role="dialog" aria-modal="true" aria-label={captions[index]} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <button ref={closeRef} type="button" className="lb-btn lb-close" onClick={onClose} aria-label={t('gallery.close')}><Icon name="close"/></button>
    <button type="button" className="lb-btn lb-prev" onClick={() => onStep(-1)} aria-label={t('gallery.prev')}><Icon name="left"/></button>
    <figure className="lb-figure">
      <button type="button" className={`lb-zoom ${zoomed ? 'is-zoomed' : ''}`} onClick={toggleZoom} aria-label={t('gallery.zoom')}>
        <Picture key={image} image={image} alt={`${t('gallery.alt')} — ${captions[index]}`} sizes="(max-width: 900px) 100vw, 70vw" loading="eager" style={{ transformOrigin: origin }}/>
      </button>
      <figcaption><span>{String(index + 1).padStart(2, '0')} / {String(GALLERY.length).padStart(2, '0')}</span>{captions[index]}</figcaption>
    </figure>
    <button type="button" className="lb-btn lb-next" onClick={() => onStep(1)} aria-label={t('gallery.next')}><Icon name="right"/></button>
  </div>
}

/** Auto-scrolling photo slideshow of real clinic moments with a zoomable lightbox. */
export function ClinicGallery() {
  const { t } = useI18n()
  const [active, setActive] = useState(null)
  const captions = t('gallery.captions')
  const loop = [...GALLERY, ...GALLERY]
  const close = useCallback(() => setActive(null), [])
  const step = useCallback((dir) => setActive((i) => (i + dir + GALLERY.length) % GALLERY.length), [])

  return <section className="gallery" aria-labelledby="gallery-title">
    <div className="container">
      <Reveal variant="up"><SectionHead id="gallery-title" eyebrow={t('gallery.eyebrow')} title={t('gallery.title')} lead={t('gallery.lead')} align="center"/></Reveal>
    </div>
    <div className="gallery-rail" aria-label={t('gallery.hint')}>
      <div className="gallery-track">
        {loop.map((image, i) => {
          const real = i % GALLERY.length
          const duplicate = i >= GALLERY.length
          const { w, h } = imageMeta(image)
          return <button type="button" key={`${image}-${i}`} className="gallery-item" style={{ '--ar': `${w} / ${h}` }} onClick={() => setActive(real)} aria-hidden={duplicate || undefined} tabIndex={duplicate ? -1 : 0} aria-label={`${captions[real]} — ${t('gallery.hint')}`}>
            <Picture image={image} alt="" sizes="(max-width: 700px) 70vw, 360px"/>
            <span className="gallery-caption"><Icon name="zoom"/>{captions[real]}</span>
          </button>
        })}
      </div>
    </div>
    <p className="gallery-hint"><Icon name="zoom"/>{t('gallery.hint')}</p>
    {active !== null && <Lightbox index={active} onClose={close} onStep={step}/>}
  </section>
}

/** @param {{ headingLevel?: 'h2' | 'h3' }} props */
export function ProgramStack({ headingLevel = 'h3' }) {
  const { t } = useI18n()
  const Heading = headingLevel
  return <div className="stack-cards">
    {PROGRAMS.map((p, i) => {
      const item = t(`programs.items.${p.key}`)
      return <article key={p.key} className="stack-card" style={{ '--i': i }}>
        <div className="stack-media"><Picture image={p.image} alt="" sizes="(max-width: 900px) 92vw, 560px"/><span className="stack-num">0{i + 1}</span></div>
        <div className="stack-body">
          <span className="tag">{item.tag}</span>
          <Heading>{item.title}</Heading>
          <p>{item.text}</p>
          <ul>{item.points.map((pt) => <li key={pt}><Icon name="check"/>{pt}</li>)}</ul>
          <div className="btn-row">
            <Button to="/book-consultation/" variant="outline">{t('programs.enquire')}</Button>
            <Link className="text-link" to={`/services/${p.service}/`}>{t('programs.related')}: {t(`services.items.${p.service}.title`)}<Icon name="arrow"/></Link>
          </div>
        </div>
      </article>
    })}
  </div>
}

export function ContactCTA() {
  const { t } = useI18n()
  const ref = useRef(null)
  useScrollProgress(ref)
  return <section ref={ref} className="cta" aria-labelledby="cta-title">
    <div className="cta-bg" aria-hidden="true"><Picture image={IMAGES.cta} alt="" sizes="100vw"/></div>
    <div className="container cta-inner">
      <Reveal variant="clip" className="cta-copy">
        <Eyebrow light>{t('cta.eyebrow')}</Eyebrow>
        <h2 id="cta-title">{t('cta.title')}</h2>
        <p>{t('cta.lead')}</p>
        <Button to="/book-consultation/" icon="calendar">{t('nav.book')}</Button>
      </Reveal>
      <Reveal variant="right" delay={150} className="cta-contacts">
        <a href={CONTACT.phoneHref} className="cta-contact tilt" {...tilt}><span className="cta-icon"><Icon name="phone"/></span><span><small>{t('cta.callLabel')}</small><strong>{CONTACT.phone}</strong></span></a>
        <a href={CONTACT.emailHref} className="cta-contact tilt" {...tilt}><span className="cta-icon"><Icon name="mail"/></span><span><small>{t('cta.emailLabel')}</small><strong>{CONTACT.email}</strong></span></a>
      </Reveal>
    </div>
  </section>
}

export function ArticleCard({ post, delay = 0 }) {
  const { t } = useI18n()
  const copy = t(`journal.posts.${post.slug}`)
  return <Reveal variant="up" delay={delay} className="article-reveal">
    <Link className="article-card tilt" to={`/articles/${post.slug}/`} {...tilt}>
      <div className="article-media"><Picture image={post.image} alt="" sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 380px"/></div>
      <div className="article-body">
        <span className="tag">{copy.category}</span>
        <h3>{copy.title}</h3>
        <p>{copy.excerpt}</p>
        <span className="article-meta">{post.minutes} {t('journal.minRead')}<span className="article-link">{t('journal.read')} <Icon name="arrow"/></span></span>
      </div>
    </Link>
  </Reveal>
}
