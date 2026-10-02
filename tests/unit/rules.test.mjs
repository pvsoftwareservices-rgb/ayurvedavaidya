import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isoDate, phoneDigits, validateEnquiry, whatsappUrl } from '../../src/form/rules.js'

const valid = { name: 'Priya Sharma', email: 'priya@example.com', phone: '98765 43210', message: 'Help with a diet plan, please.', consent: true }
const opts = { today: '2026-10-03', dialCode: '91' }

test('a complete enquiry has no errors', () => {
  assert.deepEqual(validateEnquiry(valid, opts), {})
})

test('required fields: name, email, phone, message and consent', () => {
  assert.deepEqual(validateEnquiry({}, opts), { name: 'required', email: 'required', phone: 'required', message: 'required', consent: 'consent' })
})

test('minimum lengths are checked manually (autofilled values never trigger validity.tooShort)', () => {
  const errors = validateEnquiry({ ...valid, name: 'P', message: 'Too short' }, opts)
  assert.equal(errors.name, 'tooShort')
  assert.equal(errors.message, 'tooShort')
})

test('maximum lengths', () => {
  const errors = validateEnquiry({ ...valid, name: 'n'.repeat(101), message: 'm'.repeat(2001), email: `${'e'.repeat(250)}@x.com` }, opts)
  assert.deepEqual([errors.name, errors.message, errors.email], ['tooLong', 'tooLong', 'tooLong'])
})

test('email format', () => {
  for (const email of ['priya@example', 'priya example.com', 'priya@@example.com', '@example.com']) {
    assert.equal(validateEnquiry({ ...valid, email }, opts).email, 'email', email)
  }
  assert.equal(validateEnquiry({ ...valid, email: 'p.sharma+clinic@mail.example.co.in' }, opts).email, undefined)
})

test('phone: 10–15 digits including the country code, digits and separators only', () => {
  assert.equal(phoneDigits('91', '98765 43210'), '919876543210')
  assert.equal(validateEnquiry({ ...valid, phone: '12345' }, opts).phone, 'phone')
  assert.equal(validateEnquiry({ ...valid, phone: '9876543210123456' }, opts).phone, 'phone')
  assert.equal(validateEnquiry({ ...valid, phone: '98765abc10' }, opts).phone, 'phone')
  assert.equal(validateEnquiry({ ...valid, phone: '(987) 654-3210' }, opts).phone, undefined)
})

test('no past dates; today and future dates are fine', () => {
  assert.equal(validateEnquiry({ ...valid, date: '2026-10-02' }, opts).date, 'pastDate')
  assert.equal(validateEnquiry({ ...valid, date: '2026-10-03' }, opts).date, undefined)
  assert.equal(validateEnquiry({ ...valid, date: '03/10/2026' }, opts).date, 'invalid')
})

test('select values must come from the list', () => {
  assert.equal(validateEnquiry({ ...valid, area: 'surgery' }, opts).area, 'invalid')
  assert.equal(validateEnquiry({ ...valid, mode: 'online', area: 'yoga' }, opts).mode, undefined)
})

test('isoDate formats the local date', () => {
  assert.equal(isoDate(new Date(2026, 0, 5)), '2026-01-05')
})

test('WhatsApp link pre-fills the message and skips empty lines', () => {
  const url = whatsappUrl('917895911809', ['Hello', '', 'Name: Priya'])
  assert.equal(url, 'https://wa.me/917895911809?text=Hello%0AName%3A%20Priya')
})
