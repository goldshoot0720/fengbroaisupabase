// Shared helpers for ZIP export/import with media files.

export const sanitizeZipFileName = (name = 'file') => {
  return String(name || 'file')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80) || 'file'
}

export const isRemoteMediaUrl = (value) => {
  if (!value || typeof value !== 'string') return false
  return /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')
}

export const isMultipartMediaRef = (value) => {
  return typeof value === 'string' && value.startsWith('supabase-multipart://')
}

export const resolveMediaFetchUrl = (value, getPublicUrl) => {
  if (!value) return ''
  if (isRemoteMediaUrl(value) || isMultipartMediaRef(value)) return value
  if (typeof getPublicUrl === 'function') {
    try {
      return getPublicUrl(value) || value
    } catch {
      return value
    }
  }
  return value
}

export const guessExtension = (urlOrPath = '', mime = '', fallback = 'bin') => {
  const fromPath = String(urlOrPath).split('?')[0].split('#')[0].split('.').pop()
  if (fromPath && /^[a-z0-9]{1,8}$/i.test(fromPath) && fromPath.length <= 8) {
    return fromPath.toLowerCase()
  }

  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf'
  }
  if (mime && mimeMap[mime]) return mimeMap[mime]
  return fallback
}

export const downloadBlobFromUrl = async (url, timeoutMs = 60000) => {
  if (!url) throw new Error('缺少媒體網址')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.blob()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Pack media fields into a zip and rewrite record paths to local zip paths.
 *
 * mediaMap example:
 * {
 *   file: { folder: 'images', fallbackExt: 'jpg' },
 *   cover: { folder: 'covers', fallbackExt: 'jpg' }
 * }
 */
export const packRecordsMediaIntoZip = async ({
  zip,
  records,
  mediaMap = {},
  resolveUrl,
  fetchBlob,
  onProgress
}) => {
  const folders = {}
  const stats = { ok: 0, fail: 0, skipped: 0 }
  const output = []
  const list = Array.isArray(records) ? records : []
  const fields = Object.keys(mediaMap)

  for (let i = 0; i < list.length; i++) {
    const source = list[i] || {}
    const row = { ...source }

    for (const field of fields) {
      const config = mediaMap[field] || {}
      const folderName = config.folder || 'media'
      const raw = row[field]
      if (!raw || typeof raw !== 'string') {
        stats.skipped += 1
        continue
      }

      // Already a local zip-style path — keep as-is if present in zip later on import.
      if (!isRemoteMediaUrl(raw) && !isMultipartMediaRef(raw) && raw.includes('/') && !raw.startsWith('storage/')) {
        // Could still be a storage relative path. Try download via resolveUrl.
      }

      try {
        const resolved = typeof resolveUrl === 'function' ? resolveUrl(raw) : raw
        let blob
        if (typeof fetchBlob === 'function') {
          blob = await fetchBlob({ raw, resolved, field, record: source, index: i })
        } else {
          blob = await downloadBlobFromUrl(resolved)
        }

        if (!folders[folderName]) folders[folderName] = zip.folder(folderName)
        const base = sanitizeZipFileName(source.name || source.title || `item_${i}`)
        const ext = guessExtension(resolved || raw, blob.type, config.fallbackExt || 'bin')
        const zipFileName = `${i}_${field}_${base}.${ext}`
        folders[folderName].file(zipFileName, blob)
        row[field] = `${folderName}/${zipFileName}`
        stats.ok += 1
      } catch (error) {
        console.warn(`[zipMediaBundle] 打包失敗 #${i} ${field}:`, error)
        stats.fail += 1
        // Keep original value so metadata export still has a reference.
      }
    }

    // Strip volatile ids for cleaner re-import (optional caller can keep them).
    output.push(row)

    if (typeof onProgress === 'function') {
      onProgress({
        current: i + 1,
        total: list.length,
        percent: list.length ? Math.round(((i + 1) / list.length) * 100) : 100,
        stats: { ...stats }
      })
    }
  }

  return { records: output, stats }
}

/**
 * Re-upload local zip media paths found in records.
 *
 * mediaMap example:
 * {
 *   file: { prefixes: ['images/', 'media/'], storageFolder: 'gallery', mimeFallback: 'image/jpeg' },
 *   cover: { prefixes: ['covers/'], storageFolder: 'gallery-covers', mimeFallback: 'image/jpeg' }
 * }
 */
export const reuploadLocalMediaFromZip = async ({
  zip,
  records,
  mediaMap = {},
  uploadFile,
  onProgress
}) => {
  const list = Array.isArray(records) ? records : []
  const fields = Object.keys(mediaMap)
  const stats = { ok: 0, fail: 0, skipped: 0 }
  const output = []

  for (let i = 0; i < list.length; i++) {
    const source = list[i] || {}
    const row = { ...source }

    for (const field of fields) {
      const config = mediaMap[field] || {}
      const prefixes = config.prefixes || (config.folder ? [`${config.folder}/`] : [])
      const raw = row[field]
      if (!raw || typeof raw !== 'string') {
        stats.skipped += 1
        continue
      }
      if (isRemoteMediaUrl(raw) || isMultipartMediaRef(raw)) {
        stats.skipped += 1
        continue
      }

      const matched = prefixes.length === 0
        ? raw.includes('/')
        : prefixes.some((prefix) => raw === prefix.slice(0, -1) || raw.startsWith(prefix))

      if (!matched) {
        stats.skipped += 1
        continue
      }

      const zipEntry = zip.file(raw)
      if (!zipEntry) {
        console.warn(`[zipMediaBundle] ZIP 找不到檔案: ${raw}`)
        row[field] = ''
        stats.fail += 1
        continue
      }

      try {
        const blob = await zipEntry.async('blob')
        const fileName = raw.split('/').pop() || `${field}_${i}`
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        const mime = blob.type || config.mimeFallback || 'application/octet-stream'
        const fileObj = new window.File([blob], fileName, { type: mime })
        const uploadResult = await uploadFile(fileObj, config.storageFolder || 'uploads')
        if (!uploadResult?.success) throw new Error(uploadResult?.error || '上傳失敗')
        row[field] = uploadResult.path || uploadResult.url
        if (config.filetypeField && !row[config.filetypeField] && ext) {
          row[config.filetypeField] = ext
        }
        stats.ok += 1
      } catch (error) {
        console.warn(`[zipMediaBundle] 重新上傳失敗 #${i} ${field}:`, error)
        row[field] = ''
        stats.fail += 1
      }
    }

    output.push(row)
    if (typeof onProgress === 'function') {
      onProgress({
        current: i + 1,
        total: list.length,
        percent: list.length ? Math.round(((i + 1) / list.length) * 100) : 100,
        stats: { ...stats }
      })
    }
  }

  return { records: output, stats }
}

export const stripRecordMeta = (record) => {
  if (!record || typeof record !== 'object') return {}
  const { id, created_at, updated_at, ...rest } = record
  return rest
}

export const downloadZipBlob = (blob, fileName) => {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * High-level helper: build zip with JSON + packed media and trigger download.
 */
export const exportRecordsAsMediaZip = async ({
  records,
  jsonFileName,
  downloadName,
  mediaMap,
  resolveUrl,
  fetchBlob,
  onProgress
}) => {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  const packed = await packRecordsMediaIntoZip({
    zip,
    records: (records || []).map(stripRecordMeta),
    mediaMap,
    resolveUrl,
    fetchBlob,
    onProgress: onProgress
      ? (info) => onProgress({ stage: 'media', ...info })
      : undefined
  })

  zip.file(jsonFileName, JSON.stringify(packed.records, null, 2))

  if (typeof onProgress === 'function') {
    onProgress({ stage: 'compress', percent: 0, stats: packed.stats })
  }

  const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (typeof onProgress === 'function') {
      onProgress({
        stage: 'compress',
        percent: Math.round(metadata.percent || 0),
        currentFile: metadata.currentFile || downloadName,
        stats: packed.stats
      })
    }
  })

  downloadZipBlob(blob, downloadName)
  return packed.stats
}
