// composables/useSubscriptions.js
// 訂閱管理的完整邏輯 - 使用共享狀態
import { ref, computed } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'
import { SUBSCRIPTION_NOTIFY_WINDOW_DAYS, isWithinNotifyWindow } from '../utils/notificationHelpers'

// 共享狀態（在模組層級定義，所有組件共用）
const subscriptions = ref([])
const subscriptionLoading = ref(false)
const subscriptionError = ref('')
const editingSubscription = ref(null)
const SUBSCRIPTION_IMPORT_KEY_FIELDS = ['name', 'site', 'account', 'price', 'nextdate', 'note', 'currency', 'iscontinue']
const newSubscription = ref({
  name: '',
  site: '',
  account: '',
  price: null,
  nextdate: '',
  note: '',
  iscontinue: true,
  currency: 'TWD'
})
let supabase = null
let isInitialized = false
let currentCredentials = null // 記錄當前使用的認證

const isMissingSubscriptionTableError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    /Could not find the table .*subscription/i.test(message) ||
    /relation .*subscription.* does not exist/i.test(message)
}

const getSubscriptionErrorMessage = (error) => {
  if (isMissingSubscriptionTableError(error)) {
    return '尚未建立 public.subscription 資料表，請到鋒兄設定的資料表狀態手動建立 subscription。'
  }
  return error?.message || String(error)
}

// 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
const optimistic = createOptimisticList({
  table: 'subscription',
  listRef: subscriptions,
  toMessage: getSubscriptionErrorMessage
})

const buildSubscriptionRow = (form) => ({
  name: form.name,
  site: form.site || null,
  account: form.account || null,
  price: form.price || null,
  nextdate: form.nextdate || null,
  note: form.note || null,
  iscontinue: form.iscontinue !== false,
  currency: form.currency || 'TWD'
})

