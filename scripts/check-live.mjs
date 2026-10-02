// Post-deployment check of the live site (read-only: GET/HEAD requests only, the form is never submitted).
//   npm run check:live                       → https://ayurvedavaidya.com
//   BASE_URL=https://preview.example npm run check:live
// Compares the deployed version with the local build (run `npm run build` first) and checks status codes,
// redirects, headers, robots/sitemaps, favicons and that the PHP form endpoint is executing.
import { existsSync, readFileSync } from 'node:fs'

const BASE = (process.env.BASE_URL ?? 'https://ayurvedavaidya.com').replace(/\/$/, '')
const HOST = new URL(BASE).host
const results = []
const check = (ok, label, detail = '') => results.push({ ok, label, detail })

async function get(path, init = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  try {
    return await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'AyurvedaVaidya-deploy-check' }, ...init })
  } catch (error) {
    return { status: 0, headers: new Headers(), text: async () => String(error.cause ?? error) }
  }
}

async function redirect(from, to) {
  const res = await get(from)
  const location = res.headers.get('location') ?? ''
  check([301, 308].includes(res.status) && location === to, `redirect ${from}`, `${res.status} → ${location || '(none)'} (want 301 → ${to})`)
}

// 1. Deployed version = local build
const home = await get('/')
const liveHtml = home.status === 200 ? await home.text() : ''
const asset = (html) => html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null
const localHtml = existsSync('dist/index.html') ? readFileSync('dist/index.html', 'utf8') : ''
check(home.status === 200, 'home page responds 200', String(home.status))
check(Boolean(asset(liveHtml)) && asset(liveHtml) === asset(localHtml), 'live site runs the current build', `live ${asset(liveHtml)} · local ${asset(localHtml) ?? 'no local build'}`)
check(liveHtml.includes('id="main-content"') && liveHtml.includes('<h1'), 'pages are pre-rendered (content in the HTML)')

// 2. Error page
const missing = await get(`/this-page-does-not-exist-${Date.now()}/`)
const missingHtml = await missing.text()
check(missing.status === 404, '404 page returns HTTP 404', String(missing.status))
check(/name="robots" content="noindex/.test(missingHtml) && !missingHtml.includes('rel="canonical"'), '404 page is noindex without canonical')

// 3. Redirects (single hop to the canonical https://apex/ URL with trailing slash)
await redirect(`http://${HOST}/`, `https://${HOST}/`)
await redirect(`https://www.${HOST}/`, `https://${HOST}/`)
await redirect('/about', `https://${HOST}/about/`)
await redirect('/index.html', `https://${HOST}/`)
await redirect('/contact/', `https://${HOST}/book-consultation/`)

// 4. Headers
for (const name of ['x-content-type-options', 'referrer-policy', 'x-frame-options']) check(Boolean(home.headers.get(name)), `header ${name}`, home.headers.get(name) ?? 'missing')
const js = asset(liveHtml) ? await get(asset(liveHtml), { method: 'HEAD' }) : null
check(/max-age=31536000/.test(js?.headers.get('cache-control') ?? ''), 'hashed assets cached for a year', js?.headers.get('cache-control') ?? 'n/a')

// 5. robots.txt and sitemaps
const robots = await get('/robots.txt')
const robotsText = await robots.text()
check(robots.status === 200 && robotsText.includes(`Sitemap: https://${HOST}/sitemap-index.xml`), 'robots.txt lists sitemap-index.xml')
check(!/^disallow:\s*\S/im.test(robotsText), 'robots.txt blocks nothing')
const index = await get('/sitemap-index.xml')
check(index.status === 200, 'sitemap-index.xml responds 200', String(index.status))
const sitemap = await get('/sitemap.xml')
const liveUrls = (await sitemap.text()).match(/<loc>/g)?.length ?? 0
const localUrls = existsSync('dist/sitemap.xml') ? readFileSync('dist/sitemap.xml', 'utf8').match(/<loc>/g)?.length : null
check(sitemap.status === 200 && liveUrls > 0 && (localUrls == null || liveUrls === localUrls), 'sitemap.xml matches the build', `${liveUrls} URLs live · ${localUrls ?? '?'} local`)
const thanks = await get('/thank-you/')
check(thanks.status === 200 && /content="noindex, follow"/.test(await thanks.text()), '/thank-you/ exists and is noindex')

// 6. Favicons (Google reads the homepage icon)
for (const file of ['/favicon.ico', '/favicon.svg', '/favicon-48x48.png', '/favicon-96x96.png', '/apple-touch-icon.png', '/web-app-manifest-192x192.png', '/web-app-manifest-512x512.png', '/site.webmanifest']) {
  const res = await get(file, { method: 'HEAD' })
  check(res.status === 200, `favicon ${file}`, String(res.status))
}

// 7. Form endpoint: a GET must reach PHP (405 JSON). Nothing is sent.
const endpoint = await get('/api/contact.php')
const body = await endpoint.text()
check(endpoint.status === 405 && body.includes('"error":"method"'), 'form endpoint /api/contact.php is executing PHP', `${endpoint.status} ${body.slice(0, 60)}`)
const lib = await get('/api/lib/Support.php')
check([403, 404].includes(lib.status), 'form library folder is not reachable', String(lib.status))

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.label}${r.detail ? `  — ${r.detail}` : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} checks passed for ${BASE}`)
process.exit(failed.length ? 1 : 0)
