import { ref, watch } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import {
  fetchFinanceInstrumentRows,
  financeInstrumentFromDbRow,
  isFinanceInstrumentTableMissing,
  readLegacyFinanceList,
  saveFinanceInstrumentList,
  writeLegacyFinanceList,
} from '../utils/financeInstrumentStore.js'

// 鋒兄金融標的（全部標的，含遷移進來的原預設標的）的雲端同步：public.financeinstrument 每檔一列，雲端為主、
// localStorage 為離線快取。對外介面與 useCloudListSync 相同（hydrateFromCloud /
// cloudReady / syncState / loadVersion），FengToolsPage 的新增、編輯、刪除、
// CSV 匯入只要改 target 清單即可。
//
// - 首次載入：表有資料就覆蓋本機；表是空的就把 toollistsync 舊清單（沒有則本機）搬進來。
// - 之後清單每次變更 debounce 400ms：upsert 目前清單、刪除已移除的列。
// - financeinstrument 表還沒建：退回舊的 toollistsync 寫法，不阻斷操作。

const stringify = (value) => {
  try {
    return JSON.stringify(value ?? [])
  } catch {
    return ''
  }
}

/**
 * @param {object} options
 * @param {import('vue').Ref} options.target 自訂標的清單 ref
 * @param {() => unknown[]} options.readLocal 本機快取讀取
 * @param {(value: unknown[]) => void} options.writeLocal 本機快取寫入
 * @param {(value: unknown) => unknown} [options.normalize] 載入時的正規化
 */
export const useFinanceInstrumentSync = (options) => {
  const { target, readLocal, writeLocal, normalize = (value) => value } = options

  const cloudReady = ref(false)
  const syncState = ref('idle') // idle | syncing | error
  const loadVersion = ref(0)
  // 'table'：financeinstrument；'legacy'：表還沒建，寫 toollistsync；null：尚未載入成功
  let mode = null
  let knownRows = []
  let lastSynced = ''
  let debounceTimer = null
  let inFlight = false
  let pendingAfterInFlight = false

  const client = () => (process.client ? getSupabaseBrowserClient() : null)

  // 套用雲端清單後 watch 仍會觸發，但內容等於 lastSynced，uploadCurrent 會直接略過。
  const applyList = (list) => {
    target.value = list.map(normalize).filter(Boolean)
    writeLocal(target.value)
  }

  const uploadCurrent = async () => {
    if (!mode) return
    if (inFlight) {
      pendingAfterInFlight = true
      return
    }
    const snapshot = stringify(target.value)
    if (snapshot === lastSynced) return
    const supabase = client()
    if (!supabase) return
    inFlight = true
    syncState.value = 'syncing'
    try {
      if (mode === 'table') {
        knownRows = await saveFinanceInstrumentList(supabase, target.value, knownRows)
      } else {
        await writeLegacyFinanceList(supabase, target.value)
      }
      lastSynced = snapshot
      syncState.value = 'idle'
    } catch (err) {
      console.error('鋒兄金融標的同步失敗:', err)
      syncState.value = 'error'
      // 單次失敗不中斷；下次變更會重試。
    } finally {
      inFlight = false
      if (pendingAfterInFlight) {
        pendingAfterInFlight = false
        debounceTimer = setTimeout(uploadCurrent, 400)
      }
    }
  }

  const hydrateLegacy = async (supabase) => {
    mode = 'legacy'
    const remote = await readLegacyFinanceList(supabase)
    if (remote.length) {
      applyList(remote)
      lastSynced = stringify(target.value)
    }
  }

  /** 掛載時呼叫一次。 */
  const hydrateFromCloud = async () => {
    if (typeof window === 'undefined') return
    const supabase = client()
    if (!supabase) return
    try {
      let rows
      try {
        rows = await fetchFinanceInstrumentRows(supabase)
      } catch (err) {
        if (!isFinanceInstrumentTableMissing(err)) throw err
        await hydrateLegacy(supabase)
        cloudReady.value = true
        syncState.value = 'idle'
        loadVersion.value += 1
        await uploadCurrent()
        return
      }

      mode = 'table'
      knownRows = rows
      cloudReady.value = true
      if (rows.length) {
        applyList(rows.map(financeInstrumentFromDbRow).filter(Boolean))
        lastSynced = stringify(target.value)
      } else {
        // 首次使用獨立表：搬 toollistsync 舊清單，沒有就搬本機快取。
        const legacy = await readLegacyFinanceList(supabase)
        const source = legacy.length ? legacy : readLocal()
        if (source.length) applyList(source)
      }
      syncState.value = 'idle'
      loadVersion.value += 1
      await uploadCurrent()
    } catch (err) {
      console.error('鋒兄金融標的載入失敗:', err)
      mode = null
      cloudReady.value = false
      syncState.value = 'error'
    }
  }

  watch(
    target,
    (next) => {
      writeLocal(next)
      if (debounceTimer) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(uploadCurrent, 400)
    },
    { deep: true },
  )

  return {
    cloudReady,
    syncState,
    loadVersion,
    hydrateFromCloud,
  }
}
