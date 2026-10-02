// Booking form end-to-end. /api/contact.php is intercepted with page.route(), so nothing is ever sent —
// except the no-JavaScript test, which uses the real PHP handler with a fake transport (see tests/php/router.php).
import { readFileSync, rmSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { fillValid, watchPage } from './helpers.mjs'

const ENDPOINT = '**/api/contact.php'
/**
 * JS disabled; images and fonts skipped because PHP's built-in server handles one request at a time.
 * Reduced motion turns off the page's smooth scrolling, which otherwise keeps Playwright's scroll-into-view moving.
 */
async function noJsContext(browser) {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' })
  await context.route(/\.(avif|webp|png|jpg|woff2?|ico|svg)(\?.*)?$/, (route) => route.abort())
  return context
}

const json = (status, body) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test.beforeEach(async ({ page }) => {
  await page.goto('/book-consultation/')
  await expect(page.locator('#booking-form')).toHaveAttribute('novalidate', '') // hydrated → enhanced mode
})

test('success: sends JSON in the background and lands on /thank-you/', async ({ page }) => {
  const problems = watchPage(page)
  let payload = null
  await page.route(ENDPOINT, async (route) => {
    payload = route.request().postDataJSON()
    expect(route.request().headers()['content-type']).toContain('application/json')
    await route.fulfill(json(200, { ok: true }))
  })
  await fillValid(page)
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page).toHaveURL(/\/thank-you\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Thank you')
  expect(payload).toMatchObject({ name: 'Priya Sharma', email: 'priya@example.com', consent: 'yes', dialCode: '91', website: '' })
  expect(Number(payload._submitted) - Number(payload._ts)).toBeGreaterThanOrEqual(0)
  expect(payload._page).toContain('/book-consultation/')
  expect(problems).toEqual([])
})

test('client validation: field messages, summary, ARIA wiring and focus on the first invalid field', async ({ page }) => {
  let called = false
  await page.route(ENDPOINT, (route) => { called = true; return route.abort() })
  await page.getByRole('button', { name: 'Send request' }).click()
  const summary = page.locator('.form-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toContainText('Please check the following')
  const name = page.locator('#booking-name')
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAttribute('aria-describedby', /booking-name-error/)
  await expect(page.locator('#booking-name-error')).toHaveText(/required/)
  await expect(page.locator('#booking-consent-error')).toBeVisible()
  // Minimum length is enforced even for scripted (autofill-like) values.
  await name.evaluate((el) => { el.value = 'P' })
  await page.locator('#booking-email').fill('priya@example')
  await page.locator('#booking-phone').fill('12345')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.locator('#booking-name-error')).toContainText('at least 2 characters')
  await expect(page.locator('#booking-email-error')).toContainText('valid email')
  await expect(page.locator('#booking-phone-error')).toContainText('10–15 digits')
  expect(called).toBe(false)
})

test('past dates are rejected', async ({ page }) => {
  await fillValid(page)
  await page.locator('#booking-date').fill('2020-01-01')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.locator('#booking-date-error')).toContainText('today or a future date')
})

test('server validation errors (422) are shown on the right fields', async ({ page }) => {
  await page.route(ENDPOINT, (route) => route.fulfill(json(422, { ok: false, error: 'validation', errors: { email: 'email' } })))
  await fillValid(page)
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.locator('#booking-email-error')).toContainText('valid email')
  await expect(page.locator('#booking-email')).toBeFocused()
})

for (const [status, text] of [[502, 'could not deliver'], [500, 'could not deliver'], [429, 'wait a few minutes']]) {
  test(`HTTP ${status}: failure message with phone/email/WhatsApp, data kept, button re-enabled`, async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.fulfill(json(status, { ok: false })))
    await fillValid(page)
    const button = page.getByRole('button', { name: 'Send request' })
    await button.click()
    const notice = page.locator('.form-notice')
    await expect(notice).toContainText(text)
    await expect(notice.locator('a[href="tel:+917895911809"]')).toBeVisible()
    await expect(notice.locator('a[href="mailto:info@ayurvedavaidya.com"]')).toBeVisible()
    await expect(notice.locator('a[href^="https://wa.me/917895911809"]')).toBeVisible()
    await expect(page.locator('#booking-name')).toHaveValue('Priya Sharma')
    await expect(page.locator('#booking-message')).toHaveValue(/diet plan/)
    await expect(button).toBeEnabled()
  })
}

