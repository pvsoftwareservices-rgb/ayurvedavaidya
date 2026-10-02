// Search-engine metadata for every public route. Plain JS (no JSX) so the app, the post-build
// prerender (scripts/prerender.mjs) and the SEO audit (scripts/audit-seo.mjs) share one source.
// Copy is taken from the English dictionary, which is what search engines see.
import { imageMeta, imageUrl } from './images.js'
import { CONTACT, DOCTOR_IMAGES, IMAGES, LOGO, POSTS, PROGRAMS, QUALIFICATIONS, SERVICES } from './data.js'
import en from './i18n/en.js'

export const SITE_URL = 'https://ayurvedavaidya.com'
export const SITE_NAME = 'AyurvedaVaidya'
export const LOCALE = 'en_IN'
/** Last content review of the site; a route can override it with `updated` (sitemap <lastmod>, Article dateModified). */
export const SITE_UPDATED = '2026-10-03'
const MAX_TITLE = 65
const DEFAULT_SHARE = { url: '/images/og/ayurvedavaidya.jpg', alt: 'AyurvedaVaidya logo — Ancient Wisdom. Modern Wellbeing.' }

export const absoluteUrl = (path) => `${SITE_URL}${path}`
/** Public page URLs end in a slash: each route is published as a folder with an index.html. Route paths here stay slash-free. */
export const pagePath = (path) => (path === '/' ? '/' : `${path}/`)
export const pageUrl = (path) => absoluteUrl(pagePath(path))

/** "Page | AyurvedaVaidya" when it fits in 65 characters, otherwise the page title alone. */
export const titled = (text) => (`${text} | ${SITE_NAME}`.length <= MAX_TITLE ? `${text} | ${SITE_NAME}` : text)

/** 1200×630 share image generated for an image key (falls back to the brand card). */
function shareImage(key, alt) {
  const og = key && imageMeta(key)?.og
  return og ? { url: og, alt } : DEFAULT_SHARE
}

const ORG_ID = `${SITE_URL}/#organization`
const PERSON_ID = `${SITE_URL}/about/#person`
const WEBSITE_ID = `${SITE_URL}/#website`

// No street address is published on the site yet, so the organization is not marked up as a LocalBusiness
// (an address is required there). Add `address` + switch to MedicalClinic once the client confirms it.
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE_NAME,
  alternateName: 'AyurvedaVaidya.com',
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: absoluteUrl(imageUrl(LOGO)), width: imageMeta(LOGO).w, height: imageMeta(LOGO).h },
  image: absoluteUrl(DEFAULT_SHARE.url),
  slogan: en.meta.tagline,
  email: CONTACT.email,
  telephone: `+${CONTACT.whatsapp}`,
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: `+${CONTACT.whatsapp}`, email: CONTACT.email, areaServed: 'IN' },
  founder: { '@id': PERSON_ID },
}

const WEBSITE = { '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: 'en', publisher: { '@id': ORG_ID } }

const PERSON = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: en.doctor.name,
  url: pageUrl('/about'),
  image: absoluteUrl(imageUrl(DOCTOR_IMAGES.portrait, 800)),
  jobTitle: 'Director & Chief Medical Officer',
  description: en.doctor.about[0],
  honorificSuffix: QUALIFICATIONS.slice(0, 3).join(', '),
  worksFor: { '@type': 'Organization', name: 'Ayurveda Clinic' },
  knowsAbout: ['Ayurveda', 'Clinical Psychology', 'Nutrition', 'Yoga', 'Integrative Healthcare'],
}

/** trail: [name, path][] after Home. */
function breadcrumbs(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [['Home', '/'], ...trail].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: pageUrl(path) })),
  }
}

const serviceRoutes = SERVICES.map((s) => {
  const item = en.services.items[s.key]
  const path = `/services/${s.key}`
  return {
    path,
    title: titled(item.subtitle),
    description: item.short,
    share: shareImage(s.image, `${item.subtitle} — consultation with ${en.doctor.name}`),
    hero: s.image,
    schema: [
      { '@type': 'Service', name: item.subtitle, serviceType: item.title, description: item.short, url: pageUrl(path), provider: { '@id': ORG_ID }, category: item.list.slice(0, 6) },
      breadcrumbs([['Services', '/services'], [item.title, path]]),
    ],
  }
})

