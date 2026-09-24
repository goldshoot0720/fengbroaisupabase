// composables/useFoods.js
// 食物管理的完整邏輯 - 使用共享狀態
import { ref, computed } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

// 共享狀態（在模組層級定義，所有組件共用）
const foods = ref([])
const foodLoading = ref(false)
const editingFood = ref(null)
const FOOD_IMPORT_KEY_FIELDS = ['name', 'amount', 'price', 'shop', 'todate', 'photo', 'photohash']
const newFood = ref({
  name: '',
  amount: null,
  price: null,
  shop: '',
  todate: '',
  photo: '',
  photohash: ''
})
let supabase = null
let isInitialized = false
let currentCredentials = null // 記錄當前使用的認證

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
const optimistic = createOptimisticList({ table: 'food', listRef: foods })

const buildFoodRow = (form) => ({
  name: form.name,
  amount: toNullableNumber(form.amount),
  price: form.price || null,
  shop: form.shop || null,
  todate: form.todate || null,
  photo: form.photo || null,
  photohash: form.photohash || null
})

const insertFoodRow = (client, row) => optimistic.insert(row, async () => {
  const { data, error } = await client.from('food').insert(row).select().single()
  if (error) throw error
  return data
})

const updateFoodRow = (client, id, row) => optimistic.update(id, row, async (realId) => {
  const { data, error } = await client.from('food').update(row).eq('id', realId).select().single()
  if (error) throw error
  return data
})

const deleteFoodRows = (client, ids) => optimistic.remove(ids, async (realIds) => {
  const { error } = await client.from('food').delete().in('id', realIds)
  if (error) throw error
})

