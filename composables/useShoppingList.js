import { computed, ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { runGroupedConcurrently } from '../utils/asyncPool.js'
import {
  buildShoppingItemWritePayload,
  isMissingTableError,
  shoppingItemFromDbRow,
  shoppingItemToDbRow,
} from '../utils/managementRecords'
import { shoppingImportKey } from '../utils/shoppingCsv'

const items = ref([])
const loading = ref(false)
const error = ref('')

let currentCredentials = null

const missingTableMessage = '尚未建立 public.shoppinglist 資料表，請到鋒兄設定的資料表狀態手動建立 shoppinglist。'

const getErrorMessage = (err) => {
  if (isMissingTableError(err, 'shoppinglist')) return missingTableMessage
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
  selectWholeTable(client, 'shoppinglist', { order: 'created_at', ascending: false })

export const useShoppingList = () => {
  const itemNames = computed(() =>
    [...new Set(items.value.map((item) => item.name.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    ),
  )
  const shopNames = computed(() =>
    [...new Set(items.value.map((item) => item.shop?.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    ),
  )
  const pickupMethods = computed(() =>
    [...new Set(items.value.map((item) => item.pickupMethod?.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    ),
  )

  // 先秀快取，再背景更新；同表同時只會有一個請求。
  const loadShoppingItems = async (options = {}) => {
    const client = initClient()
    if (!client) return
    await loadCachedTable({
      table: 'shoppinglist',
      listRef: items,
      loadingRef: loading,
      errorRef: error,
      errorValue: '',
      force: options?.force === true,
      fetcher: async () => (await fetchAllRows(client)).map(shoppingItemFromDbRow).filter(Boolean),
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
      const payload = buildShoppingItemWritePayload(form, mode)
      const row = shoppingItemToDbRow(payload)
      const query = mode === 'update'
        ? client.from('shoppinglist').update(row).eq('id', id).select()
        : client.from('shoppinglist').insert([row]).select()
      const { data, error: writeError } = await query
      if (writeError) throw writeError
      const saved = shoppingItemFromDbRow(data?.[0])
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

  const addShoppingItem = (form) => writeRecord(form, 'create')
  const updateShoppingItem = (id, form) => writeRecord(form, 'update', id)

  const deleteShoppingItem = async (id) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      loading.value = true
      const { error: deleteError } = await client.from('shoppinglist').delete().eq('id', id)
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

  const importShoppingItems = async (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, error: '沒有可匯入的資料' }
    }
    const index = new Map(items.value.map((item) => [shoppingImportKey(item), item.id]))
    let successCount = 0
    let failCount = 0
    // 不同鍵並行寫入（同鍵依序），大量匯入時快很多。
    await runGroupedConcurrently(records, (form) => shoppingImportKey(form), async (form, key) => {
      const existingId = index.get(key)
      const result = existingId
        ? await updateShoppingItem(existingId, form)
        : await addShoppingItem(form)
      if (result.success) {
        successCount += 1
        if (result.item?.id) index.set(key, result.item.id)
      } else {
        failCount += 1
      }
    })
    await loadShoppingItems({ force: true })
    return { success: failCount === 0, successCount, failCount }
  }


  // 寫入成功後同步快取，切換選單回來時立即是最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('shoppinglist', items.value)
    return result
  }

  return {
    shoppingItems: items,
    shoppingLoading: loading,
    shoppingError: error,
    itemNames,
    shopNames,
    pickupMethods,
    loadShoppingItems,
    addShoppingItem: withCacheSync(addShoppingItem),
    updateShoppingItem: withCacheSync(updateShoppingItem),
    deleteShoppingItem: withCacheSync(deleteShoppingItem),
    importShoppingItems: withCacheSync(importShoppingItems),
  }
}
