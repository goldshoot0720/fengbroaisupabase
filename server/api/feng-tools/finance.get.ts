import { FENG_FINANCE_INSTRUMENTS } from '../../../utils/fengFinanceInstruments'

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8',
  'cache-control': 'no-cache',
  pragma: 'no-cache'
}

const CACHE_TTL_MS = 5 * 60 * 1000
const PRICE_TOLERANCE = 0.0001
const SHILLER_PE_HISTORICAL_HIGH = 44.19
const SHILLER_PE_HISTORICAL_HIGH_LABEL = 'Dec 1999'

type FinanceItem = {
  id: string
  name: string
  symbol: string
  group: string
  url: string
  source?: string
  last: number | null
  lastLabel: string
  change: number | null
  changePercent: number | null
  week52High: number | null
  week52Low: number | null
  highLabel?: string
  lowLabel?: string
  statusLabel?: string
  status: 'new-high' | 'new-low' | ''
  error: string
}

type FinanceResponse = {
  fetchedAt: string
  source: string
  items: FinanceItem[]
}

let financeCache: { expiresAt: number, data: FinanceResponse } | null = null

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
    .replace(/<[^>]+>/g, ' ')
)
  .replace(/\s+/g, ' ')
  .trim()

const toNumber = (value: string | undefined | null) => {
  if (!value) return null
  const normalized = value.replace(/,/g, '').replace(/−/g, '-').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatValue = (value: number | null) => {
  if (value === null) return '--'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 100 ? 2 : 4
  }).format(value)
}

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow'
  })

  if (!response.ok) {
    throw new Error(`CNBC 抓取失敗：${response.status}`)
  }

  return await response.text()
}

const parseNumberAfterLabel = (text: string, labels: string[]) => {
  for (const label of labels) {
    const index = text.toLowerCase().indexOf(label.toLowerCase())
    if (index === -1) continue

    const segment = text
      .slice(index + label.length, index + label.length + 180)
      .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[A-Z]*/gi, ' ')
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, ' ')

    const match = segment.match(/[+-]?\d[\d,]*(?:\.\d+)?/)
    const value = toNumber(match?.[0])
    if (value !== null) return value
  }

  return null
}

const parseRangeAfterLabel = (text: string, labels: string[]) => {
  for (const label of labels) {
    const index = text.toLowerCase().indexOf(label.toLowerCase())
    if (index === -1) continue

    const segment = text.slice(index + label.length, index + label.length + 220)
    const numbers = Array.from(segment.matchAll(/[+-]?\d[\d,]*(?:\.\d+)?/g))
      .map(match => toNumber(match[0]))
      .filter((value): value is number => value !== null)

    if (numbers.length >= 2) {
      return {
        low: Math.min(numbers[0], numbers[1]),
        high: Math.max(numbers[0], numbers[1])
      }
    }
  }

  return { low: null, high: null }
}

const parseChange = (text: string, last: number | null) => {
  if (last === null) return { change: null, changePercent: null }
  const lastIndex = text.indexOf(formatValue(last).replace(/\.?0+$/, ''))
  const segment = lastIndex >= 0 ? text.slice(lastIndex, lastIndex + 180) : text
  const percent = toNumber(segment.match(/[+-]?\d+(?:\.\d+)?\s*%/)?.[0]?.replace('%', ''))
  const values = Array.from(segment.matchAll(/[+-]\d[\d,]*(?:\.\d+)?/g)).map(match => toNumber(match[0]))
  const change = values.find(value => value !== null && Math.abs(value) !== Math.abs(last)) ?? null

  return { change, changePercent: percent }
}

const parseYahooEmbeddedValue = (html: string, field: string) => {
  const patterns = [
    new RegExp(`"${field}"\\s*:\\s*\\{\\s*"raw"\\s*:\\s*([+-]?\\d[\\d,.]*)`, 'i'),
    new RegExp(`"${field}"\\s*:\\s*([+-]?\\d[\\d,.]*)`, 'i')
  ]

  for (const pattern of patterns) {
    const value = toNumber(html.match(pattern)?.[1])
    if (value !== null) return value
  }

  return null
}

