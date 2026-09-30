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
