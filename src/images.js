// Lookups into the generated image manifest (scripts/build-images.mjs). Plain JS so non-React code
// (SEO metadata, prerender) can resolve image URLs too.
import MANIFEST from './images.manifest.json'

/** Manifest entry: intrinsic { w, h }, generated `widths` and the optional 1200×630 `og` share image. */
export function imageMeta(key) {
  const entry = MANIFEST[key]
  if (!entry) throw new Error(`Unknown image "${key}" — run npm run images`)
  return entry
}

/** Public URL of one generated variant, e.g. imageUrl('people/dr-tejendra-singh-desk', 800). Defaults to the largest width. */
export function imageUrl(key, width, format = 'webp') {
  const w = width ?? imageMeta(key).widths.at(-1)
  const [folder, name] = key.split('/')
  return `/images/${folder}/${name}-${w}.${format}`
}

export const srcSet = (key, format) => imageMeta(key).widths.map((w) => `${imageUrl(key, w, format)} ${w}w`).join(', ')

/** Middle-sized WebP: the <img> fallback for browsers without srcset/AVIF support. */
export function fallbackWidth(key) {
  const widths = imageMeta(key).widths
  return widths[Math.min(1, widths.length - 1)]
}
