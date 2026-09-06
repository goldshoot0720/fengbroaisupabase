import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'

// 鋒兄工具／手機比價歷史的雲端持久化：取代原本僅存在瀏覽器 localStorage
// 的做法，換裝置、換瀏覽器或清快取都不會遺失歷史走勢；也讓
// netlify/functions/landtop-history-cron.js 能在使用者沒開啟頁面時
// 持續每週補快照（追蹤清單＝曾經查過的關鍵字）。
//
// 資料表：public.landtop_history（keyword_key, keyword, brand_label,
// product_name, snapshot_date, series jsonb）。series 的形狀與
// FengToolsPage.vue 本機歷史一致：{ "<variant>__<source>": numericPrice|null }。

const TABLE = 'landtop_history'
const HISTORY_INTERVAL_DAYS = 7

let currentCredentials = null

const isTableMissingError = (err) => {
  const message = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`
  return (
    err?.code === 'PGRST205' ||
    err?.code === '42P01' ||
    /Could not find the table .*landtop_history/i.test(message) ||
    /relation .*landtop_history.* does not exist/i.test(message)
  )
}

const initClient = () => {
  if (!process.client) return null
  const { credKey } = getSupabaseBrowserConfig()
  if (currentCredentials !== credKey) currentCredentials = credKey
  return getSupabaseBrowserClient()
}

export const useLandtopHistory = () => {
  /** 讀取某個查詢關鍵字（normalizeLookupKey 後）的歷史快照，依日期升冪排列。 */
  const loadLandtopHistory = async (keywordKey) => {
    const client = initClient()
    if (!client || !keywordKey) return []

    try {
      const { data, error } = await client
        .from(TABLE)
        .select('snapshot_date, series')
        .eq('keyword_key', keywordKey)
        .order('snapshot_date', { ascending: true })
      if (error) throw error

      return (data || []).map((row) => ({
        date: row.snapshot_date,
        series: row.series || {}
      }))
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.error('載入手機比價歷史失敗:', err)
      }
      return []
    }
  }

  /**
   * 寫入一筆快照：7 天內的重複查詢會更新最新一筆，超過 7 天才新增一筆，
   * 邏輯與本機 updateHistoryEntries 一致，讓雲端與離線快取的走勢間距相同。
   */
  const recordLandtopSnapshot = async ({ keywordKey, keyword, brandLabel, productName, series }) => {
    const client = initClient()
    if (!client || !keywordKey) return

    try {
      const { data: existing, error: listError } = await client
        .from(TABLE)
        .select('id, snapshot_date')
        .eq('keyword_key', keywordKey)
        .order('snapshot_date', { ascending: false })
        .limit(1)
      if (listError) throw listError

      const last = existing?.[0]
      const now = new Date()
      const withinInterval = Boolean(
        last?.snapshot_date &&
        (now.getTime() - new Date(last.snapshot_date).getTime()) / (1000 * 60 * 60 * 24) < HISTORY_INTERVAL_DAYS
      )

      const payload = {
        keyword_key: keywordKey,
        keyword: keyword || keywordKey,
        brand_label: brandLabel || null,
        product_name: productName || null,
        snapshot_date: now.toISOString(),
        series: series || {},
        updated_at: now.toISOString()
      }

      if (withinInterval && last?.id) {
        const { error: updateError } = await client.from(TABLE).update(payload).eq('id', last.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await client.from(TABLE).insert([payload])
        if (insertError) throw insertError
      }
    } catch (err) {
      // 手機比價歷史只是輔助走勢圖，寫入失敗不阻斷查詢流程。
      if (!isTableMissingError(err)) {
        console.error('寫入手機比價歷史失敗:', err)
      }
    }
  }

  return {
    loadLandtopHistory,
    recordLandtopSnapshot
  }
}
