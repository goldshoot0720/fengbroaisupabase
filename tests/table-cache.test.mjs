import assert from 'node:assert/strict'
import { beforeEach, it } from 'node:test'
import {
  TABLE_FRESH_MS,
  __resetTableCacheForTests,
  fetchAllPagesParallel,
  loadTableWithCache,
  peekTableCache,
  subscribeTableCache,
  tableCacheKey,
  writeTableCache,
} from '../utils/tableCache.js'
import { mapWithConcurrency, runGroupedConcurrently } from '../utils/asyncPool.js'

beforeEach(() => __resetTableCacheForTests())

it('dedupes concurrent loads of the same table into one request', async () => {
  let calls = 0
  const fetcher = async () => {
    calls += 1
    await new Promise((r) => setTimeout(r, 10))
    return [{ id: 1 }]
  }
  const key = tableCacheKey('proj', 'music')
  const [a, b, c] = await Promise.all([
    loadTableWithCache(key, fetcher, { force: true }),
    loadTableWithCache(key, fetcher, { force: true }),
    loadTableWithCache(key, fetcher, { force: true }),
  ])
  assert.equal(calls, 1)
  assert.deepEqual(a, [{ id: 1 }])
  assert.equal(a, b)
  assert.equal(b, c)
})

it('shows cached rows first and then resolves with fresh rows', async () => {
  const key = tableCacheKey('proj', 'bank')
  writeTableCache(key, [{ id: 'old' }], { silent: true })
  // 讓快取看起來過期，才會真的去抓網路。
  const entryAge = Date.now() - TABLE_FRESH_MS - 1
  const originalNow = Date.now
  Date.now = () => entryAge + TABLE_FRESH_MS * 3
  const seen = []
  try {
    const fresh = await loadTableWithCache(key, async () => [{ id: 'new' }], {
      onCached: (rows) => seen.push(rows.map((r) => r.id)),
    })
    assert.deepEqual(seen, [['old']])
    assert.deepEqual(fresh, [{ id: 'new' }])
    assert.deepEqual(peekTableCache(key), [{ id: 'new' }])
  } finally {
    Date.now = originalNow
  }
})

it('skips the network when the cache was just written', async () => {
  const key = tableCacheKey('proj', 'food')
  writeTableCache(key, [{ id: 7 }])
  let calls = 0
  const rows = await loadTableWithCache(key, async () => { calls += 1; return [] })
  assert.equal(calls, 0)
  assert.deepEqual(rows, [{ id: 7 }])
})

it('keeps caches for different projects apart', () => {
  writeTableCache(tableCacheKey('a', 'article'), [{ id: 'a' }])
  assert.equal(peekTableCache(tableCacheKey('b', 'article')), null)
})

it('notifies subscribers on writes', () => {
  const key = tableCacheKey('proj', 'quota')
  const got = []
  const off = subscribeTableCache(key, (rows) => got.push(rows.length))
  writeTableCache(key, [1, 2])
  off()
  writeTableCache(key, [1])
  assert.deepEqual(got, [2])
})

it('fetches remaining pages in parallel after reading the total count', async () => {
  const total = 2500
  const data = Array.from({ length: total }, (_, i) => ({ id: i }))
  let active = 0
  let maxActive = 0
  const rows = await fetchAllPagesParallel(async (from, to, withCount) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((r) => setTimeout(r, 5))
    active -= 1
    return { data: data.slice(from, to + 1), error: null, count: withCount ? total : null }
  }, 1000)
  assert.equal(rows.length, total)
  assert.deepEqual(rows.map((r) => r.id), data.map((r) => r.id))
  assert.equal(maxActive, 2)
})

it('falls back to sequential pages without a count', async () => {
  const data = Array.from({ length: 1500 }, (_, i) => i)
  const rows = await fetchAllPagesParallel(async (from, to) => ({ data: data.slice(from, to + 1), error: null }), 1000)
  assert.equal(rows.length, 1500)
})

it('throws page errors', async () => {
  await assert.rejects(
    fetchAllPagesParallel(async () => ({ data: null, error: new Error('boom') })),
    /boom/,
  )
})

it('mapWithConcurrency keeps order and respects the limit', async () => {
  let active = 0
  let maxActive = 0
  const out = await mapWithConcurrency([5, 1, 3, 2, 4], async (n) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((r) => setTimeout(r, n))
    active -= 1
    return n * 2
  }, 2)
  assert.deepEqual(out, [10, 2, 6, 4, 8])
  assert.equal(maxActive, 2)
})

it('runGroupedConcurrently runs same-key items in order', async () => {
  const log = []
  await runGroupedConcurrently(
    [{ k: 'a', n: 1 }, { k: 'b', n: 1 }, { k: 'a', n: 2 }],
    (item) => item.k,
    async (item, key) => {
      await new Promise((r) => setTimeout(r, item.n === 1 ? 10 : 0))
      log.push(`${key}${item.n}`)
    },
  )
  assert.ok(log.indexOf('a1') < log.indexOf('a2'))
  assert.equal(log.length, 3)
})
