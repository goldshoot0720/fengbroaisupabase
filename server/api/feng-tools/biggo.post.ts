const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8',
  'cache-control': 'no-cache',
  'pragma': 'no-cache'
}

type FetchAttempt = {
  html: string
  status: number
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

const unique = <T>(items: T[]) => [...new Set(items)]

const getMoneyValues = (value: string) => Array
  .from(value.matchAll(/\$([\d,]+)/g))
  .map(match => Number(match[1].replace(/,/g, '')))
  .filter(value => Number.isFinite(value))

const sanitizeKeyword = (value: string) => decodeEntities(value)
  .replace(/\s*[-|｜]\s*[^-|｜]+$/, '')
  .replace(/[()[\]{}]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const addCandidate = (target: string[], rawValue: string) => {
  const value = sanitizeKeyword(rawValue)
  if (value.length < 3) return
  if (!/[a-zA-Z\u4e00-\u9fff]/.test(value) && !/\d{3,}/.test(value)) return
  target.push(value)
}

const splitTokens = (value: string) => value
  .split(/[\s/\\?&=_.-]+/)
  .map(token => token.trim())
  .filter(token => token.length >= 3)

const buildUrlCandidates = (productUrl: URL) => {
  const candidates: string[] = []

  addCandidate(candidates, decodeURIComponent(productUrl.pathname))

  for (const token of splitTokens(decodeURIComponent(productUrl.pathname))) {
    addCandidate(candidates, token)
  }

  for (const [, rawValue] of productUrl.searchParams.entries()) {
    const value = decodeURIComponent(rawValue)
    addCandidate(candidates, value)
    for (const token of splitTokens(value)) {
      addCandidate(candidates, token)
    }
  }

  return candidates
}

const buildHtmlCandidates = (html: string) => {
  const candidates: string[] = []
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]

  for (const value of [ogTitle, title, h1]) {
    if (!value) continue
    addCandidate(candidates, value)
    for (const token of splitTokens(value)) {
      addCandidate(candidates, token)
    }
  }

  return candidates
}

const buildKeywordCandidates = (productUrl: URL, sourceHtml?: string) => {
  const sourceCandidates = sourceHtml ? buildHtmlCandidates(sourceHtml) : []
  const urlCandidates = buildUrlCandidates(productUrl)
  return unique([...sourceCandidates, ...urlCandidates]).slice(0, 16)
}

const buildSearchVariants = (candidate: string) => {
  const variants = [
    candidate,
    candidate.replace(/[_/\\.-]+/g, ' '),
    candidate.replace(/\s+/g, ' ')
  ]

  const compactAlphaNumeric = candidate.replace(/[^a-zA-Z0-9]/g, '')
  if (compactAlphaNumeric.length >= 5 && compactAlphaNumeric !== candidate) {
    variants.push(compactAlphaNumeric)
  }

  return unique(variants.map(value => value.trim()).filter(value => value.length >= 3))
}

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow'
  })

  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: `無法讀取來源頁面：${response.status}` })
  }

  return await response.text()
}

const tryFetchText = async (url: string): Promise<FetchAttempt | null> => {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      redirect: 'follow'
    })

    if (!response.ok) {
      return {
        html: '',
        status: response.status
      }
    }

    return {
      html: await response.text(),
      status: response.status
    }
  } catch {
    return null
  }
}

const pickBiggoMatch = async (keywordCandidates: string[]) => {
  for (const candidate of keywordCandidates) {
    for (const keyword of buildSearchVariants(candidate)) {
      try {
        const biggoUrl = `https://biggo.com.tw/s/${encodeURIComponent(keyword)}/`
        const html = await fetchText(biggoUrl)
        const text = stripTags(html)
        const moneyValues = getMoneyValues(text)
        if (moneyValues.length > 0) {
          return { html, keyword }
        }
      } catch {
        continue
      }
    }
  }

  return null
}

const buildHistorySeries = (prices: number[]) => prices.slice(0, 12).map((price, index) => ({
  label: `H${index + 1}`,
  value: price
}))

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

  const sourceAttempt = await tryFetchText(productUrl.toString())
  const sourceHtml = sourceAttempt?.html || ''
  const sourceFetchFailed = Boolean(sourceAttempt && !sourceAttempt.html)
  const keywordCandidates = buildKeywordCandidates(productUrl, sourceHtml)

  if (keywordCandidates.length === 0) {
    if (sourceFetchFailed) {
      throw createError({ statusCode: 422, statusMessage: `來源網站回應 ${sourceAttempt?.status}，而且網址裡也找不到可搜尋的商品關鍵字。` })
    }

    throw createError({ statusCode: 422, statusMessage: '無法從商品頁或網址抓到可用的搜尋關鍵字。' })
  }

  const biggoMatch = await pickBiggoMatch(keywordCandidates)
  if (!biggoMatch) {
    throw createError({ statusCode: 404, statusMessage: 'BigGo 找不到對應商品結果。' })
  }

  const biggoText = stripTags(biggoMatch.html)
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

  const sourceText = sourceHtml ? stripTags(sourceHtml) : ''
  const productTitle = keywordCandidates[0] || sourceText.split('\n')[0] || biggoMatch.keyword

  return {
    sourceUrl: rawUrl,
    keyword: biggoMatch.keyword,
    productTitle,
    currentPrice: Math.min(...allCurrent),
    historicalHigh: Math.max(...allHistorical),
    historicalLow: Math.min(...allHistorical),
    series: buildHistorySeries(allHistorical),
    sourceStatus: sourceAttempt?.status || null
  }
})
