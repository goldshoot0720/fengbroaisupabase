// utils/landtopLookup.js
// Framework-agnostic 手機比價 (地標網通 + 傑昇通信) lookup logic.
// Shared by server/api/feng-tools/landtop.post.ts (on-demand user lookups)
// and netlify/functions/landtop-history-cron.js (weekly persisted snapshots),
// so both entry points scrape and score candidates identically.

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8'
}

/** Error carrying an HTTP-style statusCode/statusMessage, usable outside Nitro's createError(). */
export class LandtopLookupError extends Error {
  constructor(statusCode, statusMessage) {
    super(statusMessage)
    this.name = 'LandtopLookupError'
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }
}

const decodeEntities = (value) => value
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')

const stripTags = (html) => decodeEntities(
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
)
  .replace(/\r/g, '')
  .replace(/\n{2,}/g, '\n')
  .trim()

const fetchText = async (url) => {
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) {
    throw new LandtopLookupError(response.status, `抓取頁面失敗：${response.status}`)
  }

  return await response.text()
}

const normalizeText = (value) => value
  .toLowerCase()
  .replace(/三星/gi, 'samsung')
  .replace(/蘋果/gi, 'apple')
  .replace(/galaxy/gi, '')
  .replace(/iphone/gi, 'iphone')
  .replace(/apple/gi, 'apple')
  .replace(/samsung/gi, 'samsung')
  .replace(/[()（）【】\[\]{}]/g, ' ')
  .replace(/[\s\-_/]+/g, '')

const inferBrands = (keyword) => {
  const normalized = keyword.toLowerCase()
  if (normalized.includes('iphone') || normalized.includes('apple')) {
    return [{ brand: 'apple', brandLabel: 'Apple' }]
  }

  if (
    normalized.includes('samsung') ||
    normalized.includes('galaxy') ||
    normalized.includes('三星') ||
    /\b[as]\d{2}\b/i.test(normalized) ||
    /^\d{2}$/i.test(normalized)
  ) {
    return [{ brand: 'samsung', brandLabel: 'Samsung' }]
  }

  return [
    { brand: 'samsung', brandLabel: 'Samsung' },
    { brand: 'apple', brandLabel: 'Apple' }
  ]
}

const scoreCandidate = (name, keyword) => {
  const normalizedName = normalizeText(name)
  const normalizedKeyword = normalizeText(keyword)

  if (normalizedName === normalizedKeyword) return 100
  if (normalizedName.includes(normalizedKeyword)) return 84
  if (normalizedKeyword.includes(normalizedName)) return 72

  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean)
  let score = tokens.reduce((total, token) => {
    return total + (normalizedName.includes(normalizeText(token)) ? 12 : 0)
  }, 0)

  const compactKeyword = normalizeText(keyword)
  const numericTokens = compactKeyword.match(/\d+[a-z]?/gi) || []
  for (const token of numericTokens) {
    if (normalizedName.includes(token)) score += 24
  }

  if (/^a\d{2}$/i.test(compactKeyword) && normalizedName.includes(compactKeyword)) score += 40
  if (/^s\d{2}$/i.test(compactKeyword) && normalizedName.includes(compactKeyword)) {
    score += 40
    if (!/(fe|plus|ultra|edge|\+)/i.test(normalizedName)) score += 20
    if (/(fe|plus|ultra|edge|\+)/i.test(normalizedName)) score -= 12
  }
  if (/^\d{2}$/i.test(compactKeyword) && /samsung|galaxy|三星/i.test(name) && normalizedName.includes(`a${compactKeyword}`)) score += 44
  if (/^\d{2}$/i.test(compactKeyword) && /iphone|apple|蘋果/i.test(name) && normalizedName.includes(`iphone${compactKeyword}`)) score += 24

  return score
}

const unique = (items) => [...new Set(items)]

const normalizeVariantLabel = (value) => value.trim().replace(/\s+/g, '').replace(/GB/gi, 'G')

