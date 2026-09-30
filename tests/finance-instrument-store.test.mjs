import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  financeInstrumentFromDbRow,
  financeInstrumentToDbRow,
  planFinanceInstrumentSync,
  readLegacyFinanceList,
  saveFinanceInstrumentList,
} from '../utils/financeInstrumentStore.js'
import { parseCloudPayload } from '../utils/toolListPayload.js'
import { applyFinanceDraft, draftFromCustomFinanceInstrument } from '../utils/fengbroFinanceCustom.ts'
import { buildFinanceCustomCsv, parseFinanceCustomCsv } from '../utils/fengbroFinanceCsv.ts'

// 原本寫死的預設標的搬進資料表後的樣子（financeinstrument-setup.sql 的 KOSPI／上櫃指數列）。
const KOSPI_ROW = {
  id: 'row-kospi',
  slug: 'kospi',
  name: 'KOSPI Index',
  symbol: '.KS11',
  provider: 'cnbc',
  region: 'korea',
  sortorder: 0,
  imageurls: ['/finance/kospi-cats.jpg', '/finance/kospi-index.png'],
  sourceurl: 'https://www.cnbc.com/quotes/.KS11?qsearchterm=kospi',
  historysymbol: '^KS11',
  alertthreshold: '12682',
  locallabel: '코스피',
  periodlabel: '2026~2027',
  referencelevels: [{ value: 6472, label: '融資平均水平線 · 絕對不能破' }],
  youtubeurl: 'https://www.youtube.com/results?search_query=SK+Hynix+stock',
  youtubelabel: null,
  youtubelinks: [],
  bilibiliurl: 'https://search.bilibili.com/all?keyword=kospi',
  relatedlinks: [{ label: '證交所', url: 'https://www.twse.com.tw/' }],
  featured: true,
  subtitle: '韓國綜合指數 코스피',
}
const OTC_ROW = {
  id: 'row-otc',
  slug: 'otc',
  name: '上櫃指數',
  symbol: 'otc_o00.tw',
  provider: 'mis',
  region: 'taiwan',
  imageurls: [],
  sourceurl: 'https://www.tpex.org.tw/',
  alertthreshold: 666,
  locallabel: '櫃買指數',
  referencelevels: [],
  youtubelinks: [],
  relatedlinks: [],
  featured: false,
}

// 最小的 supabase-js 查詢鏈替身：記錄呼叫，await 時回傳預設結果。
const fakeClient = (results = {}) => {
  const calls = []
  const client = {
    calls,
    from(table) {
      const call = { table, ops: [] }
      calls.push(call)
      const chain = new Proxy({}, {
        get(_, op) {
          if (op === 'then') {
            const kind = call.ops.find((o) => ['upsert', 'delete', 'insert', 'update', 'select'].includes(o.op))?.op
            const result = results[`${table}.${kind}`] ?? { data: [], error: null }
            return (resolve) => resolve(typeof result === 'function' ? result(call) : result)
          }
          return (...args) => {
            call.ops.push({ op, args })
            return chain
          }
        },
      })
      return chain
    },
  }
  return client
}

