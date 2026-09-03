import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  QUOTA_CSV_HEADERS,
  buildQuotaCsv,
  parseQuotaCsv,
  quotaImportKey,
} from '../utils/quotaCsv.js'

const sample = {
  id: 'doc1',
  name: 'ChatGPT',
  serviceType: 'ai',
  account: 'owner@example.com',
  quotaRemaining: 320,
  quotaRatio: 90,
  quotaExpiry: '2026-09-30',
  ratio5h: 80,
  expiry5h: '14:30',
  ratioWeek: 60,
  expiryWeek: '2026-09-15',
  ratioMonth: 40,
  expiryMonth: '2026-12-31',
  note: '主帳號, 含逗號',
}

describe('quota CSV', () => {
  it('exports all Appwrite fields and round-trips quoted notes', () => {
    assert.deepEqual(QUOTA_CSV_HEADERS, [
      'name',
      'serviceType',
      'account',
      'quotaRemaining',
      'quotaRatio',
      'quotaExpiry',
      'ratio5h',
      'expiry5h',
      'ratioWeek',
      'expiryWeek',
      'ratioMonth',
      'expiryMonth',
      'note',
    ])

    const csv = buildQuotaCsv([sample])
    assert.match(csv, /^name,serviceType,account,quotaRemaining,quotaRatio,quotaExpiry,ratio5h,expiry5h,ratioWeek,expiryWeek,ratioMonth,expiryMonth,note\n/)
    assert.match(csv, /"主帳號, 含逗號"/)

    const { data, errors } = parseQuotaCsv(`\uFEFF${csv}`)
    assert.deepEqual(errors, [])
    assert.deepEqual(data, [
      {
        name: 'ChatGPT',
        serviceType: 'ai',
        account: 'owner@example.com',
        quotaRemaining: 320,
        quotaRatio: 90,
        quotaExpiry: '2026-09-30',
        ratio5h: 80,
        expiry5h: '14:30',
        ratioWeek: 60,
        expiryWeek: '2026-09-15',
        ratioMonth: 40,
        expiryMonth: '2026-12-31',
        note: '主帳號, 含逗號',
      },
    ])
  })

  it('accepts Chinese headers and labels, and matches 服務×帳號', () => {
    const csv = [
      '服務名稱,服務類型,帳號,剩餘次數,剩餘比例,到期日,備註',
      ' ChatGPT ,AI 服務,Owner@example.com ,320,90,2026/09/30,主帳號',
    ].join('\n')

    const { data, errors } = parseQuotaCsv(csv)
    assert.deepEqual(errors, [])
    assert.equal(data[0].serviceType, 'ai')
    assert.equal(data[0].quotaRemaining, 320)
    assert.equal(data[0].quotaRatio, 90)
    assert.equal(data[0].quotaExpiry, '2026-09-30')
    assert.equal(
      quotaImportKey(data[0]),
      quotaImportKey({ name: 'chatgpt', account: 'owner@example.com' }),
    )
  })

  it('parses full-date AI plan rows and defaults missing optional fields', () => {
    const csv = [
      QUOTA_CSV_HEADERS.join(','),
      'Claude,ai,me@example.com,100,50,2026/09/30,80,14:30,60,2026-09-15,40,2026-12-31,主帳號',
    ].join('\n')

    const { data, errors } = parseQuotaCsv(csv)
    assert.deepEqual(errors, [])
    assert.deepEqual(data[0], {
      name: 'Claude',
      serviceType: 'ai',
      account: 'me@example.com',
      quotaRemaining: 100,
      quotaRatio: 50,
      quotaExpiry: '2026-09-30',
      ratio5h: 80,
      expiry5h: '14:30',
      ratioWeek: 60,
      expiryWeek: '2026-09-15',
      ratioMonth: 40,
      expiryMonth: '2026-12-31',
      note: '主帳號',
    })
  })

  it('skips invalid rows and requires a service name', () => {
    const csv = [
      QUOTA_CSV_HEADERS.join(','),
      // name missing
      ',general,,0,0,,,,,,,,',
      // serviceType invalid
      '服務,unknown,a,0,0,,,,,,,,',
      // quotaExpiry invalid date
      '服務,general,a,0,0,2026-02-30,,,,,,,',
      // quotaRemaining negative
      '服務,general,a,-1,0,,,,,,,,',
      // ratio5h not an integer
      '服務,ai,a,0,0,,abc,,,,,,',
      // expiry5h not HH:mm
      '服務,ai,a,0,0,,,bad,,,,,',
      // expiryWeek invalid date
      '服務,ai,a,0,0,,,,,2026-02-30,,,',
      // expiryMonth invalid date
      '服務,ai,a,0,0,,,,,,,2026-02-30,',
    ].join('\n')

    const { data, errors } = parseQuotaCsv(csv)
    assert.equal(data.length, 0)
    assert.ok(errors.some((error) => error.includes('name')))
    assert.ok(errors.some((error) => error.includes('服務類型')))
    assert.ok(errors.some((error) => error.includes('額度到期日格式不正確')))
    assert.ok(errors.some((error) => error.includes('次數')))
    assert.ok(errors.some((error) => error.includes('5 小時比例')))
    assert.ok(errors.some((error) => error.includes('5 小時到期需為 HH:mm')))
    assert.ok(errors.some((error) => error.includes('一週到期')))
    assert.ok(errors.some((error) => error.includes('一月到期')))
  })

  it('fills defaults when optional columns are omitted', () => {
    const { data, errors } = parseQuotaCsv('name\nNotion')
    assert.deepEqual(errors, [])
    assert.deepEqual(data, [
      {
        name: 'Notion',
        serviceType: 'general',
        account: '',
        quotaRemaining: 0,
        quotaRatio: 0,
        quotaExpiry: '',
        ratio5h: 0,
        expiry5h: '',
        ratioWeek: 0,
        expiryWeek: '',
        ratioMonth: 0,
        expiryMonth: '',
        note: '',
      },
    ])
  })
})
