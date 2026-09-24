// utils/tableCache.js
// Supabase 資料表讀取快取（stale-while-revalidate）。
//
// 目標：切換選單時「立刻」顯示上次的資料，再於背景向 Supabase 重新整理。
// - 記憶體快取：同一個分頁內所有 composable 實例共用（同步可讀，零等待）。
// - IndexedDB 快照：重新整理頁面 / 下次開站也能秒開，不受 localStorage 5MB 限制。
// - 同一張表同時只會有一個進行中的請求（in-flight 去重），
//   避免 Dashboard + 各頁面 + app.vue 同時開站時重複打同一張表。
// - 超過 1000 筆時，第一頁取得總數後其餘頁面「並行」抓取，
//   不再一頁一頁排隊（也順便修正未分頁查詢被 PostgREST 截在 1000 筆的問題）。
//
// 快取以 credKey（Supabase 專案 URL + key 前綴）分隔，切換帳號不會看到別的專案資料。
// 本模組刻意不依賴 Vue / Nuxt，可以直接在 node --test 中測試。

export const TABLE_PAGE_SIZE = 1000
// 在這個時間內抓過（或寫入過）的表，再次 load 只用快取、不重打網路。
// 本站自己的寫入都會同步更新快取（Optimistic UI + rememberCachedTable），
// 所以一分鐘內切換選單回來資料一定是最新的，不需要再問 Supabase；
// 超過後才背景重新驗證，用來接住其他裝置 / 分頁的變更。要立即更新可傳 force。
export const TABLE_FRESH_MS = 60_000

const IDB_NAME = 'fengbro-table-cache'
const IDB_STORE = 'tables'
const IDB_VERSION = 1

const memory = new Map() // key -> { rows, at }
const inflight = new Map() // key -> Promise<rows>
const listeners = new Map() // key -> Set<fn>
const mutations = new Map() // key -> { pending, epoch }
let dbPromise = null
let hydratePromise = null
let hydrated = false

export const tableCacheKey = (credKey, table, variant = '') =>
  `${credKey || 'default'}|${table}${variant ? `|${variant}` : ''}`

const hasIndexedDb = () => typeof indexedDB !== 'undefined' && indexedDB !== null

const openDb = () => {
  if (!hasIndexedDb()) return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

const idbPut = async (key, value) => {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
  } catch {
    // 快照只是加速用，寫入失敗（配額、私密模式）不影響功能。
  }
}

const idbDelete = async (key) => {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(key)
  } catch {}
}

const idbGetAll = async () => {
  const db = await openDb()
  if (!db) return []
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const out = []
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (!cursor) return resolve(out)
        out.push([cursor.key, cursor.value])
        cursor.continue()
      }
      cursorReq.onerror = () => resolve(out)
    } catch {
      resolve([])
    }
  })
}

const idbClear = async () => {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).clear()
  } catch {}
}

// 把 IndexedDB 裡的所有快照一次讀進記憶體，之後 peek 都是同步的。
// app 開機時呼叫一次即可；重複呼叫共用同一個 Promise。
export const hydrateTableCache = () => {
  if (hydrated) return Promise.resolve()
  if (hydratePromise) return hydratePromise
  hydratePromise = idbGetAll().then((entries) => {
    for (const [key, value] of entries) {
      // 記憶體裡較新的資料（hydrate 期間已從網路抓到）優先。
      const current = memory.get(key)
      if (value && Array.isArray(value.rows) && (!current || current.at < value.at)) {
        memory.set(key, value)
        notify(key, value.rows)
      }
    }
    hydrated = true
  }).catch(() => { hydrated = true })
  return hydratePromise
}

const notify = (key, rows) => {
  const set = listeners.get(key)
  if (!set) return
  for (const fn of set) {
    try { fn(rows) } catch {}
  }
}

// 訂閱某張表快取的變動（例如別的頁面寫入後，這邊的清單也跟著更新）。回傳取消函式。
export const subscribeTableCache = (key, fn) => {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(fn)
  return () => listeners.get(key)?.delete(fn)
}

export const peekTableCache = (key) => memory.get(key)?.rows || null

export const peekTableCacheEntry = (key) => memory.get(key) || null

// 先看記憶體；沒有就等 IndexedDB hydrate（通常只要數毫秒）。
export const readTableCache = async (key) => {
  const hit = memory.get(key)
  if (hit) return hit.rows
  await hydrateTableCache()
  return memory.get(key)?.rows || null
}

export const writeTableCache = (key, rows, { silent = false } = {}) => {
  if (!Array.isArray(rows)) return
  // 存一份淺拷貝，避免之後 Vue 端就地 splice 影響快取內容。
  const entry = { rows: rows.slice(), at: Date.now() }
  memory.set(key, entry)
  idbPut(key, entry)
  if (!silent) notify(key, entry.rows)
}

