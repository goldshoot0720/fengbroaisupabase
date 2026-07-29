import { createError, getHeader, getQuery, setHeader } from 'h3'

/**
 * Same-origin media proxy for remote images / assets (avoids browser CORS).
 * Ported from fengbroaiappwrite `app/api/media-proxy` (image-convert URL import).
 *
 * GET /api/media-proxy?url=https://example.com/photo.png
 * Optional: download=1&filename=name.png
 */

const MAX_BYTES = 40 * 1024 * 1024 // 40 MB safety cap for tool use

function isHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(String(raw || '').trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u
  } catch {
    return null
  }
}

function buildContentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, '_').replace(/"/g, '')
  const encoded = encodeURIComponent(filename)
  return `attachment; filename="${asciiFallback || 'download'}"; filename*=UTF-8''${encoded}`
}

function guessContentType(url: string, headerType: string | null): string {
  if (headerType && headerType !== 'application/octet-stream') {
    return headerType.split(';')[0].trim()
  }
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    avif: 'image/avif',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    m4a: 'audio/mp4',
    pdf: 'application/pdf'
  }
  return map[ext] || headerType || 'application/octet-stream'
}

function buildFetchHeaders(target: URL, event: any): Record<string, string> {
  const headers: Record<string, string> = {}
  const userAgent = getHeader(event, 'user-agent')
  if (userAgent) headers['user-agent'] = userAgent

  const host = target.hostname.toLowerCase()
  // Bilibili CDN often requires referer
  if (/(^|\.)hdslb\.com$/i.test(host) || /(^|\.)biliimg\.com$/i.test(host)) {
    headers.referer = 'https://www.bilibili.com/'
    headers['user-agent'] =
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  }

  return headers
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawUrl = String(query.url || '').trim()
  if (!rawUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url parameter' })
  }

  const target = isHttpUrl(rawUrl)
  if (!target) {
    throw createError({ statusCode: 400, statusMessage: '僅支援 http/https 網址' })
  }

  // Block obvious SSRF to localhost / private nets (basic guard)
  const host = target.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw createError({ statusCode: 400, statusMessage: '不允許代理本機或私有網段網址' })
  }

  let response: Response
  try {
    response = await fetch(target.href, {
      headers: buildFetchHeaders(target, event),
      redirect: 'follow',
      cache: 'no-store'
    })
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || '無法連線遠端資源'
    })
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status >= 400 && response.status < 600 ? response.status : 502,
      statusMessage: `遠端回應 HTTP ${response.status}`
    })
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '檔案過大（超過 40MB）' })
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '檔案過大（超過 40MB）' })
  }

  const contentType = guessContentType(target.href, response.headers.get('content-type'))
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Length', String(buffer.byteLength))

  if (String(query.download) === '1') {
    const filename =
      String(query.filename || '').trim() ||
      target.pathname.split('/').filter(Boolean).pop() ||
      'download'
    setHeader(event, 'Content-Disposition', buildContentDisposition(filename))
  } else {
    setHeader(event, 'Content-Disposition', 'inline')
  }

  if (contentType.startsWith('image/')) {
    setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  } else {
    setHeader(event, 'Cache-Control', 'no-store')
  }

  setHeader(event, 'Access-Control-Allow-Origin', '*')

  return buffer
})