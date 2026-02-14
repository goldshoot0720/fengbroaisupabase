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

export const useDocuments = () => {
  const documents = ref([])
  const loading = ref(false)
  const error = ref(null)

  const TABLE = 'commondocument'
  const FIELDS = ['name', 'file', 'note', 'ref', 'category', 'hash', 'cover']
  // 資料庫 varchar 欄位長度限制 — 超過的欄位名稱記錄在此以便 truncate
  const VARCHAR_LIMIT = 150
  const URL_FIELDS = ['file', 'cover', 'ref', 'hash']  // 可能超長的欄位

  /** 將 payload 中可能超長的 varchar 欄位截斷，避免資料庫報錯 */
  const sanitizePayload = (payload) => {
    for (const f of URL_FIELDS) {
      if (payload[f] && typeof payload[f] === 'string' && payload[f].length > VARCHAR_LIMIT) {
        console.warn(`⚠️ 欄位 "${f}" 長度 ${payload[f].length} 超過 ${VARCHAR_LIMIT}，已截斷。原值: ${payload[f]}`)
        payload[f] = payload[f].substring(0, VARCHAR_LIMIT)
      }
    }
    return payload
  }

  const loadDocuments = async () => {
    const client = initSupabase()
    if (!client) return
    try {
      loading.value = true
      error.value = null
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      documents.value = data || []
    } catch (e) {
      console.error('Error loading documents:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
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
      const { data, error: err } = await client.from(TABLE).insert(payload).select()
      if (err) throw err
      documents.value.push(...data)
      return { success: true, count: data.length, message: '匯入成功' }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return { documents, loading, error, FIELDS, loadDocuments, addDocument, updateDocument, deleteDocument, importDocuments }
}