const articleRoutes = POSTS.map((p) => {
  const post = en.journal.posts[p.slug]
  const path = `/articles/${p.slug}`
  const share = shareImage(p.image, post.title)
  return {
    path,
    type: 'article',
    title: titled(post.seoTitle ?? post.title),
    description: post.excerpt,
    share,
    hero: p.image,
    published: p.published,
    schema: [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image: [absoluteUrl(share.url)],
        datePublished: p.published,
        dateModified: SITE_UPDATED,
        author: { '@id': PERSON_ID },
        publisher: { '@id': ORG_ID },
        mainEntityOfPage: pageUrl(path),
        articleSection: post.category,
        inLanguage: 'en',
      },
      PERSON,
      breadcrumbs([['Journal', '/articles'], [post.title, path]]),
    ],
  }
})

const legalRoute = (type) => ({
  path: `/${type}`,
  title: titled(en.legal[type]),
  description: en.legal.pages[type].description,
  hero: IMAGES.hero,
  schema: [breadcrumbs([[en.legal[type], `/${type}`]])],
})

/** Every public route. `noindex` routes are kept out of the sitemap, carry robots noindex and have no canonical. */
export const ROUTES = [
  {
    path: '/',
    title: `${SITE_NAME} — Ayurvedic Consultations with ${en.doctor.name}`,
    description: 'Personal Ayurvedic consultations with Dr. Tejendra Singh (BAMS, MD Ayu.), combining Ayurveda, clinical psychology, nutrition and yoga. Online, phone and in-clinic.',
    share: shareImage(DOCTOR_IMAGES.portrait, `${en.doctor.name}, Ayurvedic physician`),
    hero: null, // LCP is the hero photo wall; its first tiles are eager + high priority in the markup.
    schema: [WEBSITE, PERSON],
  },
  {
    path: '/about',
    type: 'profile',
    title: titled(`About ${en.doctor.name}, Ayurvedic Physician`),
    description: 'Dr. Tejendra Singh — BAMS, MD (Ayu.), MAPC (Clin. Psych.) — Ayurvedic physician, academician and Director & CMO at Ayurveda Clinic. Qualifications and approach.',
    share: shareImage(DOCTOR_IMAGES.profile, en.doctor.profileAlt),
    hero: DOCTOR_IMAGES.profile,
    heroSizes: '(max-width: 900px) 80vw, 460px',
    schema: [{ '@type': 'ProfilePage', url: pageUrl('/about'), mainEntity: { '@id': PERSON_ID } }, PERSON, breadcrumbs([['About Dr. Tejendra', '/about']])],
  },
  {
    path: '/services',
    title: titled('Ayurveda, Nutrition & Yoga Consultations'),
    description: `${en.services.pageLead} Every consultation is led by Dr. Tejendra Singh.`,
    share: shareImage(IMAGES.hero, 'Ayurvedic consultation services'),
    hero: IMAGES.hero,
    schema: [breadcrumbs([['Services', '/services']])],
  },
  ...serviceRoutes,
  {
    path: '/programs',
    title: titled('Ayurvedic Wellness Programs'),
    description: 'Physician-supervised programs for detox & rejuvenation, weight & metabolic balance, stress & sleep, and seasonal & preventive wellness.',
    share: shareImage(PROGRAMS[0].image, 'Ayurvedic wellness programs'),
    hero: PROGRAMS[0].image,
    schema: [breadcrumbs([['Programs', '/programs']])],
  },
  {
    path: '/articles',
    title: titled('Ayurveda, Nutrition & Wellbeing Journal'),
    description: `${en.journal.lead} Written for general education by the AyurvedaVaidya team.`,
    share: shareImage(POSTS[0].image, 'The AyurvedaVaidya journal'),
    hero: POSTS[0].image,
    schema: [breadcrumbs([['Journal', '/articles']])],
  },
  ...articleRoutes,
  {
    path: '/book-consultation',
    title: titled(`Book a Consultation with ${en.doctor.name}`),
    description: `Book an online, phone or in-clinic consultation with Dr. Tejendra Singh. Call ${CONTACT.phone}, email ${CONTACT.email}, or send a request.`,
    share: shareImage(IMAGES.booking, 'Book a consultation'),
    hero: IMAGES.booking,
    schema: [breadcrumbs([['Book a Consultation', '/book-consultation']])],
  },
  legalRoute('privacy'),
  legalRoute('terms'),
  legalRoute('disclaimer'),
  {
    path: '/thank-you',
    noindex: true,
    title: titled('Thank You — Request Sent'),
    description: 'Thank you for your consultation request. AyurvedaVaidya will reply by phone or email to confirm your appointment with Dr. Tejendra Singh.',
    hero: IMAGES.cta,
  },
]

