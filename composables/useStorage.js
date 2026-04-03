import { ref } from 'vue'
import { getSupabaseBucket } from './useSettings'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const MULTIPART_VIDEO_THRESHOLD = 50 * 1024 * 1024
const MULTIPART_VIDEO_CHUNK_SIZE = 45 * 1024 * 1024
const MULTIPART_ARTICLE_THRESHOLD = 50 * 1024 * 1024
const MULTIPART_ARTICLE_CHUNK_SIZE = 25 * 1024 * 1024
const MULTIPART_MANIFEST_SUFFIX = '.manifest.json'
const MULTIPART_REFERENCE_PREFIX = 'supabase-multipart://'

// 取得 bucket 名稱：localStorage 帳號 → .env → 預設 'uploads'
const getBucket = () => {
  const fromSettings = getSupabaseBucket()
  if (fromSettings) return fromSettings
  try {
    const config = useRuntimeConfig()
    return config.public.supabaseBucket || 'uploads'
  } catch {
    return 'uploads'
  }
}

const multipartManifestCache = new Map()

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useStorage = () => {
  const uploading = ref(false)
  const uploadProgress = ref(0)

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

  const getMultipartUploadConfig = (file, folder) => {
    const isVideoFile = file?.type?.startsWith('video/') || folder === 'video'
    const isArticleFile = folder === 'article'

    if (isVideoFile && file.size > MULTIPART_VIDEO_THRESHOLD) {
      return {
        type: 'multipart-video',
        chunkSize: MULTIPART_VIDEO_CHUNK_SIZE
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

  const getMultipartReference = (bucketName, filePath, meta = {}) => {
    const params = new URLSearchParams()
    if (meta.partCount) params.set('parts', String(meta.partCount))
    const query = params.toString()
    return `${MULTIPART_REFERENCE_PREFIX}${bucketName}/${filePath}${query ? `?${query}` : ''}`
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

      const { error } = await client.storage
        .from(bucketName)
        .upload(partPath, chunk, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/octet-stream'
        })

      if (error) throw error

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
   * @returns {Promise<{success: boolean, url?: string, path?: string, error?: string}>}
   */
  const uploadFile = async (file, folder = 'general', customPath = null) => {
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

      const multipartConfig = getMultipartUploadConfig(file, folder)
      const filePath = multipartConfig
        ? (customPath || buildMultipartFilePath(folder, file))
        : buildFilePath(file, folder, customPath)
      if (multipartConfig) {
        return await uploadMultipartVideo(client, bucketName, file, filePath, {
          chunkSize: multipartConfig.chunkSize,
          fallbackType: folder === 'article' ? 'application/octet-stream' : 'video/mp4'
        })
      }

      // Upload file
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

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
      const msg = e?.message?.includes('Bucket')
        ? `Bucket "${bucketName}" not found。請在 Supabase 建立此 bucket，或到設定頁設定正確的 SUPABASE_BUCKET。`
        : e.message
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
