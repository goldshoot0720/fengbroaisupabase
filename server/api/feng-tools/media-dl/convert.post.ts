import { createError, getHeader, readBody, sendStream, setHeader } from 'h3'
import {
  cleanupWorkDir,
  convertMediaUrls,
  isAllowedMediaUrl,
  openFileStream
} from '../../../utils/ytDlpMedia'

/**
 * Convert YouTube / Bilibili URLs to MP3 or MP4 via yt-dlp.
 * Requires yt-dlp + ffmpeg on the server PATH (local/Docker). Not available on typical Netlify functions.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const urlsRaw = Array.isArray(body?.urls) ? body.urls : body?.url ? [body.url] : []
  const urls = urlsRaw.map((u: unknown) => String(u || '').trim()).filter(Boolean)

  if (!urls.length) {
    throw createError({ statusCode: 400, statusMessage: '請至少提供一個網址' })
  }
  if (urls.length > 7) {
    throw createError({ statusCode: 400, statusMessage: '一次最多 7 個網址' })
  }
  if (!urls.every(isAllowedMediaUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: '僅支援 YouTube 或 Bilibili 網址'
    })
  }

  const format = body?.format === 'mp4' ? 'mp4' : 'mp3'
  const mp4Quality = body?.mp4Quality === '4k' || body?.mp4Quality === '4K' ? '4k' : '1080p'

  // Optional: reject giant payloads early
  const accept = getHeader(event, 'accept') || ''

  try {
    const result = await convertMediaUrls({
      urls,
      format,
      mp4Quality
    })

    // If client wants JSON metadata only (debug)
    if (accept.includes('application/json') && body?.metaOnly) {
      const payload = {
        success: true,
        filename: result.filename,
        mime: result.mime,
        size: result.size,
        successCount: result.successCount,
        total: result.total,
        logs: result.logs
      }
      await cleanupWorkDir(result.workDir)
      return payload
    }

    setHeader(event, 'Content-Type', result.mime)
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`
    )
    setHeader(event, 'X-Fengbro-Success-Count', String(result.successCount))
    setHeader(event, 'X-Fengbro-Total', String(result.total))
    setHeader(event, 'X-Fengbro-Filename', encodeURIComponent(result.filename))
    if (result.size) setHeader(event, 'Content-Length', String(result.size))

    const stream = openFileStream(result.filePath)
    stream.on('close', () => {
      cleanupWorkDir(result.workDir).catch(() => {})
    })
    stream.on('error', () => {
      cleanupWorkDir(result.workDir).catch(() => {})
    })

    return sendStream(event, stream)
  } catch (err: any) {
    if (err?.code === 'TOOLS_MISSING') {
      throw createError({
        statusCode: 503,
        statusMessage: err.message || '找不到 yt-dlp / ffmpeg',
        data: err.status || null
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || String(err),
      data: { logs: err?.logs || [] }
    })
  }
})
