import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEFAULT_COUNTRY, DIAL_CODES, getCountryOptions } from '../countryCodes'
import { CONTACT, FORM_ENDPOINT, THANK_YOU_PATH } from '../data'
import { AREAS, FIELD_ORDER, LIMITS, MODES, isoDate, validateEnquiry, whatsappUrl } from '../form/rules'
import { useI18n } from '../i18n'
import { Button, Icon } from '../ui'

const REQUEST_TIMEOUT_MS = 20000
const DRAFT_KEY = 'av-enquiry-draft'
const DRAFT_FIELDS = ['name', 'email', 'country', 'phone', 'area', 'mode', 'date', 'time', 'message', 'consent']

/**
 * @param {HTMLFormElement} form
 * @returns {Record<string, any>} field values; `consent` is a boolean
 */
function readForm(form) {
  const data = new FormData(form)
  const values = Object.fromEntries(DRAFT_FIELDS.map((key) => [key, data.get(key) ?? '']))
  return { ...values, consent: data.get('consent') === 'on' }
}

function saveDraft(form) {
  try { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(readForm(form))) } catch { /* storage unavailable: the fields themselves still hold the data */ }
}

function restoreDraft(form) {
  let draft = null
  try { draft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? 'null') } catch { return null }
  if (!draft) return null
  for (const key of DRAFT_FIELDS) {
    const el = form.elements.namedItem(key)
    if (!el) continue
    if (el.type === 'checkbox') el.checked = draft[key] === true
    else if (draft[key]) el.value = draft[key]
  }
  return draft
}

const clearDraft = () => { try { window.sessionStorage.removeItem(DRAFT_KEY) } catch { /* nothing to clear */ } }

/** Label + control + hint + error, wired together with aria-describedby / aria-invalid. */
/** @param {{ id: string, label: string, required?: boolean, hint?: string, error?: string, children: import('react').ReactNode, className?: string }} props */
function Field({ id, label, required = false, hint = undefined, error = undefined, children, className = '' }) {
  const { t } = useI18n()
  return <div className={`field ${error ? 'has-error' : ''} ${className}`}>
    <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}{!required && <span className="optional"> ({t('contact.form.optional')})</span>}</label>
    {children}
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    <p className="field-error" id={`${id}-error`} hidden={!error}>{error && <><Icon name="close"/>{error}</>}</p>
  </div>
}

/** ARIA wiring for a control: hint/error ids and the invalid state. */
const describe = (id, error, hint) => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined,
})

function Alternatives() {
  const { t } = useI18n()
  return <span className="form-alternatives">
    <a href={CONTACT.phoneHref}><Icon name="phone"/>{CONTACT.phone}</a>
    <a href={CONTACT.emailHref}><Icon name="mail"/>{CONTACT.email}</a>
    <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer"><Icon name="chat"/>{t('contact.form.whatsappShort')}</a>
  </span>
}

