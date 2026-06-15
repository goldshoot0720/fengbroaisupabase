import { ref, computed } from 'vue'

const STORAGE_KEY = 'feng-settings'
const ACCOUNTS_KEY = 'feng-accounts'
const DEFAULT_RESEND_FROM_EMAIL = 'FengBro AI <onboarding@resend.dev>'
export const RESEND_GROUP_OPTIONS = [3, 6, 9, 12, 15, 18, 21]
export const RESEND_PAIR_COUNT = 21

const accounts = ref([])
const activeAccountId = ref(null)
let _isLoaded = false

const tempFriendlyName = ref('')
const tempSupabaseUrl = ref('')
const tempSupabaseAnonKey = ref('')
const tempBucket = ref('')
const tempResendGroupCount = ref(3)
const tempResendPairs = Array.from({ length: RESEND_PAIR_COUNT }, () => ({
  apiKey: ref(''),
  toEmail: ref('')
}))
const tempResendFromEmail = ref(DEFAULT_RESEND_FROM_EMAIL)

const activeAccount = computed(() => {
  return accounts.value.find(acc => acc.id === activeAccountId.value) || null
})

const resendApiKeyField = (index) => index === 1 ? 'resendApiKey' : `resendApiKey${index}`
const resendToEmailField = (index) => index === 1 ? 'resendToEmail' : `resendToEmail${index}`

const normalizeResendGroupCount = (value) => {
  const count = Number(value)
  return RESEND_GROUP_OPTIONS.includes(count) ? count : 3
}

const loadAccountsFromStorage = () => {
  if (_isLoaded || typeof localStorage === 'undefined') return
  try {
    const accountsRaw = localStorage.getItem(ACCOUNTS_KEY)
    if (accountsRaw) {
      const data = JSON.parse(accountsRaw)
      accounts.value = data.accounts || []
      activeAccountId.value = data.activeId || (accounts.value[0]?.id || null)
    }
    _isLoaded = true
  } catch (e) {
    console.error('load settings error:', e)
  }
}

const friendlyName = computed({
  get: () => activeAccount.value?.friendlyName ?? tempFriendlyName.value,
  set: (val) => {
    if (activeAccount.value) activeAccount.value.friendlyName = val
    else tempFriendlyName.value = val
  }
})

const supabaseUrl = computed({
  get: () => activeAccount.value?.supabaseUrl ?? tempSupabaseUrl.value,
  set: (val) => {
    if (activeAccount.value) activeAccount.value.supabaseUrl = val
    else tempSupabaseUrl.value = val
  }
})

const supabaseAnonKey = computed({
  get: () => activeAccount.value?.supabaseAnonKey ?? tempSupabaseAnonKey.value,
  set: (val) => {
    if (activeAccount.value) activeAccount.value.supabaseAnonKey = val
    else tempSupabaseAnonKey.value = val
  }
})

const bucket = computed({
  get: () => activeAccount.value?.bucket ?? tempBucket.value,
  set: (val) => {
    if (activeAccount.value) activeAccount.value.bucket = val
    else tempBucket.value = val
  }
})

const resendGroupCount = computed({
  get: () => normalizeResendGroupCount(activeAccount.value?.resendGroupCount ?? tempResendGroupCount.value),
  set: (val) => {
    const nextValue = normalizeResendGroupCount(val)
    if (activeAccount.value) activeAccount.value.resendGroupCount = nextValue
    else tempResendGroupCount.value = nextValue
  }
})

const createResendComputed = (index, kind) => {
  const field = kind === 'apiKey' ? resendApiKeyField(index) : resendToEmailField(index)
  const tempRef = tempResendPairs[index - 1][kind]
  return computed({
    get: () => activeAccount.value?.[field] ?? tempRef.value,
    set: (val) => {
      if (activeAccount.value) activeAccount.value[field] = val
      else tempRef.value = val
    }
  })
}

const resendPairs = Array.from({ length: RESEND_PAIR_COUNT }, (_, index) => {
  const position = index + 1
  return {
    index: position,
    label: `第${position}組`,
    apiKey: createResendComputed(position, 'apiKey'),
    toEmail: createResendComputed(position, 'toEmail')
  }
})

