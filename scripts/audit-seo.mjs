// Technical SEO audit of the production build (run `npm run build` first):   npm run audit:seo
// Checks every built HTML page in dist/ — titles, descriptions, headings, alt text, robots, canonical,
// Open Graph/Twitter, JSON-LD, internal links, images, favicons — plus sitemap.xml, sitemap-index.xml and
// robots.txt. Exits with code 1 when any issue is found.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'node-html-parser'
import sharp from 'sharp'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const SITE = 'https://ayurvedavaidya.com'
const INDEX_ROBOTS = 'index, follow, max-image-preview:large'
const NOINDEX_ROBOTS = 'noindex, follow'
const TITLE_MAX = 65
const DESC_MIN = 70
const DESC_MAX = 170

const issues = []
const issue = (page, message) => issues.push(`${page}: ${message}`)

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === 'api' ? [] : htmlFiles(full)
    return name.endsWith('.html') ? [full] : []
  })
}

/** URL path for a built file: about/index.html → /about/, 404.html → /404.html */
const urlPathOf = (file) => `/${relative(DIST, file).split(sep).join('/')}`.replace(/index\.html$/, '')

/** Does an internal URL resolve to a file the host will serve? */
function resolves(href) {
  const path = decodeURIComponent(new URL(href, SITE).pathname)
  const target = join(DIST, path)
  if (path.endsWith('/')) return existsSync(join(target, 'index.html'))
  return existsSync(target) && statSync(target).isFile()
}

const isInternal = (href) => href.startsWith('/') && !href.startsWith('//') || href.startsWith(SITE)
const meta = (root, attr, key) => root.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null

const pages = []
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8')
  const root = parse(html)
  const path = urlPathOf(file)
  if (root.querySelector('meta[http-equiv="refresh"]')) {
    // Redirect fallback page (the 301 lives in .htaccess): must be noindex and point at the target.
    if (meta(root, 'name', 'robots') !== NOINDEX_ROBOTS) issue(path, 'redirect page is not noindex')
    continue
  }
  pages.push({ file, path, html, root })
}

const indexable = []
const titles = new Map()
const descriptions = new Map()