const parseVariantFromName = (name) => {
  const normalizedName = name.replace(/\s+/g, ' ')
  const pairMatch = normalizedName.match(/(\d+G\/\d+G(?:B)?)/i)
  if (pairMatch) return normalizeVariantLabel(pairMatch[1])

  return ''
}

const createVariantDisplayName = (name, variantLabel) => {
  const cleaned = name
    .replace(/\s+/g, ' ')
    .replace(/\(\s*([^)]+)\s*\)/g, ' $1')
    .trim()

  if (!variantLabel) return cleaned

  const escaped = variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return cleaned.replace(new RegExp(`${escaped}$`, 'i'), '').trim() + ` ${variantLabel}`
}

const normalizePriceLabel = (value) => {
  const cleaned = decodeEntities(value).replace(/\s+/g, '')
  if (!cleaned) return '查無公開價格'
  if (/^\$?[\d,]+$/.test(cleaned)) {
    const numeric = Number(cleaned.replace(/[^\d]/g, ''))
    return `$${numeric.toLocaleString('en-US')}`
  }
  if (cleaned.includes('最低價')) return '挑戰手機最低價'
  if (cleaned.includes('門市')) return '特價請洽門市'
  return cleaned
}

const toNumericPrice = (priceLabel) => {
  if (!/^\$[\d,]+$/.test(priceLabel)) return null
  return Number(priceLabel.replace(/[^\d]/g, ''))
}

const parseLandtopStorageOptions = (text) => {
  const pairMatches = unique(
    Array.from(text.matchAll(/(\d+G\/\d+G(?:B)?)/gi))
      .map(match => normalizeVariantLabel(match[1]))
  )

  if (pairMatches.length > 0) return pairMatches

  return unique(
    Array.from(text.matchAll(/(\d+G(?:B)?)/gi))
      .map(match => normalizeVariantLabel(match[1]))
  )
}

const parseLandtopPriceForVariant = (text, variantLabel) => {
  const escaped = variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exact = text.match(new RegExp(`${escaped}[\\s\\S]{0,120}?(\\$[\\d,]+|挑戰手機最低價|特價請洽門市)`, 'i'))?.[1]
  if (exact) return normalizePriceLabel(exact)

  const fallback = text.match(/(\$[\d,]+|挑戰手機最低價|特價請洽門市)/i)?.[1]
  return normalizePriceLabel(fallback || '')
}

const fetchLandtopResult = async (keyword) => {
  const brands = inferBrands(keyword)
  const candidates = []

  for (const brandItem of brands) {
    const brandHtml = await fetchText(`https://www.landtop.com.tw/brands?brand=${brandItem.brand}`)
    for (const match of brandHtml.matchAll(/href="(\/products\/[^"]+)"[\s\S]{0,320}?>([\s\S]{0,180}?)<\/a>/gi)) {
      const rawText = stripTags(match[2]).split('\n').map(line => line.trim()).filter(Boolean)
      const name = rawText.find(value => /iphone|apple|samsung|galaxy|三星|蘋果/i.test(value))
      if (!name) continue

      candidates.push({
        name,
        url: `https://www.landtop.com.tw${match[1]}`,
        brandLabel: brandItem.brandLabel,
        score: scoreCandidate(name, keyword)
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const bestMatch = candidates.find(item => item.score > 0)
  if (!bestMatch) {
    throw new LandtopLookupError(404, '地標網通找不到相符型號。')
  }

  const detailHtml = await fetchText(bestMatch.url)
  const detailText = stripTags(detailHtml)
  const variantLabels = parseLandtopStorageOptions(detailText)
  const variants = (variantLabels.length > 0 ? variantLabels : [''])
    .map((variantLabel) => {
      const priceLabel = variantLabel
        ? parseLandtopPriceForVariant(detailText, variantLabel)
        : normalizePriceLabel(detailText.match(/(\$[\d,]+|挑戰手機最低價|特價請洽門市)/i)?.[1] || '')

      return {
        variantLabel: variantLabel || '單一版本',
        displayName: variantLabel ? createVariantDisplayName(bestMatch.name, variantLabel) : bestMatch.name,
        priceLabel,
        numericPrice: toNumericPrice(priceLabel),
        url: bestMatch.url
      }
    })

  return {
    source: '地標網通',
    brandLabel: bestMatch.brandLabel,
    productName: bestMatch.name,
    productUrl: bestMatch.url,
    variants
  }
}

const JYES_CATEGORY_MAP = {
  apple: {
    url: 'https://www.jyes.com.tw/product.php?act=list&cid=1',
    brandLabel: 'Apple'
  },
  samsung: {
    url: 'https://www.jyes.com.tw/product.php?act=list&cid=2',
    brandLabel: 'Samsung'
  }
}

const parseJsonLdCandidates = (html) => {
  const candidates = []

  const collectProduct = (product) => {
    const name = String(product?.name || product?.sku || '').trim()
    const url = String(product?.url || '').trim()
    const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers
    const price = offer?.price
    if (!name || !url || price === undefined || price === null) return

    const priceLabel = normalizePriceLabel(String(price))
    candidates.push({
      name,
      url,
      priceLabel,
      numericPrice: toNumericPrice(priceLabel)
    })
  }

  const visit = (value) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (typeof value !== 'object') return

    if (value['@type'] === 'Product') collectProduct(value)
    if (value.item && value.item['@type'] === 'Product') collectProduct(value.item)
    if (value.itemListElement) visit(value.itemListElement)
    if (value['@graph']) visit(value['@graph'])
  }

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1]))
    } catch {
      continue
    }
  }

  return candidates
}

