// composables/useTableCounts.js
// 只需要「筆數」的地方（例如儀表板的資料表統計）改用 Supabase 的 count 查詢。
//
// 原本儀表板為了顯示筆數，會把十幾張表的所有欄位整批抓下來
// （含 lyrics / hash / cover 這類長欄位），資料量大時首屏會被卡住。
// 這裡改用 `head: true` 的 exact count：只回傳 Content-Range 標頭，不傳任何資料列。
import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const counts = ref({})
const loading = ref(false)
const error = ref(null)
let inflight = null

const fetchCount = async (client, table) => {
  const { count, error: countError } = await client
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (countError) {
    // 單一資料表不存在或沒權限時不要拖垮整批統計，保留舊值即可。
    console.warn(`取得 ${table} 筆數失敗:`, countError.message || countError)
    return [table, counts.value[table] ?? 0]
  }
  return [table, count || 0]
}

export const useTableCounts = () => {
  /**
   * 平行取得多張資料表的筆數。重複呼叫時共用同一個進行中的請求。
   * @param {string[]} tables 資料表名稱
   */
  const loadTableCounts = (tables = []) => {
    if (inflight) return inflight

    const client = getSupabaseBrowserClient()
    if (!client || tables.length === 0) return Promise.resolve(counts.value)

    const hasCache = Object.keys(counts.value).length > 0

    inflight = (async () => {
      if (!hasCache) loading.value = true
      error.value = null
      try {
        const entries = await Promise.all(tables.map(table => fetchCount(client, table)))
        counts.value = { ...counts.value, ...Object.fromEntries(entries) }
        return counts.value
      } catch (e) {
        console.error('取得資料表筆數失敗:', e)
        error.value = e?.message || String(e)
        return counts.value
      } finally {
        loading.value = false
        inflight = null
      }
    })()

    return inflight
  }

  const countFor = (table) => counts.value[table] ?? 0

  return { counts, loading, error, loadTableCounts, countFor }
}
