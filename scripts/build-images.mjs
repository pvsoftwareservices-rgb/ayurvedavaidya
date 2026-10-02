// Generates every deployed image from the full-resolution masters in source-files/images/.
//   npm run images
// Output (committed, so the Hostinger build needs no native image tooling):
//   public/images/<folder>/<name>-<width>.avif|webp   responsive variants, never larger than the master
//   public/images/og/<name>.jpg                       1200×630 social-share crops
//   public/favicon.*, public/*-NNxNN.png, public/apple-touch-icon.png, public/site.webmanifest
//   src/images.manifest.json                          intrinsic sizes + generated widths for <Picture>
// Masters are never copied to public/, so original files are never linked or shipped.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'source-files/images')
const OUT = join(ROOT, 'public/images')
const PUBLIC = join(ROOT, 'public')
const MANIFEST = join(ROOT, 'src/images.manifest.json')

// Widths per folder, chosen from the largest rendered size (CSS px × 2 for high-density screens).
const WIDTHS = {
  brand: [160, 320, 415],
  community: [160, 320, 480],
  clinic: [400, 800, 1100],
  people: [400, 800, 1100],
  illustrations: [480, 800, 1200, 1600],
  editorial: [480, 800, 1024],
}
const SKIP = new Set(['ayurvedavaidya-logo-master'])
// Images used as page share images get a 1200×630 crop (position = focal point for the crop).
const OG = {
  'people/dr-tejendra-singh-portrait': 'attention',
  'people/dr-tejendra-singh-profile': 'north',
  'illustrations/service-nadi-pariksha': 'attention',
  'illustrations/service-ayurvedic-diet': 'attention',
  'illustrations/service-therapeutic-yoga': 'attention',
  'illustrations/service-counselling': 'attention',
  'illustrations/service-health-assessment': 'attention',
  'illustrations/service-shirodhara': 'attention',
  'illustrations/hero-clinic': 'attention',
  'editorial/article-prakriti': 'attention',
  'editorial/article-nutrition': 'attention',
  'editorial/article-breathing': 'attention',
}
const BRAND_BG = '#fbf6ea'
const THEME = '#0c2a17'

async function variants(folder, file) {
  const name = basename(file, extname(file))
  const input = sharp(join(SRC, folder, file))
  const { width, height } = await input.metadata()
  const widths = [...new Set(WIDTHS[folder].map((w) => Math.min(w, width)))].sort((a, b) => a - b)
  await mkdir(join(OUT, folder), { recursive: true })
  for (const w of widths) {
    const resized = sharp(join(SRC, folder, file)).resize({ width: w, withoutEnlargement: true })
    await resized.clone().webp({ quality: 74, effort: 6 }).toFile(join(OUT, folder, `${name}-${w}.webp`))
    await resized.clone().avif({ quality: 52, effort: 5 }).toFile(join(OUT, folder, `${name}-${w}.avif`))
  }
  const key = `${folder}/${name}`
  if (OG[key]) {
    await mkdir(join(OUT, 'og'), { recursive: true })
    await sharp(join(SRC, folder, file)).resize(1200, 630, { fit: 'cover', position: OG[key] }).flatten({ background: BRAND_BG })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(join(OUT, 'og', `${name}.jpg`))
  }
  return [key, { w: width, h: height, widths, og: OG[key] ? `/images/og/${name}.jpg` : undefined }]
}

/** Default share image: the logo centred on the brand background. */
async function defaultOg() {
  const logo = await sharp(join(SRC, 'brand/ayurvedavaidya-logo-master.png')).trim({ threshold: 10 }).resize({ height: 560 }).toBuffer()
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: BRAND_BG } })
    .composite([{ input: logo, gravity: 'center' }]).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, 'og', 'ayurvedavaidya.jpg'))
}

/** The "AV" emblem from the logo, square, on a solid background — legible at 16–48 px. */
async function emblem(size) {
  // Two pipelines: sharp applies trim() before extract() when both are chained on one instance.
  const crop = await sharp(join(SRC, 'brand/ayurvedavaidya-logo-master.png')).extract({ left: 289, top: 212, width: 661, height: 440 }).toBuffer()
  const mark = await sharp(crop).trim({ threshold: 10 }).toBuffer()
  const inner = Math.round(size * 0.9)
  const fitted = await sharp(mark).resize(inner, inner, { fit: 'contain', background: BRAND_BG }).flatten({ background: BRAND_BG }).toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: BRAND_BG } })
    .composite([{ input: fitted, gravity: 'center' }]).png({ compressionLevel: 9, palette: true, quality: 92 }).toBuffer()
}

/** ICO container holding PNG images (supported by every current browser and by Google). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4)
  let offset = header.length
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e); header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...pngs.map((p) => p.data)])
}

async function favicons() {
  const files = { 'favicon-48x48.png': 48, 'favicon-96x96.png': 96, 'web-app-manifest-192x192.png': 192, 'web-app-manifest-512x512.png': 512, 'apple-touch-icon.png': 180 }
  for (const [file, size] of Object.entries(files)) await writeFile(join(PUBLIC, file), await emblem(size))
  const icoSizes = [16, 32, 48]
  await writeFile(join(PUBLIC, 'favicon.ico'), ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await emblem(size) })))))
  // SVG wrapper around a 96 px raster of the same emblem: one crisp icon for browsers that prefer SVG.
  const png96 = (await emblem(96)).toString('base64')
  await writeFile(join(PUBLIC, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 96 96" width="96" height="96"><rect width="96" height="96" fill="${BRAND_BG}"/><image width="96" height="96" xlink:href="data:image/png;base64,${png96}" href="data:image/png;base64,${png96}"/></svg>\n`)
  const manifest = {
    name: 'AyurvedaVaidya — Dr. Tejendra Singh',
    short_name: 'AyurvedaVaidya',
    description: 'Ayurvedic, nutrition, yoga and mind–body wellness consultations with Dr. Tejendra Singh.',
    start_url: '/',
    scope: '/',
    display: 'browser',
    lang: 'en',
    theme_color: THEME,
    background_color: BRAND_BG,
    icons: [
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  await writeFile(join(PUBLIC, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`)
}

await rm(OUT, { recursive: true, force: true })
await mkdir(join(OUT, 'og'), { recursive: true })
const entries = []
for (const folder of Object.keys(WIDTHS)) {
  const files = (await readdir(join(SRC, folder))).filter((f) => /\.(webp|png|jpe?g)$/i.test(f) && !SKIP.has(basename(f, extname(f)))).sort()
  for (const file of files) entries.push(await variants(folder, file))
}
await defaultOg()
await favicons()
await writeFile(MANIFEST, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`)
console.log(`images: ${entries.length} masters → public/images (avif + webp), ${Object.keys(OG).length + 1} share images, favicon set`)
