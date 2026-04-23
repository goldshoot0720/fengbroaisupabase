const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8'
}

type StoreVariant = {
  variantLabel: string
  displayName: string
  priceLabel: string
  numericPrice: number | null
  url: string
}

type StoreResult = {
  source: '地標網通' | '傑昇通信'
  brandLabel: string
  productName: string
  productUrl: string
  variants: StoreVariant[]
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

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: `無法讀取來源頁面：${response.status}` })
  }
  return await response.text()
}

const normalizeText = (value: string) => value
  .toLowerCase()
  .replace(/galaxy/gi, '')
  .replace(/iphone/gi, 'iphone')
  .replace(/apple/gi, 'apple')
  .replace(/samsung/gi, 'samsung')
  .replace(/[()]/g, ' ')
  .replace(/[\s\-_/]+/g, '')

const inferBrands = (keyword: string) => {
  const normalized = keyword.toLowerCase()
  if (normalized.includes('iphone') || normalized.includes('apple')) {
    return [{ brand: 'apple', brandLabel: 'Apple' }]
  }
  if (normalized.includes('samsung') || normalized.includes('galaxy') || /\b[as]\d{2}\b/i.test(normalized)) {
    return [{ brand: 'samsung', brandLabel: 'Samsung' }]
  }
  return [
    { brand: 'samsung', brandLabel: 'Samsung' },
    { brand: 'apple', brandLabel: 'Apple' }
  ]
}

const scoreCandidate = (name: string, keyword: string) => {
  const normalizedName = normalizeText(name)
  const normalizedKeyword = normalizeText(keyword)
  if (normalizedName === normalizedKeyword) return 100
  if (normalizedName.includes(normalizedKeyword)) return 82
  if (normalizedKeyword.includes(normalizedName)) return 70

  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean)
  let score = tokens.reduce((total, token) => total + (normalizedName.includes(normalizeText(token)) ? 12 : 0), 0)

  const compactKeyword = normalizeText(keyword)
  const numericTokens = compactKeyword.match(/\d+[a-z]?/gi) || []
  for (const token of numericTokens) {
    if (normalizedName.includes(token)) score += 24
  }

  if (/^a\d{2}$/i.test(compactKeyword) && normalizedName.includes(compactKeyword)) score += 36
  if (/^s\d{2}$/i.test(compactKeyword) && normalizedName.includes(compactKeyword)) score += 36
  if (/^\d{2}$/i.test(compactKeyword) && /samsung|galaxy/i.test(name) && normalizedName.includes(`a${compactKeyword}`)) score += 40
  if (/^\d{2}$/i.test(compactKeyword) && /iphone/i.test(name) && normalizedName.includes(`iphone${compactKeyword}`)) score += 20

  return score
}

const normalizeVariantLabel = (value: string) => value.trim().replace(/\s+/g, '')

const parseVariantFromName = (name: string) => {
  const normalized = name.replace(/\s+/g, ' ')
  const match = normalized.match(/(\d+G\/\d+G(?:B)?|\d+G(?:B)?)/i)
  return match ? normalizeVariantLabel(match[1].replace(/GB/gi, 'G')) : ''
}

