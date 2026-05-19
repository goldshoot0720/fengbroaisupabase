import { ref, computed } from 'vue'

const STORAGE_KEY = 'feng-settings'
const ACCOUNTS_KEY = 'feng-accounts'
const DEFAULT_RESEND_FROM_EMAIL = 'FengBro AI <onboarding@resend.dev>'

// 共享狀態
const accounts = ref([]) // 帳號列表
const activeAccountId = ref(null) // 當前啟用的帳號 ID
let _isLoaded = false // 是否已載入

// 表單編輯用的暫存值（當沒有 activeAccount 時使用）
const tempFriendlyName = ref('')
const tempSupabaseUrl = ref('')
const tempSupabaseAnonKey = ref('')
const tempBucket = ref('')
const tempResendApiKey = ref('')
const tempResendToEmail = ref('')
const tempResendApiKey2 = ref('')
const tempResendToEmail2 = ref('')
const tempResendApiKey3 = ref('')
const tempResendToEmail3 = ref('')
const tempResendFromEmail = ref(DEFAULT_RESEND_FROM_EMAIL)

// 當前啟用的帳號
const activeAccount = computed(() => {
  return accounts.value.find(acc => acc.id === activeAccountId.value) || null
})

// 向後相容的單一設定（當前啟用帳號的設定，或暫存值）
const friendlyName = computed({
  get: () => activeAccount.value?.friendlyName ?? tempFriendlyName.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.friendlyName = val
    } else {
      tempFriendlyName.value = val
    }
  }
})
const supabaseUrl = computed({
  get: () => activeAccount.value?.supabaseUrl ?? tempSupabaseUrl.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.supabaseUrl = val
    } else {
      tempSupabaseUrl.value = val
    }
  }
})
const supabaseAnonKey = computed({
  get: () => activeAccount.value?.supabaseAnonKey ?? tempSupabaseAnonKey.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.supabaseAnonKey = val
    } else {
      tempSupabaseAnonKey.value = val
    }
  }
})
const bucket = computed({
  get: () => activeAccount.value?.bucket ?? tempBucket.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.bucket = val
    } else {
      tempBucket.value = val
    }
  }
})

const resendApiKey = computed({
  get: () => activeAccount.value?.resendApiKey ?? tempResendApiKey.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendApiKey = val
    } else {
      tempResendApiKey.value = val
    }
  }
})

const resendToEmail = computed({
  get: () => activeAccount.value?.resendToEmail ?? tempResendToEmail.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendToEmail = val
    } else {
      tempResendToEmail.value = val
    }
  }
})

const resendApiKey2 = computed({
  get: () => activeAccount.value?.resendApiKey2 ?? tempResendApiKey2.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendApiKey2 = val
    } else {
      tempResendApiKey2.value = val
    }
  }
})

const resendToEmail2 = computed({
  get: () => activeAccount.value?.resendToEmail2 ?? tempResendToEmail2.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendToEmail2 = val
    } else {
      tempResendToEmail2.value = val
    }
  }
})

const resendApiKey3 = computed({
  get: () => activeAccount.value?.resendApiKey3 ?? tempResendApiKey3.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendApiKey3 = val
    } else {
      tempResendApiKey3.value = val
    }
  }
})

const resendToEmail3 = computed({
  get: () => activeAccount.value?.resendToEmail3 ?? tempResendToEmail3.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendToEmail3 = val
    } else {
      tempResendToEmail3.value = val
    }
  }
})

const resendFromEmail = computed({
  get: () => activeAccount.value?.resendFromEmail ?? tempResendFromEmail.value,
  set: (val) => {
    if (activeAccount.value) {
      activeAccount.value.resendFromEmail = val
    } else {
      tempResendFromEmail.value = val
    }
  }
})

/**
 * 獲取 Supabase 認證資訊（優先使用 localStorage 帳號，否則使用 .env）
 * 這是給其他 composables 使用的工具函數
 */
export function getSupabaseCredentials() {
  // 確保已載入設定
  if (!_isLoaded && typeof localStorage !== 'undefined') {
    try {
      const accountsRaw = localStorage.getItem(ACCOUNTS_KEY)
      if (accountsRaw) {
        const data = JSON.parse(accountsRaw)
        accounts.value = data.accounts || []
        activeAccountId.value = data.activeId || (accounts.value[0]?.id || null)
      }
      _isLoaded = true
    } catch (e) {
      console.error('getSupabaseCredentials 載入失敗:', e)
    }
  }

  // 如果有啟用的帳號，使用它的設定
  const acc = accounts.value.find(a => a.id === activeAccountId.value)
  if (acc && acc.supabaseUrl && acc.supabaseAnonKey) {
    return {
      url: acc.supabaseUrl,
      key: acc.supabaseAnonKey,
      source: 'localStorage'
    }
  }

  // 否則返回 null，讓調用者使用 .env
  return null
}

