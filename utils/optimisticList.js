// utils/optimisticList.js
// Optimistic UI：寫入時先改畫面，再等 Supabase 回應；失敗就把那一筆還原。
//
// - 新增：立刻插入一筆暫時列（id 為 `optimistic-…`），成功後換成伺服器回傳的列。
// - 更新：立刻套用修改，成功後換成伺服器回傳的列；失敗且期間沒有更新的修改時還原舊值。
// - 刪除：立刻移除，失敗時插回原本的位置（已被別處加回的不重複插）。
//
// 還原只動「這次操作」那幾筆，不會把整份清單倒回快照，
// 所以同時進行的多個寫入互不覆蓋。
// 暫時列在伺服器回應前被編輯 / 刪除時，commit 會拿到真正的 id（resolveOptimisticId）。
//
// 本模組不依賴 Vue：listRef 只要是有 `.value` 陣列的物件即可，node --test 可直接測。

export const OPTIMISTIC_ID_PREFIX = 'optimistic-'

let tempSeq = 0
const pendingIds = new Map() // tempId -> Promise<realId | null>
const updateTokens = new WeakMap() // listRef -> Map<id, token>

export const createOptimisticId = () =>
  `${OPTIMISTIC_ID_PREFIX}${Date.now().toString(36)}-${++tempSeq}`

export const isOptimisticId = (id) =>
  typeof id === 'string' && id.startsWith(OPTIMISTIC_ID_PREFIX)

// 暫時 id → 真正 id（新增失敗時為 null）；一般 id 原樣回傳。
export const resolveOptimisticId = async (id) => {
  if (!isOptimisticId(id)) return id
  const pending = pendingIds.get(id)
  return pending ? pending : null
}

// 寫入快取前去掉尚未確認的暫時列，避免重新整理後看到假資料。
export const withoutOptimisticRows = (rows) =>
  Array.isArray(rows) ? rows.filter((row) => !isOptimisticId(row?.id)) : []

const setList = (listRef, next, sort) => {
  listRef.value = sort ? sort(next) : next
}

const noop = () => {}

// 新增：draft 是畫面上先顯示的內容；commit() 回傳伺服器存好的列（或 null）。
export const optimisticInsert = async ({
  listRef,
  draft,
  commit,
  prepend = true,
  sort,
  onStart = noop,
  onEnd = noop
}) => {
  const tempId = createOptimisticId()
  const temp = { ...draft, id: tempId }
  let settleId
  pendingIds.set(tempId, new Promise((resolve) => { settleId = resolve }))

  onStart()
  setList(listRef, prepend ? [temp, ...listRef.value] : [...listRef.value, temp], sort)
  try {
    const saved = await commit()
    const list = listRef.value
    const index = list.findIndex((row) => row?.id === tempId)
    // 暫時列在等待期間被使用者刪掉了：伺服器那筆由刪除流程處理，不要再插回來。
    if (index !== -1) {
      const next = list.slice()
      if (saved) next[index] = saved
      else next.splice(index, 1)
      setList(listRef, next, sort)
    }
    settleId(saved?.id ?? null)
    return saved
  } catch (e) {
    const next = listRef.value.filter((row) => row?.id !== tempId)
    if (next.length !== listRef.value.length) setList(listRef, next, sort)
    settleId(null)
    throw e
  } finally {
    onEnd()
  }
}

// 更新：patch 會合併到目前那一列；commit(realId) 回傳伺服器存好的列（或 null 表示沿用 patch 結果）。
export const optimisticUpdate = async ({
  listRef,
  id,
  patch,
  commit,
  sort,
  onStart = noop,
  onEnd = noop
}) => {
  if (!updateTokens.has(listRef)) updateTokens.set(listRef, new Map())
  const tokens = updateTokens.get(listRef)
  const token = {}
  tokens.set(id, token)

  const list = listRef.value
  const index = list.findIndex((row) => row?.id === id)
  const before = index === -1 ? null : list[index]

  onStart()
  if (before) {
    const next = list.slice()
    next[index] = { ...before, ...patch, id: before.id }
    setList(listRef, next, sort)
  }

  try {
    const realId = await resolveOptimisticId(id)
    if (realId === null || realId === undefined) throw new Error('新增尚未完成或已失敗，無法更新')
    const saved = await commit(realId)
    if (saved) {
      const current = listRef.value
      const at = current.findIndex((row) => row?.id === realId || row?.id === id)
      if (at !== -1) {
        const next = current.slice()
        next[at] = saved
        setList(listRef, next, sort)
      }
    }
    return saved
  } catch (e) {
    // 只有在這之後沒有更新的修改時才還原，免得蓋掉使用者後來的編輯。
    if (before && tokens.get(id) === token) {
      const current = listRef.value
      const at = current.findIndex((row) => row?.id === id)
      if (at !== -1) {
        const next = current.slice()
        next[at] = before
        setList(listRef, next, sort)
      }
    }
    throw e
  } finally {
    if (tokens.get(id) === token) tokens.delete(id)
    onEnd()
  }
}

// 刪除：commit(realIds) 真的去刪；暫時列會先等新增完成拿到真 id。
export const optimisticRemove = async ({
  listRef,
  ids,
  commit,
  sort,
  onStart = noop,
  onEnd = noop
}) => {
  const idList = Array.isArray(ids) ? ids : [ids]
  const idSet = new Set(idList)
  const removed = []
  listRef.value.forEach((row, index) => {
    if (idSet.has(row?.id)) removed.push({ row, index })
  })

  onStart()
  if (removed.length) setList(listRef, listRef.value.filter((row) => !idSet.has(row?.id)), sort)
  try {
    const realIds = (await Promise.all(idList.map(resolveOptimisticId)))
      .filter((id) => id !== null && id !== undefined)
    // 全部都是新增失敗的暫時列：畫面已經移除，不用再打伺服器。
    if (realIds.length === 0) return undefined
    return await commit(realIds)
  } catch (e) {
    const next = listRef.value.slice()
    for (const { row, index } of removed) {
      if (next.some((item) => item?.id === row.id)) continue
      next.splice(Math.min(index, next.length), 0, row)
    }
    if (removed.length) setList(listRef, next, sort)
    throw e
  } finally {
    onEnd()
  }
}

// 測試用
export const __resetOptimisticListForTests = () => {
  pendingIds.clear()
  tempSeq = 0
}
