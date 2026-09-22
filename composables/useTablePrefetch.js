// composables/useTablePrefetch.js
// 開站後瀏覽器空閒時，背景預先把各選單資料表抓進快取（記憶體 + IndexedDB）。
// 之後點任何選單都是「秒開」，再由頁面自己的 load 做背景更新。
import { useArticles } from './useArticles'
import { useBanks } from './useBanks'
import { useCommonAccounts } from './useCommonAccounts'
import { useDocuments } from './useDocuments'
import { useImages } from './useImages'
import { useMusicRecords } from './useMusicRecords'
import { usePodcasts } from './usePodcasts'
import { useRoutines } from './useRoutines'
import { useVideoRecords } from './useVideoRecords'
import { useQuotas } from './useQuotas'
import { useTrialPurchases } from './useTrialPurchases'
import { useShoppingList } from './useShoppingList'
import { useReinstalls } from './useReinstalls'
import { mapWithConcurrency } from '../utils/asyncPool.js'

let prefetchScheduled = false

const shouldSkipPrefetch = () => {
  if (typeof navigator === 'undefined') return true
  if (navigator.onLine === false) return true
  // 使用者開了「省流量」就不要背景預抓。
  if (navigator.connection?.saveData) return true
  return false
}

export const prefetchAllTables = async () => {
  if (shouldSkipPrefetch()) return
  const loaders = [
    () => useArticles().loadArticles(),
    () => useBanks().loadBanks(),
    () => useCommonAccounts().loadAccounts(),
    () => useRoutines().loadRoutines(),
    () => useQuotas().loadQuotas(),
    () => useTrialPurchases().loadTrialPurchases(),
    () => useShoppingList().loadShoppingItems(),
    () => useReinstalls().loadReinstalls(),
    () => useDocuments().loadDocuments(),
    () => useImages().loadImages(),
    () => useMusicRecords().loadMusics(),
    () => usePodcasts().loadPodcasts(),
    () => useVideoRecords().loadVideos()
  ]
  // 最多同時 3 個請求，不和使用者當下的操作搶頻寬。
  await mapWithConcurrency(loaders, async (load) => {
    try { await load() } catch {}
  }, 3)
}

export const scheduleTablePrefetch = (delayMs = 1500) => {
  if (prefetchScheduled || typeof window === 'undefined') return
  prefetchScheduled = true
  const run = () => { prefetchAllTables() }
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 })
    } else {
      run()
    }
  }, delayMs)
}
