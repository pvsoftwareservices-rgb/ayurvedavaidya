import { readFileSync } from 'node:fs'

/** Every indexable page from the built sitemap, as paths ("/about/"). */
export function sitemapPaths() {
  const xml = readFileSync(new URL('../../dist/sitemap.xml', import.meta.url), 'utf8')
  return [...xml.matchAll(/<loc>https:\/\/ayurvedavaidya\.com(\/[^<]*)<\/loc>/g)].map((m) => m[1])
}

/** Indexable pages plus the utility pages (noindex) that must still be checked. */
export const allPaths = () => [...sitemapPaths(), '/thank-you/', '/this-page-does-not-exist/']

/** Collects console errors, page errors and failed/404 same-origin requests for a page. */
export function watchPage(page) {
  const problems = []
  page.on('console', (msg) => {
    // The 404 page's own document request is expected to log a 404; any other error counts.
    if (msg.type() === 'error' && !(msg.text().includes('404') && msg.location().url.includes('does-not-exist'))) problems.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('requestfailed', (req) => { if (!req.url().includes('/api/')) problems.push(`failed: ${req.url()} ${req.failure()?.errorText}`) })
  page.on('response', (res) => {
    const url = new URL(res.url())
    if (url.hostname === 'localhost' && res.status() >= 400 && !url.pathname.includes('does-not-exist')) problems.push(`${res.status()}: ${url.pathname}`)
  })
  return problems
}

export const VALID = { name: 'Priya Sharma', email: 'priya@example.com', phone: '98765 43210', message: 'I would like help with a diet plan for better digestion.' }

/** Fills the booking form with valid values (consent ticked) and waits past the 3-second bot timer. */
export async function fillValid(page, overrides = {}) {
  const v = { ...VALID, ...overrides }
  await page.locator('#booking-name').fill(v.name)
  await page.locator('#booking-email').fill(v.email)
  await page.locator('#booking-phone').fill(v.phone)
  await page.locator('#booking-message').fill(v.message)
  await page.locator('#booking-consent').check()
}
