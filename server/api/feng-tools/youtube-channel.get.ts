const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8'
}

const decodeEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')

const extractChannelLabel = (html: string) => {
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1]
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s*-\s*YouTube\s*$/i, '')
  return decodeEntities((ogTitle || title || '').trim())
}

export default defineEventHandler(async (event) => {
  const rawUrl = getQuery(event).url
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl

  if (!url || typeof url !== 'string' || !/^https:\/\/www\.youtube\.com\/@[^/]+\/videos$/i.test(url)) {
    throw createError({
      statusCode: 400,
      statusMessage: '請提供有效的 YouTube 頻道網址。'
    })
  }

  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: '抓取 YouTube 頻道名稱失敗。'
    })
  }

  const html = await response.text()
  const label = extractChannelLabel(html)
  if (!label) {
    throw createError({
      statusCode: 404,
      statusMessage: '找不到 YouTube 頻道名稱。'
    })
  }

  return { label }
})
