// composables/useCachedTable.js
// 把 utils/tableCache 接到 Vue ref：先顯示快取，再背景更新；寫入後同步快取。
// 寫入走 Optimistic UI（utils/optimisticList）：先改畫面，失敗再還原並跳 toast。
import { getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { useToast } from './useToast'
import {
  tableCacheKey,
  loadTableWithCache,
  writeTableCache,
  selectWholeTable,
  beginTableMutation,
  endTableMutation,
  isTableMutating,
  tableMutationEpoch,
  isTableReadStale,
  sameRows
} from '../utils/tableCache.js'
import {
  optimisticInsert,
  optimisticUpdate,
  optimisticRemove,
  resolveOptimisticId,
  isOptimisticId,
  withoutOptimisticRows
} from '../utils/optimisticList.js'

export { selectWholeTable, resolveOptimisticId, isOptimisticId }

export const currentTableCacheKey = (table, variant = '') => {
  const { credKey } = getSupabaseBrowserConfig()
  return tableCacheKey(credKey, table, variant)
}

// listRef：畫面用的清單 ref；fetcher：回傳「畫面可直接用」的資料列陣列。
// loadingRef 只有在畫面上完全沒有資料時才會變 true，避免已經有內容時閃出「載入中」。
// 樂觀寫入進行中（或讀取期間有寫入完成）時，不拿讀到的舊資料覆蓋畫面。
// TABLE_FRESH_MS（60 秒）內再次載入完全不打網路。
export const loadCachedTable = async ({
  table,
  variant = '',
  listRef,
  loadingRef,
  errorRef,
  fetcher,
  force = false,
  errorValue = null,
  onError
}) => {
  const key = currentTableCacheKey(table, variant)
  const epochAtStart = tableMutationEpoch(key)
  let showedCache = false
  try {
    if (errorRef) errorRef.value = errorValue
    if (loadingRef && listRef.value.length === 0) loadingRef.value = true
    const rows = await loadTableWithCache(key, fetcher, {
      force,
      onCached: (cached) => {
        showedCache = true
        if (!isTableMutating(key) && !sameRows(listRef.value, cached)) listRef.value = cached.slice()
        if (loadingRef) loadingRef.value = false
      }
    })
    // 資料沒變就不重新指定清單，切換選單回來不會整頁重畫。
    if (!isTableReadStale(key, epochAtStart) && !sameRows(listRef.value, rows)) listRef.value = rows.slice()
    return { success: true, rows: listRef.value, fromCache: showedCache }
  } catch (e) {
    console.error(`載入 ${table} 失敗:`, e)
    if (errorRef) errorRef.value = e?.message || String(e)
    if (onError) onError(e, { showedCache })
    return { success: false, error: e?.message || String(e) }
  } finally {
    if (loadingRef) loadingRef.value = false
  }
}

// 寫入（新增 / 更新 / 刪除 / 匯入）成功後呼叫，讓下次切回頁面立刻看到最新狀態。
// 尚未確認的暫時列不寫進快取。
export const rememberCachedTable = (table, rows, variant = '') => {
  try {
    writeTableCache(currentTableCacheKey(table, variant), withoutOptimisticRows(rows))
  } catch {}
}

const ACTION_LABELS = { insert: '新增', update: '更新', remove: '刪除' }

// 綁定某張表 + 清單 ref 的樂觀寫入工具。
// - sort(list)：清單有固定排序時（例如銀行依存款、筆記依日期）傳入，每次變動後重排。
// - toMessage(err)：把錯誤轉成給人看的訊息（例如缺表提示）。
// 每個方法都會：標記寫入中（擋住背景讀取覆蓋）→ 先改畫面 → commit → 成功寫快取 / 失敗還原 + toast。
// commit 丟出的錯誤會原樣往外丟，呼叫端維持原本的 try/catch 與回傳格式。
// options.notify = false：不跳失敗 toast（例如 CSV 匯入逐筆呼叫時由匯入結果統一回報）。
export const createOptimisticList = ({ table, listRef, sort, toMessage, variant = '' }) => {
  const key = () => currentTableCacheKey(table, variant)
  const run = (action, fn, { notify = true } = {}) => {
    const cacheKey = key()
    return fn({
      listRef,
      sort,
      onStart: () => beginTableMutation(cacheKey),
      // 先寫快取再解除「寫入中」，背景讀取才不會在中間塞進舊資料。
      onEnd: () => {
        rememberCachedTable(table, listRef.value, variant)
        endTableMutation(cacheKey)
      }
    }).catch((err) => {
      if (notify) {
        const message = toMessage ? toMessage(err) : (err?.message || String(err))
        try {
          const toast = useToast()
          const text = `${ACTION_LABELS[action]}失敗，畫面已還原：${message}`
          // 批次操作同時失敗時只顯示一則相同訊息。
          if (!toast.toasts.value.some((t) => t.message === text)) toast.error(text, { duration: 5000 })
        } catch {}
      }
      throw err
    })
  }

  return {
    // options.prepend = false：暫時列放在最後（預設放最前面）。
    insert: (draft, commit, options = {}) =>
      run('insert', (base) => optimisticInsert({ ...base, prepend: options.prepend !== false, draft, commit }), options),
    update: (id, patch, commit, options = {}) =>
      run('update', (base) => optimisticUpdate({ ...base, id, patch, commit }), options),
    remove: (ids, commit, options = {}) =>
      run('remove', (base) => optimisticRemove({ ...base, ids, commit }), options)
  }
}
