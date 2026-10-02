import { Link, useParams } from 'react-router-dom'
import { ArticleCard, ContactCTA, PageHero } from '../components/Blocks'
import Picture from '../components/Picture'
import { POSTS, SERVICES } from '../data'
import { useI18n, usePageTitle } from '../i18n'
import { Reveal } from '../motion'
import { Button, Icon } from '../ui'
import NotFound from './NotFound'

export function ArticlesPage() {
  const { t } = useI18n()
  usePageTitle(t('journal.title'))
  return <main id="main-content">
    <PageHero eyebrow={t('journal.eyebrow')} title={t('journal.title')} lead={t('journal.lead')} image={POSTS[0].image} crumbs={[[t('nav.journal'), '/articles/']]}/>
    <section className="section journal" aria-labelledby="all-articles">
      <div className="container">
        <h2 id="all-articles" className="principles-title">{t('journal.allTitle')}</h2>
        <div className="article-grid">{POSTS.map((post, i) => <ArticleCard key={post.slug} post={post} delay={i * 110}/>)}</div>
      </div>
    </section>
    <ContactCTA/>
  </main>
}

/** "Related service" box shown beside each article: links journal content to the matching consultation page. */
function RelatedService({ serviceKey }) {
  const { t } = useI18n()
  const service = SERVICES.find((s) => s.key === serviceKey)
  const item = t(`services.items.${service.key}`)
  return <div className="related-service">
    <h2 className="mini-title">{t('journal.relatedService')}</h2>
    <Link to={`/services/${service.key}/`} className="aside-post">
      <Picture image={service.image} alt="" sizes="90px"/>
      <span><small>{item.title}</small>{item.subtitle}</span>
    </Link>
    <Button to="/book-consultation/" variant="outline" icon="calendar">{t('nav.book')}</Button>
  </div>
}

export function ArticlePage() {
  const { slug } = useParams()
  const { t } = useI18n()
  const post = POSTS.find((p) => p.slug === slug)
  const copy = post ? t(`journal.posts.${post.slug}`) : null
  usePageTitle(copy?.title ?? t('notFound.title'))
  if (!post) return <NotFound/>

  const others = POSTS.filter((p) => p.slug !== slug)
  return <main id="main-content">
    <PageHero eyebrow={copy.category} title={copy.title} lead={`${post.minutes} ${t('journal.minRead')}`} image={post.image} crumbs={[[t('nav.journal'), '/articles/'], [copy.title, `/articles/${post.slug}/`]]}/>
    <section className="section article-page">
      <div className="container article-layout">
        <article className="article-content">
          <Link to="/articles/" className="back-link"><Icon name="left"/>{t('journal.back')}</Link>
          <p className="article-excerpt">{copy.excerpt}</p>
          {copy.body.map((para, i) => <Reveal key={para} variant="up" delay={i * 60}><p>{para}</p></Reveal>)}
          <p className="article-disclaimer"><Icon name="shield"/>{t('journal.disclaimer')}</p>
        </article>
        <aside className="article-aside">
          <RelatedService serviceKey={post.service}/>
          <h2 className="mini-title">{t('journal.moreTitle')}</h2>
          {others.map((p) => <Link key={p.slug} to={`/articles/${p.slug}/`} className="aside-post">
            <Picture image={p.image} alt="" sizes="90px"/>
            <span><small>{t(`journal.posts.${p.slug}.category`)}</small>{t(`journal.posts.${p.slug}.title`)}</span>
          </Link>)}
        </aside>
      </div>
    </section>
    <ContactCTA/>
  </main>
}
