import { computed, ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { runGroupedConcurrently } from '../utils/asyncPool.js'
import {
  buildQuotaWritePayload,
  isMissingTableError,
  quotaFromDbRow,
  quotaToDbRow,
} from '../utils/managementRecords'
import { quotaImportKey } from '../utils/quotaCsv'

const items = ref([])
const loading = ref(false)
const error = ref('')

let currentCredentials = null

const missingTableMessage = '尚未建立 public.quota 資料表，請到鋒兄設定的資料表狀態手動建立 quota。'

const getErrorMessage = (err) => {
  if (isMissingTableError(err, 'quota')) return missingTableMessage
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
  selectWholeTable(client, 'quota', { order: 'created_at', ascending: false })

export const useQuotas = () => {
  const serviceNames = computed(() =>
    [...new Set(items.value.map((item) => item.name.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    ),
  )

  // 先秀快取，再背景更新；同表同時只會有一個請求。
  const loadQuotas = async (options = {}) => {
    const client = initClient()
    if (!client) return
    await loadCachedTable({
      table: 'quota',
      listRef: items,
      loadingRef: loading,
      errorRef: error,
      errorValue: '',
      force: options?.force === true,
      fetcher: async () => (await fetchAllRows(client)).map(quotaFromDbRow).filter(Boolean),
      onError: (err, { showedCache }) => {
        if (!showedCache) items.value = []
        error.value = getErrorMessage(err)
      }
    })
  }

  const writeRecord = async (form, mode, id) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      loading.value = true
      const payload = buildQuotaWritePayload(form, mode)
      const row = quotaToDbRow(payload)
      const query = mode === 'update'
        ? client.from('quota').update(row).eq('id', id).select()
        : client.from('quota').insert([row]).select()
      const { data, error: writeError } = await query
      if (writeError) throw writeError
      const saved = quotaFromDbRow(data?.[0])
      if (mode === 'update') {
        items.value = items.value.map((item) => item.id === id ? saved : item)
      } else {
        items.value = [saved, ...items.value]
      }
      error.value = ''
      return { success: true, item: saved }
    } catch (err) {
      return { success: false, error: getErrorMessage(err) }
    } finally {
      loading.value = false
    }
  }

  const addQuota = (form) => writeRecord(form, 'create')
  const updateQuota = (id, form) => writeRecord(form, 'update', id)

  const deleteQuota = async (id) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      loading.value = true
      const { error: deleteError } = await client.from('quota').delete().eq('id', id)
      if (deleteError) throw deleteError
      items.value = items.value.filter((item) => item.id !== id)
      error.value = ''
      return { success: true }
    } catch (err) {
      return { success: false, error: getErrorMessage(err) }
    } finally {
      loading.value = false
    }
  }

  const importQuotas = async (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, error: '沒有可匯入的資料' }
    }
    const index = new Map(items.value.map((item) => [quotaImportKey(item), item.id]))
    let successCount = 0
    let failCount = 0
    // 不同鍵並行寫入（同鍵依序），大量匯入時快很多。
    await runGroupedConcurrently(records, (form) => quotaImportKey(form), async (form, key) => {
      const existingId = index.get(key)
      const result = existingId
        ? await updateQuota(existingId, form)
        : await addQuota(form)
      if (result.success) {
        successCount += 1
        if (result.item?.id) index.set(key, result.item.id)
      } else {
        failCount += 1
      }
    })
    await loadQuotas({ force: true })
    return { success: failCount === 0, successCount, failCount }
  }


  // 寫入成功後同步快取，切換選單回來時立即是最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('quota', items.value)
    return result
  }

  return {
    quotas: items,
    quotaLoading: loading,
    quotaError: error,
    serviceNames,
    loadQuotas,
    addQuota: withCacheSync(addQuota),
    updateQuota: withCacheSync(updateQuota),
    deleteQuota: withCacheSync(deleteQuota),
    importQuotas: withCacheSync(importQuotas),
  }
}
