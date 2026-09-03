import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  QUOTA_SERVICE_TYPE_OPTIONS,
  buildQuotaWritePayload,
  emptyQuotaForm,
  formatQuotaDate,
  groupQuotas,
  quotaFromDbRow,
  quotaRatioLabel,
  quotaStats,
  quotaToDbRow,
  toQuotaForm,
} from '../utils/managementRecords.js'

describe('quota records', () => {
  it('starts a new account as a general service with zero quotas', () => {
    assert.deepEqual(emptyQuotaForm('ChatGPT'), {
      name: 'ChatGPT',
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
    })
  })

  it('normalizes a complete general create payload', () => {
    assert.deepEqual(
      buildQuotaWritePayload(
        {
          name: '  ChatGPT  ',
          serviceType: 'general',
          account: '  owner@example.com ',
          quotaRemaining: '320',
          quotaRatio: '90',
          quotaExpiry: '2026-09-30',
          note: ' 主帳號 ',
        },
        'create',
      ),
      {
        name: 'ChatGPT',
        serviceType: 'general',
        account: 'owner@example.com',
        quotaRemaining: 320,
        quotaRatio: 90,
        quotaExpiry: '2026-09-30T00:00:00.000Z',
        note: '主帳號',
        ratio5h: 0,
        expiry5h: '',
        ratioWeek: 0,
        expiryWeek: '',
        ratioMonth: 0,
        expiryMonth: '',
      },
    )
  })

  it('keeps AI plan fields only for ai services and clears them otherwise', () => {
    const ai = buildQuotaWritePayload(
      {
        name: 'Claude',
        serviceType: 'ai',
        account: 'me@example.com',
        quotaRemaining: 10,
        quotaRatio: 50,
        ratio5h: 80,
        expiry5h: '14:30',
        ratioWeek: 60,
        expiryWeek: '2026-09-15',
        ratioMonth: 40,
        expiryMonth: '2026-12-31',
      },
      'create',
    )
    assert.equal(ai.ratio5h, 80)
    assert.equal(ai.expiry5h, '14:30')
    assert.equal(ai.ratioWeek, 60)
    assert.equal(ai.expiryWeek, '2026-09-15')
    assert.equal(ai.ratioMonth, 40)
    assert.equal(ai.expiryMonth, '2026-12-31')

    const general = buildQuotaWritePayload(
      {
        name: 'Spotify',
        serviceType: 'general',
        quotaRemaining: 5,
        ratio5h: 99,
        expiry5h: '09:00',
        ratioWeek: 99,
        expiryWeek: '2026-01-01',
        ratioMonth: 99,
        expiryMonth: '2026-01-01',
      },
      'create',
    )
    assert.equal(general.ratio5h, 0)
    assert.equal(general.expiry5h, '')
    assert.equal(general.ratioWeek, 0)
    assert.equal(general.expiryWeek, '')
    assert.equal(general.ratioMonth, 0)
    assert.equal(general.expiryMonth, '')
  })

  it('clears an optional date on update and rejects invalid input', () => {
    const payload = buildQuotaWritePayload(
      { name: '服務', serviceType: 'general', quotaExpiry: '' },
      'update',
    )
    assert.equal(payload.quotaExpiry, null)

    assert.throws(
      () => buildQuotaWritePayload({ name: '服務', quotaRemaining: -1 }, 'create'),
      /0 以上的整數/,
    )
    assert.throws(
      () => buildQuotaWritePayload({ name: '服務', serviceType: 'ai', expiry5h: '下午' }, 'create'),
      /HH:mm/,
    )
    assert.throws(
      () => buildQuotaWritePayload({ name: '服務', serviceType: 'ai', expiry5h: '25:99' }, 'create'),
      /HH:mm/,
    )
    assert.throws(
      () => buildQuotaWritePayload({ name: '服務', serviceType: 'ai', expiryWeek: '09-30' }, 'create'),
      /一週到期/,
    )
    assert.throws(
      () => buildQuotaWritePayload({ name: '服務', serviceType: 'ai', expiryWeek: '2026-13-01' }, 'create'),
      /一週到期/,
    )
    assert.throws(
      () => buildQuotaWritePayload({ name: '服務', serviceType: 'ai', expiryMonth: '2026-13-01' }, 'create'),
      /一月到期/,
    )
    assert.throws(
      () => buildQuotaWritePayload({ name: 'x'.repeat(101) }, 'create'),
      /最多 100/,
    )
    assert.throws(() => buildQuotaWritePayload({ name: '服務', quotaRemaining: true }, 'create'), /整數/)
    assert.throws(() => buildQuotaWritePayload(null, 'create'), /物件/)
  })

  it('maps camelCase fields to lowercase Supabase columns', () => {
    const payload = buildQuotaWritePayload(
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
        note: '主帳號',
      },
      'create',
    )
    assert.deepEqual(quotaToDbRow(payload), {
      name: 'ChatGPT',
      servicetype: 'ai',
      account: 'owner@example.com',
      quotaremaining: 320,
      quotaratio: 90,
      quotaexpiry: '2026-09-30',
      ratio5h: 80,
      expiry5h: '14:30',
      ratioweek: 60,
      expiryweek: '2026-09-15',
      ratiomonth: 40,
      expirymonth: '2026-12-31',
      note: '主帳號',
    })
    assert.deepEqual(
      quotaFromDbRow({
        id: 'abc',
        name: 'ChatGPT',
        servicetype: 'ai',
        account: 'owner@example.com',
        quotaremaining: 320,
        quotaratio: 90,
        quotaexpiry: '2026-09-30',
        ratio5h: 80,
        expiry5h: '14:30',
        ratioweek: 60,
        expiryweek: '2026-09-15',
        ratiomonth: 40,
        expirymonth: '2026-12-31',
        note: '主帳號',
      }),
      {
        id: 'abc',
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
        note: '主帳號',
        created_at: undefined,
        updated_at: undefined,
      },
    )
  })

  it('round-trips a general row without AI fields', () => {
    const form = toQuotaForm(
      quotaFromDbRow({
        id: 7,
        name: 'Spotify',
        servicetype: 'general',
        account: 'me@example.com',
        quotaremaining: 5,
        quotaratio: 25,
        note: '家庭方案',
      }),
    )
    assert.equal(form.serviceType, 'general')
    assert.equal(form.ratio5h, 0)
    assert.equal(form.expiry5h, '')
    assert.equal(form.ratioWeek, 0)
    assert.equal(form.expiryMonth, '')
  })

  it('groups the same service regardless of case and counts AI accounts', () => {
    const items = [
      { id: 1, name: 'ChatGPT', account: 'alpha', serviceType: 'ai', quotaRemaining: 300 },
      { id: 2, name: 'chatgpt', account: 'beta', serviceType: 'general', quotaRemaining: 100 },
      { id: 3, name: 'Notion', account: 'me', serviceType: 'general', quotaRemaining: 200 },
    ]
    const groups = groupQuotas(items)
    assert.equal(groups.length, 2)
    assert.equal(groups[0].name, 'ChatGPT')
    assert.deepEqual(groups[0].items.map((item) => item.account), ['alpha', 'beta'])
    const filtered = groupQuotas(items, '', 'ai')
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].name, 'ChatGPT')
    const notionGroups = groupQuotas(items, 'notion')
    assert.equal(notionGroups.length, 1)
    assert.equal(notionGroups[0].name, 'Notion')
    assert.deepEqual(notionGroups[0].items, [items[2]])
    assert.deepEqual(quotaStats(items), {
      serviceCount: 2,
      accountCount: 3,
      aiCount: 1,
    })
  })

  it('formats ratio and date labels', () => {
    assert.equal(quotaRatioLabel(90), '90%')
    assert.equal(quotaRatioLabel(0), null)
    assert.equal(quotaRatioLabel(null), null)
    assert.equal(QUOTA_SERVICE_TYPE_OPTIONS[1].label, 'AI 服務')
    assert.equal(formatQuotaDate(''), '未設定')
    assert.equal(formatQuotaDate('2026-09-30'), '2026/09/30')
  })
})
