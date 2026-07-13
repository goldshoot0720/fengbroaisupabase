/**
 * 鋒兄比價 — 改用 BigGo 公開 JSON API（參考開源 BigGo-MCP-Server）
 * 取代原先對 biggo.com.tw HTML 大量爬取（易觸發 429）。
 *
 * APIs:
 * - Search:   GET  https://api.biggo.com/api/v1/spa/search/{query}/product
 * - History:  POST https://extension.biggo.com/api/product_price_history.php
 * - Domain:   GET  https://extension.biggo.com/api/store.php?method=domain_lookup&domain=
 * - EC list:  GET  https://extension.biggo.com/api/eclist.php
 */

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept': 'application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8',
  'cache-control': 'no-cache'
}

const BIGGO_SEARCH_HEADERS = {
  ...DEFAULT_HEADERS,
  'content-type': 'application/json',
  site: 'biggo.com.tw',
  region: 'tw'
}

const MAX_KEYWORD_ATTEMPTS = 4
const REQUEST_GAP_MS = 280
const SOURCE_FETCH_TIMEOUT_MS = 6000
const CACHE_TTL_MS = 10 * 60 * 1000

type CacheEntry = { expiresAt: number, value: unknown }
const responseCache = new Map<string, CacheEntry>()
let ecListCache: { expiresAt: number, data: Record<string, any> | null } | null = null

type SeriesPoint = { label: string, value: number }

type LookupResult = {
  sourceUrl: string
  keyword: string
  productTitle: string
  currentPrice: number | null
  historicalHigh: number | null
  historicalLow: number | null
  series: SeriesPoint[]
  sourceStatus: number | null
  biggoUrl: string
  lookupMode: 'price' | 'search-link'
  notice?: string
  historyId?: string | null
  storeName?: string | null
}

type SearchItem = {
  title?: string
  price?: number
  history_id?: string
  nindex?: string
  oid?: string
  affurl?: string
  url?: string
  store?: { name?: string }
  multiple?: { min_price?: number, max_price?: number, current_price?: number, title?: string }
}

type SearchResponse = {
  result?: boolean
  list?: SearchItem[]
  low_price?: number
  high_price?: number
  total?: number
}

type PriceHistoryAttributes = {
  title?: string
  current_price?: number
  url?: string
  nindex_name?: string
  price_history?: Array<{ x?: number, y?: number }>
  statistics?: Record<string, {
    days?: number
    max_price?: number
    min_price?: number
  } | null | undefined>
}

type EcListPattern = {
  match?: string | string[]
  template?: string | string[]
  query?: string
  uppercase?: boolean
  lowercase?: boolean
  len?: number
  pad?: string
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

const buildBiggoSearchUrl = (keyword: string) => `https://biggo.com.tw/s/${encodeURIComponent(keyword)}/`

const getCache = <T>(key: string): T | null => {
  const hit = responseCache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    responseCache.delete(key)
    return null
  }
  return hit.value as T
}

const setCache = (key: string, value: unknown) => {
  responseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value })
}

const isFinitePrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const scoreSearchItem = (item: SearchItem, keyword: string) => {
  const title = String(item.title || '').toLowerCase()
  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean)
  let score = 0
  for (const token of tokens) {
    if (title.includes(token)) score += 2
  }
  if (isFinitePrice(item.price)) score += 1
  if (item.history_id) score += 1
  // Prefer realistic retail prices over junk $1 listings.
  if (isFinitePrice(item.price) && item.price >= 50) score += 2
  return score
}

const pickBestSearchItem = (items: SearchItem[], keyword: string) => {
  if (!items.length) return null
  return [...items]
    .map(item => ({ item, score: scoreSearchItem(item, keyword) }))
    .sort((a, b) => b.score - a.score || (a.item.price || Infinity) - (b.item.price || Infinity))[0]?.item || null
}

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

  // Prefer human-readable titles / long phrases first.
  const ranked = unique([...sourceCandidates, ...urlCandidates])
    .sort((a, b) => {
      const aHasHan = /[\u4e00-\u9fff]/.test(a) ? 1 : 0
      const bHasHan = /[\u4e00-\u9fff]/.test(b) ? 1 : 0
      if (aHasHan !== bHasHan) return bHasHan - aHasHan
      return b.length - a.length
    })

  return ranked.slice(0, 8)
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

  return unique(variants.map(value => value.trim()).filter(value => value.length >= 3)).slice(0, 2)
}

