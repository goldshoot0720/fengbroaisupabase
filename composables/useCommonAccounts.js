import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseCredentials } from './useSettings'

// 共享狀態
let supabase = null
let currentCredentials = null

// 初始化 Supabase（優先使用 localStorage 設定）
const initSupabase = () => {
  if (typeof window === 'undefined') return null
  
  const creds = getSupabaseCredentials()
  const config = useRuntimeConfig()
  
  const url = creds?.url || config.public.supabaseUrl
  const key = creds?.key || config.public.supabaseAnonKey
  const credKey = `${url}:${key?.slice(0, 20)}`
  
  if (supabase && currentCredentials !== credKey) {
    supabase = null
  }
  
  if (!supabase) {
    supabase = createClient(url, key)
    currentCredentials = credKey
  }
  
  return supabase
}

export const useCommonAccounts = () => {
  const accounts = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 載入資料
  const loadAccounts = async () => {
    const client = initSupabase()
    if (!client) return
    
    try {
      loading.value = true
      error.value = null
      
      const { data, error: fetchError } = await client
        .from('commonaccount')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      accounts.value = data || []
    } catch (e) {
      console.error('Error loading common accounts:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 新增資料
  const addAccount = async (accountData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      
      const { id, ...payload } = accountData
      
      const { data, error: insertError } = await client
        .from('commonaccount')
        .insert([payload])
        .select()

      if (insertError) throw insertError

      if (data) {
        accounts.value.unshift(data[0])
      }
      return { success: true }
    } catch (e) {
      console.error('Error adding common account:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 更新資料
  const updateAccount = async (id, accountData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      
      const { id: _, created_at: __, ...payload } = accountData

      const { data, error: updateError } = await client
        .from('commonaccount')
        .update(payload)
        .eq('id', id)
        .select()

      if (updateError) throw updateError

      if (data) {
        const index = accounts.value.findIndex(a => a.id === id)
        if (index !== -1) {
          accounts.value[index] = data[0]
        }
      }
      return { success: true }
    } catch (e) {
      console.error('Error updating common account:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // commonaccount 表允許的欄位（Supabase 全小寫）
  const COMMON_FIELDS = (() => {
    const fields = ['name']
    for (let i = 1; i <= 37; i++) {
      const key = i.toString().padStart(2, '0')
      fields.push(`site${key}`, `note${key}`)
    }
    fields.push('photohash')
    return fields
  })()

  // 批次匯入
  const importAccounts = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }

    try {
      loading.value = true

      const payload = rows.map(r => {
        const row = {}
        COMMON_FIELDS.forEach(field => {
          if (field === 'name') {
            row[field] = r[field] || r.Name || ''
          } else if (r[field] !== undefined && r[field] !== '') {
            row[field] = r[field]
          }
        })
        return row
      }).filter(r => r.name)

      if (payload.length === 0) return { success: false, error: '無有效資料（需有 name 欄位）' }

      console.log('Inserting', payload.length, 'common accounts')
      console.log('Sample payload:', payload[0])

      const { data, error: insertError } = await client.from('commonaccount').insert(payload).select()
      if (insertError) throw insertError

      accounts.value.push(...data)

      return {
        success: true,
        count: data.length,
        message: '匯入成功'
      }
    } catch (e) {
      console.error('Import error:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 刪除資料
  const deleteAccount = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      const { error: deleteError } = await client
        .from('commonaccount')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      accounts.value = accounts.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      console.error('Error deleting common account:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    importAccounts,
    COMMON_FIELDS
  }
}
