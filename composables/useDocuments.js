import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { useSharedTableState, loadSharedTable } from './useSharedTableState'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useDocuments = () => {
  // 共用狀態：儀表板與內頁共享同一份 commondocument 資料，避免各自重打 Supabase。
  const tableState = useSharedTableState('commondocument')
  const documents = tableState.items
  const loading = tableState.loading
  const error = tableState.error

  const TABLE = 'commondocument'
  const FIELDS = ['name', 'file', 'note', 'ref', 'category', 'hash', 'cover']
  // 各欄位對應資料庫 varchar 長度限制
  const FIELD_LIMITS = { name: 100, category: 100, note: 100, ref: 100, file: 150, cover: 150, hash: 300 }

  /** 將 payload 中可能超長的 varchar 欄位截斷，避免資料庫報錯 */
  const sanitizePayload = (payload) => {
    for (const [f, limit] of Object.entries(FIELD_LIMITS)) {
      if (payload[f] && typeof payload[f] === 'string' && payload[f].length > limit) {
        console.warn(`⚠️ 欄位 "${f}" 長度 ${payload[f].length} 超過 ${limit}，已截斷。原值: ${payload[f]}`)
        payload[f] = payload[f].substring(0, limit)
      }
    }
    return payload
  }

  const loadDocuments = () => {
    const client = initSupabase()
    if (!client) return Promise.resolve(documents.value)

    // 交給共用狀態處理：併發去重 + 有快取時靜默更新。
    return loadSharedTable(tableState, async () => {
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      return data || []
    }, { label: 'commondocument' })
  }

  const addDocument = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      sanitizePayload(payload)
      const { data, error: err } = await client.from(TABLE).insert([payload]).select()
      if (err) throw err
      if (data) documents.value.unshift(data[0])
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const updateDocument = async (id, item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      sanitizePayload(payload)
      const { data, error: err } = await client.from(TABLE).update(payload).eq('id', id).select()
      if (err) throw err
      if (data) {
        const idx = documents.value.findIndex(a => a.id === id)
        if (idx !== -1) documents.value[idx] = data[0]
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const deleteDocument = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const { error: err } = await client.from(TABLE).delete().eq('id', id)
      if (err) throw err
      documents.value = documents.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const importDocuments = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    try {
      loading.value = true
      const payload = rows.map(r => {
        const row = {}
        FIELDS.forEach(f => {
          if (f === 'name') row[f] = r[f] || ''
          else if (r[f] !== undefined && r[f] !== '') row[f] = r[f]
        })
        sanitizePayload(row)
        return row
      }).filter(r => r.name)
      if (payload.length === 0) return { success: false, error: '無有效資料' }
      const { data: existingRows, error: existingError } = await client.from(TABLE).select('*')
      if (existingError) throw existingError
      const { unique, skipped } = filterDuplicateImports(payload, existingRows || documents.value, FIELDS)
      if (unique.length === 0) return { success: true, count: 0, skipped, message: buildImportMessage('匯入成功', skipped) }
      const { data, error: err } = await client.from(TABLE).insert(unique).select()
      if (err) throw err
      documents.value.push(...data)
      return { success: true, count: data.length, skipped, message: buildImportMessage('匯入成功', skipped) }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return { documents, loading, error, FIELDS, loadDocuments, addDocument, updateDocument, deleteDocument, importDocuments }
}