export const useSubscriptions = () => {
  // 初始化 Supabase（優先使用 localStorage 設定）
  const initSupabase = () => {
    if (!process.client) return null
    const { credKey, source } = getSupabaseBrowserConfig()
    
    // 如果認證變更，重新建立客戶端並重置資料
    if (supabase && currentCredentials !== credKey) {
      console.log('Supabase 認證變更，重新初始化...')
      supabase = null
      isInitialized = false
      subscriptions.value = []
    }
    
    if (!supabase) {
      supabase = getSupabaseBrowserClient()
      currentCredentials = credKey
      console.log('Supabase 客戶端已初始化:', source)
    }
    
    return supabase
  }

  // 計算屬性：每月總費用
  const totalMonthlyCost = computed(() => {
    return subscriptions.value.reduce((total, sub) => total + (sub.price || 0), 0)
  })

  // 取得通知視窗內即將到期的訂閱（僅續訂中的項目）
  const getUpcomingSubscriptions = (windowDays = SUBSCRIPTION_NOTIFY_WINDOW_DAYS) => {
    return subscriptions.value.filter(sub => {
      if (!sub.nextdate || sub.iscontinue === false) return false
      return isWithinNotifyWindow(sub.nextdate, windowDays)
    })
  }

  // 計算屬性：排序後的訂閱（按下次扣款日期）
  const sortedSubscriptions = computed(() => {
    return [...subscriptions.value].sort((a, b) => {
      if (!a.nextdate && !b.nextdate) return 0
      if (!a.nextdate) return 1
      if (!b.nextdate) return -1
      
      const dateA = new Date(a.nextdate)
      const dateB = new Date(b.nextdate)
      return dateA - dateB
    })
  })

  // 欄位名稱轉換（資料庫 iscontinue ↔ Appwrite continue）
  const normalizeSubscription = (sub) => {
    if (!sub) return null
    // 資料庫欄位是 iscontinue，但前端顯示使用 iscontinue
    return {
      ...sub,
      iscontinue: sub.iscontinue !== false
    }
  }
  
  const insertSubscriptionRow = (client, row) => optimistic.insert(normalizeSubscription(row), async () => {
    const { data, error } = await client.from('subscription').insert(row).select().single()
    if (error) throw error
    return normalizeSubscription(data)
  })

  const updateSubscriptionRow = (client, id, row) => optimistic.update(id, normalizeSubscription(row), async (realId) => {
    const { data, error } = await client.from('subscription').update(row).eq('id', realId).select().single()
    if (error) throw error
    return normalizeSubscription(data)
  })

  const deleteSubscriptionRows = (client, ids) => optimistic.remove(ids, async (realIds) => {
    const { error } = await client.from('subscription').delete().in('id', realIds)
    if (error) throw error
  })

  // CSV 欄位名映射（Appwrite 格式）
  const CSV_FIELD_MAP = {
    name: 'name',
    site: 'site',
    account: 'account',
    price: 'price',
    nextdate: 'nextdate',
    note: 'note',
    currency: 'currency',
    continue: 'iscontinue'  // CSV 用 continue，資料庫用 iscontinue
  }

  // 載入訂閱資料
  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  // force 可傳 true 或 { force: true }。
  const loadSubscriptions = async (force = false) => {
    const client = initSupabase()
    if (!client) return
    const result = await loadCachedTable({
      table: 'subscription',
      listRef: subscriptions,
      loadingRef: subscriptionLoading,
      errorRef: subscriptionError,
      errorValue: '',
      force: force === true || force?.force === true,
      fetcher: async () => (await selectWholeTable(client, 'subscription')).map(normalizeSubscription).filter(Boolean),
      onError: (error, { showedCache }) => {
        if (!showedCache) subscriptions.value = []
        subscriptionError.value = getSubscriptionErrorMessage(error)
      }
    })
    isInitialized = true
    return result
  }

  // 新增訂閱
  const addSubscription = async () => {
    const client = initSupabase()
    if (!client) return
    
    // 驗證日期格式
    if (newSubscription.value.nextdate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(newSubscription.value.nextdate)) {
        alert('請輸入正確的日期格式 (YYYY-MM-DD)')
        return
      }
    }
    
    try {
      subscriptionLoading.value = true
      
      await insertSubscriptionRow(client, buildSubscriptionRow(newSubscription.value))
      resetSubscriptionForm()
      alert('訂閱已新增成功！')
    } catch (error) {
      console.error('新增訂閱失敗:', error.message)
      alert('新增訂閱失敗: ' + getSubscriptionErrorMessage(error))
    } finally {
      subscriptionLoading.value = false
    }
  }

  // 行内新增訂閱
  const addSubscriptionInline = async (formData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    
    if (!formData.name) {
      return { success: false, error: '請輸入服務名稱' }
    }
    
    try {
      const created = await insertSubscriptionRow(client, buildSubscriptionRow(formData))
      return { success: true, item: created }
    } catch (error) {
      console.error('行内新增失敗:', error.message)
      return { success: false, error: getSubscriptionErrorMessage(error) }
    }
  }


  // 編輯訂閱
  const editSubscription = (subscription) => {
    editingSubscription.value = subscription
    newSubscription.value = {
      name: subscription.name,
      site: subscription.site || '',
      account: subscription.account || '',
      price: subscription.price,
      nextdate: subscription.nextdate || '',
      note: subscription.note || '',
      iscontinue: subscription.iscontinue !== false,
      currency: subscription.currency || 'TWD'
    }
    
    // 滾動到表單區域
    if (process.client) {
      document.querySelector('.add-subscription')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // 更新訂閱
  const updateSubscription = async () => {
    const client = initSupabase()
    if (!editingSubscription.value || !client) return
    
    // 驗證日期格式
    if (newSubscription.value.nextdate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(newSubscription.value.nextdate)) {
        alert('請輸入正確的日期格式 (YYYY-MM-DD)')
        return
      }
    }
    
    try {
      subscriptionLoading.value = true
      
      await updateSubscriptionRow(client, editingSubscription.value.id, buildSubscriptionRow(newSubscription.value))
      resetSubscriptionForm()
      alert('訂閱已更新成功！')
    } catch (error) {
      console.error('更新訂閱失敗:', error.message)
      alert('更新訂閱失敗: ' + getSubscriptionErrorMessage(error))
    } finally {
      subscriptionLoading.value = false
    }
  }

  // 行内更新訂閱
  const updateSubscriptionInline = async (id, formData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    
    try {
      await updateSubscriptionRow(client, id, buildSubscriptionRow(formData))
      return { success: true }
    } catch (error) {
      console.error('行内更新失敗:', error.message)
      return { success: false, error: getSubscriptionErrorMessage(error) }
    }
  }

  // 刪除訂閱
  const deleteSubscription = async (id, options = {}) => {
    const client = initSupabase()
    if (!client) return
    
    if (!options.skipConfirm && !confirm('確定要將此訂閱項目移到垃圾桶嗎？')) return { success: false, cancelled: true }
    
    try {
      await deleteSubscriptionRows(client, [id])
      if (!options.silent) alert('訂閱已移到垃圾桶！')
      return { success: true }
    } catch (error) {
      console.error('刪除訂閱失敗:', error.message)
      alert('刪除訂閱失敗: ' + getSubscriptionErrorMessage(error))
      return { success: false, error: getSubscriptionErrorMessage(error) }
    }
  }

  const restoreSubscription = async (record) => {
    const client = initSupabase()
    if (!client || !record) return { success: false, error: 'No client' }
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = record
    try {
      const data = await insertSubscriptionRow(client, payload)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: getSubscriptionErrorMessage(error) }
    }
  }

  // 批量刪除訂閱
  const batchDeleteSubscriptions = async (ids) => {
    const client = initSupabase()
    if (!client || ids.length === 0) return { success: false, error: '無效操作' }
    
    try {
      await deleteSubscriptionRows(client, [...ids])
      return { success: true, count: ids.length }
    } catch (error) {
      console.error('批量刪除失敗:', error.message)
      return { success: false, error: getSubscriptionErrorMessage(error) }
    }
  }

  // 切換續訂狀態
  const toggleIsContinue = async (subscription) => {
    const client = initSupabase()
    if (!client) return
    try {
      const row = { iscontinue: subscription.iscontinue !== true }
      await optimistic.update(subscription.id, row, async (realId) => {
        const { data, error } = await client
          .from('subscription')
          .update(row)
          .eq('id', realId)
          .select()
          .single()
        if (error) throw error
        return normalizeSubscription(data)
      })
    } catch (error) {
      console.error('切換續訂狀態失敗:', error.message)
      alert('切換續訂狀態失敗: ' + getSubscriptionErrorMessage(error))
    }
  }

  // 重置表單
  const resetSubscriptionForm = () => {
    newSubscription.value = {
      name: '',
      site: '',
      account: '',
      price: null,
      nextdate: '',
      note: '',
      iscontinue: true,
      currency: 'TWD'
    }
    editingSubscription.value = null
  }

  // 檢測是否為 Appwrite 格式（ISO 8601 日期）
  const isAppwriteFormat = (rows) => {
    if (!rows || rows.length === 0) return false
    const firstRow = rows[0]
    // Appwrite 格式的日期包含 'T'
    const hasIsoDate = firstRow.nextdate && firstRow.nextdate.includes('T')
    return hasIsoDate
  }
  
  // 解析 CSV continue 欄位為布林值
  const parseContinueField = (value) => {
    if (value === undefined || value === null || value === '') return true
    const str = String(value).toLowerCase().trim()
    return str === 'true' || str === '1' || str === 'yes'
  }

  // 驗證日期格式（YYYY-MM-DD 或 ISO 8601）
  const isValidDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return false
    // 接受 YYYY-MM-DD 或 ISO 8601 格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T.*)?$/
    return dateRegex.test(dateStr)
  }

  // 轉換 ISO 8601 日期格式為簡單日期
  const convertAppwriteDate = (isoDate) => {
    if (!isoDate) return null
    if (isoDate.includes('T')) {
      return isoDate.split('T')[0]
    }
    return isoDate
  }

  // 批次匯入訂閱
  const importSubscriptions = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    
    try {
      subscriptionLoading.value = true
      
      // 檢測格式
      const isAppwrite = isAppwriteFormat(rows)
      console.log('Import format - isAppwrite:', isAppwrite)
      console.log('First row:', rows[0])
      
      const payload = rows.map((r, idx) => {
        // 處理日期格式
        let nextdate = r.nextdate || null
        
        // 驗證日期格式，無效則設為 null
        if (nextdate && !isValidDate(nextdate)) {
          console.warn(`Row ${idx}: Invalid date format "${nextdate}", setting to null`)
          nextdate = null
        } else if (nextdate && nextdate.includes('T')) {
          // 轉換 ISO 8601 格式
          nextdate = convertAppwriteDate(nextdate)
        }
        
        // CSV 用 'continue'，資料庫用 'iscontinue'
        const iscontinue = parseContinueField(r.continue)
        
        const record = {
          name: r.name || '',
          site: r.site || null,
          account: r.account || null,
          price: Number(r.price || 0) || null,
          nextdate: nextdate,
          note: r.note || null,
          currency: r.currency || 'TWD',
          "iscontinue": iscontinue
        }
        
        if (idx === 0) console.log('First payload record:', record)
        return record
      }).filter(r => r.name)
      
      if (payload.length === 0) return { success: false, error: '無有效資料' }
      
      const { data: existingRows, error: existingError } = await client.from('subscription').select('*')
      if (existingError) throw existingError

      const { unique, skipped } = filterDuplicateImports(payload, existingRows || subscriptions.value, SUBSCRIPTION_IMPORT_KEY_FIELDS)
      if (unique.length === 0) {
        return {
          success: true,
          count: 0,
          skipped,
          isAppwrite: isAppwrite,
          message: buildImportMessage('匯入成功', skipped)
        }
      }

      console.log('Inserting', unique.length, 'records')
      const { data, error } = await client.from('subscription').insert(unique).select()
      if (error) throw error
      
      subscriptions.value.push(...data)
      return { 
        success: true, 
        count: data.length,
        skipped,
        isAppwrite: isAppwrite,
        message: buildImportMessage(isAppwrite ? '已轉換 ISO 8601 日期格式並匯入' : '匯入成功', skipped)
      }
    } catch (e) {
      console.error('Import error:', e)
      return { success: false, error: getSubscriptionErrorMessage(e) }
    } finally {
      subscriptionLoading.value = false
    }
  }


  // 寫入成功後同步快取（記憶體 + IndexedDB），重新整理或切換選單都能立即顯示。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('subscription', subscriptions.value)
    return result
  }

  return {
    subscriptions,
    subscriptionLoading,
    subscriptionError,
    editingSubscription,
    newSubscription,
    totalMonthlyCost,
    sortedSubscriptions,
    getUpcomingSubscriptions,
    loadSubscriptions,
    addSubscription: withCacheSync(addSubscription),
    addSubscriptionInline: withCacheSync(addSubscriptionInline),
    importSubscriptions: withCacheSync(importSubscriptions),
    isAppwriteFormat,
    editSubscription,
    updateSubscription: withCacheSync(updateSubscription),
    updateSubscriptionInline: withCacheSync(updateSubscriptionInline),
    deleteSubscription: withCacheSync(deleteSubscription),
    batchDeleteSubscriptions: withCacheSync(batchDeleteSubscriptions),
    restoreSubscription: withCacheSync(restoreSubscription),
    toggleIsContinue: withCacheSync(toggleIsContinue),
    resetSubscriptionForm
  }
}
