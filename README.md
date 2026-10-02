# AyurvedaVaidya.com

Website of Dr. Tejendra Singh: React 19 + Vite 8, **pre-rendered to static HTML** at build time and hosted on **Hostinger** (LiteSpeed, `.htaccess`). The consultation form sends email through the clinic's **Zoho** mailbox from a small PHP script on the same host.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (Node `^20.19` or `>=22.12`) |
| `npm run dev` | Development server at http://localhost:5173 (client-rendered; the form endpoint needs PHP, see tests) |
| `npm run build` | Production build → `dist/` (client build + SSR build + `scripts/prerender.mjs`) |
| `npm run preview` | Serve `dist/` like the host does (folder URLs, real 404, Brotli) at http://localhost:4173 |
| `npm run images` | Regenerate every deployed image, the share images and the favicon set from `source-files/images/` |
| `npm run typecheck` | Type-check `src/` (JS + JSDoc, `jsconfig.json`) |
| `npm test` | Unit tests: form rules (Node) + PHP mail handler (needs PHP 8 on PATH or `PHP_BIN`) |
| `npm run audit:seo` | SEO audit of every built page (titles, descriptions, headings, alt, canonical, robots, OG, JSON-LD, links, sitemap) |
| `npm run test:e2e` | Playwright: every page (status, console, images, axe WCAG 2.1 AA), responsive layout, keyboard, form flows |
| `npm run audit:lighthouse` | Mobile Lighthouse for `/` and `/services/ayurveda/` (`BASE_URL=https://ayurvedavaidya.com` for live) |
| `npm run verify` | typecheck → build → unit tests → SEO audit → e2e |
| `npm run package` | Create `output/ayurvedavaidya-hostinger-upload.zip` for Hostinger |
| `npm run check:live` | After deploying: version, 404, redirects, headers, sitemaps, favicons, form endpoint (read-only) |

## Folder structure

```
index.html                 HTML shell (head markers are filled per page by the prerender step)
src/
  main.jsx                 client entry: hydrates the pre-rendered page
  entry-server.jsx         build-time renderer used by scripts/prerender.mjs
  App.jsx                  routes
  HomePage.jsx, pages/     pages (BookingForm.jsx = the enquiry form)
  components/              Header, Footer, Blocks (hero, breadcrumbs, gallery…), Picture (responsive images)
  form/rules.js            form validation shared with the browser (mirrored in PHP)
  i18n/                    en (default), es, ru — es/ru load on demand
  data.js                  contact details, services, posts, image keys
  seo.js                   titles, descriptions, canonical, robots, OG/Twitter, JSON-LD for every route
  images.js / images.manifest.json   generated-image lookup (written by npm run images)
  styles/                  fonts.css (self-hosted fonts), base, layout, home, pages
public/
  api/contact.php          enquiry endpoint (PHP 8.1+) + api/lib/ (handler, validator, mail builder, PHPMailer 7.1.1)
  images/<folder>/         GENERATED responsive AVIF/WebP (+ og/ 1200×630 share images) — do not edit by hand
  favicon.*, *.png, site.webmanifest   GENERATED favicon set
source-files/images/       full-resolution masters (not deployed): brand/ people/ clinic/ community/ illustrations/ editorial/
scripts/                   build-images, prerender, serve, audit-seo, lighthouse, check-live, package-upload, run-php
tests/                     unit/ (Node), php/ (handler tests + e2e router), e2e/ (Playwright)
docs/                      HOSTINGER-SMTP-SETUP.md, GOOGLE-SEARCH-CONSOLE.md, earlier design notes
```

### Images
Put a new or replaced photo in the right `source-files/images/<folder>/` (lowercase-hyphenated name), run `npm run images`, and reference it by key (`'people/dr-tejendra-singh-desk'`) through `<Picture image=… alt=… sizes=…/>`. Variants are never wider than the master, and masters are never shipped. Widths per folder are set in `scripts/build-images.mjs`.

## How the build works
1. `vite build` → client bundle with hashed file names.
2. `vite build --ssr src/entry-server.jsx` → a renderer.
3. `scripts/prerender.mjs` renders every route into `dist/<route>/index.html` with its own `<title>`, description, robots, canonical, Open Graph/Twitter, JSON-LD and preload hints. It also writes `404.html`, `sitemap.xml`, `sitemap-index.xml`, `robots.txt`, redirect pages for `/contact/` and `/ayurveda/`, and `.htaccess` (HTTPS/www/trailing-slash/index.html 301s, real 404, security headers, caching). The build fails if any of these are missing.

Add a new page in `src/App.jsx` **and** `src/seo.js` (`ROUTES`), then run `npm run build && npm run audit:seo`.

## Deploy (Hostinger, manual ZIP upload)
The site is a Hostinger **Node.js Web App** that builds from an uploaded ZIP. This was confirmed from the live HTML, which matched the local build exactly.

1. `npm run verify` (everything must pass), then `npm run package`.
2. hPanel → Websites → ayurvedavaidya.com → the Node.js app's **Deployments / Settings** → upload `output/ayurvedavaidya-hostinger-upload.zip`.
   Framework **Vite** · Build command **`npm run build`** · Output directory **`dist`** · Node **20, 22 or 24**.
3. One time only: create the private mail settings file (`docs/HOSTINGER-SMTP-SETUP.md` §3). It lives outside the site folder, so deploys never touch it.
4. After the deploy finishes: `npm run check:live` (all ✓), then one real form test.

Hostinger can also deploy from GitHub (hPanel → Git) if you prefer auto-deploys from `main`. The current setup uses the ZIP upload.

## Before launch (needs the client)
- Testimonials are carried over from the earlier design: replace them with consented, verified patient content.
- Confirm consent from the people shown in the clinic and community photos.
- Have the Privacy Policy, Terms and Disclaimer (`src/i18n/en.js` → `legal`) reviewed. Update `legal.updated` when they change.
- Clinic street address: needed for a LocalBusiness/MedicalClinic markup and Google Business Profile (currently `Organization`, because no address is published).

Service images in `source-files/images/illustrations/` were generated with AI (Google Nano Banana 2 via Magnific). Doctor, clinic and community photographs are real photos supplied by the client.
