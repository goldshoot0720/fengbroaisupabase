// composables/useVideos.js
// 影片管理邏輯（使用 Supabase Storage）
import { ref } from 'vue'

// Supabase Storage bucket 名稱
const STORAGE_BUCKET = 'videos'

export const useVideos = () => {
  // 影片列表
  const videoList = ref([
    {
      storageKey: '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
      displayName: '鋒兄的傳奇人生',
      fileSize: 149202463,
      uploadedAt: '2025-12-16',
      cached: false,
      loading: false,
      loaded: false,
      error: false,
      errorType: null,
      errorDetails: null,
      caching: false,
      poster: null,
      exists: false,
      loadProgress: 0,
      statusInfo: null
    },
    {
      storageKey: 'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4',
      displayName: '鋒兄進化Show🔥',
      fileSize: 46317671,
      uploadedAt: '2025-12-16',
      cached: false,
      loading: false,
      loaded: false,
      error: false,
      errorType: null,
      errorDetails: null,
      caching: false,
      poster: null,
      exists: false,
      loadProgress: 0,
      statusInfo: null
    },
    {
      storageKey: '鋒兄進化 Show🔥影片保留十五年.mp4',
      displayName: '鋒兄進化 Show🔥影片保留十五年',
      fileSize: 26896384,
      uploadedAt: '2026-01-30',
      cached: false,
      loading: false,
      loaded: false,
      error: false,
      errorType: null,
      errorDetails: null,
      caching: false,
      poster: null,
      exists: false,
      loadProgress: 0,
      statusInfo: null
    }
  ])

  // 快取狀態
  const cachedVideos = ref([])
  const totalCacheSize = ref(0)
  const isPreloading = ref(false)
  const cacheMessage = ref('')
  const cacheMessageType = ref('info')

  // 取得 Supabase Storage 公開 URL
  const getStorageUrl = (storageKey) => {
    const supabaseUrl = useRuntimeConfig().public.supabaseUrl
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${encodeURIComponent(storageKey)}`
  }

  // 取得影片 URL（優先使用本地快取）
  const getVideoUrl = (storageKey) => {
    const cached = cachedVideos.value.find(v => v.storageKey === storageKey)
    if (cached && cached.cachedUrl) {
      return cached.cachedUrl
    }
    return getStorageUrl(storageKey)
  }

  // 影片載入開始
  const onVideoLoadStart = (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (video) {
      video.loading = true
      video.error = false
    }
  }

  // 影片載入完成
  const onVideoLoaded = (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (video) {
      video.loading = false
      video.error = false
    }
  }

  // 影片載入錯誤
  const onVideoError = (storageKey, event) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (video) {
      video.loading = false
      video.error = true
      video.loadProgress = 0

      const target = event.target
      const networkState = target?.networkState
      const error = target?.error

      if (networkState === 3) {
        video.errorType = 'no_source'
        video.errorDetails = 'Supabase Storage 中找不到此影片檔案'
      } else if (error?.code === 4) {
        video.errorType = 'unsupported'
        video.errorDetails = '影片格式不支援或檔案損壞'
      } else if (error?.code === 2) {
        video.errorType = 'network'
        video.errorDetails = '網路連線問題，無法載入影片'
      } else if (error?.code === 3) {
        video.errorType = 'decode'
        video.errorDetails = '影片解碼失敗，檔案可能損壞'
      } else {
        video.errorType = 'unknown'
        video.errorDetails = '未知錯誤，請檢查影片狀態'
      }
    }
    console.error(`影片載入失敗 (${storageKey}):`, event)
  }

  // 延遲載入影片
  const loadVideo = async (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (!video || video.loaded || video.loading) return

    video.loading = true
    video.error = false
    video.errorType = null
    video.errorDetails = null
    video.loadProgress = 0

    try {
      const url = getStorageUrl(storageKey)
      const headResponse = await fetch(url, { method: 'HEAD' })

      if (!headResponse.ok) {
        throw new Error(`Supabase Storage 中找不到影片檔案 (HTTP ${headResponse.status})`)
      }

      video.exists = true
      video.loaded = true
      video.loading = false
      video.loadProgress = 100

      setStatusInfo(storageKey, 'success', '影片載入成功', '已從 Supabase Storage 載入')
    } catch (error) {
      video.loading = false
      video.error = true
      video.errorType = 'network'
      video.errorDetails = error.message
      video.exists = false

      setStatusInfo(storageKey, 'error', '影片載入失敗', error.message)
      console.error(`載入影片失敗 (${storageKey}):`, error)
    }
  }

  // 重試載入影片
  const retryVideo = async (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (video) {
      video.error = false
      video.errorType = null
      video.errorDetails = null
      video.loadProgress = 0

      if (!video.loaded) {
        await loadVideo(storageKey)
      } else {
        video.loading = true
        setTimeout(() => {
          const videoEl = document.querySelector(`[ref="video-${storageKey}"]`)
          if (videoEl) {
            videoEl.load()
          }
        }, 100)
      }
    }
  }

  // 快取單個影片
  const cacheVideo = async (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (!video || video.cached || video.caching) return

    video.caching = true

    try {
      const url = getStorageUrl(storageKey)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const blob = await response.blob()
      const cachedUrl = URL.createObjectURL(blob)

      video.cached = true
      video.caching = false
      video.fileSize = blob.size

      cachedVideos.value.push({
        storageKey,
        cachedUrl,
        size: blob.size,
        cachedAt: new Date()
      })

      totalCacheSize.value += blob.size

      const videoEl = document.querySelector(`[ref="video-${storageKey}"]`)
      if (videoEl) {
        videoEl.src = cachedUrl
      }

      showCacheMessage(`影片 "${video.displayName}" 快取成功！`, 'success')
    } catch (error) {
      video.caching = false
      console.error(`快取影片失敗 (${storageKey}):`, error)
      showCacheMessage(`快取影片失敗: ${error.message}`, 'error')
    }
  }

  // 清除單個影片快取
  const clearVideoCache = (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (!video || !video.cached) return

    const cached = cachedVideos.value.find(v => v.storageKey === storageKey)
    if (cached && cached.cachedUrl) {
      URL.revokeObjectURL(cached.cachedUrl)
      totalCacheSize.value -= cached.size
    }

    cachedVideos.value = cachedVideos.value.filter(v => v.storageKey !== storageKey)
    video.cached = false

    const videoEl = document.querySelector(`[ref="video-${storageKey}"]`)
    if (videoEl) {
      videoEl.src = getStorageUrl(storageKey)
    }

    showCacheMessage(`影片 "${video.displayName}" 快取已清除`, 'info')
  }

  // 預載所有影片
  const preloadAllVideos = async () => {
    isPreloading.value = true
    showCacheMessage('正在預載所有影片...', 'info')

    try {
      const uncachedVideos = videoList.value.filter(v => !v.cached)

      for (const video of uncachedVideos) {
        await cacheVideo(video.storageKey)
      }

      showCacheMessage('所有影片預載完成！', 'success')
    } catch (error) {
      showCacheMessage('部分影片預載失敗', 'error')
    } finally {
      isPreloading.value = false
    }
  }

  // 清除所有快取
  const clearAllCache = () => {
    if (!confirm('確定要清除所有影片快取嗎？')) return

    cachedVideos.value.forEach(cached => {
      if (cached.cachedUrl) {
        URL.revokeObjectURL(cached.cachedUrl)
      }
    })

    videoList.value.forEach(video => {
      video.cached = false

      const videoEl = document.querySelector(`[ref="video-${video.storageKey}"]`)
      if (videoEl) {
        videoEl.src = getStorageUrl(video.storageKey)
      }
    })

    cachedVideos.value = []
    totalCacheSize.value = 0

    showCacheMessage('所有快取已清除', 'info')
  }

  // 檢查快取狀態
  const checkCacheStatus = () => {
    totalCacheSize.value = cachedVideos.value.reduce((total, video) => total + (video.size || 0), 0)

    videoList.value.forEach(video => {
      video.cached = cachedVideos.value.some(cached => cached.storageKey === video.storageKey)
    })

    showCacheMessage('快取狀態已更新', 'info')
  }

  // 檢查 Supabase Storage 狀態
  const checkStorageStatus = async () => {
    showCacheMessage('正在檢查 Supabase Storage 狀態...', 'info')

    try {
      let existingCount = 0

      for (const video of videoList.value) {
        try {
          const url = getStorageUrl(video.storageKey)
          const response = await fetch(url, { method: 'HEAD' })
          video.exists = response.ok

          if (response.ok) {
            existingCount++
            video.error = false
          } else {
            video.error = true
          }
        } catch (error) {
          video.exists = false
          video.error = true
        }
      }

      const total = videoList.value.length

      if (existingCount === total) {
        showCacheMessage(`所有影片 (${existingCount}/${total}) 都已存在於 Supabase Storage`, 'success')
      } else if (existingCount > 0) {
        showCacheMessage(`部分影片 (${existingCount}/${total}) 存在於 Supabase Storage`, 'info')
      } else {
        showCacheMessage('沒有影片存在於 Supabase Storage，請先上傳', 'error')
      }
    } catch (error) {
      console.error('檢查 Supabase Storage 狀態失敗:', error)
      showCacheMessage(`檢查失敗: ${error.message}`, 'error')
    }
  }

  // 下載影片
  const downloadVideo = async (storageKey, displayName) => {
    try {
      const url = getStorageUrl(storageKey)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${displayName}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(downloadUrl)

      showCacheMessage(`影片 "${displayName}" 下載成功！`, 'success')
    } catch (error) {
      console.error('下載影片失敗:', error)
      showCacheMessage(`下載失敗: ${error.message}`, 'error')
    }
  }

  // 檢查單個影片狀態
  const checkSingleStatus = async (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (!video) return

    setStatusInfo(storageKey, 'info', '正在檢查影片狀態...', '')

    try {
      const url = getStorageUrl(storageKey)
      const response = await fetch(url, { method: 'HEAD' })

      if (response.ok) {
        video.exists = true
        video.error = false
        setStatusInfo(storageKey, 'success', '檢查完成', '影片存在於 Supabase Storage')
      } else {
        video.exists = false
        setStatusInfo(storageKey, 'error', '影片不存在', `HTTP ${response.status} - 請先上傳影片到 Supabase Storage`)
      }
    } catch (error) {
      video.exists = false
      setStatusInfo(storageKey, 'error', '檢查失敗', `無法連接: ${error.message}`)
    }
  }

  // 顯示上傳說明
  const showUploadInstructions = (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (!video) return

    const instructions = `
上傳 "${video.displayName}" 到 Supabase Storage:

1. 前往 Supabase Dashboard → Storage → ${STORAGE_BUCKET}
2. 上傳檔案 "${storageKey}"
3. 確認 bucket 為 public 存取
4. 上傳完成後點擊 "🔍 檢查狀態"
    `.trim()

    setStatusInfo(storageKey, 'info', '上傳說明', instructions)
  }

  // 設置狀態提示
  const setStatusInfo = (storageKey, type, message, details) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (video) {
      video.statusInfo = { type, message, details, timestamp: Date.now() }
    }
  }

  // 清除狀態提示
  const clearStatusInfo = (storageKey) => {
    const video = videoList.value.find(v => v.storageKey === storageKey)
    if (video) {
      video.statusInfo = null
    }
  }

  // 取得錯誤訊息
  const getErrorMessage = (errorType) => {
    const messages = {
      'no_source': '影片檔案不存在於 Supabase Storage',
      'unsupported': '影片格式不支援或檔案損壞',
      'network': '網路連線問題，無法載入影片',
      'decode': '影片解碼失敗，檔案可能損壞',
      'unknown': '未知錯誤，請檢查影片狀態'
    }
    return messages[errorType] || messages.unknown
  }

  // 顯示快取訊息
  const showCacheMessage = (message, type = 'info') => {
    cacheMessage.value = message
    cacheMessageType.value = type

    setTimeout(() => {
      cacheMessage.value = ''
    }, 3000)
  }

  return {
    videoList,
    cachedVideos,
    totalCacheSize,
    isPreloading,
    cacheMessage,
    cacheMessageType,
    getVideoUrl,
    onVideoLoadStart,
    onVideoLoaded,
    onVideoError,
    retryVideo,
    cacheVideo,
    clearVideoCache,
    preloadAllVideos,
    clearAllCache,
    checkCacheStatus,
    checkStorageStatus,
    downloadVideo,
    showCacheMessage,
    loadVideo,
    checkSingleStatus,
    showUploadInstructions,
    clearStatusInfo,
    getErrorMessage
  }
}
