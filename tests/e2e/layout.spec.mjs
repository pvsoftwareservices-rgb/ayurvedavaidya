// Responsive layout: no horizontal scroll at 320–1440 px, and touch targets at least 24×24 CSS px
// (WCAG 2.2 target size minimum; links inside running text are exempt).
import { expect, test } from '@playwright/test'
import { allPaths } from './helpers.mjs'

const WIDTHS = [320, 375, 768, 1024, 1440]
const PAGES = allPaths().filter((p) => !p.includes('does-not-exist')).concat('/missing-page/')

for (const width of WIDTHS) {
  test(`${width}px: no horizontal scroll and large-enough tap targets on every page`, async ({ browser }) => {
    test.setTimeout(240000)
    const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < 1024, isMobile: width < 768 })
    const page = await context.newPage()
    const failures = []
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('load')
      const result = await page.evaluate(() => {
        const doc = document.documentElement
        const overflow = doc.scrollWidth - doc.clientWidth
        const small = []
        for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')) {
          const style = getComputedStyle(el)
          if (style.visibility === 'hidden' || style.display === 'none' || el.closest('[inert], [aria-hidden="true"], .hp-field')) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (el.tagName === 'A' && el.closest('p, li, figcaption, label') && style.display === 'inline') continue // inline link inside a sentence (WCAG 2.5.8 exception)
          if (el.type === 'checkbox' || el.type === 'hidden') continue
          if (r.width < 24 || r.height < 24) small.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
        }
        return { overflow, small: [...new Set(small)] }
      })
      if (result.overflow > 0) failures.push(`${path}: horizontal overflow ${result.overflow}px`)
      for (const s of result.small) failures.push(`${path}: small target ${s}`)
    }
    await context.close()
    expect(failures).toEqual([])
  })
}
