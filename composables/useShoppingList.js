import { computed, ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
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
const PAGE_SIZE = 1000

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

const fetchAllRows = async (client) => {
  const rows = []
  let from = 0
  while (true) {
    const { data, error: fetchError } = await client
      .from('shoppinglist')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (fetchError) throw fetchError
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

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

  const loadShoppingItems = async () => {
    const client = initClient()
    if (!client) return
    try {
      loading.value = true
      error.value = ''
      const rows = await fetchAllRows(client)
      items.value = rows.map(shoppingItemFromDbRow).filter(Boolean)
    } catch (err) {
      console.error('載入購物清單資料失敗:', err)
      items.value = []
      error.value = getErrorMessage(err)
    } finally {
      loading.value = false
    }
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
    for (const form of records) {
      const key = shoppingImportKey(form)
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
    }
    await loadShoppingItems()
    return { success: failCount === 0, successCount, failCount }
  }

  return {
    shoppingItems: items,
    shoppingLoading: loading,
    shoppingError: error,
    itemNames,
    shopNames,
    pickupMethods,
    loadShoppingItems,
    addShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    importShoppingItems,
  }
}