test('button is disabled while sending', async ({ page }) => {
  let release
  await page.route(ENDPOINT, async (route) => { await new Promise((r) => { release = r }); await route.fulfill(json(200, { ok: true })) })
  await fillValid(page)
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.locator('#booking-form button[type="submit"]')).toBeDisabled()
  release()
  await expect(page).toHaveURL(/\/thank-you\/$/)
})

test('timeout after 20 seconds: timeout message, data kept', async ({ page }) => {
  await page.clock.install()
  await page.reload()
  await expect(page.locator('#booking-form')).toHaveAttribute('novalidate', '')
  await page.route(ENDPOINT, () => { /* never answers */ })
  await fillValid(page)
  await page.getByRole('button', { name: 'Send request' }).click()
  await page.clock.runFor(20500)
  await expect(page.locator('.form-notice')).toContainText('took too long')
  await expect(page.locator('#booking-email')).toHaveValue('priya@example.com')
})

test('offline: offline message, nothing sent, data kept', async ({ page, context }) => {
  let called = false
  await page.route(ENDPOINT, (route) => { called = true; return route.abort() })
  await fillValid(page)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.locator('.form-notice')).toContainText('offline')
  await context.setOffline(false)
  expect(called).toBe(false)
  await expect(page.locator('#booking-phone')).toHaveValue('98765 43210')
})

test('entered data survives a reload (session draft)', async ({ page }) => {
  await fillValid(page)
  await page.reload()
  await expect(page.locator('#booking-name')).toHaveValue('Priya Sharma')
  await expect(page.locator('#booking-consent')).toBeChecked()
})

test('WhatsApp button opens a pre-filled chat without calling the endpoint', async ({ page, context }) => {
  let called = false
  await page.route(ENDPOINT, (route) => { called = true; return route.abort() })
  await context.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>wa</title>' }))
  await fillValid(page)
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Send via WhatsApp' }).click()])
  const url = new URL(popup.url())
  expect(url.origin + url.pathname).toBe('https://wa.me/917895911809')
  expect(url.searchParams.get('text')).toContain('Priya Sharma')
  expect(url.searchParams.get('text')).toContain('+91 98765 43210')
  expect(called).toBe(false)
})

test.describe('without JavaScript (real PHP handler, fake transport)', () => {
  // PHP's built-in server is single-threaded: run these one at a time.
  test.describe.configure({ mode: 'serial' })

  test('no JavaScript: native POST to the real PHP handler, 303 → /thank-you/', async ({ browser }) => {
  test.skip(!process.env.E2E_PHP, 'PHP 8 not available — set PHP_BIN to run this test')
  rmSync(process.env.MAIL_OUTBOX, { force: true })
  const context = await noJsContext(browser)
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:8090/book-consultation/')
  await page.locator('#booking-name').fill('Ravi Kumar')
  await page.locator('#booking-email').fill('ravi@example.com')
  await page.locator('#booking-phone').fill('98111 22233')
  await page.locator('#booking-message').fill('Please call me about an online consultation.')
  await page.locator('#booking-consent').check()
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page).toHaveURL('http://127.0.0.1:8090/thank-you/')
  const mail = JSON.parse(readFileSync(process.env.MAIL_OUTBOX, 'utf8').trim().split('\n').at(-1))
  expect(mail.fromName).toBe('Ravi Kumar via AyurvedaVaidya')
  expect(mail.replyTo).toBe('ravi@example.com')
  expect(mail.subject).toBe('New enquiry from Ravi Kumar: Consultation request')
  expect(mail.html).toContain('+91 98111 22233')
  await context.close()
})

  test('no JavaScript: a server-side validation error shows a helpful page (422)', async ({ browser }) => {
  test.skip(!process.env.E2E_PHP, 'PHP 8 not available — set PHP_BIN to run this test')
  const context = await noJsContext(browser)
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:8090/book-consultation/')
  await page.locator('#booking-name').fill('Ravi Kumar')
  await page.locator('#booking-email').fill('ravi@example.com')
  await page.locator('#booking-phone').fill('98111 22233')
  // Message shorter than the 10-character minimum (native validation only checks "required" here).
  await page.locator('#booking-message').evaluate((el) => { el.removeAttribute('minlength'); el.value = 'Hi there' })
  await page.locator('#booking-consent').check()
  const [response] = await Promise.all([page.waitForResponse('**/api/contact.php'), page.getByRole('button', { name: 'Send request' }).click()])
  expect(response.status()).toBe(422)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Please check your request')
  await expect(page.locator('body')).toContainText('+91 78959 11809')
  await context.close()
})
})
