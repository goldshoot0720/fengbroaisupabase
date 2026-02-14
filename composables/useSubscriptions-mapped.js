// composables/useSubscriptions.js
// 訂閱管理 - Appwrite 欄位名稱映射版本
import { ref, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseCredentials } from './useSettings'

// 欄位名稱映射 (Appwrite → Supabase)
const FIELD_MAP = {
  id: 'id',
  name: 'name',
  site: 'site',
  price: 'price',
  nextdate: 'nextdate',
  note: 'note',
  account: 'account',
  currency: 'currency',
  continue: 'continue',  // Appwrite 欄位名
  createdAt: 'created_at',
  updatedAt: 'updated_at'
}

// 共享狀態
const subscriptions = ref([])
const subscriptionLoading = ref(false)
const editingSubscription = ref(null)
const newSubscription = ref({
  name: '',
  site: '',
  account: '',
  price: null,
  nextdate: '',
  note: '',
  continue: true,  // 使用 Appwrite 欄位名
  currency: 'TWD'
})
let supabase = null
let isInitialized = false
let currentCredentials = null

export const useSubscriptions = () => {
  const initSupabase = () => {
    if (!process.client) return null
    const creds = getSupabaseCredentials()
    const config = useRuntimeConfig()
    const url = creds?.url || config.public.supabaseUrl
    const key = creds?.key || config.public.supabaseAnonKey
    const credKey = `${url}:${key?.slice(0, 20)}`
    
    if (supabase && currentCredentials !== credKey) {
      supabase = null
      isInitialized = false
      subscriptions.value = []
    }
    
    if (!supabase) {
      supabase = createClient(url, key)
      currentCredentials = credKey
    }
    return supabase
  }

  // 將資料庫欄位名映射為 Appwrite 風格（前端使用）
  const mapFromDB = (record) => {
    if (!record) return null
    return {
      id: record.id,
      name: record.name,
      site: record.site,
      account: record.account,
      price: record.price,
      nextdate: record.nextdate,
      note: record.note,
      currency: record.currency || 'TWD',
      continue: record.continue !== false,  // 映射為 continue
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }
  }

  // 將前端資料映射為資料庫欄位名
  const mapToDB = (data) => ({
    name: data.name,
    site: data.site || null,
    account: data.account || null,
    price: data.price || null,
    nextdate: data.nextdate || null,
    note: data.note || null,
    currency: data.currency || 'TWD',
    "continue": data.continue !== false  // 使用雙引號因為是保留字
  })

  const totalMonthlyCost = computed(() => {
    return subscriptions.value.reduce((total, sub) => total + (sub.price || 0), 0)
  })

  const sortedSubscriptions = computed(() => {
    return [...subscriptions.value].sort((a, b) => {
      if (!a.nextdate && !b.nextdate) return 0
      if (!a.nextdate) return 1
      if (!b.nextdate) return -1
      return new Date(a.nextdate) - new Date(b.nextdate)
    })
  })

  const loadSubscriptions = async () => {
    const client = initSupabase()
    if (!client) return
    if (isInitialized && subscriptions.value.length > 0) return
    
    try {
      subscriptionLoading.value = true
      const { data, error } = await client
        .from('subscription')
        .select('*')
      
      if (error) throw error
      if (data) {
        subscriptions.value = data.map(mapFromDB)
        isInitialized = true
      }
    } catch (error) {
      console.error('載入訂閱資料失敗:', error)
    } finally {
      subscriptionLoading.value = false
    }
  }

  const addSubscription = async () => {
    const client = initSupabase()
    if (!client) return
    
    try {
      subscriptionLoading.value = true
      const payload = mapToDB(newSubscription.value)
      
      const { data, error } = await client
        .from('subscription')
        .insert(payload)
        .select()
        .single()
      
      if (error) throw error
      subscriptions.value.unshift(mapFromDB(data))
      resetSubscriptionForm()
      alert('訂閱已新增成功！')
    } catch (error) {
      console.error('新增訂閱失敗:', error.message)
      alert('新增訂閱失敗: ' + error.message)
    } finally {
      subscriptionLoading.value = false
    }
  }

  const editSubscription = (subscription) => {
    editingSubscription.value = subscription
    newSubscription.value = {
      name: subscription.name,
      site: subscription.site || '',
      account: subscription.account || '',
      price: subscription.price,
      nextdate: subscription.nextdate || '',
      note: subscription.note || '',
      continue: subscription.continue !== false,
      currency: subscription.currency || 'TWD'
    }
  }

  const updateSubscription = async () => {
    const client = initSupabase()
    if (!editingSubscription.value || !client) return
    
    try {
      subscriptionLoading.value = true
      const payload = mapToDB(newSubscription.value)
      
      const { data, error } = await client
        .from('subscription')
        .update(payload)
        .eq('id', editingSubscription.value.id)
        .select()
        .single()
      
      if (error) throw error
      
      const index = subscriptions.value.findIndex(s => s.id === editingSubscription.value.id)
      if (index !== -1) {
        subscriptions.value[index] = mapFromDB(data)
      }
      resetSubscriptionForm()
      alert('訂閱已更新成功！')
    } catch (error) {
      console.error('更新訂閱失敗:', error.message)
      alert('更新訂閱失敗: ' + error.message)
    } finally {
      subscriptionLoading.value = false
    }
  }

  const deleteSubscription = async (id) => {
    const client = initSupabase()
    if (!client) return
    if (!confirm('確定要刪除此訂閱項目嗎？')) return
    
    try {
      subscriptionLoading.value = true
      const { error } = await client
        .from('subscription')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      subscriptions.value = subscriptions.value.filter(s => s.id !== id)
      alert('訂閱已刪除！')
    } catch (error) {
      console.error('刪除訂閱失敗:', error.message)
      alert('刪除訂閱失敗: ' + error.message)
    } finally {
      subscriptionLoading.value = false
    }
  }

  const toggleContinue = async (subscription) => {
    const client = initSupabase()
    if (!client) return
    try {
      const newContinue = subscription.continue !== true
      const { data, error } = await client
        .from('subscription')
        .update({ "continue": newContinue })
        .eq('id', subscription.id)
        .select()
        .single()
      if (error) throw error
      const idx = subscriptions.value.findIndex(s => s.id === subscription.id)
      if (idx !== -1) subscriptions.value[idx] = mapFromDB(data)
    } catch (error) {
      console.error('切換續訂狀態失敗:', error.message)
      alert('切換續訂狀態失敗: ' + error.message)
    }
  }

  const resetSubscriptionForm = () => {
    newSubscription.value = {
      name: '',
      site: '',
      account: '',
      price: null,
      nextdate: '',
      note: '',
      continue: true,
      currency: 'TWD'
    }
    editingSubscription.value = null
  }

  return {
    subscriptions,
    subscriptionLoading,
    editingSubscription,
    newSubscription,
    totalMonthlyCost,
    sortedSubscriptions,
    loadSubscriptions,
    addSubscription,
    editSubscription,
    updateSubscription,
    deleteSubscription,
    toggleContinue,
    resetSubscriptionForm
  }
}
