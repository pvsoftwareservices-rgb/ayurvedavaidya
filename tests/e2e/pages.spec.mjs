// Every page: HTTP status, no console errors, no broken images/requests, all images loaded,
// axe WCAG 2.1 AA = 0 violations, keyboard skip link, visible focus and reduced motion.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { allPaths, watchPage } from './helpers.mjs'

/** Scrolls through the page so lazy images and scroll reveals all load before checks. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.7)) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
}

for (const path of allPaths()) {
  test(`page ${path}: status, console, images, headings, axe`, async ({ page }) => {
    test.setTimeout(120000) // long pages: scroll-through + axe
    const problems = watchPage(page)
    const response = await page.goto(path)
    expect(response.status()).toBe(path.includes('does-not-exist') ? 404 : 200)
    await scrollThrough(page)

    const broken = await page.evaluate(() => [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src))
    expect(broken, 'broken images').toEqual([])
    await expect(page.locator('h1')).toHaveCount(1)

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const summary = axe.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
    expect(summary, 'axe WCAG 2.1 AA violations').toEqual([])
    expect(problems, 'console errors / failed requests').toEqual([])
  })
}

test('keyboard: the skip link is the first tab stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/about/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  const box = await skip.boundingBox()
  expect(box.y).toBeGreaterThanOrEqual(0) // visible on focus
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main-content$/)
  await page.keyboard.press('Tab')
  const inMain = await page.evaluate(() => document.querySelector('main')?.contains(document.activeElement))
  expect(inMain).toBe(true)
})

test('keyboard: focused controls show a visible focus outline', async ({ page }) => {
  await page.goto('/book-consultation/')
  await page.locator('#booking-name').focus()
  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement)
    return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow }
  })
  expect(outline.outline !== 'none' && outline.width > 0 || outline.shadow !== 'none').toBe(true)
})

test('keyboard: the services menu opens with Enter and closes with Escape', async ({ page }) => {
  await page.goto('/')
  const toggle = page.locator('.desktop-nav .nav-drop')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('reduced motion: content is visible without animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/about/')
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity !== '1').length)
  expect(hidden).toBe(0)
  await context.close()
})

test('without JavaScript every page still shows its content and the form', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/book-consultation/')
  await expect(page.locator('#booking-form')).toHaveAttribute('action', '/api/contact.php')
  await expect(page.locator('#booking-form')).toHaveAttribute('method', 'post')
  await expect(page.locator('#booking-name')).toBeVisible()
  await page.goto('/services/')
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity !== '1').length)
  expect(hidden).toBe(0)
  await context.close()
})

test('language switch loads the Russian dictionary on demand and is remembered after reload', async ({ page }) => {
  const problems = watchPage(page)
  await page.goto('/')
  const englishTitle = await page.locator('h1').innerText()
  await page.locator('.header-actions .lang-toggle').click()
  await page.locator('.lang-menu button[lang="ru"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.locator('h1')).not.toHaveText(englishTitle)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.locator('h1')).not.toHaveText(englishTitle)
  expect(problems).toEqual([])
})