const parseJyesCandidates = (html, baseUrl) => {
  const structuredCandidates = parseJsonLdCandidates(html)
  if (structuredCandidates.length > 0) return structuredCandidates

  const results = []
  const blockRegex = /商品名稱\s*[:：][\s\S]{0,260}?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,420}?(?:空機破盤價|門市破盤價)\s*[:：][\s\S]{0,80}?((?:\$[\d,]+)|挑戰手機最低價|特價請洽門市)/gi

  for (const match of html.matchAll(blockRegex)) {
    const href = match[1]
    const name = stripTags(match[2]).replace(/\s+/g, ' ').trim()
    if (!name) continue

    const priceLabel = normalizePriceLabel(match[3])
    const url = href.startsWith('http') ? href : new URL(href, baseUrl).toString()

    results.push({
      name,
      url,
      priceLabel,
      numericPrice: toNumericPrice(priceLabel)
    })
  }

  if (results.length > 0) return results

  const text = stripTags(html)
  const segments = text.split('商品名稱 :').slice(1)
  for (const segment of segments) {
    const lines = segment.split('\n').map(line => line.trim()).filter(Boolean)
    const name = lines[0]
    if (!name) continue

    const priceIndex = lines.findIndex(line => line.includes('空機破盤價') || line.includes('門市破盤價'))
    const nextLine = priceIndex >= 0 ? lines[priceIndex + 1] || '' : ''
    const priceLine = /^\$[\d,]+$/.test(nextLine) || nextLine.includes('最低價') || nextLine.includes('門市')
      ? nextLine
      : ''
    if (!priceLine) continue
    const priceLabel = normalizePriceLabel(priceLine || '')

    results.push({
      name,
      url: baseUrl,
      priceLabel,
      numericPrice: toNumericPrice(priceLabel)
    })
  }

  return results
}