/**
 * 獲取 Storage Bucket 名稱（優先 localStorage 帳號 → .env → 預設 'uploads'）
 */
export function getSupabaseBucket() {
  if (!_isLoaded && typeof localStorage !== 'undefined') {
    try {
      const accountsRaw = localStorage.getItem(ACCOUNTS_KEY)
      if (accountsRaw) {
        const data = JSON.parse(accountsRaw)
        accounts.value = data.accounts || []
        activeAccountId.value = data.activeId || (accounts.value[0]?.id || null)
      }
      _isLoaded = true
    } catch (e) { /* ignore */ }
  }
  const acc = accounts.value.find(a => a.id === activeAccountId.value)
  if (acc?.bucket) return acc.bucket
  // 如果有自訂帳號但沒設 bucket，用 'uploads' 而非 .env（.env 可能屬於不同專案）
  if (acc) return 'uploads'
  return null // 沒有自訂帳號時，讓調用者 fallback 到 .env
}

export function getResendNotificationSettings() {
  if (!_isLoaded && typeof localStorage !== 'undefined') {
    try {
      const accountsRaw = localStorage.getItem(ACCOUNTS_KEY)
      if (accountsRaw) {
        const data = JSON.parse(accountsRaw)
        accounts.value = data.accounts || []
        activeAccountId.value = data.activeId || (accounts.value[0]?.id || null)
      }
      _isLoaded = true
    } catch (e) {
      console.error('getResendNotificationSettings load error:', e)
    }
  }

  const acc = accounts.value.find(a => a.id === activeAccountId.value)
  const recipients = [
    { apiKey: acc?.resendApiKey || '', toEmail: acc?.resendToEmail || '' },
    { apiKey: acc?.resendApiKey2 || '', toEmail: acc?.resendToEmail2 || '' },
    { apiKey: acc?.resendApiKey3 || '', toEmail: acc?.resendToEmail3 || '' }
  ].filter(item => item.apiKey && item.toEmail)

  return {
    apiKey: acc?.resendApiKey || '',
    toEmail: acc?.resendToEmail || '',
    apiKey2: acc?.resendApiKey2 || '',
    toEmail2: acc?.resendToEmail2 || '',
    apiKey3: acc?.resendApiKey3 || '',
    toEmail3: acc?.resendToEmail3 || '',
    recipients,
    fromEmail: acc?.resendFromEmail || DEFAULT_RESEND_FROM_EMAIL,
    accountId: acc?.id || ''
  }
}

