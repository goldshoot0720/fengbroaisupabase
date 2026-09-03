import { ref } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'
import {
  displaySiteVisitStreak,
  nextSiteVisitStreak,
  SITE_VISIT_SESSION_KEY,
} from '../utils/siteVisitStreak'

const MENU_USAGE_TABLE = 'menuusage'
const SITE_VISIT_TABLE = 'sitevisit'
const SITE_VISIT_ROW_KEY = 'site-visit'

let currentCredentials = null

const missingTableMessage = (table) =>
  `尚未建立 public.${table} 資料表，請到鋒兄設定的資料表狀態手動建立 ${table}。`

const getErrorMessage = (err, table) => {
  const message = err?.message || String(err)
  // RLS／資料表不存在都會拋出類似錯誤，統一引導到設定頁初始化。
  if (/relation .* does not exist|permission denied|PGRST/i.test(message)) {
    return missingTableMessage(table)
  }
  return message
}

const initClient = () => {
  if (!process.client) return null
  const { credKey } = getSupabaseBrowserConfig()
  if (currentCredentials !== credKey) {
    currentCredentials = credKey
  }
  return getSupabaseBrowserClient()
}

const readSiteVisitRow = async (client) => {
  const { data, error } = await client
    .from(SITE_VISIT_TABLE)
    .select('*')
    .eq('rowkey', SITE_VISIT_ROW_KEY)
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}

export const useSiteStats = () => {
  const siteVisit = ref({
    count: 0,
    currentStreak: 0,
    lastVisitAt: null,
    lastVisitDate: null,
    exists: false,
  })
  const menuUsageItems = ref([])
  const menuUsageExists = ref(false)
  const loading = ref(false)
  const error = ref('')

  const loadSiteVisit = async () => {
    const client = initClient()
    if (!client) return
    try {
      const row = await readSiteVisitRow(client)
      const rowCount = Number(row?.count) || 0
      const rowStreak = Number(row?.currentstreak) || 0
      siteVisit.value = {
        count: rowCount,
        currentStreak: displaySiteVisitStreak({
          lastVisitDate: row?.lastvisitdate,
          lastVisitAt: row?.lastvisitat,
          currentStreak: rowStreak,
        }),
        lastVisitAt: row?.lastvisitat || null,
        lastVisitDate: row?.lastvisitdate || null,
        exists: Boolean(row),
      }
      error.value = ''
    } catch (err) {
      console.error('載入進站人次統計失敗:', err)
      siteVisit.value.exists = false
      error.value = getErrorMessage(err, SITE_VISIT_TABLE)
    }
  }

  const loadMenuUsage = async () => {
    const client = initClient()
    if (!client) return
    try {
      const { data, error: listError } = await client
        .from(MENU_USAGE_TABLE)
        .select('moduleid, count, updated_at')
        .order('count', { ascending: false })
        .limit(100)
      if (listError) throw listError
      menuUsageItems.value = (data || []).map((row) => ({
        moduleId: row.moduleid,
        count: Number(row.count) || 0,
        lastUsedAt: row.updated_at || null,
      }))
      menuUsageExists.value = true
      error.value = ''
    } catch (err) {
      menuUsageItems.value = []
      menuUsageExists.value = false
      error.value = getErrorMessage(err, MENU_USAGE_TABLE)
    }
  }

  /** About 頁用：並行載入進站人次與選單使用統計。 */
  const loadSiteStats = async () => {
    loading.value = true
    try {
      await Promise.all([loadSiteVisit(), loadMenuUsage()])
    } finally {
      loading.value = false
    }
  }

  /** 每次瀏覽器 session 呼叫一次：累加進站人次並推進連續天數。 */
  const recordSiteVisit = async () => {
    const client = initClient()
    if (!client) return
    if (typeof sessionStorage !== 'undefined') {
      try {
        if (sessionStorage.getItem(SITE_VISIT_SESSION_KEY)) return
        sessionStorage.setItem(SITE_VISIT_SESSION_KEY, '1')
      } catch {
        // sessionStorage 不可用時仍允許這次計數。
      }
    }
    try {
      const row = await readSiteVisitRow(client)
      const streak = nextSiteVisitStreak({
        lastVisitDate: row?.lastvisitdate,
        lastVisitAt: row?.lastvisitat,
        currentStreak: row?.currentstreak,
      })
      const payload = {
        count: (Number(row?.count) || 0) + 1,
        lastvisitat: new Date().toISOString(),
        currentstreak: streak.currentStreak,
        lastvisitdate: streak.today,
      }
      if (row?.id) {
        await client.from(SITE_VISIT_TABLE).update(payload).eq('id', row.id)
      } else {
        await client
          .from(SITE_VISIT_TABLE)
          .insert([{ rowkey: SITE_VISIT_ROW_KEY, ...payload }])
      }
      siteVisit.value = {
        count: payload.count,
        currentStreak: payload.currentStreak,
        lastVisitAt: payload.lastvisitat,
        lastVisitDate: payload.lastvisitdate,
        exists: true,
      }
    } catch (err) {
      console.error('記錄進站人次失敗:', getErrorMessage(err, SITE_VISIT_TABLE))
    }
  }

  /** 選單切換時呼叫（fire-and-forget）：累加該 moduleId 的使用次數。 */
  const recordMenuUsage = async (moduleId) => {
    if (!moduleId || typeof moduleId !== 'string') return
    const client = initClient()
    if (!client) return
    const key = moduleId.trim()
    if (!key) return
    try {
      const { data: existing, error: listError } = await client
        .from(MENU_USAGE_TABLE)
        .select('id, count')
        .eq('moduleid', key)
        .limit(1)
      if (listError) throw listError
      const row = existing?.[0]
      if (row?.id) {
        await client
          .from(MENU_USAGE_TABLE)
          .update({
            count: (Number(row.count) || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
      } else {
        await client
          .from(MENU_USAGE_TABLE)
          .insert([{ moduleid: key, count: 1 }])
      }
    } catch (err) {
      // 選單使用統計只是裝飾性資訊，失敗不影響導覽。
      console.error('記錄選單使用失敗:', getErrorMessage(err, MENU_USAGE_TABLE))
    }
  }

  return {
    siteVisit,
    menuUsageItems,
    menuUsageExists,
    siteStatsLoading: loading,
    siteStatsError: error,
    loadSiteVisit,
    loadMenuUsage,
    loadSiteStats,
    recordSiteVisit,
    recordMenuUsage,
  }
}