const parseYahooQuote = (html: string) => {
  const text = stripTags(html)
  const last = parseYahooEmbeddedValue(html, 'regularMarketPrice')
    ?? parseNumberAfterLabel(text, ['成交', 'Price', 'Last Price'])
  const change = parseYahooEmbeddedValue(html, 'regularMarketChange')
    ?? parseNumberAfterLabel(text, ['漲跌', 'Change'])
  const changePercent = parseYahooEmbeddedValue(html, 'regularMarketChangePercent')
    ?? parseNumberAfterLabel(text, ['漲跌幅', 'Change %'])
  const embeddedHigh = parseYahooEmbeddedValue(html, 'fiftyTwoWeekHigh')
  const embeddedLow = parseYahooEmbeddedValue(html, 'fiftyTwoWeekLow')
  const explicitHigh = parseNumberAfterLabel(text, ['一年內最高', '52 Week High', '52週高'])
  const explicitLow = parseNumberAfterLabel(text, ['一年內最低', '52 Week Low', '52週低'])
  const range = parseRangeAfterLabel(text, ['52 週波幅', '52週波幅', '52 week range', '52-week range', '52 wk range'])
  const week52High = embeddedHigh ?? explicitHigh ?? range.high
  const week52Low = embeddedLow ?? explicitLow ?? range.low

  let status: FinanceItem['status'] = ''
  if (last !== null && week52High !== null && last >= week52High - PRICE_TOLERANCE) status = 'new-high'
  if (last !== null && week52Low !== null && last <= week52Low + PRICE_TOLERANCE) status = 'new-low'

  return {
    last,
    lastLabel: formatValue(last),
    change,
    changePercent,
    week52High,
    week52Low,
    status
  }
}

const applyAlertThreshold = (
  parsed: ReturnType<typeof parseQuote>,
  instrument: typeof FENG_FINANCE_INSTRUMENTS[number]
) => {
  if (
    'alertThreshold' in instrument &&
    typeof instrument.alertThreshold === 'number' &&
    parsed.last !== null &&
    parsed.last >= instrument.alertThreshold
  ) {
    return {
      ...parsed,
      status: 'new-high' as const,
      statusLabel: instrument.alertLabel || '突破門檻',
      highLabel: instrument.alertLabel ? `門檻 ${instrument.alertLabel}` : '門檻',
      week52High: instrument.alertThreshold
    }
  }

  return parsed
}

const parseQuote = (html: string) => {
  const text = stripTags(html)
  const last = parseNumberAfterLabel(text, ['Last |', 'Last', 'Price', 'Latest Price'])
  const explicitHigh = parseNumberAfterLabel(text, ['52 Week High', '52-Week High', '52W High'])
  const explicitLow = parseNumberAfterLabel(text, ['52 Week Low', '52-Week Low', '52W Low'])
  const range = parseRangeAfterLabel(text, ['52 week range', '52-week range', '52 wk range'])
  const { change, changePercent } = parseChange(text, last)
  const week52High = explicitHigh ?? range.high
  const week52Low = explicitLow ?? range.low

  let status: FinanceItem['status'] = ''
  if (last !== null && week52High !== null && last >= week52High - PRICE_TOLERANCE) status = 'new-high'
  if (last !== null && week52Low !== null && last <= week52Low + PRICE_TOLERANCE) status = 'new-low'

  return {
    last,
    lastLabel: formatValue(last),
    change,
    changePercent,
    week52High,
    week52Low,
    status
  }
}