const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 12000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const tryFetchSourceHtml = async (url: string): Promise<{ html: string, status: number | null }> => {
  try {
    const response = await fetchWithTimeout(url, {
      headers: DEFAULT_HEADERS,
      redirect: 'follow'
    }, SOURCE_FETCH_TIMEOUT_MS)

    if (!response.ok) {
      return { html: '', status: response.status }
    }

    return { html: await response.text(), status: response.status }
  } catch {
    return { html: '', status: null }
  }
}

const fetchJson = async <T>(url: string, init: RequestInit = {}): Promise<{ data: T | null, status: number }> => {
  const response = await fetchWithTimeout(url, init)
  const status = response.status

  if (status === 429) {
    throw createError({
      statusCode: 429,
      statusMessage: '比價服務暫時忙碌（429），請稍候 30～60 秒再試。'
    })
  }

  if (!response.ok) {
    return { data: null, status }
  }

  try {
    return { data: await response.json() as T, status }
  } catch {
    return { data: null, status }
  }
}

const searchBiggo = async (keyword: string): Promise<SearchResponse | null> => {
  const cacheKey = `search:${keyword.toLowerCase()}`
  const cached = getCache<SearchResponse>(cacheKey)
  if (cached) return cached

  const url = `https://api.biggo.com/api/v1/spa/search/${encodeURIComponent(keyword)}/product`
  const { data, status } = await fetchJson<SearchResponse>(url, {
    headers: BIGGO_SEARCH_HEADERS
  })

  if (!data || status >= 400) return null
  setCache(cacheKey, data)
  return data
}

const fetchPriceHistory = async (historyId: string, days = 365): Promise<PriceHistoryAttributes | null> => {
  const cacheKey = `hist:${historyId}:${days}`
  const cached = getCache<PriceHistoryAttributes>(cacheKey)
  if (cached) return cached

  const { data, status } = await fetchJson<Record<string, any>>(
    'https://extension.biggo.com/api/product_price_history.php',
    {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ item: [historyId], days })
    }
  )

  if (!data || status >= 400 || data.result === false) return null

  const payload = (data[historyId] || Object.values(data).find(value => value && typeof value === 'object' && 'current_price' in value)) as PriceHistoryAttributes | undefined
  if (!payload) return null

  setCache(cacheKey, payload)
  return payload
}

const getNindexFromUrl = async (productUrl: string): Promise<string | null> => {
  const cacheKey = `nindex:${productUrl}`
  const cached = getCache<string>(cacheKey)
  if (cached) return cached

  const url = `https://extension.biggo.com/api/store.php?method=domain_lookup&domain=${encodeURIComponent(productUrl)}`
  const { data } = await fetchJson<{ biggo?: Array<{ id?: string }> }>(url, { headers: DEFAULT_HEADERS })
  const nindex = data?.biggo?.[0]?.id || null
  if (nindex) setCache(cacheKey, nindex)
  return nindex
}

const getEcList = async (): Promise<Record<string, any> | null> => {
  if (ecListCache && Date.now() < ecListCache.expiresAt) {
    return ecListCache.data
  }

  const { data } = await fetchJson<{ data?: Record<string, any> }>(
    'https://extension.biggo.com/api/eclist.php',
    { headers: DEFAULT_HEADERS }
  )
  const payload = data?.data || data || null
  ecListCache = { expiresAt: Date.now() + CACHE_TTL_MS, data: payload }
  return payload
}

const getQueryVariable = (url: string, field: string) => {
  try {
    return new URL(url).searchParams.get(field)
  } catch {
    return null
  }
}

