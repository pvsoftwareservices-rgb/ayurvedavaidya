# Enquiry form email: Zoho Mail + Hostinger setup

The booking form posts to **`/api/contact.php`**, a small PHP script that ships inside the site (`public/api/`) and runs on Hostinger. It sends each enquiry **through the clinic's own Zoho mailbox over authenticated SMTP**, so the email:

- arrives at `info@ayurvedavaidya.com` from the clinic's own domain, which passes SPF, DKIM and DMARC once the DNS records below exist;
- shows the visitor as the sender name, for example `"Priya Sharma via AyurvedaVaidya" <info@ayurvedavaidya.com>`;
- has **Reply-To set to the visitor**, so pressing Reply answers them directly;
- has no third-party branding, and the visitor never leaves the website.

No password is stored in this repository or in the upload ZIP. The script reads its settings from the server only (step 3).

---

## 1. Set up Zoho Mail for ayurvedavaidya.com (one time)

The domain's DNS is managed at **GoDaddy** (nameservers `ns61/ns62.domaincontrol.com`). Today the domain has **no MX and no SPF records**, so it cannot receive mail yet. It also already has a strict DMARC policy (`p=quarantine`), so any email sent from the domain before SPF/DKIM are set up will land in spam.

1. Sign up at Zoho Mail with the domain `ayurvedavaidya.com`. Choose the **India** data centre if offered; the hosts below assume it.
   *Plan:* sending from a website over SMTP works on paid plans (Mail Lite and up). Zoho's Forever Free plan has limited protocol access, so check Zoho's current plan comparison before relying on it.
