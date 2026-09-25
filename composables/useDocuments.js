import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useDocuments = () => {
  const documents = ref([])
  const loading = ref(false)
  const error = ref(null)
  // 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
  const optimistic = createOptimisticList({ table: 'commondocument', listRef: documents })

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

  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  const loadDocuments = async (options = {}) => {
    const client = initSupabase()
    if (!client) return
    await loadCachedTable({
      table: 'commondocument',
      listRef: documents,
      loadingRef: loading,
      errorRef: error,
      force: options?.force === true,
      fetcher: () => selectWholeTable(client, 'commondocument', { order: 'created_at', ascending: false })
    })
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
      const saved = await optimistic.insert(payload, async () => {
        const { data, error: err } = await client.from(TABLE).insert([payload]).select()
        if (err) throw err
        return data?.[0] || null
      })
      return { success: true, item: saved }
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
      await optimistic.update(id, payload, async (realId) => {
        const { data, error: err } = await client.from(TABLE).update(payload).eq('id', realId).select()
        if (err) throw err
        return data?.[0] || null
      })
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
      await optimistic.remove([id], async ([realId]) => {
        const { error: err } = await client.from(TABLE).delete().eq('id', realId)
        if (err) throw err
      })
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
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


  // 任何寫入成功後同步快取，下次切回此頁可立刻看到最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('commondocument', documents.value)
    return result
  }

  return { documents, loading, error, FIELDS, loadDocuments, addDocument: withCacheSync(addDocument), updateDocument: withCacheSync(updateDocument), deleteDocument: withCacheSync(deleteDocument), importDocuments: withCacheSync(importDocuments) }
}
