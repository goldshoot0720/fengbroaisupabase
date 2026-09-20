import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { useSharedTableState, loadSharedTable } from './useSharedTableState'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useVideoRecords = () => {
  // 共用狀態：儀表板與內頁共享同一份 video 資料，避免各自重打 Supabase。
  const tableState = useSharedTableState('video')
  const videos = tableState.items
  const loading = tableState.loading
  const error = tableState.error

  const TABLE = 'video'
  const FIELDS = ['name', 'file', 'filetype', 'note', 'ref', 'category', 'hash', 'cover']

  const loadVideos = () => {
    const client = initSupabase()
    if (!client) return Promise.resolve(videos.value)

    // 交給共用狀態處理：併發去重 + 有快取時靜默更新。
    return loadSharedTable(tableState, async () => {
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      return data || []
    }, { label: 'video' })
  }

  const addVideo = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      const { data, error: err } = await client.from(TABLE).insert([payload]).select()
      if (err) throw err
      if (data) videos.value.unshift(data[0])
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const updateVideo = async (id, item) => {
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
        const idx = videos.value.findIndex(a => a.id === id)
        if (idx !== -1) videos.value[idx] = data[0]
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const deleteVideo = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const { error: err } = await client.from(TABLE).delete().eq('id', id)
      if (err) throw err
      videos.value = videos.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const importVideos = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    try {
      loading.value = true
      const rawPayload = rows.map(r => {
        const row = {}
        FIELDS.forEach(f => {
          if (f === 'name') row[f] = r[f] || ''
          else if (r[f] !== undefined && r[f] !== '') row[f] = r[f]
        })
        return row
      }).filter(r => r.name)
      const payloadByName = new Map()
      rawPayload.forEach(row => {
        payloadByName.set(row.name, row)
      })
      const payload = Array.from(payloadByName.values())
      if (payload.length === 0) return { success: false, error: '無有效資料' }

      const names = payload.map(row => row.name)
      const { data: existingRows, error: existingErr } = await client
        .from(TABLE)
        .select('name')
        .in('name', names)
      if (existingErr) throw existingErr

      const existingNames = new Set((existingRows || []).map(row => row.name))
      const duplicateInBatchCount = rawPayload.length - payload.length
      const updateCount = payload.filter(row => existingNames.has(row.name)).length
      const insertCount = payload.length - updateCount

      const { data, error: err } = await client
        .from(TABLE)
        .upsert(payload, { onConflict: 'name' })
        .select()
      if (err) throw err

      if (data) {
        const currentById = new Map(videos.value.map(video => [video.id, video]))
        data.forEach(video => {
          currentById.set(video.id, video)
        })
        videos.value = Array.from(currentById.values())
      }

      const parts = []
      if (insertCount > 0) parts.push(`新增 ${insertCount} 筆`)
      if (updateCount > 0) parts.push(`更新 ${updateCount} 筆`)
      if (duplicateInBatchCount > 0) parts.push(`批次內重複 ${duplicateInBatchCount} 筆已合併`)

      return {
        success: true,
        count: data?.length || 0,
        inserted: insertCount,
        updated: updateCount,
        deduped: duplicateInBatchCount,
        message: parts.length > 0 ? parts.join('，') : '匯入成功'
      }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return { videos, loading, error, FIELDS, loadVideos, addVideo, updateVideo, deleteVideo, importVideos }
}
