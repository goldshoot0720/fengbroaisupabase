import { ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
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
const PAGE_SIZE = 1000

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

const fetchAllRows = async (client) => {
  const rows = []
  let from = 0
  while (true) {
    const { data, error: fetchError } = await client
      .from('reinstall')
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

export const useReinstalls = () => {
  const loadReinstalls = async () => {
    const client = initClient()
    if (!client) return
    try {
      loading.value = true
      error.value = ''
      const rows = await fetchAllRows(client)
      items.value = rows.map(reinstallFromDbRow).filter(Boolean)
    } catch (err) {
      console.error('載入重灌資料失敗:', err)
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
    for (const form of records) {
      const key = reinstallImportKey(form)
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
    }
    await loadReinstalls()
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

  return {
    reinstalls: items,
    reinstallLoading: loading,
    reinstallError: error,
    loadReinstalls,
    addReinstall,
    updateReinstall,
    deleteReinstall,
    importReinstalls,
  }
}
