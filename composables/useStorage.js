import { ref } from 'vue'
import { resolveSupabaseBucket } from './useSettings'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { STORAGE_UPLOAD_LIMIT_BYTES, formatBytes, useStorageUsage } from './useStorageUsage'

const MULTIPART_VIDEO_THRESHOLD = 50 * 1024 * 1024
const MULTIPART_VIDEO_CHUNK_SIZE = 45 * 1024 * 1024
const MULTIPART_ARTICLE_THRESHOLD = 50 * 1024 * 1024
const MULTIPART_ARTICLE_CHUNK_SIZE = 25 * 1024 * 1024
const MULTIPART_MANIFEST_SUFFIX = '.manifest.json'
const MULTIPART_REFERENCE_PREFIX = 'supabase-multipart://'

// 取得 bucket：明確 bucket → 帳號名（goldshoot0720 等）→ env → 預設 uploads
const getBucket = () => resolveSupabaseBucket()

const multipartManifestCache = new Map()

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useStorage = () => {
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const { getStorageUsageSnapshot } = useStorageUsage()

  const sanitizeFileName = (name = '') => {
    return name
      .replace(/[^a-zA-Z0-9._\-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      || 'file'
  }

  const buildFilePath = (file, folder, customPath) => {
    if (customPath) return customPath
    return `${folder}/${Date.now()}_${sanitizeFileName(file.name)}`
  }

  const buildMultipartFilePath = (folder, file) => {
    const shortId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const ext = sanitizeFileName(file?.name || '').split('.').pop()
    return `${folder}/mp_${shortId}${ext && ext !== 'file' ? `.${ext}` : ''}`
  }

  const isNetworkUploadError = (error) => {
    const msg = String(error?.message || error || '')
    return /NetworkError|Failed to fetch|network|Load failed|fetch resource|ECONNRESET|ETIMEDOUT|timeout/i.test(msg)
  }

  const getMultipartUploadConfig = (file, folder) => {
    const isVideoFile = file?.type?.startsWith('video/') || folder === 'video' || String(folder || '').startsWith('temp/')
    const isArticleFile = folder === 'article'
    // Temp generated videos often fail as a single large PUT (SW / proxy / browser limits).
    const tempVideoThreshold = 8 * 1024 * 1024
    const threshold = String(folder || '').startsWith('temp/')
      ? tempVideoThreshold
      : MULTIPART_VIDEO_THRESHOLD

    if (isVideoFile && file.size > threshold) {
      return {
        type: 'multipart-video',
        chunkSize: String(folder || '').startsWith('temp/')
          ? 6 * 1024 * 1024
          : MULTIPART_VIDEO_CHUNK_SIZE
      }
    }

    if (isArticleFile && file.size > MULTIPART_ARTICLE_THRESHOLD) {
      return {
        type: 'multipart-file',
        chunkSize: MULTIPART_ARTICLE_CHUNK_SIZE
      }
    }

    return null
  }

  const sleepMs = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const uploadWithRetry = async (client, bucketName, filePath, file, uploadOptions, retries = 3) => {
    let lastError = null
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await client.storage
          .from(bucketName)
          .upload(filePath, file, {
            ...uploadOptions,
            // Retry may race with a partially completed previous attempt.
            upsert: attempt > 1 ? true : !!uploadOptions?.upsert
          })
        if (error) throw error
        return data
      } catch (error) {
        lastError = error
        if (!isNetworkUploadError(error) || attempt >= retries) break
        await sleepMs(400 * attempt)
      }
    }
    throw lastError
  }

  const getMultipartReference = (bucketName, filePath, meta = {}) => {
    const params = new URLSearchParams()
    if (meta.partCount) params.set('parts', String(meta.partCount))
    const query = params.toString()
    return `${MULTIPART_REFERENCE_PREFIX}${bucketName}/${filePath}${query ? `?${query}` : ''}`
  }

  const assertStorageUploadAllowed = async (client, bucketName, file) => {
    const usage = await getStorageUsageSnapshot(client, bucketName)
    const currentBytes = usage.bytes || 0
    const incomingBytes = Number(file?.size || 0)
    const nextBytes = currentBytes + incomingBytes

    if (nextBytes <= STORAGE_UPLOAD_LIMIT_BYTES) return

    const fileSizeText = formatBytes(incomingBytes)
    const currentText = formatBytes(currentBytes)
    const nextText = formatBytes(nextBytes)
    const limitText = formatBytes(STORAGE_UPLOAD_LIMIT_BYTES)
    throw new Error(
      `File Storage 已達 ${currentText}，本次檔案 ${fileSizeText} 上傳後會變成 ${nextText}，超過 ${limitText} 上傳上限。請先到系統設定的 Supabase Storage 管理區手動刪除檔案，直到容量低於 900MB 以下再上傳。`
    )
  }

  const isMultipartManifestUrl = (value = '') => {
    return typeof value === 'string' && (
      value.startsWith(MULTIPART_REFERENCE_PREFIX) ||
      value.includes(MULTIPART_MANIFEST_SUFFIX)
    )
  }

  const parseMultipartReference = (value = '') => {
    if (typeof value !== 'string') return null

    if (value.startsWith(MULTIPART_REFERENCE_PREFIX)) {
      const rawPath = value.slice(MULTIPART_REFERENCE_PREFIX.length)
      const [pathPart, queryString = ''] = rawPath.split('?')
      const slashIndex = pathPart.indexOf('/')
      if (slashIndex === -1) return null
      const params = new URLSearchParams(queryString)
      return {
        bucket: pathPart.slice(0, slashIndex),
        path: pathPart.slice(slashIndex + 1),
        partCount: Number(params.get('parts') || 0),
        originalType: params.get('type') || '',
        originalSize: Number(params.get('size') || 0),
        originalName: params.get('name') || ''
      }
    }

    try {
      const url = new URL(value)
      const marker = '/storage/v1/object/public/'
      const markerIndex = url.pathname.indexOf(marker)
      if (markerIndex === -1) return null
      const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
      const slashIndex = objectPath.indexOf('/')
      if (slashIndex === -1) return null
      return {
        bucket: objectPath.slice(0, slashIndex),
        path: objectPath.slice(slashIndex + 1)
      }
    } catch {
      return null
    }
  }

  const downloadStorageObject = async (bucketName, objectPath) => {
    const client = initSupabase()
    if (!client) throw new Error('No Supabase client')
    const { data, error } = await client.storage
      .from(bucketName)
      .download(objectPath)
    if (error) throw error
    return data
  }

  const fetchMultipartManifest = async (manifestReference) => {
    if (!multipartManifestCache.has(manifestReference)) {
      multipartManifestCache.set(manifestReference, (async () => {
        const parsed = parseMultipartReference(manifestReference)
        let manifest

        if (parsed?.path?.endsWith(MULTIPART_MANIFEST_SUFFIX)) {
          const manifestBlob = await downloadStorageObject(parsed.bucket, parsed.path)
          manifest = JSON.parse(await manifestBlob.text())
        } else if (parsed) {
          const parts = []
          const totalParts = parsed.partCount || 0
          for (let index = 0; index < totalParts; index++) {
            parts.push({
              index: index + 1,
              path: `${parsed.path}.part${String(index + 1).padStart(3, '0')}`
            })
          }
          manifest = {
            type: 'multipart-video',
            version: 2,
            bucket: parsed.bucket,
            originalName: parsed.originalName,
            originalType: parsed.originalType || 'application/octet-stream',
            originalSize: parsed.originalSize || 0,
            chunkSize: parsed.partCount > 0
              ? Math.ceil((parsed.originalSize || 0) / parsed.partCount)
              : MULTIPART_VIDEO_CHUNK_SIZE,
            partCount: totalParts,
            parts
          }
        } else {
          const response = await fetch(manifestReference)
          if (!response.ok) {
            throw new Error(`無法讀取影片 manifest (HTTP ${response.status})`)
          }
          manifest = await response.json()
        }

        if (manifest?.type !== 'multipart-video' || !Array.isArray(manifest.parts)) {
          throw new Error('影片 manifest 格式不正確')
        }
        return manifest
      })().catch((error) => {
        multipartManifestCache.delete(manifestReference)
        throw error
      }))
    }
    return multipartManifestCache.get(manifestReference)
  }

  const resolveMultipartFile = async (fileUrl, onProgress = null) => {
    if (!isMultipartManifestUrl(fileUrl)) {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`無法讀取檔案 (HTTP ${response.status})`)
      }
      const blob = await response.blob()
      if (typeof onProgress === 'function') onProgress(100)
      return { blob, manifest: null }
    }

    const manifest = await fetchMultipartManifest(fileUrl)
    const chunks = []
    let loadedBytes = 0

    for (const part of manifest.parts) {
      const chunkBlob = part.path
        ? await downloadStorageObject(manifest.bucket || getBucket(), part.path)
        : await (async () => {
            const response = await fetch(part.publicUrl)
            if (!response.ok) {
              throw new Error(`無法讀取影片分段 ${part.index} (HTTP ${response.status})`)
            }
            return await response.blob()
          })()
      chunks.push(chunkBlob)
      loadedBytes += part.size || chunkBlob.size
      if (typeof onProgress === 'function' && manifest.originalSize) {
        onProgress(Math.min(100, Math.round((loadedBytes / manifest.originalSize) * 100)))
      }
    }

    return {
      blob: new Blob(chunks, { type: manifest.originalType || 'application/octet-stream' }),
      manifest
    }
  }

  const resolveMultipartPreviewFile = async (fileUrl) => {
    if (!isMultipartManifestUrl(fileUrl)) {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`無法讀取檔案 (HTTP ${response.status})`)
      }
      return {
        blob: await response.blob(),
        manifest: null
      }
    }

    const manifest = await fetchMultipartManifest(fileUrl)
    const firstPart = manifest.parts?.[0]
    if (!firstPart) {
      throw new Error('影片分段資料不完整')
    }

    const blob = firstPart.path
      ? await downloadStorageObject(manifest.bucket || getBucket(), firstPart.path)
      : await (async () => {
          const response = await fetch(firstPart.publicUrl)
          if (!response.ok) {
            throw new Error(`無法讀取影片第一段 (HTTP ${response.status})`)
          }
          return await response.blob()
        })()

    return { blob, manifest }
  }

  const uploadMultipartVideo = async (client, bucketName, file, filePath, options = {}) => {
    const chunkSize = options.chunkSize || MULTIPART_VIDEO_CHUNK_SIZE
    const fallbackType = options.fallbackType || 'application/octet-stream'
    const totalParts = Math.ceil(file.size / chunkSize)
    const parts = []

    for (let index = 0; index < totalParts; index++) {
      const start = index * chunkSize
      const end = Math.min(file.size, start + chunkSize)
      const chunk = file.slice(start, end)
      const partPath = `${filePath}.part${String(index + 1).padStart(3, '0')}`

      await uploadWithRetry(
        client,
        bucketName,
        partPath,
        chunk,
        {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/octet-stream'
        },
        3
      )

      const { data: partUrlData } = client.storage
        .from(bucketName)
        .getPublicUrl(partPath)

      parts.push({
        index: index + 1,
        path: partPath,
        size: chunk.size,
        publicUrl: partUrlData.publicUrl
      })

      uploadProgress.value = Math.min(95, Math.round(((index + 1) / totalParts) * 95))
    }

    uploadProgress.value = 100

    return {
      success: true,
      url: getMultipartReference(bucketName, filePath, {
        partCount: totalParts,
        originalType: file.type || fallbackType,
        originalSize: file.size,
        originalName: file.name
      }),
      path: filePath,
      multipart: true,
      previewUrl: URL.createObjectURL(file),
      manifest: {
        type: 'multipart-video',
        version: 2,
        bucket: bucketName,
        originalName: file.name,
        originalType: file.type || fallbackType,
        originalSize: file.size,
        chunkSize,
        partCount: totalParts,
        parts,
        uploadedAt: new Date().toISOString()
      }
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param {File} file - The file to upload
   * @param {string} folder - Folder name inside bucket (e.g. 'food', 'article')
   * @param {string} customPath - Optional full custom path (overrides folder + auto name)
   * @param {{ skipUsageCheck?: boolean, retries?: number }} [options]
   * @returns {Promise<{success: boolean, url?: string, path?: string, error?: string}>}
   */
  const uploadFile = async (file, folder = 'general', customPath = null, options = {}) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No Supabase client' }

    try {
      uploading.value = true
      uploadProgress.value = 0

      // Generate unique file path: folder/timestamp_filename
      const bucketName = getBucket()
      console.log('[useStorage] bucket =', bucketName)
      const probe = await client.storage.from(bucketName).list('')
      if (probe.error) {
        throw new Error(`Bucket "${bucketName}" not found`)
      }

      if (!options.skipUsageCheck) {
        try {
          await assertStorageUploadAllowed(client, bucketName, file)
        } catch (usageError) {
          // Hard fail only on real quota messages; network blips during usage scan should not block upload.
          if (String(usageError?.message || '').includes('上傳上限')) throw usageError
          console.warn('[useStorage] usage check skipped:', usageError)
        }
      }

      const multipartConfig = getMultipartUploadConfig(file, folder)
      const filePath = multipartConfig
        ? (customPath || buildMultipartFilePath(folder, file))
        : buildFilePath(file, folder, customPath)
      if (multipartConfig) {
        return await uploadMultipartVideo(client, bucketName, file, filePath, {
          chunkSize: multipartConfig.chunkSize,
          fallbackType: folder === 'article'
            ? 'application/octet-stream'
            : (file.type || 'video/webm')
        })
      }

      const contentType = file.type || 'application/octet-stream'
      await uploadWithRetry(
        client,
        bucketName,
        filePath,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType
        },
        options.retries ?? 3
      )

      // Get public URL
      const { data: urlData } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      uploadProgress.value = 100

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      }
    } catch (e) {
      const bucketName = getBucket()
      let msg = e?.message || String(e)
      if (msg.includes('Bucket')) {
        msg = `Bucket "${bucketName}" not found。本專案 bucket 通常等於帳號名（如 goldshoot0720）。請到設定頁確認帳號名／SUPABASE_BUCKET，並在 Supabase Storage 建立同名 public bucket；或設定 Netlify 的 SUPABASE_BUCKET / NUXT_PUBLIC_SUPABASE_BUCKET 後重新部署。`
      } else if (isNetworkUploadError(e)) {
        msg = `網路上傳失敗（${msg}）。若為 PWA，請重新整理以更新 Service Worker；影片仍可本機下載。`
      }
      console.error('Upload error:', e)
      return { success: false, error: msg }
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} path - File path in bucket (e.g. 'food/123_photo.jpg')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deleteFile = async (path) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No Supabase client' }

    try {
      const { error } = await client.storage
        .from(getBucket())
        .remove([path])

      if (error) throw error

      return { success: true }
    } catch (e) {
      console.error('Delete error:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Get public URL for a file
   * @param {string} path - File path in bucket
   * @returns {string|null}
   */
  const getPublicUrl = (path) => {
    const client = initSupabase()
    if (!client) return null

    const { data } = client.storage
      .from(getBucket())
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * List files in a bucket folder
   * @param {string} folder - Folder path to list (defaults to root)
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  const listFiles = async (folder = '') => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No Supabase client' }

    try {
      const { data, error } = await client.storage
        .from(getBucket())
        .list(folder)

      if (error) throw error

      return { success: true, files: data }
    } catch (e) {
      console.error('List files error:', e)
      return { success: false, error: e.message }
    }
  }

  return {
    getBucket,
    uploading,
    uploadProgress,
    uploadFile,
    isMultipartManifestUrl,
    resolveMultipartFile,
    resolveMultipartPreviewFile,
    deleteFile,
    getPublicUrl,
    listFiles
  }
}