const fetchJyesResult = async (keyword) => {
  const brands = inferBrands(keyword)
  const candidates = []
  const fetchedUrls = new Set()

  for (const brandItem of brands) {
    const category = JYES_CATEGORY_MAP[brandItem.brand]
    const searchUrl = `https://www.jyes.com.tw/product.php?keywords=${encodeURIComponent(keyword)}`
    const urls = unique([searchUrl, category.url])

    for (const url of urls) {
      if (fetchedUrls.has(url)) continue
      fetchedUrls.add(url)

      const html = await fetchText(url)
      const parsed = parseJyesCandidates(html, url)

      for (const item of parsed) {
        candidates.push({
          ...item,
          brandLabel: category.brandLabel,
          score: scoreCandidate(item.name, keyword)
        })
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const topScore = candidates[0]?.score || 0
  if (topScore <= 0) {
    throw new LandtopLookupError(404, '傑昇通信找不到相符型號。')
  }

  const matched = candidates.filter(item => item.score >= topScore - 8)
  const primary = matched[0]
  const familyName = primary.name
    .replace(/\(\s*[^)]+\s*\)\s*$/g, '')
    .replace(/\s+\d+G\/\d+G(?:B)?$/i, '')
    .replace(/\s+\d+G(?:B)?$/i, '')
    .trim()

  const variants = matched
    .map((item) => {
      const variantLabel = parseVariantFromName(item.name)
      if (!variantLabel) return null

      return {
        variantLabel,
        displayName: createVariantDisplayName(item.name, variantLabel),
        priceLabel: item.priceLabel,
        numericPrice: item.numericPrice,
        url: item.url
      }
    })
    .filter(Boolean)

  return {
    source: '傑昇通信',
    brandLabel: primary.brandLabel,
    productName: familyName || primary.name,
    productUrl: primary.url,
    variants
  }
}

/**
 * Look up a phone keyword across 地標網通 + 傑昇通信 and return the merged
 * per-variant comparison. Throws LandtopLookupError when neither source matches.
 */
export const compareLandtopAndJyes = async (keyword) => {
  const trimmed = String(keyword || '').trim()
  if (!trimmed) {
    throw new LandtopLookupError(400, '請輸入要查詢的型號。')
  }

  const [landtopResult, jyesResult] = await Promise.allSettled([
    fetchLandtopResult(trimmed),
    fetchJyesResult(trimmed)
  ])
  const stores = [landtopResult, jyesResult]
    .filter((result) => result.status === 'fulfilled')
    .map(result => result.value)

  if (stores.length === 0) {
    const errors = [landtopResult, jyesResult]
      .filter((result) => result.status === 'rejected')
      .map(result => result.reason?.statusMessage || result.reason?.message)
      .filter(Boolean)

    throw new LandtopLookupError(404, errors.join('；') || '手機比價找不到相符型號。')
  }

  const variantMap = new Map()

  for (const store of stores) {
    for (const variant of store.variants) {
      const key = variant.variantLabel
      const current = variantMap.get(key) || {
        label: key,
        displayName: variant.displayName,
        sources: []
      }

      current.displayName = current.displayName || variant.displayName
      const nextSource = {
        source: store.source,
        priceLabel: variant.priceLabel,
        numericPrice: variant.numericPrice,
        url: variant.url
      }
      const existingSourceIndex = current.sources.findIndex(source => source.source === store.source)
      if (existingSourceIndex === -1) {
        current.sources.push(nextSource)
      } else {
        const existingSource = current.sources[existingSourceIndex]
        const shouldReplace = !Number.isFinite(existingSource.numericPrice) ||
          (Number.isFinite(nextSource.numericPrice) && Number(nextSource.numericPrice) < Number(existingSource.numericPrice))
        if (shouldReplace) current.sources[existingSourceIndex] = nextSource
      }
      variantMap.set(key, current)
    }
  }

  const primaryStore = stores[0]

  return {
    keyword: trimmed,
    brandLabel: primaryStore.brandLabel,
    productName: primaryStore.productName,
    stores,
    comparison: Array.from(variantMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'en'))
  }
}

/**
 * Flattens a comparison array into the same `{ "<variant>__<source>": price }`
 * series shape the client stores per history snapshot, so on-demand lookups
 * (browser) and the weekly cron write identical row shapes.
 */
export const buildLandtopSnapshotSeries = (comparison) => Object.fromEntries(
  (comparison || []).flatMap(item =>
    (item.sources || []).map(source => [`${item.label}__${source.source}`, source.numericPrice ?? null])
  )
)
