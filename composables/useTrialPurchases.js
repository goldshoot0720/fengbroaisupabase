import { computed, ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
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
const PAGE_SIZE = 1000

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

const fetchAllRows = async (client) => {
  const rows = []
  let from = 0
  while (true) {
    const { data, error: fetchError } = await client
      .from('trialpurchase')
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

export const useTrialPurchases = () => {
  const serviceNames = computed(() =>
    [...new Set(items.value.map((item) => item.name.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    ),
  )

  const loadTrialPurchases = async () => {
    const client = initClient()
    if (!client) return
    try {
      loading.value = true
      error.value = ''
      const rows = await fetchAllRows(client)
      items.value = rows.map(trialPurchaseFromDbRow).filter(Boolean)
    } catch (err) {
      console.error('載入試用／首購資料失敗:', err)
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
      const payload = buildTrialPurchaseWritePayload(form, mode)
      const row = trialPurchaseToDbRow(payload)
      const query = mode === 'update'
        ? client.from('trialpurchase').update(row).eq('id', id).select()
        : client.from('trialpurchase').insert([row]).select()
      const { data, error: writeError } = await query
      if (writeError) throw writeError
      const saved = trialPurchaseFromDbRow(data?.[0])
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

  const addTrialPurchase = (form) => writeRecord(form, 'create')
  const updateTrialPurchase = (id, form) => writeRecord(form, 'update', id)

  const deleteTrialPurchase = async (id) => {
    const client = initClient()
    if (!client) return { success: false, error: '尚未連線 Supabase' }
    try {
      loading.value = true
      const { error: deleteError } = await client.from('trialpurchase').delete().eq('id', id)
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

  const importTrialPurchases = async (records) => {
    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, error: '沒有可匯入的資料' }
    }
    const index = new Map(items.value.map((item) => [trialPurchaseImportKey(item), item.id]))
    let successCount = 0
    let failCount = 0
    for (const form of records) {
      const key = trialPurchaseImportKey(form)
      const existingId = index.get(key)
      const result = existingId
        ? await updateTrialPurchase(existingId, form)
        : await addTrialPurchase(form)
      if (result.success) {
        successCount += 1
        if (result.item?.id) index.set(key, result.item.id)
      } else {
        failCount += 1
      }
    }
    await loadTrialPurchases()
    return { success: failCount === 0, successCount, failCount }
  }

  return {
    trialPurchases: items,
    trialPurchaseLoading: loading,
    trialPurchaseError: error,
    serviceNames,
    loadTrialPurchases,
    addTrialPurchase,
    updateTrialPurchase,
    deleteTrialPurchase,
    importTrialPurchases,
  }
}
