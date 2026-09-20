import { computed, ref } from 'vue'
import { resolveSupabaseBucket } from './useSettings'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const ONE_GB_BYTES = 1024 * 1024 * 1024
const STORAGE_WARNING_BYTES = 900 * 1024 * 1024
const STORAGE_UPLOAD_LIMIT_BYTES = 999 * 1024 * 1024

const getBucketName = () => resolveSupabaseBucket()

const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[unitIndex]}`
}

const getObjectSize = (item) => {
  const size = item?.metadata?.size ?? item?.size ?? 0
  return Number.isFinite(Number(size)) ? Number(size) : 0
}

// 共用狀態：Storage 掃描成本高，所有呼叫者共用同一份結果與同一個進行中的請求。
const loading = ref(false)
const error = ref('')
const bucket = ref('')
const usedBytes = ref(0)
const fileCount = ref(0)
let scannedAt = 0
let scanInflight = null

// 同一個分頁上限內重複進入儀表板時，沒必要再整個桶掃一次。
const USAGE_CACHE_MS = 5 * 60 * 1000

export const useStorageUsage = () => {
  if (!bucket.value) bucket.value = getBucketName()

  const quotaBytes = ONE_GB_BYTES
  const usedLabel = computed(() => formatBytes(usedBytes.value))
  const quotaLabel = computed(() => formatBytes(quotaBytes))
  const usagePercent = computed(() => {
    if (!quotaBytes) return 0
    return Math.min(100, Number(((usedBytes.value / quotaBytes) * 100).toFixed(2)))
  })
  const displayLabel = computed(() => `${usedLabel.value} / ${quotaLabel.value}`)

  // 子資料夾改成平行展開：原本是一層一層串行等待，
  // 資料夾一多時間就是所有往返的總和。
  const listStorageUsageRecursive = async (client, bucketName, prefix = '') => {
    const { data, error: listError } = await client.storage.from(bucketName).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    })

    if (listError) throw listError

    let totalBytes = 0
    let totalFiles = 0
    const folderScans = []

    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      const isFolder = item.id === null

      if (isFolder) {
        folderScans.push(listStorageUsageRecursive(client, bucketName, path))
        continue
      }

      totalBytes += getObjectSize(item)
      totalFiles += 1
    }

    for (const nested of await Promise.all(folderScans)) {
      totalBytes += nested.bytes
      totalFiles += nested.files
    }

    return { bytes: totalBytes, files: totalFiles }
  }

  const getStorageUsageSnapshot = async (client, bucketName = getBucketName()) => {
    return await listStorageUsageRecursive(client, bucketName)
  }

  const refreshStorageUsage = async ({ force = false } = {}) => {
    const client = getSupabaseBrowserClient()
    const nextBucket = getBucketName()
    if (nextBucket !== bucket.value) {
      // 換桶就不能沿用舊數字。
      bucket.value = nextBucket
      scannedAt = 0
    }

    if (!client) {
      error.value = '尚未設定 Supabase 連線'
      return
    }

    // 進行中的掃描直接共用，別再發一輪請求。
    if (scanInflight) return scanInflight
    if (!force && scannedAt && Date.now() - scannedAt < USAGE_CACHE_MS) return

    const hasCache = scannedAt > 0

    scanInflight = (async () => {
      if (!hasCache) loading.value = true
      error.value = ''

      try {
        const usage = await listStorageUsageRecursive(client, bucket.value)
        usedBytes.value = usage.bytes
        fileCount.value = usage.files
        scannedAt = Date.now()
      } catch (err) {
        error.value = err?.message || '讀取 Storage 容量失敗'
        usedBytes.value = 0
        fileCount.value = 0
        scannedAt = 0
      } finally {
        loading.value = false
        scanInflight = null
      }
    })()

    return scanInflight
  }

  return {
    loading,
    error,
    bucket,
    usedBytes,
    usedLabel,
    quotaBytes,
    uploadLimitBytes: STORAGE_UPLOAD_LIMIT_BYTES,
    quotaLabel,
    displayLabel,
    usagePercent,
    fileCount,
    refreshStorageUsage,
    getStorageUsageSnapshot
  }
}

export {
  ONE_GB_BYTES,
  STORAGE_WARNING_BYTES,
  STORAGE_UPLOAD_LIMIT_BYTES,
  formatBytes
}
