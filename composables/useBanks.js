import { ref, computed } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

// 初始化 Supabase（優先使用 localStorage 設定）
const initSupabase = () => {
  return getSupabaseBrowserClient()
}

const BANK_IMPORT_KEY_FIELDS = ['name', 'deposit', 'account', 'card', 'site', 'address', 'withdrawals', 'transfer', 'activity']

const taiwanBankKeywords = [
  '台北富邦', '富邦', '國泰世華', '國泰', '兆豐', '王道', '新光', '中華郵政',
  '郵局', '玉山', '中國信託', '中信', '台新', '臺新', '永豐', '第一銀行',
  '一銀', '華南', '彰化銀行', '彰銀', '土地銀行', '土銀', '合作金庫',
  '合庫', '臺灣銀行', '台灣銀行', '台銀', '上海商銀', '上海銀行', '聯邦',
  '遠東商銀', '遠銀', '元大', '凱基', '星展', '渣打', '滙豐', '匯豐',
  '陽信', '三信', '高雄銀行', '臺灣企銀', '台灣企銀', '企銀', '農會',
  '漁會', '信用合作社', '信合社', '銀行', '信託'
]

const normalizeBankName = (name = '') => String(name).trim().toLowerCase()

const isTaiwanBankAccount = (item = {}) => {
  const name = normalizeBankName(item.name)
  if (!name) return false
  return taiwanBankKeywords.some(keyword => name.includes(keyword.toLowerCase()))
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
        .order('deposit', { ascending: false })

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
        banks.value.sort((a, b) => (Number(b.deposit) || 0) - (Number(a.deposit) || 0))
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
        banks.value.sort((a, b) => (Number(b.deposit) || 0) - (Number(a.deposit) || 0))
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

      const { data: existingRows, error: existingError } = await client.from('bank').select('*')
      if (existingError) throw existingError

      const { unique, skipped } = filterDuplicateImports(newBanks, existingRows || banks.value, BANK_IMPORT_KEY_FIELDS)
      if (unique.length === 0) {
        return { success: true, count: 0, skipped, message: buildImportMessage('預設銀行匯入完成', skipped) }
      }

      const { data, error: insertError } = await client
        .from('bank')
        .insert(unique)
        .select()

      if (insertError) throw insertError

      if (data) {
        banks.value = [...banks.value, ...data]
        banks.value.sort((a, b) => (Number(b.deposit) || 0) - (Number(a.deposit) || 0))
      }
      return { success: true, count: data?.length || 0, skipped, message: buildImportMessage('預設銀行匯入完成', skipped) }
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

  const bankAccounts = computed(() => {
    return banks.value.filter(bank => isTaiwanBankAccount(bank))
  })

  const electronicTickets = computed(() => {
    return banks.value.filter(bank => !isTaiwanBankAccount(bank))
  })

  const bankAccountCount = computed(() => bankAccounts.value.length)
  const electronicTicketCount = computed(() => electronicTickets.value.length)
  const bankTotalAssets = computed(() => {
    return bankAccounts.value.reduce((sum, bank) => sum + (Number(bank.deposit) || 0), 0)
  })
  const electronicTicketTotalAssets = computed(() => {
    return electronicTickets.value.reduce((sum, item) => sum + (Number(item.deposit) || 0), 0)
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

      const { data: existingRows, error: existingError } = await client.from('bank').select('*')
      if (existingError) throw existingError

      const { unique, skipped } = filterDuplicateImports(payload, existingRows || banks.value, BANK_IMPORT_KEY_FIELDS)
      if (unique.length === 0) {
        return { success: true, count: 0, skipped, message: buildImportMessage('匯入成功', skipped) }
      }

      const { data, error: insertError } = await client.from('bank').insert(unique).select()
      if (insertError) throw insertError
      banks.value.push(...data)
      banks.value.sort((a, b) => (Number(b.deposit) || 0) - (Number(a.deposit) || 0))
      return { success: true, count: data.length, skipped, message: buildImportMessage('匯入成功', skipped) }
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
    totalAssets,
    bankAccounts,
    electronicTickets,
    bankAccountCount,
    electronicTicketCount,
    bankTotalAssets,
    electronicTicketTotalAssets,
    isTaiwanBankAccount
  }
}
