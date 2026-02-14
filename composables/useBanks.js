import { ref, computed } from 'vue'
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

export const useBanks = () => {
  const banks = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 預設銀行列表
  const defaultBankNames = [
    '台北富邦',
    '國泰世華',
    '兆豐銀行',
    '王道銀行',
    '新光銀行',
    '中華郵政',
    '玉山銀行',
    '中國信託',
    '台新銀行'
  ]

  // 銀行 Favicon 對照表
  const bankFavicons = {
    '台北富邦': 'https://www.fubon.com/favicon.ico',
    '國泰世華': 'https://www.cathaybk.com.tw/favicon.ico',
    '兆豐銀行': 'https://www.megabank.com.tw/favicon.ico',
    '王道銀行': 'https://www.o-bank.com/favicon.ico',
    '新光銀行': 'https://www.skbank.com.tw/favicon.ico',
    '中華郵政': 'https://www.post.gov.tw/favicon.ico',
    '玉山銀行': 'https://www.esunbank.com.tw/favicon.ico',
    '中國信託': 'https://www.ctbcbank.com/favicon.ico',
    '台新銀行': 'https://www.taishinbank.com.tw/favicon.ico'
  }

  // 取得銀行 Favicon
  const getBankFavicon = (bankName) => {
    return bankFavicons[bankName] || null
  }

  // 載入銀行資料
  const loadBanks = async () => {
    const client = initSupabase()
    if (!client) return
    
    try {
      loading.value = true
      error.value = null
      
      const { data, error: fetchError } = await client
        .from('bank')
        .select('*')
        .order('id', { ascending: true })

      if (fetchError) throw fetchError
      
      banks.value = data || []
    } catch (e) {
      console.error('Error loading banks:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 新增銀行資料
  const addBank = async (bankData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      const payload = {
        name: bankData.name,
        deposit: Number(bankData.deposit) || 0,
        withdrawals: Number(bankData.withdrawals) || 0,
        transfer: Number(bankData.transfer) || 0,
        site: bankData.site || null,
        address: bankData.address || null,
        activity: bankData.activity || null,
        card: bankData.card || null,
        account: bankData.account || null,
        created_at: new Date().toISOString()
      }

      const { data, error: insertError } = await client
        .from('bank')
        .insert([payload])
        .select()

      if (insertError) throw insertError

      if (data) {
        banks.value.push(data[0])
      }
      return { success: true }
    } catch (e) {
      console.error('Error adding bank:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 更新銀行資料
  const updateBank = async (id, bankData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      const payload = {
        name: bankData.name,
        deposit: Number(bankData.deposit) || 0,
        withdrawals: Number(bankData.withdrawals) || 0,
        transfer: Number(bankData.transfer) || 0,
        site: bankData.site || null,
        address: bankData.address || null,
        activity: bankData.activity || null,
        card: bankData.card || null,
        account: bankData.account || null
      }

      const { data, error: updateError } = await client
        .from('bank')
        .update(payload)
        .eq('id', id)
        .select()

      if (updateError) throw updateError

      if (data) {
        const index = banks.value.findIndex(b => b.id === id)
        if (index !== -1) {
          banks.value[index] = data[0]
        }
      }
      return { success: true }
    } catch (e) {
      console.error('Error updating bank:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 刪除銀行資料
  const deleteBank = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      const { error: deleteError } = await client
        .from('bank')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      banks.value = banks.value.filter(b => b.id !== id)
      return { success: true }
    } catch (e) {
      console.error('Error deleting bank:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 批量新增預設銀行
  const initDefaultBanks = async () => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      const newBanks = defaultBankNames.map(name => ({
        name,
        deposit: 0,
        withdrawals: 0,
        transfer: 0,
        created_at: new Date().toISOString()
      }))

      const { data, error: insertError } = await client
        .from('bank')
        .insert(newBanks)
        .select()

      if (insertError) throw insertError

      if (data) {
        banks.value = [...banks.value, ...data]
      }
      return { success: true }
    } catch (e) {
      console.error('Error initializing default banks:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 計算總資產
  const totalAssets = computed(() => {
    return banks.value.reduce((sum, bank) => sum + (Number(bank.deposit) || 0), 0)
  })

  // 批次匯入銀行
  const importBanks = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      const payload = rows.map(r => ({
        name: r.name || r['銀行名稱'] || '',
        deposit: Number(r.deposit || r['存款'] || 0) || 0,
        account: r.account || r['帳號'] || null,
        card: r.card || r['卡號'] || null,
        site: r.site || r['分行/網點'] || null,
        address: r.address || r['地址'] || null,
        withdrawals: Number(r.withdrawals || r['提款'] || 0) || 0,
        transfer: Number(r.transfer || r['轉帳'] || 0) || 0,
        activity: r.activity || r['活動/備註'] || null,
        created_at: new Date().toISOString()
      })).filter(r => r.name)
      if (payload.length === 0) return { success: false, error: '無有效資料' }
      const { data, error: insertError } = await client.from('bank').insert(payload).select()
      if (insertError) throw insertError
      banks.value.push(...data)
      return { success: true, count: data.length }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return {
    banks,
    loading,
    error,
    defaultBankNames,
    bankFavicons,
    getBankFavicon,
    loadBanks,
    addBank,
    importBanks,
    updateBank,
    deleteBank,
    initDefaultBanks,
    totalAssets
  }
}