export const useFoods = () => {
  // 初始化 Supabase（優先使用 localStorage 設定）
  const initSupabase = () => {
    if (!process.client) return null
    const { credKey, source } = getSupabaseBrowserConfig()
    
    // 如果認證變更，重新建立客戶端並重置資料
    if (supabase && currentCredentials !== credKey) {
      console.log('Supabase 認證變更，重新初始化...')
      supabase = null
      isInitialized = false
      foods.value = []
    }
    
    if (!supabase) {
      supabase = getSupabaseBrowserClient()
      currentCredentials = credKey
      console.log('Supabase 客戶端已初始化:', source)
    }
    
    return supabase
  }

  // 計算屬性：即將到期的食物（7天內，依到期日由近到遠）
  const expiringFoods = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    return foods.value
      .filter((food) => {
        if (!food.todate) return false
        const toDate = new Date(food.todate)
        if (Number.isNaN(toDate.getTime())) return false
        toDate.setHours(0, 0, 0, 0)
        return toDate <= sevenDaysLater && toDate >= today
      })
      .sort((a, b) => new Date(a.todate) - new Date(b.todate))
  })

  // 計算屬性：排序後的食物（按到期日）
  const sortedFoods = computed(() => {
    return [...foods.value].sort((a, b) => {
      if (!a.todate && !b.todate) return 0
      if (!a.todate) return 1
      if (!b.todate) return -1
      
      const dateA = new Date(a.todate)
      const dateB = new Date(b.todate)
      return dateA - dateB
    })
  })

  // 載入食物資料
  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  const loadFoods = async (options = {}) => {
    const client = initSupabase()
    if (!client) return
    const result = await loadCachedTable({
      table: 'food',
      listRef: foods,
      loadingRef: foodLoading,
      force: options?.force === true,
      fetcher: () => selectWholeTable(client, 'food')
    })
    if (result.success) isInitialized = true
  }

  // 新增食物
  const addFood = async () => {
    const client = initSupabase()
    if (!client) return

    // 驗證日期格式
    if (newFood.value.todate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(newFood.value.todate)) {
        alert('請輸入正確的日期格式 (YYYY-MM-DD)')
        return
      }
    }

    try {
      foodLoading.value = true

      await insertFoodRow(client, buildFoodRow(newFood.value))
      resetFoodForm()
      alert('食物新增成功！')
    } catch (error) {
      console.error('新增食物失敗:', error.message)
      alert('新增食物失敗: ' + error.message)
    } finally {
      foodLoading.value = false
    }
  }

  // 行内新增食物
  const addFoodInline = async (formData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }

    if (!formData.name) {
      return { success: false, error: '請輸入食物名稱' }
    }

    try {
      await insertFoodRow(client, buildFoodRow(formData))
      return { success: true }
    } catch (error) {
      console.error('行内新增失敗:', error.message)
      return { success: false, error: error.message }
    }
  }


  // 編輯食物
  const editFood = (food) => {
    editingFood.value = food
    newFood.value = {
      name: food.name,
      amount: food.amount,
      price: food.price,
      shop: food.shop || '',
      todate: food.todate || '',
      photo: food.photo || '',
      photohash: food.photohash || ''
    }
    
    // 滾動到表單區域
    if (process.client) {
      document.querySelector('.add-food')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // 更新食物
  const updateFood = async () => {
    const client = initSupabase()
    if (!editingFood.value || !client) return

    // 驗證日期格式
    if (newFood.value.todate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(newFood.value.todate)) {
        alert('請輸入正確的日期格式 (YYYY-MM-DD)')
        return
      }
    }

    try {
      foodLoading.value = true

      await updateFoodRow(client, editingFood.value.id, buildFoodRow(newFood.value))
      resetFoodForm()
      alert('食物更新成功！')
    } catch (error) {
      console.error('更新食物失敗:', error.message)
      alert('更新食物失敗: ' + error.message)
    } finally {
      foodLoading.value = false
    }
  }

  // 行内更新食物
  const updateFoodInline = async (id, formData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }

    try {
      await updateFoodRow(client, id, buildFoodRow(formData))
      return { success: true }
    } catch (error) {
      console.error('行内更新失敗:', error.message)
      return { success: false, error: error.message }
    }
  }

  // 刪除食物
  const deleteFood = async (id) => {
    const client = initSupabase()
    if (!client) return

    if (!confirm('確定要刪除此食物項目嗎？')) return

    try {
      await deleteFoodRows(client, [id])
    } catch (error) {
      console.error('刪除食物失敗:', error.message)
      alert('刪除食物失敗: ' + error.message)
    }
  }

  // 批量刪除食物
  const batchDeleteFoods = async (ids) => {
    const client = initSupabase()
    if (!client || ids.length === 0) return { success: false, error: '無效操作' }

    try {
      await deleteFoodRows(client, [...ids])
      return { success: true, count: ids.length }
    } catch (error) {
      console.error('批量刪除失敗:', error.message)
      return { success: false, error: error.message }
    }
  }

  // 重置表單
  const resetFoodForm = () => {
    newFood.value = {
      name: '',
      amount: null,
      price: null,
      shop: '',
      todate: '',
      photo: '',
      photohash: ''
    }
    editingFood.value = null
  }

  // 檢測是否為 Appwrite 格式（ISO 8601 日期）
  const isAppwriteFormat = (rows) => {
    if (!rows || rows.length === 0) return false
    const firstRow = rows[0]
    // Appwrite 格式的日期包含 'T'
    const hasIsoDate = firstRow.todate && firstRow.todate.includes('T')
    return hasIsoDate
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

  // 批次匯入食物
  const importFoods = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    
    try {
      foodLoading.value = true
      
      // 檢測格式
      const isAppwrite = isAppwriteFormat(rows)
      console.log('Import format - isAppwrite:', isAppwrite)
      console.log('First row:', rows[0])
      
      const payload = rows.map((r, idx) => {
        // 處理日期格式
        let todate = r.todate || null
        
        // 驗證日期格式，無效則設為 null
        if (todate && !isValidDate(todate)) {
          console.warn(`Row ${idx}: Invalid date format "${todate}", setting to null`)
          todate = null
        } else if (todate && todate.includes('T')) {
          // 轉換 ISO 8601 格式
          todate = convertAppwriteDate(todate)
        }
        
        const record = {
          name: r.name || '',
          amount: Number(r.amount || 0) || null,
          price: Number(r.price || 0) || null,
          shop: r.shop || null,
          todate: todate,
          photo: r.photo || null,
          photohash: r.photohash || null
        }
        
        if (idx === 0) console.log('First payload record:', record)
        return record
      }).filter(r => r.name)
      
      if (payload.length === 0) return { success: false, error: '無有效資料' }
      
      const { data: existingRows, error: existingError } = await client.from('food').select('*')
      if (existingError) throw existingError

      const { unique, skipped } = filterDuplicateImports(payload, existingRows || foods.value, FOOD_IMPORT_KEY_FIELDS)
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
      const { data, error } = await client.from('food').insert(unique).select()
      if (error) throw error
      
      foods.value.push(...data)
      return { 
        success: true, 
        count: data.length,
        skipped,
        isAppwrite: isAppwrite,
        message: buildImportMessage(isAppwrite ? '已轉換 ISO 8601 日期格式並匯入' : '匯入成功', skipped)
      }
    } catch (e) {
      console.error('Import error:', e)
      return { success: false, error: e.message }
    } finally {
      foodLoading.value = false
    }
  }


  // 寫入成功後同步快取（記憶體 + IndexedDB），重新整理或切換選單都能立即顯示。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('food', foods.value)
    return result
  }

  return {
    foods,
    foodLoading,
    editingFood,
    newFood,
    expiringFoods,
    sortedFoods,
    loadFoods,
    addFood: withCacheSync(addFood),
    addFoodInline: withCacheSync(addFoodInline),
    importFoods: withCacheSync(importFoods),
    isAppwriteFormat,
    editFood,
    updateFood: withCacheSync(updateFood),
    updateFoodInline: withCacheSync(updateFoodInline),
    deleteFood: withCacheSync(deleteFood),
    batchDeleteFoods: withCacheSync(batchDeleteFoods),
    resetFoodForm
  }
}