// ── 寫入追蹤（Optimistic UI 用）───────────────────────────────
// 樂觀寫入進行中，或背景讀取開始後有寫入完成時，那次讀取拿到的是「寫入前」的資料：
// 不能拿它覆蓋畫面或快取，否則剛刪掉的列會復活、剛新增的列會消失。
const mutationState = (key) => {
  if (!mutations.has(key)) mutations.set(key, { pending: 0, epoch: 0 })
  return mutations.get(key)
}

export const beginTableMutation = (key) => {
  const state = mutationState(key)
  state.pending += 1
  state.epoch += 1
}

export const endTableMutation = (key) => {
  const state = mutationState(key)
  state.pending = Math.max(0, state.pending - 1)
  state.epoch += 1
}

export const isTableMutating = (key) => (mutations.get(key)?.pending || 0) > 0

export const tableMutationEpoch = (key) => mutations.get(key)?.epoch || 0

// 讀取開始時記下 epoch，結束時用這個判斷資料是否已經被寫入超車。
export const isTableReadStale = (key, epochAtStart) =>
  isTableMutating(key) || tableMutationEpoch(key) !== epochAtStart

// 兩份資料列內容完全相同（背景更新拿到一樣的資料時用來避免整頁重新渲染）。
export const sameRows = (a, b) => {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export const invalidateTableCache = (key) => {
  memory.delete(key)
  idbDelete(key)
}

export const clearTableCache = async () => {
  memory.clear()
  inflight.clear()
  await idbClear()
}

// 分頁並行抓取整張表。
// buildQuery(from, to, withCount) 必須回傳 Supabase query builder（尚未 await）。
export const fetchAllPagesParallel = async (buildQuery, pageSize = TABLE_PAGE_SIZE) => {
  const first = await buildQuery(0, pageSize - 1, true)
  if (first.error) throw first.error
  const rows = first.data ? first.data.slice() : []
  const total = typeof first.count === 'number' ? first.count : null

  if (rows.length < pageSize) return rows

  if (total !== null) {
    const pages = []
    for (let from = pageSize; from < total; from += pageSize) {
      pages.push(buildQuery(from, Math.min(from + pageSize, total) - 1, false))
    }
    const results = await Promise.all(pages)
    for (const res of results) {
      if (res.error) throw res.error
      if (res.data) rows.push(...res.data)
    }
    return rows
  }

  // 沒有 count 時退回逐頁抓取。
  let from = pageSize
  while (true) {
    const res = await buildQuery(from, from + pageSize - 1, false)
    if (res.error) throw res.error
    const data = res.data || []
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

// 標準的整表讀取：select('*') + 可選排序 + 並行分頁。
export const selectWholeTable = (client, table, { order, ascending = false, select = '*' } = {}) =>
  fetchAllPagesParallel((from, to, withCount) => {
    let query = client
      .from(table)
      .select(select, withCount ? { count: 'exact' } : undefined)
    if (order) query = query.order(order, { ascending })
    // 同一排序值時用 id 當次要排序，確保分頁結果穩定、不重複也不漏。
    if (order !== 'id') query = query.order('id', { ascending: true })
    return query.range(from, to)
  })

// stale-while-revalidate 讀取。
// - onCached(rows)：只要有快取就先同步（或 hydrate 後）回呼一次，讓畫面立刻有資料。
// - 回傳 Promise<rows>：網路最新資料（同 key 同時只打一次）。
// - force=false 且快取在 TABLE_FRESH_MS 內，直接回傳快取不打網路。
export const loadTableWithCache = async (key, fetcher, { onCached, force = false } = {}) => {
  const entry = memory.get(key)
  if (entry && onCached) onCached(entry.rows)
  if (!entry && onCached) {
    // 還沒 hydrate 的話等一下 IndexedDB，比網路快很多。
    await hydrateTableCache()
    const later = memory.get(key)
    if (later) onCached(later.rows)
  }

  const current = memory.get(key)
  if (!force && current && Date.now() - current.at < TABLE_FRESH_MS) return current.rows

  if (inflight.has(key)) return inflight.get(key)

  const promise = (async () => {
    const epochAtStart = tableMutationEpoch(key)
    try {
      const rows = (await fetcher()) || []
      // 讀取期間有寫入：這份資料已過時，保留快取裡（寫入後）的版本。
      if (isTableReadStale(key, epochAtStart)) return memory.get(key)?.rows || rows
      // 資料沒變：沿用同一個陣列、只更新時間戳，畫面不必重畫。
      const previous = memory.get(key)
      if (previous && sameRows(previous.rows, rows)) {
        previous.at = Date.now()
        return previous.rows
      }
      writeTableCache(key, rows, { silent: true })
      return rows
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, promise)
  return promise
}

// 測試用：重置模組狀態。
export const __resetTableCacheForTests = () => {
  memory.clear()
  inflight.clear()
  listeners.clear()
  mutations.clear()
  dbPromise = null
  hydratePromise = null
  hydrated = false
}
