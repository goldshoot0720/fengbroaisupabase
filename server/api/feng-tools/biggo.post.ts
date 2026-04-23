const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8'
}

const decodeEntities = (value: string) => value
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')

const stripTags = (html: string) => decodeEntities(
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
)
  .replace(/\r/g, '')
  .replace(/\n{2,}/g, '\n')
  .trim()

const getMoneyValues = (value: string) => Array.from(value.matchAll(/\$([\d,]+)/g)).map((match) => Number(match[1].replace(/,/g, '')))

const unique = <T>(items: T[]) => [...new Set(items)]

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: `無法讀取來源頁面：${response.status}` })
  }
  return await response.text()
}

const pickKeywordCandidates = (productUrl: URL, html: string) => {
  const candidates: string[] = []
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
  const fromMeta = decodeEntities(ogTitle || title || '')
    .replace(/\s*[-|｜]\s*[^-|｜]+$/, '')
    .trim()

  if (fromMeta) candidates.push(fromMeta)

  const pathTokens = productUrl.pathname
    .split(/[\/\-_.]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 5)

  candidates.push(...pathTokens.filter(token => /[a-z]/i.test(token) || /\d/.test(token)))
  return unique(candidates)
}

const buildHistorySeries = (prices: number[]) => {
  return prices.slice(0, 12).map((price, index) => ({
    label: `H${index + 1}`,
    value: price
  }))
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string }>(event)
  const rawUrl = String(body?.url || '').trim()

  if (!rawUrl) {
    throw createError({ statusCode: 400, statusMessage: '請先提供商品網址。' })
  }

  let productUrl: URL
  try {
    productUrl = new URL(rawUrl)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '商品網址格式不正確。' })
  }

  const sourceHtml = await fetchText(productUrl.toString())
  const productText = stripTags(sourceHtml)
  const keywordCandidates = pickKeywordCandidates(productUrl, sourceHtml)
  if (keywordCandidates.length === 0) {
    throw createError({ statusCode: 422, statusMessage: '無法從商品頁抓到可用的搜尋關鍵字。' })
  }

  let biggoHtml = ''
  let keyword = ''
  for (const candidate of keywordCandidates) {
    const biggoUrl = `https://biggo.com.tw/s/${encodeURIComponent(candidate)}/`
    try {
      const html = await fetchText(biggoUrl)
      const text = stripTags(html)
      if (text.includes('價格推薦') || text.includes('歷史價格')) {
        biggoHtml = html
        keyword = candidate
        break
      }
    } catch {
      continue
    }
  }

  if (!biggoHtml) {
    throw createError({ statusCode: 404, statusMessage: 'BigGo 找不到對應商品結果。' })
  }

  const biggoText = stripTags(biggoHtml)
  const historyIndex = biggoText.indexOf('歷史價格')
  const currentSection = historyIndex >= 0 ? biggoText.slice(0, historyIndex) : biggoText
  const historySection = historyIndex >= 0 ? biggoText.slice(historyIndex) : biggoText

  const currentPrices = getMoneyValues(currentSection)
  const historicalPrices = getMoneyValues(historySection)
  const fallbackAllPrices = getMoneyValues(biggoText)

  const allCurrent = currentPrices.length > 0 ? currentPrices : fallbackAllPrices
  const allHistorical = historicalPrices.length > 0 ? historicalPrices : fallbackAllPrices

  if (allCurrent.length === 0 || allHistorical.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'BigGo 頁面沒有可分析的價格資料。' })
  }

  const currentPrice = Math.min(...allCurrent)
  const historicalHigh = Math.max(...allHistorical)
  const historicalLow = Math.min(...allHistorical)
  const productTitle = keywordCandidates[0] || productText.split('\n')[0] || keyword

  return {
    sourceUrl: rawUrl,
    keyword,
    productTitle,
    currentPrice,
    historicalHigh,
    historicalLow,
    series: buildHistorySeries(allHistorical)
  }
})