export const NOT_FOUND_META = { path: null, title: titled('Page Not Found'), description: 'The page you are looking for may have moved or no longer exists. Find Ayurvedic consultations, programs and articles from AyurvedaVaidya.', noindex: true, hero: IMAGES.hero }

/** Duplicate app routes → preferred route. Published as 301s (.htaccess) plus fallback redirect pages. */
export const REDIRECTS = { '/contact': '/book-consultation', '/ayurveda': '/services/ayurveda' }

export function getRouteMeta(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const path = REDIRECTS[clean] ?? clean
  return ROUTES.find((r) => r.path === path) ?? null
}

/** Resolved head values for a route (or the 404 meta). */
export function headFor(route) {
  const share = route.share ?? DEFAULT_SHARE
  return {
    title: route.title,
    description: route.description,
    robots: route.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    canonical: route.path && !route.noindex ? pageUrl(route.path) : null,
    ogType: route.type ?? 'website',
    image: { url: absoluteUrl(share.url), alt: share.alt, w: 1200, h: 630 },
  }
}

/**
 * Head tags (besides <title> and JSON-LD) as data: [attribute, key, value] for <meta>,
 * or ['rel', 'canonical', href] for the canonical <link>. A null value means "omit".
 */
export function headTags(route) {
  const h = headFor(route)
  return [
    ['name', 'description', h.description],
    ['name', 'robots', h.robots],
    ['rel', 'canonical', h.canonical],
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:locale', LOCALE],
    ['property', 'og:type', h.ogType],
    ['property', 'og:title', h.title],
    ['property', 'og:description', h.description],
    ['property', 'og:url', h.canonical],
    ['property', 'og:image', h.image.url],
    ['property', 'og:image:width', String(h.image.w)],
    ['property', 'og:image:height', String(h.image.h)],
    ['property', 'og:image:alt', h.image.alt],
    ['property', 'article:published_time', route.published ?? null],
    ['property', 'article:modified_time', route.published ? (route.updated ?? SITE_UPDATED) : null],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', h.title],
    ['name', 'twitter:description', h.description],
    ['name', 'twitter:image', h.image.url],
    ['name', 'twitter:image:alt', h.image.alt],
  ]
}

/** JSON-LD graph: organization + website on every indexable page, plus page-specific nodes. */
export function jsonLdFor(route) {
  if (!route.path || route.noindex) return null
  const nodes = [ORGANIZATION, ...(route.schema ?? [])]
  if (!nodes.includes(WEBSITE)) nodes.push(WEBSITE)
  return { '@context': 'https://schema.org', '@graph': nodes }
}

/** JSON for a <script type="application/ld+json">: "<" is escaped so the content can never close the tag. */
export const serializeJsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c')

/** Image-preload hints for a route's LCP hero image (AVIF, with the same srcset/sizes as the rendered <picture>). */
export function heroPreload(route) {
  const key = route.hero
  if (!key) return null
  const meta = imageMeta(key)
  const srcset = meta.widths.map((w) => `${imageUrl(key, w, 'avif')} ${w}w`).join(', ')
  return { href: imageUrl(key, meta.widths[0], 'avif'), srcset, sizes: route.heroSizes ?? '100vw', type: 'image/avif' }
}
