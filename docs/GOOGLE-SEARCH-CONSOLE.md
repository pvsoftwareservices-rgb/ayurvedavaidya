# Google Search Console — launch guide for ayurvedavaidya.com

## 1. Pre-launch checklist (on the live domain, after deploying)

Run `npm run check:live` from the project folder. Every line must show ✓. It checks:

- [ ] **HTTPS**: `http://ayurvedavaidya.com/` → 301 → `https://ayurvedavaidya.com/`
- [ ] **Redirects**: `www` → apex; `/about` → `/about/`; `/index.html` → `/`; `/contact/` → `/book-consultation/` (single 301 hops)
- [ ] **robots.txt** allows everything and lists `Sitemap: https://ayurvedavaidya.com/sitemap-index.xml`
- [ ] **sitemap-index.xml** and **sitemap.xml** respond 200 (16 URLs)
- [ ] **404**: an unknown URL returns a real **HTTP 404** with the branded page (noindex, no canonical)
- [ ] **Favicons** respond 200 (`/favicon.ico`, `/favicon.svg`, `/favicon-48x48.png`, `/favicon-96x96.png`, `/apple-touch-icon.png`, `/site.webmanifest`)
- [ ] **Form endpoint** responds (`/api/contact.php` → 405 to a GET)
- [ ] **One real form test** has reached the inbox (see `docs/HOSTINGER-SMTP-SETUP.md` §4)

## 2. Add a Domain property (DNS TXT verification)

The domain's DNS is at **GoDaddy** (nameservers `ns61.domaincontrol.com` / `ns62.domaincontrol.com`).

> The domain **already has** a TXT record `google-site-verification=eVu2uRw66k_…`. Someone has probably verified it before. First sign in to Search Console with the client's Google account. If `ayurvedavaidya.com` is already listed, skip to step 3. If not, ask who created that record, or simply add your own (several verification records can coexist).

1. Go to <https://search.google.com/search-console> → **Add property** → **Domain** → enter `ayurvedavaidya.com` → Continue.
2. Copy the TXT value shown (`google-site-verification=…`).
3. GoDaddy → My Products → **Domains** → `ayurvedavaidya.com` → **DNS** → **Add New Record**:
   Type **TXT** · Name **@** · Value = the copied text · TTL **1 hour** → **Save**.
4. Back in Search Console click **Verify**. If it fails, wait 15–60 minutes and try again (DNS can take up to 48 hours).

A Domain property covers `https://`, `http://`, `www` and every page.

## 3. Submit the sitemap

Search Console → **Sitemaps** → "Add a new sitemap" → type **`sitemap-index.xml`** → **Submit**.

- That one file covers every page: it points to `sitemap.xml`, which lists all 16 indexable URLs with `<lastmod>` dates. It is regenerated on every build.
- **"Couldn't fetch"** or **"Pending"** for up to 24 hours is normal for a new sitemap. Check again the next day.
- Opening the sitemap in a browser shows *"This XML file does not appear to have any style information"*. That is normal for XML files and not an error.

## 4. The 16 indexable URLs

| Group | URL |
|---|---|
| Core | `https://ayurvedavaidya.com/` |
| | `https://ayurvedavaidya.com/about/` |
| | `https://ayurvedavaidya.com/book-consultation/` |
| Services | `https://ayurvedavaidya.com/services/` |
| | `https://ayurvedavaidya.com/services/ayurveda/` |
| | `https://ayurvedavaidya.com/services/nutrition/` |
| | `https://ayurvedavaidya.com/services/yoga/` |
| | `https://ayurvedavaidya.com/services/mind-body-wellness/` |
| Programs | `https://ayurvedavaidya.com/programs/` |
| Journal | `https://ayurvedavaidya.com/articles/` |
| | `https://ayurvedavaidya.com/articles/understanding-prakriti/` |
| | `https://ayurvedavaidya.com/articles/balanced-ayurvedic-plate/` |
| | `https://ayurvedavaidya.com/articles/breath-movement-stress/` |
| Legal | `https://ayurvedavaidya.com/privacy/` |
| | `https://ayurvedavaidya.com/terms/` |
| | `https://ayurvedavaidya.com/disclaimer/` |

### Manual "Request indexing" (URL Inspection → paste URL → Request indexing)
Google allows only a small number of requests per day, so split them into batches of about 10:

- **Day 1 (10):** `/`, `/about/`, `/services/`, `/services/ayurveda/`, `/services/nutrition/`, `/services/yoga/`, `/services/mind-body-wellness/`, `/book-consultation/`, `/programs/`, `/articles/`
- **Day 2 (6):** the three articles, `/privacy/`, `/terms/`, `/disclaimer/`

## 5. Do NOT submit these (and why)

| URL | Why |
|---|---|
| `/thank-you/` | Only shown after a form submission; marked `noindex` and kept out of the sitemap |
| Any 404 URL / `/404.html` | Error page; `noindex` and returns HTTP 404 |
| `/contact/`, `/ayurveda/` | Old addresses that 301-redirect to `/book-consultation/` and `/services/ayurveda/` |
| `/index.html`, `http://`, `www.` versions | Redirect to the canonical `https://ayurvedavaidya.com/…/` URLs |
| `/api/contact.php` | The form's mail endpoint, not a page |

Noindex pages stay crawlable on purpose (robots.txt blocks nothing), so Google can see their `noindex` tag.

## 6. Favicon in search results
Google reads the icon linked from the **homepage** (`/favicon.ico` 48×48, `/favicon.svg`, `/favicon-96x96.png`). It can take **days to weeks** for Google to show a new icon. Requesting indexing of the homepage (Day 1) speeds this up.

## 7. Weeks 1–4 follow-up

- **Week 1:** Sitemaps shows "Success" with 16 discovered URLs. URL Inspection on the homepage → "URL is on Google" (or "Discovered/Crawled – currently not indexed", which is normal at first). Finish the Day 2 indexing batch.
- **Week 2:** **Pages** report: indexed vs not indexed. Expected and fine: *Excluded by 'noindex' tag* (thank-you), *Page with redirect* (`/contact/`, `/ayurveda/`, `http`/`www`), *Not found (404)* for test URLs. Investigate anything else.
- **Week 2–3:** **Enhancements**: the *Breadcrumbs* report (all inner pages) should show valid items; check the Organization markup with the Rich Results Test (<https://search.google.com/test/rich-results>) on the homepage. The site has no FAQ content, so no FAQ report is expected. Fix any "invalid item" reported.
- **Week 3:** **Core Web Vitals** (needs real-user data, which may stay "not enough data" for a small site) and a PageSpeed Insights run on `/` and `/services/ayurveda/` (mobile).
- **Week 3–4:** **Google Business Profile**: create or claim the clinic listing at <https://business.google.com>. It needs the clinic's real **address**, phone and category, and verification by postcard, phone or video. Once you have the address, add it to the site's structured data (see README → Decisions).
- **Week 4:** **Bing Webmaster Tools**: <https://www.bing.com/webmasters> → *Import from Google Search Console* (one click, imports the sitemap too).
- **Ongoing:** **Performance** report: queries, clicks, impressions. Add new articles to `src/data.js` + `src/i18n/en.js`. They join the sitemap automatically on the next build; then request indexing for each new URL.
