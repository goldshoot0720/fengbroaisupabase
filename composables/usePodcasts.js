import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { useSharedTableState, loadSharedTable } from './useSharedTableState'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const usePodcasts = () => {
  // 共用狀態：儀表板與內頁共享同一份 podcast 資料，避免各自重打 Supabase。
  const tableState = useSharedTableState('podcast')
  const podcasts = tableState.items
  const loading = tableState.loading
  const error = tableState.error

  const TABLE = 'podcast'
  const FIELDS = ['name', 'file', 'filetype', 'note', 'ref', 'category', 'hash', 'cover']

  const loadPodcasts = () => {
    const client = initSupabase()
    if (!client) return Promise.resolve(podcasts.value)

    // 交給共用狀態處理：併發去重 + 有快取時靜默更新。
    return loadSharedTable(tableState, async () => {
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      return data || []
    }, { label: 'podcast' })
  }

  const addPodcast = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      const { data, error: err } = await client.from(TABLE).insert([payload]).select()
      if (err) throw err
      if (data) podcasts.value.unshift(data[0])
      return { success: true }
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
      const { data, error: err } = await client.from(TABLE).update(payload).eq('id', id).select()
      if (err) throw err
      if (data) {
        const idx = podcasts.value.findIndex(a => a.id === id)
        if (idx !== -1) podcasts.value[idx] = data[0]
      }
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
      loading.value = true
      const { error: err } = await client.from(TABLE).delete().eq('id', id)
      if (err) throw err
      podcasts.value = podcasts.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
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

  return { podcasts, loading, error, FIELDS, loadPodcasts, addPodcast, updatePodcast, deletePodcast, importPodcasts }
}
