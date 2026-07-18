import { computed, ref } from 'vue'
import { resolveSupabaseBucket } from './useSettings'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const ONE_GB_BYTES = 1024 * 1024 * 1024
const STORAGE_UPLOAD_LIMIT_BYTES = 900 * 1024 * 1024

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

export const useStorageUsage = () => {
  const loading = ref(false)
  const error = ref('')
  const bucket = ref(getBucketName())
  const usedBytes = ref(0)
  const fileCount = ref(0)

  const quotaBytes = ONE_GB_BYTES
  const usedLabel = computed(() => formatBytes(usedBytes.value))
  const quotaLabel = computed(() => formatBytes(quotaBytes))
  const usagePercent = computed(() => {
    if (!quotaBytes) return 0
    return Math.min(100, Number(((usedBytes.value / quotaBytes) * 100).toFixed(2)))
  })
  const displayLabel = computed(() => `${usedLabel.value} / ${quotaLabel.value}`)

  const listStorageUsageRecursive = async (client, bucketName, prefix = '') => {
    const { data, error: listError } = await client.storage.from(bucketName).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    })

    if (listError) throw listError

    let totalBytes = 0
    let totalFiles = 0

    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      const isFolder = item.id === null

      if (isFolder) {
        const nested = await listStorageUsageRecursive(client, bucketName, path)
        totalBytes += nested.bytes
        totalFiles += nested.files
        continue
      }

      totalBytes += getObjectSize(item)
      totalFiles += 1
    }

    return { bytes: totalBytes, files: totalFiles }
  }

  const getStorageUsageSnapshot = async (client, bucketName = getBucketName()) => {
    return await listStorageUsageRecursive(client, bucketName)
  }

  const refreshStorageUsage = async () => {
    const client = getSupabaseBrowserClient()
    bucket.value = getBucketName()

    if (!client) {
      error.value = '尚未設定 Supabase 連線'
      return
    }

    loading.value = true
    error.value = ''

    try {
      const usage = await listStorageUsageRecursive(client, bucket.value)
      usedBytes.value = usage.bytes
      fileCount.value = usage.files
    } catch (err) {
      error.value = err?.message || '讀取 Storage 容量失敗'
      usedBytes.value = 0
      fileCount.value = 0
    } finally {
      loading.value = false
    }
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
  STORAGE_UPLOAD_LIMIT_BYTES,
  formatBytes
}
