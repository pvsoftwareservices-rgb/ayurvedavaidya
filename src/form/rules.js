// Enquiry form rules shared by the browser form. The PHP handler (public/api/lib/EnquiryValidator.php)
// enforces the same limits server-side — keep both in step (tests/php covers the server copy).

/** Character limits. Minimums are checked manually: validity.tooShort does not fire for autofilled or scripted values. */
export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { min: 10, max: 15 }, // digits, including the country code
  message: { min: 10, max: 2000 },
}

export const AREAS = ['ayurveda', 'nutrition', 'yoga', 'mind-body-wellness']
export const MODES = ['online', 'phone', 'clinic']
export const FIELD_ORDER = ['name', 'email', 'phone', 'area', 'mode', 'date', 'time', 'message', 'consent']

// Same pattern as the server: one @, no spaces, a dot in the domain, a 2+ letter TLD.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const length = (value) => [...value].length

/** Digits of the full international number (country dialling code + national number). */
export function phoneDigits(dialCode, phone) {
  return `${dialCode ?? ''}${phone ?? ''}`.replace(/\D/g, '')
}

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Validates enquiry values; returns { field: code } for every invalid field (empty object = valid).
 * Codes: required | tooShort | tooLong | email | phone | pastDate | invalid | consent
 * @param {Record<string, string | boolean | undefined>} values
 * @param {{ today?: string, dialCode?: string }} [options]
 * @returns {Record<string, string>}
 */
export function validateEnquiry(values, { today = isoDate(), dialCode = '' } = {}) {
  const errors = {}
  const text = (key) => String(values[key] ?? '').trim()

  const name = text('name')
  if (!name) errors.name = 'required'
  else if (length(name) < LIMITS.name.min) errors.name = 'tooShort'
  else if (length(name) > LIMITS.name.max) errors.name = 'tooLong'

  const email = text('email')
  if (!email) errors.email = 'required'
  else if (length(email) > LIMITS.email.max) errors.email = 'tooLong'
  else if (!EMAIL.test(email)) errors.email = 'email'

  const phone = text('phone')
  const digits = phoneDigits(dialCode, phone).length
  if (!phone) errors.phone = 'required'
  else if (/[^\d\s\-().+]/.test(phone) || digits < LIMITS.phone.min || digits > LIMITS.phone.max) errors.phone = 'phone'

  if (text('area') && !AREAS.includes(text('area'))) errors.area = 'invalid'
  if (text('mode') && !MODES.includes(text('mode'))) errors.mode = 'invalid'

  const date = text('date')
  if (date && !DATE.test(date)) errors.date = 'invalid'
  else if (date && date < today) errors.date = 'pastDate'

  const time = text('time')
  if (time && !TIME.test(time)) errors.time = 'invalid'

  const message = text('message')
  if (!message) errors.message = 'required'
  else if (length(message) < LIMITS.message.min) errors.message = 'tooShort'
  else if (length(message) > LIMITS.message.max) errors.message = 'tooLong'

  if (values.consent !== true && values.consent !== 'on' && values.consent !== 'yes') errors.consent = 'consent'
  return errors
}

/** WhatsApp chat link with the visitor's entries pre-filled (no server involved, so no bot timer). */
export function whatsappUrl(number, lines) {
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`
}