export function useSettings() {

  // 生成唯一 ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  }

  // 載入設定（包含舊格式遷移）
  const loadSettings = () => {
    try {
      // 先嘗試載入新格式
      const accountsRaw = localStorage.getItem(ACCOUNTS_KEY)
      if (accountsRaw) {
        const data = JSON.parse(accountsRaw)
        accounts.value = data.accounts || []
        activeAccountId.value = data.activeId || (accounts.value[0]?.id || null)
        return
      }

      // 舊格式遷移
      const oldRaw = localStorage.getItem(STORAGE_KEY)
      if (oldRaw) {
        const oldData = JSON.parse(oldRaw)
        if (oldData.friendlyName || oldData.supabaseUrl) {
          const newAccount = {
            id: generateId(),
            friendlyName: oldData.friendlyName || '',
            supabaseUrl: oldData.supabaseUrl || '',
            supabaseAnonKey: oldData.supabaseAnonKey || ''
          }
          accounts.value = [newAccount]
          activeAccountId.value = newAccount.id
          // 儲存新格式並刪除舊格式
          saveAccounts()
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (e) {
      console.error('載入設定失敗:', e)
    }
  }

  // 儲存帳號列表
  const saveAccounts = () => {
    try {
      const data = {
        accounts: accounts.value,
        activeId: activeAccountId.value
      }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data))
      return { success: true }
    } catch (e) {
      console.error('儲存帳號失敗:', e)
      return { success: false, error: e.message }
    }
  }

  // 新增帳號
  const addAccount = (account) => {
    const newAccount = {
      id: generateId(),
      friendlyName: account.friendlyName || '',
      supabaseUrl: account.supabaseUrl || '',
      supabaseAnonKey: account.supabaseAnonKey || '',
      bucket: account.bucket || '',
      resendApiKey: account.resendApiKey || '',
      resendToEmail: account.resendToEmail || '',
      resendApiKey2: account.resendApiKey2 || '',
      resendToEmail2: account.resendToEmail2 || '',
      resendApiKey3: account.resendApiKey3 || '',
      resendToEmail3: account.resendToEmail3 || '',
      resendFromEmail: account.resendFromEmail || DEFAULT_RESEND_FROM_EMAIL
    }
    accounts.value.push(newAccount)
    // 如果是第一個帳號，自動設為啟用
    if (accounts.value.length === 1) {
      activeAccountId.value = newAccount.id
    }
    saveAccounts()
    return newAccount
  }

  // 更新帳號
  const updateAccount = (id, updates) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updates }
      saveAccounts()
      return { success: true }
    }
    return { success: false, error: '帳號不存在' }
  }

  // 刪除帳號
  const deleteAccount = (id) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      // 如果刪除的是當前啟用的帳號，切換到第一個
      if (activeAccountId.value === id) {
        activeAccountId.value = accounts.value[0]?.id || null
      }
      saveAccounts()
      return { success: true }
    }
    return { success: false, error: '帳號不存在' }
  }

  // 切換帳號
  const switchAccount = (id) => {
    const account = accounts.value.find(acc => acc.id === id)
    if (account) {
      activeAccountId.value = id
      saveAccounts()
      return { success: true }
    }
    return { success: false, error: '帳號不存在' }
  }

  // 向後相容：儲存設定（如果沒有帳號則新增，否則更新當前帳號）
  const saveSettings = () => {
    // 如果有啟用的帳號，更新它
    if (activeAccount.value) {
      return saveAccounts()
    }
    
    // 如果沒有啟用的帳號，但有填寫表單，則新增帳號
    const name = tempFriendlyName.value.trim()
    const url = tempSupabaseUrl.value.trim()
    const key = tempSupabaseAnonKey.value.trim()
    const resendKey = tempResendApiKey.value.trim()
    const resendTo = tempResendToEmail.value.trim()
    const resendKey2 = tempResendApiKey2.value.trim()
    const resendTo2 = tempResendToEmail2.value.trim()
    const resendKey3 = tempResendApiKey3.value.trim()
    const resendTo3 = tempResendToEmail3.value.trim()
    const resendFrom = tempResendFromEmail.value.trim()
    const bkt = tempBucket.value.trim()
    const hasResendFromOverride = resendFrom && resendFrom !== DEFAULT_RESEND_FROM_EMAIL
    
    if (name || url || key || bkt || resendKey || resendTo || resendKey2 || resendTo2 || resendKey3 || resendTo3 || hasResendFromOverride) {
      const newAccount = addAccount({
        friendlyName: name,
        supabaseUrl: url,
        supabaseAnonKey: key,
        bucket: bkt,
        resendApiKey: resendKey,
        resendToEmail: resendTo,
        resendApiKey2: resendKey2,
        resendToEmail2: resendTo2,
        resendApiKey3: resendKey3,
        resendToEmail3: resendTo3,
        resendFromEmail: resendFrom || DEFAULT_RESEND_FROM_EMAIL
      })
      // 設為當前啟用帳號
      activeAccountId.value = newAccount.id
      // 清空暫存值
      tempFriendlyName.value = ''
      tempSupabaseUrl.value = ''
      tempSupabaseAnonKey.value = ''
      tempBucket.value = ''
      tempResendApiKey.value = ''
      tempResendToEmail.value = ''
      tempResendApiKey2.value = ''
      tempResendToEmail2.value = ''
      tempResendApiKey3.value = ''
      tempResendToEmail3.value = ''
      tempResendFromEmail.value = DEFAULT_RESEND_FROM_EMAIL
      return saveAccounts()
    }
    
    return { success: false, error: '請填寫設定內容' }
  }

  // 清除所有設定
  const clearSettings = () => {
    accounts.value = []
    activeAccountId.value = null
    tempFriendlyName.value = ''
    tempSupabaseUrl.value = ''
    tempSupabaseAnonKey.value = ''
    tempBucket.value = ''
    tempResendApiKey.value = ''
    tempResendToEmail.value = ''
    tempResendApiKey2.value = ''
    tempResendToEmail2.value = ''
    tempResendApiKey3.value = ''
    tempResendToEmail3.value = ''
    tempResendFromEmail.value = DEFAULT_RESEND_FROM_EMAIL
    localStorage.removeItem(ACCOUNTS_KEY)
    localStorage.removeItem(STORAGE_KEY)
  }

  // 顯示名稱（向後相容）
  const displayName = computed(() => {
    const name = activeAccount.value?.friendlyName?.trim()
    return name ? `supabase-${name}` : 'supabase-.env'
  })

  return {
    // 帳號管理
    accounts,
    activeAccountId,
    activeAccount,
    addAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
    saveAccounts,
    // 向後相容
    friendlyName,
    supabaseUrl,
    supabaseAnonKey,
    bucket,
    resendApiKey,
    resendToEmail,
    resendApiKey2,
    resendToEmail2,
    resendApiKey3,
    resendToEmail3,
    resendFromEmail,
    displayName,
    loadSettings,
    saveSettings,
    clearSettings
  }
}
