import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useRoutines = () => {
  const routines = ref([])
  const loading = ref(false)
  const error = ref(null)
  // 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
  const optimistic = createOptimisticList({ table: 'routine', listRef: routines })

  const TABLE = 'routine'
  const FIELDS = ['name', 'note', 'lastdate1', 'lastdate2', 'lastdate3', 'link', 'photo']

  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  const loadRoutines = async (options = {}) => {
    const client = initSupabase()
    if (!client) return
    await loadCachedTable({
      table: 'routine',
      listRef: routines,
      loadingRef: loading,
      errorRef: error,
      force: options?.force === true,
      fetcher: () => selectWholeTable(client, 'routine', { order: 'created_at', ascending: false })
    })
  }

  const addRoutine = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      await optimistic.insert(payload, async () => {
        const { data, error: err } = await client.from(TABLE).insert([payload]).select()
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

  const updateRoutine = async (id, item) => {
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

  const deleteRoutine = async (id) => {
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

  const importRoutines = async (rows) => {
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
      const { unique, skipped } = filterDuplicateImports(payload, existingRows || routines.value, FIELDS)
      if (unique.length === 0) return { success: true, count: 0, skipped, message: buildImportMessage('匯入成功', skipped) }
      const { data, error: err } = await client.from(TABLE).insert(unique).select()
      if (err) throw err
      routines.value.push(...data)
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
    if (!result || result.success !== false) rememberCachedTable('routine', routines.value)
    return result
  }

  return { routines, loading, error, FIELDS, loadRoutines, addRoutine: withCacheSync(addRoutine), updateRoutine: withCacheSync(updateRoutine), deleteRoutine: withCacheSync(deleteRoutine), importRoutines: withCacheSync(importRoutines) }
}