describe('financeInstrumentStore row mapping', () => {
  it('maps group ↔ region and keeps image urls', () => {
    const row = financeInstrumentToDbRow(
      { name: '台積電', symbol: '2330.tw', provider: 'yahoo', group: 'taiwan', imageUrls: ['/finance/a.png'] },
      3,
    )
    assert.deepEqual(row, {
      name: '台積電',
      symbol: '2330.TW',
      provider: 'yahoo',
      region: 'taiwan',
      imageurls: ['/finance/a.png'],
      sortorder: 3,
      slug: null,
      sourceurl: null,
      historysymbol: null,
      alertthreshold: null,
      locallabel: null,
      periodlabel: null,
      referencelevels: [],
      youtubeurl: null,
      youtubelabel: null,
      youtubelinks: [],
      bilibiliurl: null,
      relatedlinks: [],
      featured: false,
      subtitle: null,
    })
    assert.deepEqual(financeInstrumentFromDbRow({ id: 'x', ...row }), {
      name: '台積電',
      symbol: '2330.TW',
      provider: 'yahoo',
      group: 'taiwan',
      imageUrl: '/finance/a.png',
      imageUrls: ['/finance/a.png'],
    })
  })

  it('round-trips a migrated default row with every extra column', () => {
    const item = financeInstrumentFromDbRow(KOSPI_ROW)
    assert.equal(item.slug, 'kospi')
    assert.equal(item.alertThreshold, 12682)
    assert.equal(item.historySymbol, '^KS11')
    assert.equal(item.featured, true)
    const { id: _id, ...expected } = KOSPI_ROW
    assert.deepEqual(financeInstrumentToDbRow(item, 0), {
      ...expected,
      alertthreshold: 12682,
      youtubelabel: null,
    })
  })

  it('keeps non-CNBC/Yahoo providers and their symbol case', () => {
    const item = financeInstrumentFromDbRow(OTC_ROW)
    assert.equal(item.provider, 'mis')
    assert.equal(item.symbol, 'otc_o00.tw')
    assert.equal(financeInstrumentToDbRow(item).symbol, 'otc_o00.tw')
  })

  it('rejects rows without a symbol', () => {
    assert.equal(financeInstrumentToDbRow({ name: 'x', symbol: '' }), null)
    assert.equal(financeInstrumentFromDbRow(null), null)
  })
})

describe('planFinanceInstrumentSync', () => {
  it('upserts the list in order, dedupes keys, and deletes removed rows', () => {
    const existing = [
      { id: 'keep', provider: 'cnbc', symbol: 'NVDA' },
      { id: 'gone', provider: 'yahoo', symbol: 'OLD' },
    ]
    const list = [
      { name: 'A', symbol: 'nvda', provider: 'cnbc', group: 'us' },
      { name: 'B', symbol: 'MU', provider: 'cnbc', group: 'us' },
      { name: 'A2', symbol: 'NVDA', provider: 'cnbc', group: 'us' },
    ]
    const { upserts, deleteIds } = planFinanceInstrumentSync(existing, list)
    assert.deepEqual(upserts.map((r) => [r.symbol, r.name, r.sortorder]), [
      ['MU', 'B', 0],
      ['NVDA', 'A2', 1],
    ])
    assert.deepEqual(deleteIds, ['gone'])
  })

  it('treats a symbol change as a new row plus a delete', () => {
    const { upserts, deleteIds } = planFinanceInstrumentSync(
      [{ id: 'old', provider: 'yahoo', symbol: '0050.TW' }],
      [{ name: '0056', symbol: '0056.TW', provider: 'yahoo', group: 'taiwan' }],
    )
    assert.deepEqual(upserts.map((r) => r.symbol), ['0056.TW'])
    assert.deepEqual(deleteIds, ['old'])
  })
})

describe('saveFinanceInstrumentList', () => {
  it('upserts on provider,symbol then deletes only known stale ids', async () => {
    const client = fakeClient({
      'financeinstrument.upsert': (call) => ({
        data: call.ops[0].args[0].map((row, i) => ({ id: `id-${i}`, ...row })),
        error: null,
      }),
    })
    const saved = await saveFinanceInstrumentList(
      client,
      [{ name: 'MU', symbol: 'MU', provider: 'cnbc', group: 'us' }],
      [{ id: 'stale', provider: 'cnbc', symbol: 'NVDA' }],
    )
    assert.equal(saved.length, 1)
    assert.equal(saved[0].id, 'id-0')
    const [upsert, remove] = client.calls
    assert.equal(upsert.ops[0].op, 'upsert')
    assert.deepEqual(upsert.ops[0].args[1], { onConflict: 'provider,symbol' })
    assert.equal(remove.ops[0].op, 'delete')
    assert.deepEqual(remove.ops[1], { op: 'in', args: ['id', ['stale']] })
  })

  it('throws Supabase errors so the caller can retry', async () => {
    const client = fakeClient({ 'financeinstrument.upsert': { data: null, error: new Error('boom') } })
    await assert.rejects(
      saveFinanceInstrumentList(client, [{ symbol: 'MU', provider: 'cnbc' }], []),
      /boom/,
    )
  })
})

