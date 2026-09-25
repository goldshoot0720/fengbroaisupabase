import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const usePodcasts = () => {
  const podcasts = ref([])
  const loading = ref(false)
  const error = ref(null)
  // 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
  const optimistic = createOptimisticList({ table: 'podcast', listRef: podcasts })

  const TABLE = 'podcast'
  const FIELDS = ['name', 'file', 'filetype', 'note', 'ref', 'category', 'hash', 'cover']

  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  const loadPodcasts = async (options = {}) => {
    const client = initSupabase()
    if (!client) return
    await loadCachedTable({
      table: 'podcast',
      listRef: podcasts,
      loadingRef: loading,
      errorRef: error,
      force: options?.force === true,
      fetcher: () => selectWholeTable(client, 'podcast', { order: 'created_at', ascending: false })
    })
  }

  const addPodcast = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
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

  const updatePodcast = async (id, item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
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

  const deletePodcast = async (id) => {
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

  const importPodcasts = async (rows) => {
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
        return row
      }).filter(r => r.name)
      if (payload.length === 0) return { success: false, error: '無有效資料' }
      const { data: existingRows, error: existingError } = await client.from(TABLE).select('*')
      if (existingError) throw existingError
      const { unique, skipped } = filterDuplicateImports(payload, existingRows || podcasts.value, FIELDS)
      if (unique.length === 0) return { success: true, count: 0, skipped, message: buildImportMessage('匯入成功', skipped) }
      const { data, error: err } = await client.from(TABLE).insert(unique).select()
      if (err) throw err
      podcasts.value.push(...data)
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
    if (!result || result.success !== false) rememberCachedTable('podcast', podcasts.value)
    return result
  }

  return { podcasts, loading, error, FIELDS, loadPodcasts, addPodcast: withCacheSync(addPodcast), updatePodcast: withCacheSync(updatePodcast), deletePodcast: withCacheSync(deletePodcast), importPodcasts: withCacheSync(importPodcasts) }
}
