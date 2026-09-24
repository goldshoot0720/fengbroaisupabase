import assert from 'node:assert/strict'
import { beforeEach, it } from 'node:test'
import {
  __resetOptimisticListForTests,
  isOptimisticId,
  optimisticInsert,
  optimisticRemove,
  optimisticUpdate,
  resolveOptimisticId,
  withoutOptimisticRows,
} from '../utils/optimisticList.js'
import {
  __resetTableCacheForTests,
  beginTableMutation,
  endTableMutation,
  loadTableWithCache,
  peekTableCache,
  tableCacheKey,
  writeTableCache,
} from '../utils/tableCache.js'

beforeEach(() => {
  __resetOptimisticListForTests()
  __resetTableCacheForTests()
})

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const ids = (listRef) => listRef.value.map((row) => row.id)

it('shows an inserted row before the server answers, then swaps in the saved row', async () => {
  const listRef = { value: [{ id: 1, name: 'a' }] }
  const server = deferred()
  const pending = optimisticInsert({ listRef, draft: { name: 'b' }, commit: () => server.promise })

  assert.equal(listRef.value.length, 2)
  assert.ok(isOptimisticId(listRef.value[0].id))
  assert.equal(listRef.value[0].name, 'b')

  server.resolve({ id: 2, name: 'b' })
  assert.deepEqual(await pending, { id: 2, name: 'b' })
  assert.deepEqual(ids(listRef), [2, 1])
})

it('removes the temporary row when an insert fails', async () => {
  const listRef = { value: [{ id: 1 }] }
  await assert.rejects(
    optimisticInsert({ listRef, draft: { name: 'x' }, commit: async () => { throw new Error('nope') } }),
    /nope/,
  )
  assert.deepEqual(ids(listRef), [1])
})

it('applies an update immediately and rolls it back on failure', async () => {
  const listRef = { value: [{ id: 1, name: 'old', note: 'keep' }] }
  const server = deferred()
  const pending = optimisticUpdate({ listRef, id: 1, patch: { name: 'new' }, commit: () => server.promise })

  assert.deepEqual(listRef.value[0], { id: 1, name: 'new', note: 'keep' })
  server.reject(new Error('offline'))
  await assert.rejects(pending, /offline/)
  assert.deepEqual(listRef.value[0], { id: 1, name: 'old', note: 'keep' })
})

it('does not roll back over a newer edit of the same row', async () => {
  const listRef = { value: [{ id: 1, name: 'v0' }] }
  const first = deferred()
  const firstPending = optimisticUpdate({ listRef, id: 1, patch: { name: 'v1' }, commit: () => first.promise })
  const secondPending = optimisticUpdate({ listRef, id: 1, patch: { name: 'v2' }, commit: async () => ({ id: 1, name: 'v2' }) })
  await secondPending

  first.reject(new Error('late failure'))
  await assert.rejects(firstPending)
  assert.equal(listRef.value[0].name, 'v2')
})

it('removes rows immediately and restores them in place on failure', async () => {
  const listRef = { value: [{ id: 1 }, { id: 2 }, { id: 3 }] }
  const server = deferred()
  const pending = optimisticRemove({ listRef, ids: [2], commit: () => server.promise })

  assert.deepEqual(ids(listRef), [1, 3])
  server.reject(new Error('rls'))
  await assert.rejects(pending, /rls/)
  assert.deepEqual(ids(listRef), [1, 2, 3])
})

it('waits for the real id when a pending insert is deleted', async () => {
  const listRef = { value: [] }
  const insertServer = deferred()
  const insert = optimisticInsert({ listRef, draft: { name: 'n' }, commit: () => insertServer.promise })
  const tempId = listRef.value[0].id

  let deletedIds = null
  const remove = optimisticRemove({ listRef, ids: [tempId], commit: async (realIds) => { deletedIds = realIds } })
  assert.deepEqual(listRef.value, [])

  insertServer.resolve({ id: 42, name: 'n' })
  await insert
  await remove
  assert.deepEqual(deletedIds, [42])
  // 伺服器回傳的列不能在已被刪除後又插回來。
  assert.deepEqual(listRef.value, [])
})

it('skips the server when deleting a temporary row whose insert failed', async () => {
  const listRef = { value: [] }
  const insertServer = deferred()
  const insert = optimisticInsert({ listRef, draft: {}, commit: () => insertServer.promise })
  const tempId = listRef.value[0].id
  let called = false
  const remove = optimisticRemove({ listRef, ids: [tempId], commit: async () => { called = true } })

  insertServer.reject(new Error('dup'))
  await assert.rejects(insert)
  await remove
  assert.equal(called, false)
  assert.equal(await resolveOptimisticId(tempId), null)
})

it('keeps a sort order across optimistic changes', async () => {
  const sort = (list) => [...list].sort((a, b) => b.deposit - a.deposit)
  const listRef = { value: [{ id: 1, deposit: 10 }, { id: 2, deposit: 5 }] }
  await optimisticUpdate({ listRef, id: 2, patch: { deposit: 50 }, sort, commit: async () => null })
  assert.deepEqual(ids(listRef), [2, 1])
})

it('reports start and end so background reads can be held off', async () => {
  const listRef = { value: [{ id: 1 }] }
  const events = []
  await optimisticRemove({
    listRef,
    ids: [1],
    commit: async () => { events.push('commit') },
    onStart: () => events.push('start'),
    onEnd: () => events.push('end'),
  })
  assert.deepEqual(events, ['start', 'commit', 'end'])
})

it('strips temporary rows before caching', () => {
  assert.deepEqual(withoutOptimisticRows([{ id: 'optimistic-x' }, { id: 3 }]), [{ id: 3 }])
})

it('does not let a read that raced a write overwrite the cache', async () => {
  const key = tableCacheKey('proj', 'routine')
  const fetch = deferred()
  const load = loadTableWithCache(key, () => fetch.promise, { force: true })

  // 讀取途中完成了一次寫入（快取已更新為寫入後的版本）。
  beginTableMutation(key)
  writeTableCache(key, [{ id: 1 }, { id: 2 }])
  endTableMutation(key)

  fetch.resolve([{ id: 1 }])
  assert.deepEqual(await load, [{ id: 1 }, { id: 2 }])
  assert.deepEqual(peekTableCache(key), [{ id: 1 }, { id: 2 }])
})

it('keeps the same array when a background refresh returns identical rows', async () => {
  const key = tableCacheKey('proj', 'music')
  const original = Date.now
  writeTableCache(key, [{ id: 1, name: 'a' }], { silent: true })
  const cached = peekTableCache(key)
  Date.now = () => original() + 10 * 60_000
  try {
    const rows = await loadTableWithCache(key, async () => [{ id: 1, name: 'a' }])
    assert.equal(rows, cached)
  } finally {
    Date.now = original
  }
})

it('reuses the cache without a request when revisiting within the fresh window', async () => {
  const key = tableCacheKey('proj', 'podcast')
  writeTableCache(key, [{ id: 1 }], { silent: true })
  let calls = 0
  await loadTableWithCache(key, async () => { calls += 1; return [] })
  assert.equal(calls, 0)
})
