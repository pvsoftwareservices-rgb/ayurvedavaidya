// Mobile Lighthouse for the home page and an inner page (simulated slow 4G + 4× CPU slowdown).
//   npm run audit:lighthouse                                  → local build at http://localhost:4173
//   BASE_URL=https://ayurvedavaidya.com npm run audit:lighthouse → live site
// Reports are written to output/lighthouse/. Uses Chrome from CHROME_PATH, else Playwright's Chromium.
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'

const BASE = (process.env.BASE_URL ?? 'http://localhost:4173').replace(/\/$/, '')
const PAGES = (process.env.PAGES ?? '/,/services/ayurveda/').split(',')
const RUNS = Number(process.env.RUNS ?? 3)
const OUT = new URL('../output/lighthouse/', import.meta.url)
const label = process.env.LABEL ?? new URL(BASE).host.replace(/[^a-z0-9]+/gi, '-')

await mkdir(OUT, { recursive: true })
const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH || chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] })
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const rows = []
try {
  for (const path of PAGES) {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      const { lhr } = await lighthouse(`${BASE}${path}`, { port: chrome.port, output: 'json', logLevel: 'error', formFactor: 'mobile', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })
      runs.push(lhr)
    }
    // Report the run with the median performance score.
    const lhr = runs.find((r) => r.categories.performance.score === median(runs.map((r) => r.categories.performance.score)))
    const a = lhr.audits
    rows.push({
      page: path,
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      LCP: a['largest-contentful-paint'].displayValue,
      CLS: a['cumulative-layout-shift'].displayValue,
      TBT: a['total-blocking-time'].displayValue,
      FCP: a['first-contentful-paint'].displayValue,
      bytes: a['total-byte-weight'].displayValue.replace('Total size was ', ''),
    })
    await writeFile(new URL(`${label}${path.replace(/\//g, '_') || '_'}.json`, OUT), JSON.stringify(lhr))
  }
} finally {
  await chrome.kill()
}
console.log(`Lighthouse mobile — ${BASE} (median of ${RUNS})`)
console.table(rows)
