/**
 * Client-side image → PNG / JPEG conversion (Canvas).
 * Aligned with https://github.com/huang1988pioneer/PNGJPEGConverter
 * (browser subset: formats the browser can decode; no ImageMagick).
 */

/** Input formats browsers can typically decode via <img>/Canvas */
export const ACCEPT_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/tiff',
  'image/tif',
  'image/x-ms-bmp',
  'image/avif'
])

export const ACCEPT_EXT = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'bmp',
  'gif',
  'tif',
  'tiff',
  'avif'
])

export const isSupportedImageFile = (file) => {
  if (!file) return false
  const mime = String(file.type || '').toLowerCase()
  if (ACCEPT_MIME.has(mime)) return true
  // Some browsers leave type empty for HEIC/TIFF — still try by extension
  const ext = String(file.name || '').split('.').pop()?.toLowerCase()
  if (ACCEPT_EXT.has(ext)) return true
  // image/* that isn't clearly video/document — allow attempt (HEIC may fail later)
  if (mime.startsWith('image/')) return true
  return false
}

export const detectSourceFormat = (file) => {
  const mime = String(file?.type || '').toLowerCase()
  const mimeMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/x-ms-bmp': 'bmp',
    'image/gif': 'gif',
    'image/tiff': 'tiff',
    'image/tif': 'tiff',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heic'
  }
  if (mimeMap[mime]) return mimeMap[mime]

  const ext = String(file?.name || '').split('.').pop()?.toLowerCase()
  const extMap = {
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpg',
    webp: 'webp',
    bmp: 'bmp',
    gif: 'gif',
    tif: 'tiff',
    tiff: 'tiff',
    avif: 'avif',
    heic: 'heic',
    heif: 'heic'
  }
  if (extMap[ext]) return extMap[ext]
  return 'unknown'
}

export const formatLabel = (fmt) => {
  const map = {
    png: 'PNG',
    jpg: 'JPEG',
    webp: 'WebP',
    bmp: 'BMP',
    gif: 'GIF',
    tiff: 'TIFF',
    avif: 'AVIF',
    heic: 'HEIC',
    url: 'URL',
    unknown: '未知'
  }
  return map[fmt] || String(fmt || '未知').toUpperCase()
}

export const replaceExtension = (filename, targetExt) => {
  const base =
    String(filename || 'image')
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .trim() || 'image'
  const ext = targetExt === 'png' ? 'png' : 'jpg'
  return `${base}.${ext}`
}

/**
 * Ensure unique filenames (流水號) when batch downloading / zipping.
 * @param {string} name
 * @param {Set<string>} used
 */
export const uniqueFileName = (name, used) => {
  let candidate = name
  if (!used.has(candidate)) {
    used.add(candidate)
    return candidate
  }
  const m = candidate.match(/^(.*?)(\.[^.]+)?$/)
  const base = m?.[1] || 'image'
  const ext = m?.[2] || ''
  let n = 2
  while (used.has(`${base}_${n}${ext}`)) n += 1
  candidate = `${base}_${n}${ext}`
  used.add(candidate)
  return candidate
}

export const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Guess filename from URL path.
 * @param {string} url
 */
export const filenameFromUrl = (url) => {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').filter(Boolean).pop() || 'image'
    const decoded = decodeURIComponent(last).replace(/[\\/:*?"<>|]+/g, '_')
    if (/\.(png|jpe?g|webp|bmp|gif|tiff?|avif|heic|heif)$/i.test(decoded)) {
      return decoded
    }
    return `${decoded || 'image'}.jpg`
  } catch {
    return `url-image-${Date.now()}.jpg`
  }
}

/**
 * Fetch remote image as File (CORS must allow).
 * @param {string} url
 * @returns {Promise<File>}
 */
export const fetchImageAsFile = async (url) => {
  const raw = String(url || '').trim()
  if (!raw) throw new Error('請輸入圖片網址')
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('網址格式無效')
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error('僅支援 http / https 圖片網址')
  }

  const res = await fetch(parsed.href, { mode: 'cors' })
  if (!res.ok) throw new Error(`無法下載圖片（HTTP ${res.status}）`)

  const blob = await res.blob()
  if (!blob.size) throw new Error('下載的檔案是空的')
  if (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') {
    throw new Error(`不是圖片類型：${blob.type}`)
  }

  const name = filenameFromUrl(parsed.href)
  const type = blob.type?.startsWith('image/') ? blob.type : 'image/jpeg'
  return new File([blob], name, { type })
}

/**
 * Load a File/Blob into an HTMLImageElement.
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
export const loadImageFromBlob = (blob) => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('無法讀取圖片（格式可能不被此瀏覽器支援）'))
    }
    img.src = url
  })
}

/**
 * Convert an image File to PNG or JPEG via Canvas.
 * JPEG: transparent pixels filled with background (default white) like PNGJPEGConverter.
 * @param {File|Blob} file
 * @param {{ target: 'png'|'jpg', quality?: number, background?: string }} options
 * @returns {Promise<{ blob: Blob, mime: string, width: number, height: number }>}
 */
export const convertImageFormat = async (file, options = {}) => {
  const target = options.target === 'png' ? 'png' : 'jpg'
  const quality = clampQuality(options.quality)
  const background = options.background || '#ffffff'

  const img = await loadImageFromBlob(file)
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  if (!width || !height) throw new Error('圖片尺寸無效')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('瀏覽器不支援 Canvas')

  if (target === 'jpg') {
    // JPEG has no alpha; fill background first (white by default)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)

  const mime = target === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await canvasToBlob(canvas, mime, target === 'jpg' ? quality : undefined)
  if (!blob) throw new Error('轉換失敗')

  return { blob, mime, width, height }
}

/** Quality 0.01–1.0 (1%–100%). Default 1.0 matches PNGJPEGConverter. */
export const clampQuality = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 1
  return Math.min(1, Math.max(0.01, n))
}

const canvasToBlob = (canvas, mime, quality) => {
  return new Promise((resolve) => {
    if (typeof quality === 'number') {
      canvas.toBlob((b) => resolve(b), mime, quality)
    } else {
      canvas.toBlob((b) => resolve(b), mime)
    }
  })
}