2. **Verify the domain.** Zoho gives you a TXT record (`zoho-verification=…`). Add it in GoDaddy (see "Adding a record in GoDaddy" below), then click Verify in Zoho.
3. **Create the mailbox** `info@ayurvedavaidya.com`.
4. **MX records** (use exactly what Zoho's setup wizard shows; for the India data centre they are normally):

   | Type | Name | Value | Priority |
   |---|---|---|---|
   | MX | @ | `mx.zoho.in` | 10 |
   | MX | @ | `mx2.zoho.in` | 20 |
   | MX | @ | `mx3.zoho.in` | 50 |

   Delete any other MX records for `@`.
5. **SPF**: one TXT record on `@`: `v=spf1 include:zoho.in ~all` (use `zoho.com` / `zoho.eu` if Zoho shows that). A domain must have only **one** SPF record.
6. **DKIM**: Zoho Mail Admin Console → Domains → ayurvedavaidya.com → Email Configuration → DKIM → Add a selector (e.g. `zmail`). Add the TXT record Zoho shows (name `zmail._domainkey`, long value starting `v=DKIM1; k=rsa; p=…`), then click **Verify** in Zoho.
7. **DMARC**: keep the existing `_dmarc` TXT record (`v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`). It works once SPF and DKIM pass. Optionally change the `rua=` address to a mailbox you read.
8. **App-specific password** (needed when two-factor authentication is on, and recommended either way): Zoho → My Account → Security → **App Passwords** → Generate, name it "Website form", and copy the password once.
9. **Your exact SMTP host**: Zoho Mail → Settings → Mail Accounts → *Server Configuration Details*. For the India data centre it is `smtppro.zoho.in` on paid organisation plans (`smtp.zoho.in` on the free plan). Port **465** (SSL).

### Adding a record in GoDaddy
GoDaddy → My Products → **Domains** → `ayurvedavaidya.com` → **DNS** → **Add New Record** → choose Type (TXT/MX), Name (`@` or the given name), Value, TTL 1 hour → **Save**. Changes usually work within minutes but can take up to 48 hours.

---

## 2. Check Hostinger's PHP version (one time)

hPanel → Websites → ayurvedavaidya.com → **Advanced → PHP Configuration**: choose **PHP 8.1 or newer** (8.3 recommended). The `openssl` and `mbstring` extensions are on by default.

---

## 3. Where to paste the settings on Hostinger

> **Netlify comparison:** on Netlify you would add these as environment variables (Site configuration → Environment variables), with `SMTP_PASS` marked secret, scoped to Functions and set for the Production context only, then redeploy. Hostinger shared/Business hosting has **no environment-variable panel for PHP**, so the equivalent is a **private PHP settings file outside the public website folder**. It is production-only (it exists only on the live server), never in git, never in the upload ZIP, and can't be downloaded from the web.
>
> ⚠️ Do **not** put SMTP settings in the *Environment variables* of Hostinger's Node.js Web App deployment screen. Those are build-time variables for the Vite build. The PHP script can't read them, and any variable prefixed `VITE_` would be copied into public JavaScript.

**Steps (hPanel → Websites → ayurvedavaidya.com → File Manager):**

1. File Manager opens in your account's home folder (`/home/u123456789/`, which shows folders like `domains/`). In that **home folder**, create a folder named **`private`**. This is the recommended location: it is outside every website folder and is never touched by a redeploy.
2. Inside `private`, create a file named **`mail-config.php`** with exactly this content, replacing the password:

   ```php
   <?php
   // AyurvedaVaidya enquiry form — SMTP settings. Keep this file private; never upload it to public_html or git.
   return [
       'SMTP_HOST' => 'smtppro.zoho.in',          // from Zoho → Settings → Mail Accounts → Server Configuration
       'SMTP_PORT' => '465',
       'SMTP_USER' => 'info@ayurvedavaidya.com',
       'SMTP_PASS' => 'PASTE-THE-ZOHO-APP-PASSWORD-HERE',
       'MAIL_TO'   => 'info@ayurvedavaidya.com',
       'MAIL_FROM' => 'info@ayurvedavaidya.com',
       // Optional: 'ALLOWED_ORIGINS' => 'https://your-preview-domain.hostingersite.com',
   ];
   ```

3. Right-click the file → **Permissions** → `600` (owner read/write only).

The script looks for the file in this order: real environment variables → `MAIL_CONFIG_FILE` (if set) → `<domain folder>/private/mail-config.php` (the folder that contains `public_html`) → `/home/<user>/private/mail-config.php`. `.env.example` lists every supported key and its default.

**Redeploy?** No redeploy is needed after creating or changing `mail-config.php`; PHP reads it on every request. You do need one deploy of the new site code itself (README → *Deploy*).

---

## 4. Test it once on the live site

1. Endpoint check (sends nothing):
   ```bash
   curl -i https://ayurvedavaidya.com/api/contact.php
   ```
   Expect `HTTP/1.1 405` and `{"ok":false,"error":"method"}`. If you see PHP source code or a download instead, PHP isn't running for the site: contact Hostinger support.
2. Run the full post-deploy check from the project folder: `npm run check:live`.
3. **One real test enquiry** (your decision, done by you): open `/book-consultation/`, fill the form with your own name and a personal email, wait a few seconds, and send. You should land on `/thank-you/`.
4. In Zoho, the enquiry should be in the **Inbox** with:
   - From: `Your Name via AyurvedaVaidya <info@ayurvedavaidya.com>`
   - Subject: `New enquiry from Your Name: Consultation request`
   - Reply → the To field is your personal email.
   - Message menu → **Show original**: `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

## 5. If something goes wrong

The form always tells the visitor what happened and offers phone, email and WhatsApp alternatives. Their entries are never lost.

| What the visitor sees / HTTP status | Meaning | Fix |
|---|---|---|
| "could not deliver" / **500** | Settings file not found or a required key is empty | Check the file path/name, and that it starts with `<?php` and `return [` |
| "could not deliver" / **502** | Zoho refused the login or connection | Re-check host (`smtppro` vs `smtp`, `.in` vs `.com`), port 465, app password |
| "Several requests…" / **429** | More than 5 sends from one connection in 10 minutes | Wait 10 minutes (limit is configurable: `RATE_LIMIT_MAX`) |
| Email in Spam | SPF/DKIM not set up or not yet live | Finish steps 1.5–1.6 and wait for DNS |

Errors are written to the PHP error log with an `[enquiry]` prefix (never the password): hPanel → Websites → Advanced → **Error Logs**.

## 6. Spam protection (server-side)
- Hidden honeypot field and a 3-second minimum fill time (measured with the visitor's own clock). Bots get a normal "success" reply, but nothing is sent.
- Origin allow-list: the live domain, `www`, localhost, plus any `ALLOWED_ORIGINS`.
- 5 requests per 10 minutes per IP (stored as a one-way hash in the server's temp folder).
- Every field is validated on the server, consent included. Lengths are limited, line breaks are removed from all header values, and all values are HTML-escaped in the email.
- Messages containing typical spam words or several links are **delivered with `[Possible spam]` in the subject**, never silently dropped.

## FormSubmit (not used)
The old FormSubmit setup was removed. It added third-party branding, depended on an outside service and an activation email, and was more likely to land in spam. If server-side sending ever becomes impossible, FormSubmit's AJAX endpoint (`https://formsubmit.co/ajax/<email>`) could be used as a fallback, but that is not recommended.
