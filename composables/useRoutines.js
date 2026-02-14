import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseCredentials } from './useSettings'

let supabase = null
let currentCredentials = null

const initSupabase = () => {
  if (typeof window === 'undefined') return null
  const creds = getSupabaseCredentials()
  const config = useRuntimeConfig()
  const url = creds?.url || config.public.supabaseUrl
  const key = creds?.key || config.public.supabaseAnonKey
  const credKey = `${url}:${key?.slice(0, 20)}`
  if (supabase && currentCredentials !== credKey) supabase = null
  if (!supabase) {
    supabase = createClient(url, key)
    currentCredentials = credKey
  }
  return supabase
}

export const useRoutines = () => {
  const routines = ref([])
  const loading = ref(false)
  const error = ref(null)

  const TABLE = 'routine'
  const FIELDS = ['name', 'note', 'lastdate1', 'lastdate2', 'lastdate3', 'link', 'photo']

  const loadRoutines = async () => {
    const client = initSupabase()
    if (!client) return
    try {
      loading.value = true
      error.value = null
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      routines.value = data || []
    } catch (e) {
      console.error('Error loading routines:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addRoutine = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      const { data, error: err } = await client.from(TABLE).insert([payload]).select()
      if (err) throw err
      if (data) routines.value.unshift(data[0])
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
      const { data, error: err } = await client.from(TABLE).update(payload).eq('id', id).select()
      if (err) throw err
      if (data) {
        const idx = routines.value.findIndex(a => a.id === id)
        if (idx !== -1) routines.value[idx] = data[0]
      }
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
      loading.value = true
      const { error: err } = await client.from(TABLE).delete().eq('id', id)
      if (err) throw err
      routines.value = routines.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
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
      const { data, error: err } = await client.from(TABLE).insert(payload).select()
      if (err) throw err
      routines.value.push(...data)
      return { success: true, count: data.length, message: '匯入成功' }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return { routines, loading, error, FIELDS, loadRoutines, addRoutine, updateRoutine, deleteRoutine, importRoutines }
}
