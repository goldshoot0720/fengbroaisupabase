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

const inferBrand = (keyword: string) => {
  const normalized = keyword.toLowerCase()
  if (normalized.includes('iphone') || normalized.includes('apple')) {
    return { brand: 'apple', brandLabel: 'Apple' }
  }
  if (normalized.includes('samsung') || /\bs\d{2}\b/i.test(normalized)) {
    return { brand: 'samsung', brandLabel: 'Samsung' }
  }
  return { brand: 'apple', brandLabel: 'Apple' }
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
  return tokens.reduce((score, token) => score + (normalizedName.includes(normalizeText(token)) ? 12 : 0), 0)
}

const parseVariantsFromDetail = (productName: string, detailHtml: string, keyword: string) => {
  const text = stripTags(detailHtml)
  const preferredVariants = /iphone/i.test(keyword)
    ? ['256GB', '512GB']
    : ['12G/256G', '12G/512G']

  return preferredVariants.map((variantLabel) => {
    const variantsRegex = new RegExp(`${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,220}?(挑戰手機最低價|\\$[\\d,]+)`, 'i')
    const directMatch = text.match(variantsRegex)
    const nearbyMatch = directMatch?.[1] || text.match(new RegExp(`${variantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,220}?(挑戰手機最低價|\\$[\\d,]+)`, 'i'))?.[1]

    const priceLabel = nearbyMatch || '查無公開價格'
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

  const { brand, brandLabel } = inferBrand(keyword)
  const brandHtml = await fetchText(`https://www.landtop.com.tw/brands?brand=${brand}`)
  const candidates = extractProductCandidates(brandHtml)
    .map(candidate => ({ ...candidate, score: scoreCandidate(candidate.name, keyword) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score)

  const bestMatch = candidates[0]
  if (!bestMatch) {
    throw createError({ statusCode: 404, statusMessage: '地標網通找不到相符型號。' })
  }

  const detailHtml = await fetchText(bestMatch.url)
  const variants = parseVariantsFromDetail(bestMatch.name, detailHtml, keyword)

  return {
    keyword,
    brand,
    brandLabel,
    productName: bestMatch.name,
    productUrl: bestMatch.url,
    variants
  }
})