const parseMultplShillerPe = (html: string) => {
  const text = stripTags(html)
  const last = parseNumberAfterLabel(text, ['Current Shiller PE Ratio:'])
  const changeMatch = text.match(/Current Shiller PE Ratio:\s*[\d,.]+\s*([+-]\d[\d,]*(?:\.\d+)?)\s*\(([+-]?\d+(?:\.\d+)?)%\)/i)
  const change = toNumber(changeMatch?.[1])
  const changePercent = toNumber(changeMatch?.[2])
  const allTimeHigh = parseNumberAfterLabel(text, ['Max:']) ?? SHILLER_PE_HISTORICAL_HIGH
  const allTimeLow = parseNumberAfterLabel(text, ['Min:'])
  const maxLabel = text.match(/Max:\s*[\d,.]+\s*\(([^)]+)\)/i)?.[1] ?? SHILLER_PE_HISTORICAL_HIGH_LABEL
  const minLabel = text.match(/Min:\s*[\d,.]+\s*\(([^)]+)\)/i)?.[1]

  let status: FinanceItem['status'] = ''
  if (last !== null && allTimeHigh !== null && last >= allTimeHigh - PRICE_TOLERANCE) status = 'new-high'
  if (last !== null && allTimeLow !== null && last <= allTimeLow + PRICE_TOLERANCE) status = 'new-low'

  return {
    last,
    lastLabel: formatValue(last),
    change,
    changePercent,
    week52High: allTimeHigh,
    week52Low: allTimeLow,
    highLabel: maxLabel ? `Max ${maxLabel}` : 'Max',
    lowLabel: minLabel ? `Min ${minLabel}` : 'Min',
    status
  }
}

const parseMultplShillerPeTable = (html: string) => {
  const text = stripTags(html)
  const rowMatch = text.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s+([+-]?\d[\d,]*(?:\.\d+)?)/)
  const last = toNumber(rowMatch?.[2])
  const allTimeHigh = SHILLER_PE_HISTORICAL_HIGH

  let status: FinanceItem['status'] = ''
  if (last !== null && last >= allTimeHigh - PRICE_TOLERANCE) status = 'new-high'

  return {
    last,
    lastLabel: formatValue(last),
    change: null,
    changePercent: null,
    week52High: allTimeHigh,
    week52Low: null,
    highLabel: `Max ${SHILLER_PE_HISTORICAL_HIGH_LABEL}`,
    lowLabel: 'Min',
    status
  }
}

const fetchFinanceItem = async (instrument: typeof FENG_FINANCE_INSTRUMENTS[number]): Promise<FinanceItem> => {
  try {
    const html = await fetchText(instrument.url)
    let parsed = instrument.source === 'Multpl'
      ? parseMultplShillerPe(html)
      : instrument.source === 'Yahoo Finance'
        ? parseYahooQuote(html)
        : parseQuote(html)

    if (instrument.source === 'Multpl' && parsed.last === null) {
      const tableHtml = await fetchText(`${instrument.url}/table/by-month`)
      parsed = parseMultplShillerPeTable(tableHtml)
    }

    parsed = applyAlertThreshold(parsed, instrument)

    if (parsed.last === null) {
      throw new Error(`${instrument.source || 'CNBC'} 頁面未解析到即時價格`)
    }

    return {
      ...instrument,
      ...parsed,
      error: ''
    }
  } catch (error: any) {
    return {
      ...instrument,
      last: null,
      lastLabel: '--',
      change: null,
      changePercent: null,
      week52High: null,
      week52Low: null,
      highLabel: undefined,
      lowLabel: undefined,
      statusLabel: undefined,
      status: '',
      error: error?.message || `${instrument.source || 'CNBC'} 資料抓取失敗`
    }
  }
}

export default defineEventHandler(async () => {
  const now = Date.now()
  if (financeCache && financeCache.expiresAt > now) return financeCache.data

  const items = await Promise.all(FENG_FINANCE_INSTRUMENTS.map(fetchFinanceItem))
  const data = {
    fetchedAt: new Date().toISOString(),
    source: 'CNBC / Yahoo Finance / Multpl',
    items
  }

  financeCache = {
    expiresAt: now + CACHE_TTL_MS,
    data
  }

  return data
})