for (const { path, html, root } of pages) {
  const robots = meta(root, 'name', 'robots')
  const noindex = robots?.startsWith('noindex')
  const title = root.querySelector('title')?.text.trim() ?? ''
  const description = meta(root, 'name', 'description') ?? ''
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
  const expectedUrl = `${SITE}${path}`

  // Title & description
  if (!title) issue(path, 'missing <title>')
  else if (title.length > TITLE_MAX) issue(path, `title is ${title.length} characters (max ${TITLE_MAX}): "${title}"`)
  if (description.length < DESC_MIN || description.length > DESC_MAX) issue(path, `description is ${description.length} characters (want ${DESC_MIN}–${DESC_MAX})`)
  if (!noindex) {
    titles.set(title, [...(titles.get(title) ?? []), path])
    descriptions.set(description, [...(descriptions.get(description) ?? []), path])
  }

  // Robots & canonical
  if (noindex) {
    if (robots !== NOINDEX_ROBOTS) issue(path, `robots should be "${NOINDEX_ROBOTS}", got "${robots}"`)
    if (canonical) issue(path, 'noindex page must not have a canonical tag')
  } else {
    if (robots !== INDEX_ROBOTS) issue(path, `robots should be "${INDEX_ROBOTS}", got "${robots}"`)
    if (canonical !== expectedUrl) issue(path, `canonical should be ${expectedUrl}, got ${canonical}`)
    indexable.push(expectedUrl)
  }
  if (path === '/404.html' && !noindex) issue(path, '404 page must be noindex')

  // URL format: lowercase, hyphenated, trailing slash
  if (path !== '/404.html' && !/^\/([a-z0-9]+(-[a-z0-9]+)*\/)*$/.test(path)) issue(path, 'URL is not lowercase-hyphenated with a trailing slash')

  // Headings: exactly one h1, no skipped levels (document order, header/footer included)
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6').map((h) => Number(h.tagName[1]))
  const h1s = headings.filter((n) => n === 1).length
  if (h1s !== 1) issue(path, `${h1s} <h1> elements (want exactly 1)`)
  headings.forEach((level, i) => {
    const prev = headings.slice(0, i).at(-1) ?? 0
    if (level > prev + 1) issue(path, `heading level skipped: h${prev} → h${level}`)
  })

  // Images: alt attribute present; src/srcset resolve; width/height set
  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src') ?? ''
    if (!img.hasAttribute('alt')) issue(path, `<img src="${src}"> has no alt attribute`)
    else if (/\.(webp|avif|jpe?g|png)$/i.test(img.getAttribute('alt'))) issue(path, `alt text looks like a file name: ${img.getAttribute('alt')}`)
    if (!img.getAttribute('width') || !img.getAttribute('height')) issue(path, `<img src="${src}"> has no width/height (layout shift)`)
    if (isInternal(src) && !resolves(src)) issue(path, `missing image ${src}`)
  }
  for (const el of root.querySelectorAll('source[srcset], img[srcset]')) {
    for (const candidate of el.getAttribute('srcset').split(',')) {
      const url = candidate.trim().split(/\s+/)[0]
      if (isInternal(url) && !resolves(url)) issue(path, `missing srcset image ${url}`)
    }
  }

  // Internal links
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href')
    if (!isInternal(href) || href.startsWith('/api/')) continue
    const clean = href.split('#')[0].split('?')[0] || '/'
    if (!resolves(clean)) issue(path, `broken internal link ${href}`)
    else if (!clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) issue(path, `internal link without trailing slash: ${href}`)
  }
  for (const form of root.querySelectorAll('form[action]')) {
    if (!existsSync(join(DIST, form.getAttribute('action')))) issue(path, `form action ${form.getAttribute('action')} does not exist`)
  }

  // Head assets: favicons, manifest, stylesheet/script/preload references
  for (const rel of ['icon', 'apple-touch-icon', 'manifest']) {
    if (!root.querySelector(`link[rel="${rel}"]`)) issue(path, `missing <link rel="${rel}">`)
  }
  for (const link of root.querySelectorAll('link[href], script[src]')) {
    const ref = link.getAttribute('href') ?? link.getAttribute('src')
    if (link.getAttribute('rel') === 'canonical' || !isInternal(ref)) continue
    if (!resolves(ref)) issue(path, `missing head asset ${ref}`)
  }

  // Open Graph & Twitter
  const og = (key) => meta(root, 'property', `og:${key}`)
  for (const key of ['site_name', 'locale', 'title', 'description', 'type', 'image', 'image:width', 'image:height', 'image:alt']) {
    if (!og(key)) issue(path, `missing og:${key}`)
  }
  if (!noindex && og('url') !== expectedUrl) issue(path, `og:url should be ${expectedUrl}`)
  if (og('image:width') !== '1200' || og('image:height') !== '630') issue(path, 'og:image is not declared as 1200×630')
  const expectedType = /^\/articles\/[^/]+\/$/.test(path) ? 'article' : null
  if (expectedType && og('type') !== expectedType) issue(path, `og:type should be article, got ${og('type')}`)
  for (const key of ['card', 'title', 'description', 'image', 'image:alt']) {
    if (!meta(root, 'name', `twitter:${key}`)) issue(path, `missing twitter:${key}`)
  }
  const ogImage = og('image')
  if (ogImage) {
    const local = join(DIST, new URL(ogImage).pathname)
    if (!existsSync(local)) issue(path, `og:image file missing: ${ogImage}`)
    else {
      const { width, height } = await sharp(local).metadata()
      if (width !== 1200 || height !== 630) issue(path, `og:image is ${width}×${height}, not 1200×630`)
    }
  }

  // JSON-LD
  const scripts = root.querySelectorAll('script[type="application/ld+json"]')
  if (noindex) continue
  if (scripts.length !== 1) { issue(path, `${scripts.length} JSON-LD blocks (want 1)`); continue }
  const raw = scripts[0].innerHTML
  if (raw.includes('<')) issue(path, 'JSON-LD contains an unescaped "<"')
  let graph = []
  try { graph = JSON.parse(raw)['@graph'] ?? [] } catch (error) { issue(path, `invalid JSON-LD: ${error.message}`) }
  const types = graph.map((n) => n['@type'])
  const org = graph.find((n) => n['@type'] === 'Organization')
  if (!org) issue(path, 'JSON-LD has no Organization')
  else for (const key of ['@id', 'name', 'url', 'logo', 'telephone', 'email']) if (!org[key]) issue(path, `Organization is missing ${key}`)
  if (!types.includes('WebSite')) issue(path, 'JSON-LD has no WebSite')
  if (path !== '/' && !types.includes('BreadcrumbList')) issue(path, 'inner page has no BreadcrumbList')
  if (expectedType === 'article') {
    const article = graph.find((n) => n['@type'] === 'Article')
    if (!article) issue(path, 'article page has no Article JSON-LD')
    else for (const key of ['headline', 'image', 'datePublished', 'author', 'publisher']) if (!article[key]) issue(path, `Article is missing ${key}`)
  }
  if ((path === '/' || path === '/about/') && !types.includes('Person')) issue(path, 'founder Person missing from JSON-LD')
  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')
  if (crumbs && crumbs.itemListElement.at(-1)?.item !== expectedUrl) issue(path, 'last breadcrumb is not this page')
  if (crumbs && !root.querySelector('nav.breadcrumbs')) issue(path, 'BreadcrumbList JSON-LD without visible breadcrumbs')
}

