import { ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { runGroupedConcurrently } from '../utils/asyncPool.js'
import {
  buildReinstallSoftwareWritePayload,
  isMissingTableError,
  reinstallFromDbRow,
  reinstallToDbRow,
} from '../utils/managementRecords'
import { reinstallImportKey } from '../utils/reinstallCsv'

const items = ref([])
const loading = ref(false)
const error = ref('')

let currentCredentials = null

const missingTableMessage = '尚未建立 public.reinstall 資料表，請到鋒兄設定的資料表狀態手動建立 reinstall。'
const missingColumnMessage = 'reinstall 資料表缺少訂閱欄位，請到鋒兄設定複製 SQL，或執行 reinstall-setup.sql 補齊 subscriptionsoftware／subscriptionperiod／subscriptionprice／subscriptioncurrency。'

const getErrorMessage = (err) => {
  if (isMissingTableError(err, 'reinstall')) return missingTableMessage
  const message = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`
  if (
    err?.code === 'PGRST204' ||
    /subscriptionsoftware|subscriptionperiod|subscriptionprice|subscriptioncurrency/i.test(message)
  ) {
    return missingColumnMessage
  }
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
  selectWholeTable(client, 'reinstall', { order: 'created_at', ascending: false })

export const useReinstalls = () => {
  // 先秀快取，再背景更新；同表同時只會有一個請求。
  const loadReinstalls = async (options = {}) => {
    const client = initClient()
    if (!client) return
    await loadCachedTable({
      table: 'reinstall',
      listRef: items,
      loadingRef: loading,
      errorRef: error,
      errorValue: '',
      force: options?.force === true,
      fetcher: async () => (await fetchAllRows(client)).map(reinstallFromDbRow).filter(Boolean),
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
      const payload = buildReinstallSoftwareWritePayload(form, mode)
      const row = reinstallToDbRow(payload)
      const query = mode === 'update'
        ? client.from('reinstall').update(row).eq('id', id).select()
        : client.from('reinstall').insert([row]).select()
      const { data, error: writeError } = await query
      if (writeError) throw writeError
      const saved = reinstallFromDbRow(data?.[0])
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

  const addReinstall = (form) => writeRecord(form, 'create')
  const updateReinstall = (id, form) => writeRecord(form, 'update', id)

  const importReinstalls = async (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, error: '沒有可匯入的資料' }
    }
    const index = new Map(items.value.map((item) => [reinstallImportKey(item), item.id]))
    let successCount = 0
    let failCount = 0
    // 不同鍵並行寫入（同鍵依序），大量匯入時快很多。
    await runGroupedConcurrently(records, (form) => reinstallImportKey(form), async (form, key) => {
      const existingId = index.get(key)
      const result = existingId
        ? await updateReinstall(existingId, form)
        : await addReinstall(form)
      if (result.success) {
        successCount += 1
        if (result.item?.id) index.set(key, result.item.id)
      } else {
        failCount += 1
      }
    })
    await loadReinstalls({ force: true })
    return { success: failCount === 0, successCount, failCount }
  }

  const deleteReinstall = async (id) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      loading.value = true
      const { error: deleteError } = await client.from('reinstall').delete().eq('id', id)
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


  // 寫入成功後同步快取，切換選單回來時立即是最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('reinstall', items.value)
    return result
  }

  return {
    reinstalls: items,
    reinstallLoading: loading,
    reinstallError: error,
    loadReinstalls,
    addReinstall: withCacheSync(addReinstall),
    updateReinstall: withCacheSync(updateReinstall),
    deleteReinstall: withCacheSync(deleteReinstall),
    importReinstalls: withCacheSync(importReinstalls),
  }
}