const createVariantDisplayName = (name: string, variantLabel: string) => {
  const baseName = name
    .replace(/\s+/g, ' ')
    .replace(/\(\s*([^)]+)\s*\)/g, ' $1')
    .trim()
    .replace(new RegExp(`${variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
    .trim()

  const prettyVariant = variantLabel.replace(/GB/gi, 'G')
  return `${baseName} ${prettyVariant}`.trim()
}

const parseLandtopStorageOptions = (text: string) => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const storageIndex = lines.indexOf('儲存空間')
  if (storageIndex === -1) return []

  const endLabels = ['顏色', '建議售價', '地標最低價', '產品資訊']
  const endIndexCandidates = endLabels
    .map(label => lines.indexOf(label, storageIndex + 1))
    .filter(index => index !== -1)

  const endIndex = endIndexCandidates.length > 0 ? Math.min(...endIndexCandidates) : Math.min(storageIndex + 10, lines.length)
  return lines
    .slice(storageIndex + 1, endIndex)
    .filter(line => /(\d+G\/\d+G(?:B)?|\d+G(?:B)?)/i.test(line))
    .map(normalizeVariantLabel)
}

const parseLandtopSelectedPrice = (text: string, productName: string) => {
  const productPattern = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const directMatch = text.match(new RegExp(`${productPattern}\\s+([^|\\n]+?)\\s*\\|[\\s\\S]{0,120}?地標最低價[\\s\\S]{0,80}?(挑戰手機最低價|\\$[\\d,]+)`, 'i'))
  if (directMatch) {
    return {
      variantLabel: normalizeVariantLabel(directMatch[1]),
      priceLabel: directMatch[2]
    }
  }

  const fallbackPrice = text.match(/地標最低價[\s\S]{0,80}?(挑戰手機最低價|\$[\d,]+)/i)?.[1]
  return {
    variantLabel: '',
    priceLabel: fallbackPrice || '查無公開價格'
  }
}

const fetchLandtopResult = async (keyword: string): Promise<StoreResult> => {
  const brands = inferBrands(keyword)
  const candidates: Array<{ name: string, url: string, score: number, brandLabel: string }> = []

  for (const brandItem of brands) {
    const brandHtml = await fetchText(`https://www.landtop.com.tw/brands?brand=${brandItem.brand}`)
    for (const match of brandHtml.matchAll(/href="(\/products\/[^"]+)"[\s\S]{0,260}?>[\s\S]{0,140}?<\/a>/gi)) {
      const chunk = match[0]
      const names = (chunk.match(/>([^<>]+)</g) || [])
        .map(part => part.replace(/[<>]/g, '').trim())
        .filter(Boolean)
      const name = names.find(value => /iphone|samsung|galaxy|apple/i.test(value))
      if (!name) continue

      candidates.push({
        name: decodeEntities(name),
        url: `https://www.landtop.com.tw${match[1]}`,
        brandLabel: brandItem.brandLabel,
        score: scoreCandidate(name, keyword)
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const bestMatch = candidates.find(candidate => candidate.score > 0)
  if (!bestMatch) {
    throw createError({ statusCode: 404, statusMessage: '地標網通找不到相符型號。' })
  }

  const detailHtml = await fetchText(bestMatch.url)
  const detailText = stripTags(detailHtml)
  const storageOptions = parseLandtopStorageOptions(detailText)
  const selected = parseLandtopSelectedPrice(detailText, bestMatch.name)
  const variantLabels = storageOptions.length > 0 ? storageOptions : (selected.variantLabel ? [selected.variantLabel] : [])

  const variants = variantLabels.map((variantLabel) => {
    const variantPattern = variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const exactPrice = detailText.match(new RegExp(`${variantPattern}[\\s\\S]{0,120}?(挑戰手機最低價|\\$[\\d,]+)`, 'i'))?.[1]
    const priceLabel = exactPrice || selected.priceLabel || '查無公開價格'
    const numericPrice = /^\$[\d,]+$/.test(priceLabel) ? Number(priceLabel.replace(/[^\d]/g, '')) : null

    return {
      variantLabel,
      displayName: createVariantDisplayName(bestMatch.name, variantLabel),
      priceLabel,
      numericPrice,
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

const fetchJyesResult = async (keyword: string): Promise<StoreResult> => {
  const searchHtml = await fetchText(`https://www.jyes.com.tw/product.php?keywords=${encodeURIComponent(keyword)}`)
  const text = stripTags(searchHtml)
  const candidates: Array<{ name: string, url: string, score: number, priceLabel: string, numericPrice: number | null }> = []

  for (const match of text.matchAll(/商品名稱\s*:\s*([^\n|]+?)[\s\S]{0,160}?空機破盤價\s*:\s*\$([\d,]+)/g)) {
    const name = decodeEntities(match[1]).trim()
    const numericPrice = Number(match[2].replace(/,/g, ''))
    const urlSlug = name
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    candidates.push({
      name,
      score: scoreCandidate(name, keyword),
      url: `https://www.jyes.com.tw/product/${urlSlug}`,
      priceLabel: `$${numericPrice.toLocaleString('en-US')}`,
      numericPrice
    })
  }

  candidates.sort((a, b) => b.score - a.score)
  const topScore = candidates[0]?.score || 0
  if (topScore <= 0) {
    throw createError({ statusCode: 404, statusMessage: '傑昇通信找不到相符型號。' })
  }

  const topCandidates = candidates.filter(candidate => candidate.score >= topScore - 8)
  const primaryCandidate = topCandidates[0]
  const familyName = primaryCandidate.name
    .replace(/\(\s*[^)]+\s*\)\s*$/g, '')
    .replace(/\s+\d+G\/\d+G(?:B)?$/i, '')
    .replace(/\s+\d+G(?:B)?$/i, '')
    .trim()

  const variants = topCandidates
    .map(candidate => {
      const variantLabel = parseVariantFromName(candidate.name)
      if (!variantLabel) return null

      return {
        variantLabel,
        displayName: createVariantDisplayName(candidate.name, variantLabel),
        priceLabel: candidate.priceLabel,
        numericPrice: candidate.numericPrice,
        url: candidate.url
      }
    })
    .filter((value): value is StoreVariant => Boolean(value))

  return {
    source: '傑昇通信',
    brandLabel: /iphone|apple/i.test(primaryCandidate.name) ? 'Apple' : 'Samsung',
    productName: familyName,
    productUrl: primaryCandidate.url,
    variants
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword?: string }>(event)
  const keyword = String(body?.keyword || '').trim()

  if (!keyword) {
    throw createError({ statusCode: 400, statusMessage: '請先輸入查詢型號。' })
  }

  const [landtop, jyes] = await Promise.all([
    fetchLandtopResult(keyword),
    fetchJyesResult(keyword)
  ])

  const variantMap = new Map<string, {
    label: string
    displayName: string
    sources: Array<{ source: string, priceLabel: string, numericPrice: number | null, url: string }>
  }>()

  for (const sourceResult of [landtop, jyes]) {
    for (const variant of sourceResult.variants) {
      const existing = variantMap.get(variant.variantLabel) || {
        label: variant.variantLabel,
        displayName: variant.displayName,
        sources: []
      }

      existing.displayName = existing.displayName || variant.displayName
      existing.sources.push({
        source: sourceResult.source,
        priceLabel: variant.priceLabel,
        numericPrice: variant.numericPrice,
        url: variant.url
      })
      variantMap.set(variant.variantLabel, existing)
    }
  }

  const comparison = Array.from(variantMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'en'))

  return {
    keyword,
    brandLabel: landtop.brandLabel || jyes.brandLabel,
    productName: landtop.productName || jyes.productName,
    stores: [landtop, jyes],
    comparison
  }
})