const getIdWithRegexp = (
  url: string,
  regex: string,
  template = '%1',
  config?: EcListPattern
) => {
  const match = url.match(new RegExp(regex))
  if (!match) return null

  let pid = template.replace('%1', match[1] || '')
  if (template.includes('%2') && match[2]) {
    pid = template.replace('%1', match[1] || '').replace('%2', match[2] || '')
  } else if (match[1]) {
    pid = template.includes('%1') ? template.replace('%1', match[1]) : match[1]
  }

  if (config?.len && typeof pid === 'string' && pid.includes('%p') && config.pad) {
    const paddingLength = Math.max(0, config.len - (pid.length - 2))
    pid = pid.replace('%p', config.pad.repeat(paddingLength))
  }

  return pid || null
}

const parsePidFromPattern = (url: string, nindex: string, config: EcListPattern) => {
  let pid: string | null = null
  const regex = config.match
  const template = config.template
  const query = config.query

  if (regex) {
    const regexList = Array.isArray(regex) ? regex : [regex]
    const templateList = Array.isArray(template) ? template : [template || '%1']

    for (let i = 0; i < regexList.length; i += 1) {
      const found = getIdWithRegexp(url, regexList[i], templateList[i] || templateList[0] || '%1', config)
      if (found) {
        pid = found
        break
      }
    }
  }

  if (query) {
    const queryPid = getQueryVariable(url, query)
    if (queryPid) pid = queryPid
  }

  // Rakuten special case from BigGo MCP utils
  if (nindex === 'tw_pmall_rakuten' && regex) {
    const firstRegex = Array.isArray(regex) ? regex[0] : regex
    const match = url.match(new RegExp(firstRegex))
    if (match?.[1] && match?.[2]) {
      pid = `${match[1]}_${match[2].toUpperCase()}`
    }
  }

  if (pid && config.uppercase) pid = pid.toUpperCase()
  if (pid && config.lowercase) pid = pid.toLowerCase()
  return pid
}

const getPidFromUrl = async (nindex: string, productUrl: string): Promise<string | null> => {
  const ecList = await getEcList()
  if (!ecList) return null

  const region = nindex.split('_')[0]
  const regionData = ecList[region]
  if (!regionData || !regionData[nindex]) return null

  return parsePidFromPattern(productUrl, nindex, regionData[nindex] as EcListPattern)
}

const buildHistorySeries = (history?: Array<{ x?: number, y?: number }>): SeriesPoint[] => {
  if (!history?.length) return []

  const values = history
    .map(point => Number(point.y))
    .filter(value => Number.isFinite(value) && value > 0)

  if (values.length === 0) return []

  // Keep last 12 points for chart-friendly density.
  return values.slice(-12).map((value, index) => ({
    label: `H${index + 1}`,
    value
  }))
}

const statsToHighLow = (stats?: PriceHistoryAttributes['statistics']) => {
  const buckets = ['days365', 'days180', 'days90', 'days730', 'days30', 'days7']
  for (const key of buckets) {
    const bucket = stats?.[key]
    if (bucket && isFinitePrice(bucket.max_price) && isFinitePrice(bucket.min_price)) {
      return {
        historicalHigh: bucket.max_price,
        historicalLow: bucket.min_price
      }
    }
  }
  return { historicalHigh: null as number | null, historicalLow: null as number | null }
}

const resultFromHistory = (
  sourceUrl: string,
  keyword: string,
  historyId: string,
  history: PriceHistoryAttributes,
  sourceStatus: number | null,
  fallbackTitle?: string
): LookupResult => {
  const series = buildHistorySeries(history.price_history)
  const fromStats = statsToHighLow(history.statistics)
  const seriesValues = series.map(point => point.value)
  const currentPrice = isFinitePrice(history.current_price) ? history.current_price : null
  const historicalHigh = fromStats.historicalHigh
    ?? (seriesValues.length ? Math.max(...seriesValues) : currentPrice)
  const historicalLow = fromStats.historicalLow
    ?? (seriesValues.length ? Math.min(...seriesValues) : currentPrice)

  return {
    sourceUrl,
    keyword,
    productTitle: history.title || fallbackTitle || keyword,
    currentPrice,
    historicalHigh,
    historicalLow,
    series,
    sourceStatus,
    biggoUrl: buildBiggoSearchUrl(keyword),
    lookupMode: currentPrice != null ? 'price' : 'search-link',
    historyId,
    storeName: history.nindex_name || null
  }
}

