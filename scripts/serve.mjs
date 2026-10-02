// Local static server for dist/ that behaves like the Hostinger setup: folder URLs serve index.html,
// folders without a trailing slash 301 to it, unknown paths get 404.html with a real 404 status, text is
// Brotli-compressed and hashed assets are cached for a year. Used by `npm run preview`, the Playwright
// tests and the Lighthouse script. /api/contact.php is not executed here (tests intercept it).
//   PORT=4173 node scripts/serve.mjs
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompress } from 'node:zlib'
import { promisify } from 'node:util'

const ROOT = process.env.DIST_DIR ? `${process.env.DIST_DIR.replace(/[\/]+$/, '')}/` : fileURLToPath(new URL('../dist/', import.meta.url))
const PORT = Number(process.env.PORT ?? 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.svg', '.webmanifest'])
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' }
const brotli = promisify(brotliCompress)

const isFile = async (p) => (await stat(p).catch(() => null))?.isFile() ?? false
const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory() ?? false

function cacheControl(urlPath, ext) {
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable'
  if (urlPath.startsWith('/images/')) return 'public, max-age=2592000'
  if (['.html', '.xml', '.txt', '.webmanifest'].includes(ext)) return 'no-cache'
  return 'public, max-age=604800'
}

async function send(req, res, file, status = 200, urlPath = '') {
  const ext = extname(file)
  const headers = { ...SECURITY, 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': cacheControl(urlPath, ext) }
  if (COMPRESSIBLE.has(ext) && /\bbr\b/.test(req.headers['accept-encoding'] ?? '')) {
    const body = await brotli(await readFile(file))
    res.writeHead(status, { ...headers, 'Content-Encoding': 'br', 'Content-Length': body.length, Vary: 'Accept-Encoding' })
    res.end(req.method === 'HEAD' ? undefined : body)
    return
  }
  res.writeHead(status, headers)
  if (req.method === 'HEAD') res.end()
  else createReadStream(file).pipe(res)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const urlPath = decodeURIComponent(url.pathname)
    const target = normalize(join(ROOT, urlPath))
    if (!target.startsWith(normalize(ROOT))) { res.writeHead(400).end(); return }
    if (/\/index\.html$/.test(urlPath)) { res.writeHead(301, { Location: urlPath.replace(/index\.html$/, '') + url.search }).end(); return }
    if (await isFile(target) && !urlPath.split('/').some((part) => part.startsWith('.'))) return await send(req, res, target, 200, urlPath)
    if (await isDir(target)) {
      if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: `${urlPath}/${url.search}` }).end(); return }
      if (await isFile(join(target, 'index.html'))) return await send(req, res, join(target, 'index.html'), 200, urlPath)
    }
    await send(req, res, join(ROOT, '404.html'), 404, urlPath)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(error))
  }
})

server.listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}`))