describe('legacy toollistsync payload', () => {
  it('reads both array and stringified payloads', async () => {
    const list = [{ name: 'MU', symbol: 'MU', provider: 'cnbc', group: 'us' }]
    const asArray = fakeClient({ 'toollistsync.select': { data: [{ payload: list }], error: null } })
    const asString = fakeClient({ 'toollistsync.select': { data: [{ payload: JSON.stringify(list) }], error: null } })
    assert.deepEqual(await readLegacyFinanceList(asArray), list)
    assert.deepEqual(await readLegacyFinanceList(asString), list)
    assert.equal(parseCloudPayload('not json'), null)
  })
})

describe('applyFinanceDraft', () => {
  it('keeps alert, links and featured data when renaming a migrated instrument', () => {
    const kospi = financeInstrumentFromDbRow(KOSPI_ROW)
    const draft = { ...draftFromCustomFinanceInstrument(kospi), name: 'KOSPI 코스피' }
    const next = applyFinanceDraft(draft, kospi)
    assert.equal(next.name, 'KOSPI 코스피')
    assert.equal(next.slug, 'kospi')
    assert.equal(next.historySymbol, '^KS11')
    assert.deepEqual(next.referenceLevels, kospi.referenceLevels)
    assert.deepEqual(next.relatedLinks, kospi.relatedLinks)
    assert.equal(next.featured, true)
  })

  it('edits a MIS instrument without turning it into CNBC', () => {
    const otc = financeInstrumentFromDbRow(OTC_ROW)
    const next = applyFinanceDraft({ ...draftFromCustomFinanceInstrument(otc), featured: true }, otc)
    assert.equal(next.provider, 'mis')
    assert.equal(next.symbol, 'otc_o00.tw')
    assert.equal(next.alertThreshold, 666)
    assert.equal(next.featured, true)
  })

  it('drops slug, quote page and history symbol when the symbol changes', () => {
    const kospi = financeInstrumentFromDbRow(KOSPI_ROW)
    const next = applyFinanceDraft({ ...draftFromCustomFinanceInstrument(kospi), urlOrSymbol: '^KS200', provider: 'yahoo' }, kospi)
    assert.equal(next.symbol, '^KS200')
    assert.equal(next.slug, undefined)
    assert.equal(next.sourceUrl, undefined)
    assert.equal(next.historySymbol, undefined)
    assert.equal(next.alertThreshold, 12682)
  })

  it('clears images when the draft removes them', () => {
    const kospi = financeInstrumentFromDbRow(KOSPI_ROW)
    const next = applyFinanceDraft({ ...draftFromCustomFinanceInstrument(kospi), imageUrlsText: '' }, kospi)
    assert.equal(next.imageUrl, undefined)
    assert.equal(next.imageUrls, undefined)
  })
})

describe('finance CSV with migrated fields', () => {
  it('exports and re-imports every column', () => {
    const list = [financeInstrumentFromDbRow(KOSPI_ROW), financeInstrumentFromDbRow(OTC_ROW)]
    const { data, errors } = parseFinanceCustomCsv(buildFinanceCustomCsv(list))
    assert.deepEqual(errors, [])
    assert.deepEqual(data, list)
  })

  it('still reads an Appwrite-style CSV with only the first 9 columns', () => {
    const csv = [
      'name,symbol,provider,group,imageUrls,youtubeUrl,bilibiliUrl,relatedLinks,featured',
      '美光,MU,cnbc,us,,https://www.youtube.com/@x,,官網|https://www.micron.com/,1',
    ].join('\n')
    const { data, errors } = parseFinanceCustomCsv(csv)
    assert.deepEqual(errors, [])
    assert.deepEqual(data[0], {
      name: '美光',
      symbol: 'MU',
      provider: 'cnbc',
      group: 'us',
      youtubeUrl: 'https://www.youtube.com/@x',
      relatedLinks: [{ label: '官網', url: 'https://www.micron.com/' }],
      featured: true,
    })
  })
})