const resultFromSearch = (
  sourceUrl: string,
  keyword: string,
  search: SearchResponse,
  item: SearchItem,
  sourceStatus: number | null
): LookupResult => {
  const currentPrice = isFinitePrice(item.price)
    ? item.price
    : (isFinitePrice(search.low_price) ? search.low_price : null)

  const historicalLow = isFinitePrice(search.low_price) ? search.low_price : currentPrice
  const historicalHigh = isFinitePrice(search.high_price) && (search.high_price || 0) < 50_000_000
    ? search.high_price!
    : currentPrice

  return {
    sourceUrl,
    keyword,
    productTitle: item.title || keyword,
    currentPrice,
    historicalHigh,
    historicalLow,
    series: currentPrice != null ? [{ label: 'H1', value: currentPrice }] : [],
    sourceStatus,
    biggoUrl: buildBiggoSearchUrl(keyword),
    lookupMode: currentPrice != null ? 'price' : 'search-link',
    historyId: item.history_id || null,
    storeName: item.store?.name || null,
    notice: '目前僅取得搜尋結果現價；歷史走勢可能尚未完整。'
  }
}

const tryDirectUrlHistory = async (
  productUrl: URL,
  sourceStatus: number | null
): Promise<LookupResult | null> => {
  try {
    const nindex = await getNindexFromUrl(productUrl.toString())
    if (!nindex) return null

    const pid = await getPidFromUrl(nindex, productUrl.toString())
    if (!pid) return null

    const historyId = `${nindex}-${pid}`
    const history = await fetchPriceHistory(historyId, 365)
    if (!history) return null

    return resultFromHistory(
      productUrl.toString(),
      pid,
      historyId,
      history,
      sourceStatus,
      history.title
    )
  } catch (error: any) {
    if (error?.statusCode === 429) throw error
    return null
  }
}

const tryKeywordSearch = async (
  sourceUrl: string,
  keywordCandidates: string[],
  sourceStatus: number | null
): Promise<LookupResult | null> => {
  let attempts = 0
  let lastRateLimited = false

  for (const candidate of keywordCandidates) {
    for (const keyword of buildSearchVariants(candidate)) {
      if (attempts >= MAX_KEYWORD_ATTEMPTS) break
      attempts += 1

      if (attempts > 1) await sleep(REQUEST_GAP_MS)

      try {
        const search = await searchBiggo(keyword)
        if (!search?.list?.length) continue

        const best = pickBestSearchItem(search.list, keyword)
        if (!best) continue

        if (best.history_id) {
          await sleep(REQUEST_GAP_MS)
          const history = await fetchPriceHistory(best.history_id, 365)
          if (history) {
            return resultFromHistory(
              sourceUrl,
              keyword,
              best.history_id,
              history,
              sourceStatus,
              best.title || history.title
            )
          }
        }

        return resultFromSearch(sourceUrl, keyword, search, best, sourceStatus)
      } catch (error: any) {
        if (error?.statusCode === 429) {
          lastRateLimited = true
          // Back off and try at most one more different keyword later.
          await sleep(1200)
          continue
        }
      }
    }
    if (attempts >= MAX_KEYWORD_ATTEMPTS) break
  }

  if (lastRateLimited) {
    throw createError({
      statusCode: 429,
      statusMessage: '比價服務暫時忙碌（429），請稍候 30～60 秒再試。'
    })
  }

  return null
}