export default function BookingForm() {
  const { t, lang } = useI18n()
  const f = (key) => t(`contact.form.${key}`)
  const navigate = useNavigate()
  const formRef = useRef(null)
  const summaryRef = useRef(null)
  const [enhanced, setEnhanced] = useState(false)
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [notice, setNotice] = useState(null) // { kind: 'offline' | 'timeout' | 'failed' | 'rateLimited' }
  const [isSending, setIsSending] = useState(false)
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [today, setToday] = useState(null)
  const options = useMemo(() => getCountryOptions(lang), [lang])

  // Progressive enhancement: the server-rendered form posts natively (303 → /thank-you/). Once React has
  // hydrated, switch to inline validation + background fetch, restore any saved draft and stamp the timer.
  useEffect(() => {
    const form = formRef.current
    setEnhanced(true)
    setToday(isoDate())
    form.elements.namedItem('_ts').value = String(Date.now())
    form.elements.namedItem('_page').value = window.location.href
    const draft = restoreDraft(form)
    if (draft?.country && DIAL_CODES[draft.country]) setCountry(draft.country)
    // Re-enable the button when the visitor returns with the Back button (page restored from bfcache).
    const onPageShow = (event) => { if (event.persisted) setIsSending(false) }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const message = (field, code) => {
    if (!code) return ''
    if (code === 'tooShort') return f(`errors.${field}Short`)
    if (code === 'tooLong') return f('errors.tooLong').replace('{max}', LIMITS[field]?.max ?? '')
    return f(`errors.${code}`)
  }

  const focusFirstError = (found) => {
    const first = FIELD_ORDER.find((key) => found[key])
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({ block: 'nearest' })
      formRef.current?.elements.namedItem(first)?.focus()
    })
  }

  const revalidate = (event) => {
    if (!errors[event.target.name]) return
    const found = validateEnquiry(readForm(formRef.current), { today: today ?? isoDate(), dialCode: DIAL_CODES[country] })
    setErrors((prev) => ({ ...prev, [event.target.name]: found[event.target.name] }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (isSending) return
    const form = formRef.current
    const values = readForm(form)
    const found = validateEnquiry(values, { today: isoDate(), dialCode: DIAL_CODES[country] })
    setErrors(found)
    setNotice(null)
    if (Object.keys(found).length) { focusFirstError(found); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setNotice({ kind: 'offline' }); return }

    const data = new FormData(form)
    const payload = { ...Object.fromEntries(data.entries()), consent: values.consent ? 'yes' : '', dialCode: DIAL_CODES[country], lang, _submitted: String(Date.now()) }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    setIsSending(true)
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        clearDraft()
        navigate(THANK_YOU_PATH)
        return
      }
      if (res.status === 422 && json.errors) { setErrors(json.errors); focusFirstError(json.errors) }
      else setNotice({ kind: res.status === 429 ? 'rateLimited' : 'failed' })
      setIsSending(false)
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      setNotice({ kind: error?.name === 'AbortError' ? 'timeout' : offline ? 'offline' : 'failed' })
      setIsSending(false)
    } finally {
      clearTimeout(timer)
    }
  }

  const sendWhatsapp = (event) => {
    event.preventDefault()
    const v = readForm(formRef.current)
    const url = whatsappUrl(CONTACT.whatsapp, [
      f('whatsappIntro'),
      v.name && `${f('name')}: ${v.name}`,
      v.phone && `${f('phone')}: +${DIAL_CODES[country]} ${v.phone}`,
      v.email && `${f('email')}: ${v.email}`,
      v.area && `${f('area')}: ${t(`services.items.${v.area}.title`)}`,
      v.mode && `${f('mode')}: ${f(`modes.${v.mode}`)}`,
      v.date && `${f('date')}: ${v.date}${v.time ? ` ${v.time}` : ''}`,
      v.message && `\n${v.message}`,
    ])
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const errorKeys = FIELD_ORDER.filter((key) => errors[key])
  const err = (field) => message(field, errors[field])

  return <form ref={formRef} id="booking-form" className="booking-form" action={FORM_ENDPOINT} method="post" noValidate={enhanced}
    onSubmit={submit} onInput={(e) => saveDraft(e.currentTarget)} onChange={(e) => saveDraft(e.currentTarget)}>
    <h2>{t('contact.formTitle')}</h2>
    <p className="form-required-note">{f('requiredNote')}</p>

    <div className="form-summary" ref={summaryRef} role="alert" tabIndex={-1} hidden={!errorKeys.length}>
      {errorKeys.length > 0 && <>
        <strong>{f('summaryTitle')}</strong>
        <ul>{errorKeys.map((key) => <li key={key}><a href={`#booking-${key}`}>{f(key === 'consent' ? 'consentShort' : key)}: {err(key)}</a></li>)}</ul>
      </>}
    </div>

    {/* Spam protection, checked on the server: a field people never see, and the page-load time. */}
    <div className="hp-field" aria-hidden="true">
      <label htmlFor="booking-website">Website</label>
      <input id="booking-website" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue=""/>
    </div>
    <input type="hidden" name="_ts" defaultValue=""/>
    <input type="hidden" name="_page" defaultValue="/book-consultation/"/>
    <input type="hidden" name="_form" defaultValue="consultation"/>

    <Field id="booking-name" label={f('name')} required error={err('name')}>
      <input {...describe('booking-name', errors.name)} name="name" required minLength={LIMITS.name.min} maxLength={LIMITS.name.max} autoComplete="name" onBlur={revalidate}/>
    </Field>
    <div className="form-row">
      <Field id="booking-email" label={f('email')} required error={err('email')}>
        <input {...describe('booking-email', errors.email)} name="email" type="email" required maxLength={LIMITS.email.max} autoComplete="email" inputMode="email" onBlur={revalidate}/>
      </Field>
      <Field id="booking-phone" label={f('phone')} required error={err('phone')} hint={f('phoneHint')}>
        <span className="phone-field">
          <span className="country-picker">
            <span className="country-picker-value" aria-hidden="true">{country} +{DIAL_CODES[country]}<Icon name="chevron"/></span>
            <select name="country" aria-label={f('countryCode')} value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country">
              {options.map((c) => <option key={c.iso} value={c.iso}>{c.name} (+{c.dial})</option>)}
            </select>
          </span>
          <input {...describe('booking-phone', errors.phone, true)} name="phone" type="tel" inputMode="tel" required maxLength={24} autoComplete="tel-national" onBlur={revalidate}/>
        </span>
      </Field>
    </div>
    <div className="form-row">
      <Field id="booking-area" label={f('area')} error={err('area')}>
        <select {...describe('booking-area', errors.area)} name="area" defaultValue="">
          <option value="">{f('areaPlaceholder')}</option>
          {AREAS.map((key) => <option key={key} value={key}>{t(`services.items.${key}.title`)}</option>)}
        </select>
      </Field>
      <Field id="booking-mode" label={f('mode')} error={err('mode')}>
        <select {...describe('booking-mode', errors.mode)} name="mode" defaultValue="">
          <option value="">{f('modePlaceholder')}</option>
          {MODES.map((key) => <option key={key} value={key}>{f(`modes.${key}`)}</option>)}
        </select>
      </Field>
    </div>
    <div className="form-row">
      <Field id="booking-date" label={f('date')} error={err('date')}>
        <input {...describe('booking-date', errors.date)} name="date" type="date" min={today ?? undefined} onBlur={revalidate}/>
      </Field>
      <Field id="booking-time" label={f('time')} error={err('time')}>
        <input {...describe('booking-time', errors.time)} name="time" type="time"/>
      </Field>
    </div>
    <Field id="booking-message" label={f('message')} required error={err('message')} hint={f('messageHint')}>
      <textarea {...describe('booking-message', errors.message, true)} name="message" rows={5} required minLength={LIMITS.message.min} maxLength={LIMITS.message.max} onBlur={revalidate}/>
    </Field>
    <div className={`consent-field ${errors.consent ? 'has-error' : ''}`}>
      <label className="consent">
        <input {...describe('booking-consent', errors.consent)} type="checkbox" name="consent" required onChange={revalidate}/>
        <span>{f('consent')} <Link to="/privacy/">{t('legal.privacy')}</Link>. <span className="req" aria-hidden="true">*</span></span>
      </label>
      <p className="field-error" id="booking-consent-error" hidden={!errors.consent}>{errors.consent && <><Icon name="close"/>{err('consent')}</>}</p>
    </div>

    {notice && <div className={`form-notice is-${notice.kind}`} role="alert">
      <p>{f(`notices.${notice.kind}`)}</p>
      <Alternatives/>
    </div>}

    <div className="form-actions">
      <Button type="submit" icon="mail" disabled={isSending} aria-busy={isSending || undefined}>{isSending ? f('sending') : f('submit')}</Button>
      <a className="btn btn-whatsapp" href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" onClick={sendWhatsapp}>
        <span className="btn-label">{f('whatsapp')}</span><Icon name="chat" className="btn-icon"/>
      </a>
    </div>
    <p className="form-status" role="status" aria-live="polite">{isSending ? f('sending') : ''}</p>
  </form>
}
