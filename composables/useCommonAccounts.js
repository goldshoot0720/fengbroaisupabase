import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

// 初始化 Supabase（優先使用 localStorage 設定）
const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useCommonAccounts = () => {
  const accounts = ref([])
  const loading = ref(false)
  const error = ref(null)
  // 新增 / 更新 / 刪除先改畫面，失敗自動還原（見 useCachedTable.createOptimisticList）
  const optimistic = createOptimisticList({ table: 'commonaccount', listRef: accounts })

  // 載入資料
  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  const loadAccounts = async (options = {}) => {
    const client = initSupabase()
    if (!client) return
    await loadCachedTable({
      table: 'commonaccount',
      listRef: accounts,
      loadingRef: loading,
      errorRef: error,
      force: options?.force === true,
      fetcher: () => selectWholeTable(client, 'commonaccount', { order: 'created_at', ascending: false })
    })
  }

  // 新增資料
  const addAccount = async (accountData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    
    try {
      loading.value = true
      
      const { id, ...payload } = accountData
      
      const saved = await optimistic.insert(payload, async () => {
        const { data, error: insertError } = await client
          .from('commonaccount')
          .insert([payload])
          .select()

        if (insertError) throw insertError
        return data?.[0] || null
      })
      return { success: true, item: saved }
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

      await optimistic.update(id, payload, async (realId) => {
        const { data, error: updateError } = await client
          .from('commonaccount')
          .update(payload)
          .eq('id', realId)
          .select()

        if (updateError) throw updateError
        return data?.[0] || null
      })
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

      const { data: existingRows, error: existingError } = await client.from('commonaccount').select('*')
      if (existingError) throw existingError

      const { unique, skipped } = filterDuplicateImports(payload, existingRows || accounts.value, COMMON_FIELDS)
      if (unique.length === 0) {
        return {
          success: true,
          count: 0,
          skipped,
          message: buildImportMessage('匯入成功', skipped)
        }
      }

      console.log('Inserting', unique.length, 'common accounts')
      console.log('Sample payload:', payload[0])

      const { data, error: insertError } = await client.from('commonaccount').insert(unique).select()
      if (insertError) throw insertError

      accounts.value.push(...data)

      return {
        success: true,
        count: data.length,
        skipped,
        message: buildImportMessage('匯入成功', skipped)
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
      await optimistic.remove([id], async ([realId]) => {
        const { error: deleteError } = await client
          .from('commonaccount')
          .delete()
          .eq('id', realId)

        if (deleteError) throw deleteError
      })
      return { success: true }
    } catch (e) {
      console.error('Error deleting common account:', e)
      return { success: false, error: e.message }
    }
  }


  // 任何寫入成功後同步快取，下次切回此頁可立刻看到最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('commonaccount', accounts.value)
    return result
  }

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount: withCacheSync(addAccount),
    updateAccount: withCacheSync(updateAccount),
    deleteAccount: withCacheSync(deleteAccount),
    importAccounts: withCacheSync(importAccounts),
    COMMON_FIELDS
  }
}
