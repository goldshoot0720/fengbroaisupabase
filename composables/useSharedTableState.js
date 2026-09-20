// composables/useSharedTableState.js
// 資料表共用狀態：同一張表在所有頁面共用一份資料與同一個進行中的請求。
//
// 解決三個載入速度問題：
// 1. 儀表板與內頁同時掛載時，同一張表只打一次 Supabase（併發去重）。
// 2. 切換頁面再回來時，直接沿用上次的資料，不再從空白重畫（背景靜默更新）。
// 3. 切換 Supabase 帳號（URL / API key）時自動丟棄舊資料，避免顯示上一個帳號的內容。
import { ref } from 'vue'
import { getSupabaseBrowserConfig } from './useSupabaseBrowserClient'

const registry = new Map()

const readCredKey = () => {
  if (typeof window === 'undefined') return ''
  try {
    return getSupabaseBrowserConfig().credKey || ''
  } catch {
    return ''
  }
}

export const useSharedTableState = (key) => {
  let state = registry.get(key)

  if (!state) {
    state = {
      items: ref([]),
      loading: ref(false),
      error: ref(null),
      inflight: null,
      credKey: readCredKey()
    }
    registry.set(key, state)
    return state
  }

  const credKey = readCredKey()
  if (state.credKey !== credKey) {
    state.credKey = credKey
    state.items.value = []
    state.error.value = null
    state.inflight = null
  }

  return state
}

/**
 * 載入資料表內容。
 *
 * - 已有進行中的請求時共用同一個 Promise，不會重複往返 Supabase。
 * - 已經有快取資料時採靜默更新（不把 loading 打開），畫面先顯示舊資料、
 *   新資料回來再換掉，避免每次進頁面都閃一次載入中。
 *
 * @param {object} state useSharedTableState() 取得的共用狀態
 * @param {() => Promise<any[]>} fetcher 真正打 Supabase 的函式，回傳資料列陣列
 * @param {{ label?: string }} options label 只用於錯誤訊息
 */
export const loadSharedTable = (state, fetcher, { label = 'table' } = {}) => {
  if (state.inflight) return state.inflight

  const hasCache = state.items.value.length > 0

  state.inflight = (async () => {
    if (!hasCache) state.loading.value = true
    state.error.value = null
    try {
      const rows = await fetcher()
      state.items.value = rows || []
      return state.items.value
    } catch (e) {
      console.error(`Error loading ${label}:`, e)
      state.error.value = e?.message || String(e)
      return state.items.value
    } finally {
      state.loading.value = false
      state.inflight = null
    }
  })()

  return state.inflight
}
