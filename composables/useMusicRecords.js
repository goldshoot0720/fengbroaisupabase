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

export const useMusicRecords = () => {
  const musics = ref([])
  const loading = ref(false)
  const error = ref(null)

  const TABLE = 'music'
  const FIELDS = ['name', 'file', 'filetype', 'lyrics', 'note', 'ref', 'category', 'hash', 'language', 'cover']

  const loadMusics = async () => {
    const client = initSupabase()
    if (!client) return
    try {
      loading.value = true
      error.value = null
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      musics.value = data || []
    } catch (e) {
      console.error('Error loading music:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addMusic = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = {}
      FIELDS.forEach(f => { payload[f] = item[f] || null })
      payload.name = item.name || ''
      const { data, error: err } = await client.from(TABLE).insert([payload]).select()
      if (err) throw err
      if (data) musics.value.unshift(data[0])
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const updateMusic = async (id, item) => {
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
        const idx = musics.value.findIndex(a => a.id === id)
        if (idx !== -1) musics.value[idx] = data[0]
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const deleteMusic = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const { error: err } = await client.from(TABLE).delete().eq('id', id)
      if (err) throw err
      musics.value = musics.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const importMusics = async (rows) => {
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
      musics.value.push(...data)
      return { success: true, count: data.length, message: '匯入成功' }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return { musics, loading, error, FIELDS, loadMusics, addMusic, updateMusic, deleteMusic, importMusics }
}
