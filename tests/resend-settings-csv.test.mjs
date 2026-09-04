import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  RESEND_SETTINGS_CSV_HEADERS,
  buildResendSettingsCsv,
  mergeResendSlots,
  parseResendSettingsCsv,
} from '../utils/resendSettingsCsv.js'

const sampleSlots = [
  { apiKey: 're_1stKey', toEmail: 'a@example.com' },
  { apiKey: 're_2ndKey', toEmail: 'b@example.com' },
]

describe('resend settings CSV', () => {
  it('exports only complete slots and round-trips', () => {
    assert.deepEqual(RESEND_SETTINGS_CSV_HEADERS, ['RESEND_API_KEY', 'RESEND_TO_EMAIL'])
    const csv = buildResendSettingsCsv([...sampleSlots, { apiKey: '', toEmail: 'x@example.com' }, null])
    assert.ok(csv.startsWith('RESEND_API_KEY,RESEND_TO_EMAIL'))
    assert.ok(!csv.includes('x@example.com'))

    const parsed = parseResendSettingsCsv(csv)
    assert.equal(parsed.errors.length, 0)
    assert.deepEqual(parsed.slots, sampleSlots)
  })

  it('accepts Chinese headers and quoted values', () => {
    const csv = [
      '通知收件Email,ApiKey',
      '"b@example.com","re_key_with_""quote"""',
    ].join('\n')
    const parsed = parseResendSettingsCsv(csv)
    assert.equal(parsed.errors.length, 0)
    assert.equal(parsed.slots.length, 1)
    assert.equal(parsed.slots[0].toEmail, 'b@example.com')
    assert.equal(parsed.slots[0].apiKey, 're_key_with_"quote"')
  })

  it('rejects missing headers, bad emails, and empty keys', () => {
    const missingHeader = parseResendSettingsCsv('RESEND_API_KEY\nre_x\n')
    assert.ok(missingHeader.errors.some((error) => error.includes('RESEND_TO_EMAIL')))

    const badEmail = parseResendSettingsCsv('RESEND_API_KEY,RESEND_TO_EMAIL\nre_x,not-an-email\n')
    assert.equal(badEmail.slots.length, 0)
    assert.ok(badEmail.errors.some((error) => error.includes('格式不正確')))

    const emptyKey = parseResendSettingsCsv('RESEND_API_KEY,RESEND_TO_EMAIL\n,a@example.com\n')
    assert.equal(emptyKey.slots.length, 0)
    assert.ok(emptyKey.errors.some((error) => error.includes('不能為空')))
  })

  it('merges by email: update existing, append new, skip beyond limit', () => {
    const incoming = [
      { apiKey: 're_updated', toEmail: 'a@example.com' }, // update
      { apiKey: 're_new', toEmail: 'c@example.com' },     // append
      { apiKey: 're_empty', toEmail: '' },                // skip
    ]
    const { slots, added, updated, skipped } = mergeResendSlots(incoming, sampleSlots)
    assert.equal(slots.length, 3)
    assert.equal(added, 1)
    assert.equal(updated, 1)
    assert.equal(skipped, 1)
    assert.equal(slots[0].apiKey, 're_updated')
    assert.equal(slots[2].toEmail, 'c@example.com')
  })

  it('ignores blank placeholder slots when checking capacity (regression: SettingsPage passes all 21 fixed slots)', () => {
    const paddedCurrent = [
      ...sampleSlots,
      ...Array.from({ length: 19 }, () => ({ apiKey: '', toEmail: '' })),
    ]
    assert.equal(paddedCurrent.length, 21)
    const incoming = [{ apiKey: 're_new', toEmail: 'c@example.com' }]
    const { slots, added, skipped } = mergeResendSlots(incoming, paddedCurrent)
    assert.equal(added, 1)
    assert.equal(skipped, 0)
    assert.equal(slots.length, 3)
    assert.equal(slots[2].toEmail, 'c@example.com')
  })
})