const inferProductTitle = (productUrl: URL, keyword: string, sourceHtml?: string) => {
  if (sourceHtml) {
    const ogTitle = sourceHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
    if (ogTitle) return sanitizeKeyword(ogTitle)

    const title = sourceHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    if (title) return sanitizeKeyword(title)

    const sourceText = stripTags(sourceHtml)
    const sourceTitle = sourceText.split('\n').find(value => value.trim().length >= 3)
    if (sourceTitle) return sourceTitle.slice(0, 120)
  }

  if (/pchome\.com\.tw$/i.test(productUrl.hostname) || /\.pchome\.com\.tw$/i.test(productUrl.hostname)) {
    const productId = decodeURIComponent(productUrl.pathname).split('/').filter(Boolean).pop()
    if (productId) return `PChome 商品 ${productId}`
  }

  return keyword
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string, keyword?: string }>(event)
  const rawUrl = String(body?.url || '').trim()
  const rawKeyword = String(body?.keyword || '').trim()

  if (!rawUrl && !rawKeyword) {
    throw createError({ statusCode: 400, statusMessage: '請先提供商品網址或搜尋關鍵字。' })
  }

  // Direct keyword search path (no product page needed).
  if (!rawUrl && rawKeyword) {
    const cacheKey = `resp:kw:${rawKeyword.toLowerCase()}`
    const cached = getCache<LookupResult>(cacheKey)
    if (cached) return cached

    const matched = await tryKeywordSearch('', [rawKeyword], null)
    if (!matched) {
      return {
        sourceUrl: '',
        keyword: rawKeyword,
        productTitle: rawKeyword,
        currentPrice: null,
        historicalHigh: null,
        historicalLow: null,
        series: [],
        sourceStatus: null,
        biggoUrl: buildBiggoSearchUrl(rawKeyword),
        lookupMode: 'search-link',
        notice: 'BigGo 目前沒有可解析的價格資料，請開啟搜尋結果人工確認。'
      } satisfies LookupResult
    }

    setCache(cacheKey, matched)
    return matched
  }

  let productUrl: URL
  try {
    productUrl = new URL(rawUrl)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '商品網址格式不正確。' })
  }

  const responseCacheKey = `resp:url:${productUrl.toString()}`
  const cachedResponse = getCache<LookupResult>(responseCacheKey)
  if (cachedResponse) return cachedResponse

  // 1) Prefer direct product history via BigGo extension APIs (1–2 requests).
  const direct = await tryDirectUrlHistory(productUrl, null)
  if (direct?.currentPrice != null) {
    setCache(responseCacheKey, direct)
    return direct
  }

  // 2) Optionally read source product page title (single request, short timeout).
  const sourceAttempt = await tryFetchSourceHtml(productUrl.toString())
  const sourceHtml = sourceAttempt.html
  const sourceStatus = sourceAttempt.status
  const keywordCandidates = [
    ...(rawKeyword ? [rawKeyword] : []),
    ...buildKeywordCandidates(productUrl, sourceHtml)
  ]

  if (keywordCandidates.length === 0) {
    if (sourceStatus && sourceStatus >= 400) {
      throw createError({
        statusCode: 422,
        statusMessage: `來源網站回應 ${sourceStatus}，而且網址裡也找不到可搜尋的商品關鍵字。`
      })
    }

    throw createError({ statusCode: 422, statusMessage: '無法從商品頁或網址抓到可用的搜尋關鍵字。' })
  }

  // 3) Search BigGo JSON API with a small, ranked keyword set (not HTML scraping).
  const matched = await tryKeywordSearch(rawUrl, keywordCandidates, sourceStatus)
  if (matched) {
    setCache(responseCacheKey, matched)
    return matched
  }

  const fallbackKeyword = keywordCandidates[0]
  return {
    sourceUrl: rawUrl,
    keyword: fallbackKeyword,
    productTitle: inferProductTitle(productUrl, fallbackKeyword, sourceHtml),
    currentPrice: null,
    historicalHigh: null,
    historicalLow: null,
    series: [],
    sourceStatus,
    biggoUrl: buildBiggoSearchUrl(fallbackKeyword),
    lookupMode: 'search-link',
    notice: sourceStatus && sourceStatus >= 400
      ? `來源商品頁回應 ${sourceStatus}，且 BigGo 目前沒有可解析的價格資料。`
      : 'BigGo 目前沒有可解析的價格資料，請開啟搜尋結果人工確認。'
  } satisfies LookupResult
})