const resendFromEmail = computed({
  get: () => activeAccount.value?.resendFromEmail ?? tempResendFromEmail.value,
  set: (val) => {
    if (activeAccount.value) activeAccount.value.resendFromEmail = val
    else tempResendFromEmail.value = val
  }
})

const buildResendPayload = (source = {}) => {
  const payload = {
    resendGroupCount: normalizeResendGroupCount(source.resendGroupCount),
    resendFromEmail: source.resendFromEmail || DEFAULT_RESEND_FROM_EMAIL
  }

  for (let index = 1; index <= RESEND_PAIR_COUNT; index += 1) {
    payload[resendApiKeyField(index)] = source[resendApiKeyField(index)] || ''
    payload[resendToEmailField(index)] = source[resendToEmailField(index)] || ''
  }

  return payload
}

const currentResendPayload = () => {
  const payload = {
    resendGroupCount: resendGroupCount.value,
    resendFromEmail: resendFromEmail.value || DEFAULT_RESEND_FROM_EMAIL
  }

  for (const pair of resendPairs) {
    payload[resendApiKeyField(pair.index)] = String(pair.apiKey.value || '').trim()
    payload[resendToEmailField(pair.index)] = String(pair.toEmail.value || '').trim()
  }

  return payload
}

const resetTempResend = () => {
  tempResendGroupCount.value = 3
  tempResendPairs.forEach((pair) => {
    pair.apiKey.value = ''
    pair.toEmail.value = ''
  })
  tempResendFromEmail.value = DEFAULT_RESEND_FROM_EMAIL
}

export function getSupabaseCredentials() {
  loadAccountsFromStorage()
  const acc = accounts.value.find(a => a.id === activeAccountId.value)
  if (acc && acc.supabaseUrl && acc.supabaseAnonKey) {
    return {
      url: acc.supabaseUrl,
      key: acc.supabaseAnonKey,
      source: 'localStorage'
    }
  }
  return null
}

export function getSupabaseBucket() {
  loadAccountsFromStorage()
  const acc = accounts.value.find(a => a.id === activeAccountId.value)
  if (acc?.bucket) return acc.bucket
  if (acc) return 'uploads'
  return null
}

export function getResendNotificationSettings() {
  loadAccountsFromStorage()

  const acc = accounts.value.find(a => a.id === activeAccountId.value)
  const groupCount = normalizeResendGroupCount(acc?.resendGroupCount)
  const recipients = Array.from({ length: groupCount }, (_, index) => {
    const position = index + 1
    return {
      label: `第${position}組`,
      apiKey: String(acc?.[resendApiKeyField(position)] || '').trim(),
      toEmail: String(acc?.[resendToEmailField(position)] || '').trim()
    }
  }).filter(item => item.apiKey && item.toEmail)

  return {
    ...buildResendPayload(acc),
    resendGroupCount: groupCount,
    recipients,
    fromEmail: acc?.resendFromEmail || DEFAULT_RESEND_FROM_EMAIL,
    accountId: acc?.id || ''
  }
}