// Duplicates across indexable pages
for (const [title, paths] of titles) if (paths.length > 1) issue(paths.join(', '), `duplicate title "${title}"`)
for (const [desc, paths] of descriptions) if (paths.length > 1) issue(paths.join(', '), `duplicate description "${desc.slice(0, 60)}…"`)

// Sitemap = exactly the indexable pages, each with a valid lastmod
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
for (const url of indexable) if (!locs.includes(url)) issue('sitemap.xml', `indexable page missing: ${url}`)
for (const url of locs) if (!indexable.includes(url)) issue('sitemap.xml', `lists a URL that is not an indexable page: ${url}`)
if (lastmods.length !== locs.length || lastmods.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) issue('sitemap.xml', 'every <url> needs a YYYY-MM-DD <lastmod>')
const sitemapIndex = existsSync(join(DIST, 'sitemap-index.xml')) ? readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8') : ''
if (!sitemapIndex.includes(`<loc>${SITE}/sitemap.xml</loc>`)) issue('sitemap-index.xml', 'missing or does not reference sitemap.xml')

// robots.txt: allow everything, list the sitemap index, never block CSS/JS or noindex pages
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8')
if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) issue('robots.txt', 'missing "Sitemap:" line for sitemap-index.xml')
for (const line of robots.split('\n').filter((l) => /^disallow:\s*\S/i.test(l))) issue('robots.txt', `blocks crawling: "${line.trim()}"`)

// Favicon files and manifest
for (const file of ['favicon.ico', 'favicon.svg', 'favicon-48x48.png', 'favicon-96x96.png', 'apple-touch-icon.png', 'web-app-manifest-192x192.png', 'web-app-manifest-512x512.png', 'site.webmanifest']) {
  if (!existsSync(join(DIST, file))) issue(file, 'missing')
}
for (const [file, size] of [['favicon-48x48.png', 48], ['favicon-96x96.png', 96], ['apple-touch-icon.png', 180], ['web-app-manifest-192x192.png', 192], ['web-app-manifest-512x512.png', 512]]) {
  if (!existsSync(join(DIST, file))) continue
  const { width, height } = await sharp(join(DIST, file)).metadata()
  if (width !== size || height !== size) issue(file, `is ${width}×${height}, want ${size}×${size}`)
}
const manifest = JSON.parse(readFileSync(join(DIST, 'site.webmanifest'), 'utf8'))
for (const key of ['name', 'short_name', 'icons', 'theme_color', 'background_color']) if (!manifest[key]) issue('site.webmanifest', `missing ${key}`)

console.log(`SEO audit: ${pages.length} pages checked (${indexable.length} indexable, ${pages.length - indexable.length} noindex), sitemap ${locs.length} URLs`)
if (issues.length) {
  console.log(`\n${issues.length} issue(s):`)
  for (const line of issues) console.log(`  ✗ ${line}`)
  process.exit(1)
}
console.log('✓ No issues found')
