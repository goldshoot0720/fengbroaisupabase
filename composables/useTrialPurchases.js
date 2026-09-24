import { computed, ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { runGroupedConcurrently } from '../utils/asyncPool.js'
import {
  buildTrialPurchaseWritePayload,
  isMissingTableError,
  trialPurchaseFromDbRow,
  trialPurchaseToDbRow,
} from '../utils/managementRecords'
import { trialPurchaseImportKey } from '../utils/trialPurchaseCsv'

const items = ref([])
const loading = ref(false)
const error = ref('')

let currentCredentials = null

const missingTableMessage = '尚未建立 public.trialpurchase 資料表，請到鋒兄設定的資料表狀態手動建立 trialpurchase。'

const getErrorMessage = (err) => {
  if (isMissingTableError(err, 'trialpurchase')) return missingTableMessage
  return err?.message || String(err)
}

const initClient = () => {
  if (!process.client) return null
  const { credKey } = getSupabaseBrowserConfig()
  if (currentCredentials !== credKey) {
    currentCredentials = credKey
    items.value = []
    error.value = ''
  }
  return getSupabaseBrowserClient()
}

// 超過 1000 筆時第一頁拿到總數後其餘頁面並行抓取。
const fetchAllRows = (client) =>
  selectWholeTable(client, 'trialpurchase', { order: 'created_at', ascending: false })

export const useTrialPurchases = () => {
  // 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
  const optimistic = createOptimisticList({ table: 'trialpurchase', listRef: items, toMessage: getErrorMessage })

  const serviceNames = computed(() =>
    [...new Set(items.value.map((item) => item.name.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    ),
  )

  // 先秀快取，再背景更新；同表同時只會有一個請求。
  const loadTrialPurchases = async (options = {}) => {
    const client = initClient()
    if (!client) return
    await loadCachedTable({
      table: 'trialpurchase',
      listRef: items,
      loadingRef: loading,
      errorRef: error,
      errorValue: '',
      force: options?.force === true,
      fetcher: async () => (await fetchAllRows(client)).map(trialPurchaseFromDbRow).filter(Boolean),
      onError: (err, { showedCache }) => {
        if (!showedCache) items.value = []
        error.value = getErrorMessage(err)
      }
    })
  }

  const writeRecord = async (form, mode, id, options = {}) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      loading.value = true
      const payload = buildTrialPurchaseWritePayload(form, mode)
      const row = trialPurchaseToDbRow(payload)
      // 畫面先用即將寫入的內容，伺服器回傳後換成正式資料列（含 id / created_at）。
      const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...preview } = trialPurchaseFromDbRow(row)
      const commitRow = async (query) => {
        const { data, error: writeError } = await query
        if (writeError) throw writeError
        return trialPurchaseFromDbRow(data?.[0])
      }
      const saved = mode === 'update'
        ? await optimistic.update(id, preview, (realId) =>
            commitRow(client.from('trialpurchase').update(row).eq('id', realId).select()), options)
        : await optimistic.insert(preview, () =>
            commitRow(client.from('trialpurchase').insert([row]).select()), options)
      error.value = ''
      return { success: true, item: saved }
    } catch (err) {
      return { success: false, error: getErrorMessage(err) }
    } finally {
      loading.value = false
    }
  }

  const addTrialPurchase = (form) => writeRecord(form, 'create')
  const updateTrialPurchase = (id, form) => writeRecord(form, 'update', id)

  const deleteTrialPurchase = async (id) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      await optimistic.remove([id], async ([realId]) => {
        const { error: deleteError } = await client.from('trialpurchase').delete().eq('id', realId)
        if (deleteError) throw deleteError
      })
      error.value = ''
      return { success: true }
    } catch (err) {
      return { success: false, error: getErrorMessage(err) }
    }
  }

  const importTrialPurchases = async (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, error: '沒有可匯入的資料' }
    }
    const index = new Map(items.value.map((item) => [trialPurchaseImportKey(item), item.id]))
    let successCount = 0
    let failCount = 0
    // 不同鍵並行寫入（同鍵依序），大量匯入時快很多。
    await runGroupedConcurrently(records, (form) => trialPurchaseImportKey(form), async (form, key) => {
      const existingId = index.get(key)
      const result = existingId
        ? await writeRecord(form, 'update', existingId, { notify: false })
        : await writeRecord(form, 'create', undefined, { notify: false })
      if (result.success) {
        successCount += 1
        if (result.item?.id) index.set(key, result.item.id)
      } else {
        failCount += 1
      }
    })
    await loadTrialPurchases({ force: true })
    return { success: failCount === 0, successCount, failCount }
  }


  // 寫入成功後同步快取，切換選單回來時立即是最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('trialpurchase', items.value)
    return result
  }

  return {
    trialPurchases: items,
    trialPurchaseLoading: loading,
    trialPurchaseError: error,
    serviceNames,
    loadTrialPurchases,
    addTrialPurchase: withCacheSync(addTrialPurchase),
    updateTrialPurchase: withCacheSync(updateTrialPurchase),
    deleteTrialPurchase: withCacheSync(deleteTrialPurchase),
    importTrialPurchases: withCacheSync(importTrialPurchases),
  }
}