export function useSettings() {
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  }

  const saveAccounts = () => {
    try {
      const data = {
        accounts: accounts.value,
        activeId: activeAccountId.value
      }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data))
      return { success: true }
    } catch (e) {
      console.error('save settings error:', e)
      return { success: false, error: e.message }
    }
  }

  const loadSettings = () => {
    try {
      const accountsRaw = localStorage.getItem(ACCOUNTS_KEY)
      if (accountsRaw) {
        const data = JSON.parse(accountsRaw)
        accounts.value = data.accounts || []
        activeAccountId.value = data.activeId || (accounts.value[0]?.id || null)
        _isLoaded = true
        return
      }

      const oldRaw = localStorage.getItem(STORAGE_KEY)
      if (oldRaw) {
        const oldData = JSON.parse(oldRaw)
        if (oldData.friendlyName || oldData.supabaseUrl) {
          const newAccount = {
            id: generateId(),
            friendlyName: oldData.friendlyName || '',
            supabaseUrl: oldData.supabaseUrl || '',
            supabaseAnonKey: oldData.supabaseAnonKey || '',
            bucket: oldData.bucket || '',
            ...buildResendPayload(oldData)
          }
          accounts.value = [newAccount]
          activeAccountId.value = newAccount.id
          _isLoaded = true
          saveAccounts()
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (e) {
      console.error('load settings error:', e)
    }
  }

  const addAccount = (account) => {
    const newAccount = {
      id: generateId(),
      friendlyName: account.friendlyName || '',
      supabaseUrl: account.supabaseUrl || '',
      supabaseAnonKey: account.supabaseAnonKey || '',
      bucket: account.bucket || '',
      ...buildResendPayload(account)
    }
    accounts.value.push(newAccount)
    if (accounts.value.length === 1) {
      activeAccountId.value = newAccount.id
    }
    saveAccounts()
    return newAccount
  }

  const updateAccount = (id, updates) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updates }
      saveAccounts()
      return { success: true }
    }
    return { success: false, error: '找不到帳號' }
  }

  const deleteAccount = (id) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      if (activeAccountId.value === id) {
        activeAccountId.value = accounts.value[0]?.id || null
      }
      saveAccounts()
      return { success: true }
    }
    return { success: false, error: '找不到帳號' }
  }

  const switchAccount = (id) => {
    const account = accounts.value.find(acc => acc.id === id)
    if (account) {
      activeAccountId.value = id
      saveAccounts()
      return { success: true }
    }
    return { success: false, error: '找不到帳號' }
  }

  const saveSettings = () => {
    if (activeAccount.value) {
      return saveAccounts()
    }

    const name = tempFriendlyName.value.trim()
    const url = tempSupabaseUrl.value.trim()
    const key = tempSupabaseAnonKey.value.trim()
    const bkt = tempBucket.value.trim()
    const resendPayload = currentResendPayload()
    const hasResendPair = Object.entries(resendPayload).some(([keyName, value]) =>
      (keyName.startsWith('resendApiKey') || keyName.startsWith('resendToEmail')) && value
    )
    const hasResendFromOverride = resendPayload.resendFromEmail && resendPayload.resendFromEmail !== DEFAULT_RESEND_FROM_EMAIL

    if (name || url || key || bkt || hasResendPair || hasResendFromOverride) {
      const newAccount = addAccount({
        friendlyName: name,
        supabaseUrl: url,
        supabaseAnonKey: key,
        bucket: bkt,
        ...resendPayload
      })
      activeAccountId.value = newAccount.id
      tempFriendlyName.value = ''
      tempSupabaseUrl.value = ''
      tempSupabaseAnonKey.value = ''
      tempBucket.value = ''
      resetTempResend()
      return saveAccounts()
    }

    return { success: false, error: '請至少填寫一項設定' }
  }

  const clearSettings = () => {
    accounts.value = []
    activeAccountId.value = null
    tempFriendlyName.value = ''
    tempSupabaseUrl.value = ''
    tempSupabaseAnonKey.value = ''
    tempBucket.value = ''
    resetTempResend()
    localStorage.removeItem(ACCOUNTS_KEY)
    localStorage.removeItem(STORAGE_KEY)
  }

  const displayName = computed(() => {
    const name = activeAccount.value?.friendlyName?.trim()
    return name ? `supabase-${name}` : 'supabase-.env'
  })

  const legacyResendExports = Object.fromEntries(resendPairs.flatMap(pair => [
    [resendApiKeyField(pair.index), pair.apiKey],
    [resendToEmailField(pair.index), pair.toEmail]
  ]))

  return {
    accounts,
    activeAccountId,
    activeAccount,
    addAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
    saveAccounts,
    friendlyName,
    supabaseUrl,
    supabaseAnonKey,
    bucket,
    resendGroupOptions: RESEND_GROUP_OPTIONS,
    resendGroupCount,
    resendPairs,
    ...legacyResendExports,
    resendFromEmail,
    displayName,
    loadSettings,
    saveSettings,
    clearSettings,
    currentResendPayload
  }
}
