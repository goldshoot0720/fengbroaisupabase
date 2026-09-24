import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { createOptimisticList, loadCachedTable, rememberCachedTable, selectWholeTable } from './useCachedTable'
import { buildImportMessage, filterDuplicateImports } from '../utils/importDedupe'

// 初始化 Supabase（優先使用 localStorage 設定）
const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useArticles = () => {
  const articles = ref([])
  const loading = ref(false)
  const error = ref(null)
  // 新增 / 更新 / 刪除先改畫面，失敗自動還原；清單維持依 newdate 由新到舊。
  const sortByNewdate = (list) => [...list].sort((a, b) => new Date(b.newdate) - new Date(a.newdate))
  const optimistic = createOptimisticList({ table: 'article', listRef: articles, sort: sortByNewdate })

  // 載入筆記資料
  // 先秀快取（記憶體 / IndexedDB），再背景向 Supabase 更新；同表同時只打一次請求。
  const loadArticles = async (options = {}) => {
    const client = initSupabase()
    if (!client) return
    await loadCachedTable({
      table: 'article',
      listRef: articles,
      loadingRef: loading,
      errorRef: error,
      force: options?.force === true,
      fetcher: () => selectWholeTable(client, 'article', { order: 'newdate', ascending: false })
    })
  }

  // 新增筆記
  const addArticle = async (articleData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }

    try {
      loading.value = true

      const payload = {
        title: articleData.title,
        content: articleData.content,
        category: articleData.category || null,
        ref: articleData.ref || null,
        newdate: articleData.newdate || new Date().toISOString().split('T')[0],
        url1: articleData.url1 || null,
        url2: articleData.url2 || null,
        url3: articleData.url3 || null,
        file1: articleData.file1 || null,
        file1name: articleData.file1name || null,
        file1type: articleData.file1type || null,
        file2: articleData.file2 || null,
        file2name: articleData.file2name || null,
        file2type: articleData.file2type || null,
        file3: articleData.file3 || null,
        file3name: articleData.file3name || null,
        file3type: articleData.file3type || null
      }

      await optimistic.insert(payload, async () => {
        const { data, error: insertError } = await client
          .from('article')
          .insert([payload])
          .select()

        if (insertError) throw insertError
        return data?.[0] || null
      })
      return { success: true }
    } catch (e) {
      console.error('Error adding article:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 更新筆記
  const updateArticle = async (id, articleData) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }

    try {
      loading.value = true

      const payload = {
        title: articleData.title,
        content: articleData.content,
        category: articleData.category || null,
        ref: articleData.ref || null,
        newdate: articleData.newdate,
        url1: articleData.url1 || null,
        url2: articleData.url2 || null,
        url3: articleData.url3 || null,
        file1: articleData.file1 || null,
        file1name: articleData.file1name || null,
        file1type: articleData.file1type || null,
        file2: articleData.file2 || null,
        file2name: articleData.file2name || null,
        file2type: articleData.file2type || null,
        file3: articleData.file3 || null,
        file3name: articleData.file3name || null,
        file3type: articleData.file3type || null
      }

      await optimistic.update(id, payload, async (realId) => {
        const { data, error: updateError } = await client
          .from('article')
          .update(payload)
          .eq('id', realId)
          .select()

        if (updateError) throw updateError
        return data?.[0] || null
      })
      return { success: true }
    } catch (e) {
      console.error('Error updating article:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 刪除筆記
  const deleteArticle = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }

    try {
      await optimistic.remove([id], async ([realId]) => {
        const { error: deleteError } = await client
          .from('article')
          .delete()
          .eq('id', realId)

        if (deleteError) throw deleteError
      })
      return { success: true }
    } catch (e) {
      console.error('Error deleting article:', e)
      return { success: false, error: e.message }
    }
  }

  const restoreArticle = async (record) => {
    const client = initSupabase()
    if (!client || !record) return { success: false, error: 'No client' }
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = record
    try {
      loading.value = true
      const data = await optimistic.insert(payload, async () => {
        const { data: inserted, error: insertError } = await client.from('article').insert(payload).select().single()
        if (insertError) throw insertError
        return inserted
      })
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // 檢測是否為 Appwrite 格式（有 $id 或 ISO 8601 日期）
  const isAppwriteFormat = (rows) => {
    if (!rows || rows.length === 0) return false
    const firstRow = rows[0]
    return ('$id' in firstRow) || ('$createdAt' in firstRow) ||
      (firstRow.newDate && firstRow.newDate.includes('T'))
  }

  // 轉換 ISO 8601 日期格式為簡單日期
  const convertAppwriteDate = (isoDate) => {
    if (!isoDate) return null
    if (isoDate.includes('T')) {
      return isoDate.split('T')[0]
    }
    return isoDate
  }

  // article 表允許的欄位（Supabase 全小寫）
  const ARTICLE_FIELDS = [
    'title', 'content', 'category', 'ref', 'newdate',
    'url1', 'url2', 'url3',
    'file1', 'file1name', 'file1type',
    'file2', 'file2name', 'file2type',
    'file3', 'file3name', 'file3type'
  ]

  // 批次匯入筆記（相容 Appwrite CSV 與 Supabase CSV）
  const importArticles = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }

    try {
      loading.value = true

      const isAppwrite = isAppwriteFormat(rows)
      console.log('Import format - isAppwrite:', isAppwrite)

      const payload = rows.map((r) => {
        // Appwrite 用 newDate (camelCase)，Supabase 用 newdate (lowercase)
        let dateVal = r.newdate || r.newDate || r.$createdAt || null
        if (dateVal && dateVal.includes('T')) {
          dateVal = convertAppwriteDate(dateVal)
        }

        const row = {}
        ARTICLE_FIELDS.forEach(field => {
          if (field === 'newdate') {
            row.newdate = dateVal
          } else if (field === 'title' || field === 'content') {
            row[field] = r[field] || ''
          } else if (r[field] !== undefined && r[field] !== '') {
            row[field] = r[field]
          }
        })

        return row
      }).filter(r => r.title || r.content)

      if (payload.length === 0) return { success: false, error: '無有效資料' }

      const { data: existingRows, error: existingError } = await client.from('article').select('*')
      if (existingError) throw existingError

      const { unique, skipped } = filterDuplicateImports(payload, existingRows || articles.value, ARTICLE_FIELDS)
      if (unique.length === 0) {
        return {
          success: true,
          count: 0,
          skipped,
          isAppwrite: isAppwrite,
          message: buildImportMessage('匯入成功', skipped)
        }
      }

      console.log('Inserting', unique.length, 'articles')
      console.log('Sample payload:', payload[0])

      const { data, error: insertError } = await client.from('article').insert(unique).select()
      if (insertError) throw insertError

      articles.value.push(...data)
      articles.value.sort((a, b) => new Date(b.newdate) - new Date(a.newdate))

      return {
        success: true,
        count: data.length,
        skipped,
        isAppwrite: isAppwrite,
        message: buildImportMessage(isAppwrite ? '已轉換 Appwrite 格式並匯入' : '匯入成功', skipped)
      }
    } catch (e) {
      console.error('Import error:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }


  // 任何寫入成功後同步快取，下次切回此頁可立刻看到最新資料。
  const withCacheSync = (fn) => async (...args) => {
    const result = await fn(...args)
    if (!result || result.success !== false) rememberCachedTable('article', articles.value)
    return result
  }

  return {
    articles,
    loading,
    error,
    loadArticles,
    addArticle: withCacheSync(addArticle),
    updateArticle: withCacheSync(updateArticle),
    deleteArticle: withCacheSync(deleteArticle),
    restoreArticle: withCacheSync(restoreArticle),
    importArticles: withCacheSync(importArticles),
    isAppwriteFormat
  }
}
