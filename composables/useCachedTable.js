// composables/useCachedTable.js
// 把 utils/tableCache 接到 Vue ref：先顯示快取，再背景更新；寫入後同步快取。
import { getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import {
  tableCacheKey,
  loadTableWithCache,
  writeTableCache,
  selectWholeTable
} from '../utils/tableCache.js'

export { selectWholeTable }

export const currentTableCacheKey = (table, variant = '') => {
  const { credKey } = getSupabaseBrowserConfig()
  return tableCacheKey(credKey, table, variant)
}

// listRef：畫面用的清單 ref；fetcher：回傳「畫面可直接用」的資料列陣列。
// loadingRef 只有在畫面上完全沒有資料時才會變 true，避免已經有內容時閃出「載入中」。
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
  let showedCache = false
  try {
    if (errorRef) errorRef.value = errorValue
    if (loadingRef && listRef.value.length === 0) loadingRef.value = true
    const rows = await loadTableWithCache(key, fetcher, {
      force,
      onCached: (cached) => {
        showedCache = true
        listRef.value = cached.slice()
        if (loadingRef) loadingRef.value = false
      }
    })
    listRef.value = rows.slice()
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
export const rememberCachedTable = (table, rows, variant = '') => {
  try {
    writeTableCache(currentTableCacheKey(table, variant), Array.isArray(rows) ? rows : [])
  } catch {}
}
