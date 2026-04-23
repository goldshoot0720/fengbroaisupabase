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

const extractProductCandidates = (html: string) => {
  const candidates: Array<{ name: string, url: string }> = []
  for (const match of html.matchAll(/href="(\/products\/[^"]+)"[\s\S]{0,240}?>[\s\S]{0,120}?<\/a>/gi)) {
    const chunk = match[0]
    const nameMatch = chunk.match(/>([^<>]+)</g)
    const names = (nameMatch || [])
      .map(part => part.replace(/[<>]/g, '').trim())
      .filter(Boolean)
    const name = names.find(value => /iphone|samsung|galaxy|apple/i.test(value))
    if (name) {
      candidates.push({ name: decodeEntities(name), url: `https://www.landtop.com.tw${match[1]}` })
    }
  }
  return candidates
}

const scoreCandidate = (name: string, keyword: string) => {
  const normalizedName = normalizeText(name)
  const normalizedKeyword = normalizeText(keyword)
  if (normalizedName === normalizedKeyword) return 100
  if (normalizedName.includes(normalizedKeyword)) return 80
  if (normalizedKeyword.includes(normalizedName)) return 70

  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean)
  let score = tokens.reduce((total, token) => total + (normalizedName.includes(normalizeText(token)) ? 12 : 0), 0)

  const compactKeyword = normalizeText(keyword)
  const numericTokens = compactKeyword.match(/\d+[a-z]?/gi) || []
  for (const token of numericTokens) {
    if (normalizedName.includes(token)) score += 24
  }

  if (/^a\d{2}$/i.test(compactKeyword) && normalizedName.includes(compactKeyword)) score += 30
  if (/^s\d{2}$/i.test(compactKeyword) && normalizedName.includes(compactKeyword)) score += 30
  if (/^\d{2}$/i.test(compactKeyword) && /samsung|galaxy/.test(name.toLowerCase()) && normalizedName.includes(`a${compactKeyword}`)) score += 35
  if (/^\d{2}$/i.test(compactKeyword) && /iphone/.test(name.toLowerCase()) && normalizedName.includes(`iphone${compactKeyword}`)) score += 20

  return score
}

const normalizeVariantLabel = (value: string) => value.trim().replace(/\s+/g, '')

const parseStorageOptions = (text: string) => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const storageIndex = lines.indexOf('儲存空間')
  if (storageIndex === -1) return []

  const endIndexCandidates = ['顏色', '建議售價', '地標最低價', '產品資訊']
    .map(label => lines.indexOf(label, storageIndex + 1))
    .filter(index => index !== -1)

  const endIndex = endIndexCandidates.length > 0 ? Math.min(...endIndexCandidates) : Math.min(storageIndex + 10, lines.length)
  return lines
    .slice(storageIndex + 1, endIndex)
    .filter(line => /(\d+G\/\d+G(B)?|\d+GB)/i.test(line))
    .map(normalizeVariantLabel)
}

const parseSelectedVariantPrice = (text: string, productName: string) => {
  const directMatch = text.match(new RegExp(`${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([^|\\n]+?)\\s*\\|[\\s\\S]{0,120}?地標最低價[\\s\\S]{0,80}?(挑戰手機最低價|\\$[\\d,]+)`, 'i'))
  if (directMatch) {
    return {
      variantLabel: normalizeVariantLabel(directMatch[1]),
      priceLabel: directMatch[2]
    }
  }

  const fallbackPrice = text.match(/地標最低價[\s\S]{0,80}?(挑戰手機最低價|\$[\d,]+)/i)?.[1]
  return {
    variantLabel: '',
    priceLabel: fallbackPrice || ''
  }
}

const parseVariantsFromDetail = (productName: string, detailHtml: string) => {
  const text = stripTags(detailHtml)
  const storageOptions = parseStorageOptions(text)
  const selected = parseSelectedVariantPrice(text, productName)
  const basePriceLabel = selected.priceLabel || '查無公開價格'
  const variantLabels = storageOptions.length > 0 ? storageOptions : (selected.variantLabel ? [selected.variantLabel] : [])

  return variantLabels.map((variantLabel, index) => {
    const exactPrice = text.match(new RegExp(`${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+${variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|[\\s\\S]{0,120}?(挑戰手機最低價|\\$[\\d,]+)`, 'i'))?.[1]
    const nearbyPrice = text.match(new RegExp(`${variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,120}?(挑戰手機最低價|\\$[\\d,]+)`, 'i'))?.[1]
    const priceLabel = exactPrice || nearbyPrice || (index === 0 || !selected.variantLabel || selected.variantLabel === variantLabel ? basePriceLabel : basePriceLabel)
    const numericPrice = priceLabel.startsWith('$') ? Number(priceLabel.replace(/[^\d]/g, '')) : null

    return {
      label: variantLabel,
      displayName: `${productName} ${variantLabel.replace(/G$/, 'GB')}`,
      priceLabel,
      numericPrice,
      statusText: numericPrice ? '目前售價' : priceLabel
    }
  })
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword?: string }>(event)
  const keyword = String(body?.keyword || '').trim()

  if (!keyword) {
    throw createError({ statusCode: 400, statusMessage: '請先輸入查詢型號。' })
  }

  const brands = inferBrands(keyword)
  const candidates: Array<{ name: string, url: string, score: number, brand: string, brandLabel: string }> = []

  for (const brandItem of brands) {
    const brandHtml = await fetchText(`https://www.landtop.com.tw/brands?brand=${brandItem.brand}`)
    candidates.push(
      ...extractProductCandidates(brandHtml)
        .map(candidate => ({
          ...candidate,
          brand: brandItem.brand,
          brandLabel: brandItem.brandLabel,
          score: scoreCandidate(candidate.name, keyword)
        }))
        .filter(candidate => candidate.score > 0)
    )
  }

  candidates.sort((a, b) => b.score - a.score)

  const bestMatch = candidates[0]
  if (!bestMatch) {
    throw createError({ statusCode: 404, statusMessage: '地標網通找不到相符型號。' })
  }

  const detailHtml = await fetchText(bestMatch.url)
  const variants = parseVariantsFromDetail(bestMatch.name, detailHtml)

  return {
    keyword,
    brand: bestMatch.brand,
    brandLabel: bestMatch.brandLabel,
    productName: bestMatch.name,
    productUrl: bestMatch.url,
    variants
  }
})
