import { Link } from 'react-router-dom'
import { ArticleCard, ContactCTA, PageHero } from '../components/Blocks'
import Picture from '../components/Picture'
import { POSTS, SERVICES } from '../data'
import { useI18n, usePageTitle } from '../i18n'
import { Reveal, tilt } from '../motion'
import { Button, Eyebrow, Icon } from '../ui'

function ServiceBand({ service, index, overview }) {
  const { t } = useI18n()
  const item = t(`services.items.${service.key}`)
  return <article className={`service-band ${index % 2 ? 'is-flipped' : ''}`} id={service.key}>
    <Reveal variant={index % 2 ? 'right' : 'left'} className="service-media">
      <Picture image={service.image} alt="" sizes="(max-width: 900px) 92vw, 560px"/>
      <span className="service-index">0{index + 1}</span>
    </Reveal>
    <Reveal variant="up" delay={120} className="service-copy">
      <Eyebrow><Icon name={service.icon}/> {item.title}</Eyebrow>
      <h2>{item.subtitle}</h2>
      <p className="section-lead">{item.short}</p>
      <h3 className="mini-title">{t('services.covers')}</h3>
      <ul className="service-items">{item.list.map((x) => <li key={x}><Icon name="check"/>{x}</li>)}</ul>
      <div className="btn-row">
        <Button to="/book-consultation/" icon="calendar">{t('services.discuss')}</Button>
        {overview && <Link className="text-link" to={`/services/${service.key}/`}>{t('services.details')}: {item.title}<Icon name="arrow"/></Link>}
      </div>
    </Reveal>
  </article>
}

/** Programs and journal articles connected to one service (cross-links between detail pages). */
function RelatedContent({ service }) {
  const { t } = useI18n()
  const posts = POSTS.filter((p) => service.articles.includes(p.slug))
  return <section className="section related" aria-labelledby="related-title">
    <div className="container">
      <h2 id="related-title" className="principles-title">{t('services.relatedTitle')}</h2>
      <ul className="related-programs">
        {service.programs.map((key) => <li key={key}><Link to="/programs/" className="text-link"><Icon name="spark"/>{t(`programs.items.${key}.title`)}<Icon name="arrow"/></Link></li>)}
      </ul>
      <div className="article-grid">{posts.map((post, i) => <ArticleCard key={post.slug} post={post} delay={i * 110}/>)}</div>
    </div>
  </section>
}

/** @param {{ single?: string }} props */
export default function ServicesPage({ single = undefined }) {
  const { t } = useI18n()
  const service = single ? SERVICES.find((s) => s.key === single) : null
  const item = service ? t(`services.items.${service.key}`) : null
  usePageTitle(item ? item.title : t('services.pageTitle'))

  const list = service ? [service] : SERVICES
  const others = service ? SERVICES.filter((s) => s.key !== service.key) : []
  /** @type {[string, string][]} */
  const crumbs = item ? [[t('nav.services'), '/services/'], [item.title, `/services/${service.key}/`]] : [[t('nav.services'), '/services/']]

  return <main id="main-content">
    <PageHero eyebrow={item ? item.title : t('services.pageEyebrow')} title={item ? item.subtitle : t('services.pageTitle')} lead={item ? item.short : t('services.pageLead')} image={service?.image} crumbs={crumbs}/>
    <section className="section services-list">
      <div className="container">
        {list.map((s) => <ServiceBand key={s.key} service={s} index={SERVICES.indexOf(s)} overview={!service}/>)}
      </div>
    </section>
    {service && <RelatedContent service={service}/>}
    {others.length > 0 && <section className="section other-services">
      <div className="container">
        <Reveal variant="up"><h2 className="principles-title">{t('services.others')}</h2></Reveal>
        <div className="mini-card-grid">
          {others.map((s, i) => <Reveal key={s.key} variant="up" delay={i * 90}>
            <Link to={`/services/${s.key}/`} className="mini-card tilt" {...tilt}>
              <Picture image={s.image} alt="" sizes="(max-width: 700px) 92vw, 380px"/>
              <span className="mini-card-body"><Icon name={s.icon}/><strong>{t(`services.items.${s.key}.title`)}</strong><small>{t(`services.items.${s.key}.subtitle`)}</small><Icon name="arrow" className="mini-card-arrow"/></span>
            </Link>
          </Reveal>)}
        </div>
      </div>
    </section>}
    <ContactCTA/>
  </main>
}
