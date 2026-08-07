/**
 * 桃園市／中壢區人口統計
 * 資料來源：桃園市政府資料開放平台（民政局）
 * - 人口與戶籍動態登記每月統計（109年9月起）
 * - 人口與戶籍動態登記每月統計（106年1月至109年8月）
 * - 各區人口年齡層每月統計（106年1月起，補足年度走勢）
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const API_BASE = 'https://opendata.tycg.gov.tw/api/v1'
const SOURCE_URL =
  'https://opendata.tycg.gov.tw/datalist/45882a42-4eea-4568-a4cc-f031b1d18418'

/** 109年9月起 — 人口與戶籍動態 */
const DATASET_DYNAMIC_NEW = '45882a42-4eea-4568-a4cc-f031b1d18418'
/** 106年1月～109年8月 — 人口與戶籍動態 */
const DATASET_DYNAMIC_OLD = '2b64e58f-f9db-40a8-82a7-da84e64ad665'
/** 106年1月起 — 各區年齡層（格式穩定，補年度） */
const DATASET_AGE = '84143c7b-c37e-4ba2-b273-72f36d5b6749'

const FETCH_TIMEOUT_MS = 12_000
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const RECENT_MONTHS = 3
const YEARLY_YEARS = 10

type MonthKey = { rocYear: number; month: number; key: string; label: string }

type PopPoint = {
  rocYear: number
  month: number
  year: number
  label: string
  population: number
  change: number | null
}

type RegionStats = {
  id: string
  label: string
  recentMonths: PopPoint[]
  yearly: PopPoint[]
  latestPopulation: number | null
  latestChange: number | null
  latestLabel: string | null
}

type PopulationPayload = {
  sourceUrl: string
  sourceLabel: string
  fetchedAt: string
  live: boolean
  warning?: string
  city: RegionStats
  zhongli: RegionStats
}

type ResourceMeta = {
  rid: string
  pid: string
  name: string
  position: number
  rocYear: number
  month: number
  key: string
  label: string
}

type AreaTotals = {
  city: number
  zhongli: number
}

type CacheEntry = {
  expiresAt: number
  payload: PopulationPayload
}

let memoryCache: CacheEntry | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 逾時（${ms}ms）`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

async function fetchText(url: string, label: string): Promise<string> {
  const res = await withTimeout(
    fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/csv,application/json,*/*',
        'accept-language': 'zh-TW,zh;q=0.9'
      }
    }),
    FETCH_TIMEOUT_MS,
    label
  )
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`)
  return res.text()
}

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const text = await fetchText(url, label)
  return JSON.parse(text) as T
}

function parseRocYearMonth(name: string): { rocYear: number; month: number } | null {
  const m = name.match(/(\d{2,3})\s*年\s*(\d{1,2})\s*月/)
  if (!m) return null
  const rocYear = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(rocYear) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return { rocYear, month }
}

function toGregorianYear(rocYear: number) {
  return rocYear + 1911
}

function monthLabel(rocYear: number, month: number) {
  return `${toGregorianYear(rocYear)}年${month}月`
}

function yearLabel(rocYear: number) {
  return `${toGregorianYear(rocYear)}年`
}

function monthKey(rocYear: number, month: number) {
  return `${rocYear}-${String(month).padStart(2, '0')}`
}

function parseNum(value: string | undefined): number {
  if (!value) return 0
  const n = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

/** Gender token: official files use 1/2 or 男/女 depending on year. */
const GENDER_RE = '(?:[12]|男|女)'

function stripQuotes(value: string) {
  return value.replace(/^["']|["']$/g, '').trim()
}

/** Parse district totals from dynamic or age-layer CSV. */
function parseAreaTotals(csv: string): AreaTotals {
  // Strip UTF-8 BOM if present
  const text = csv.replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { city: 0, zhongli: 0 }

  const headerCells = lines[0].split(',').map((h) => stripQuotes(h))
  const isAgeFormat =
    headerCells.some((h) => h === '總計') &&
    headerCells.some((h) => h === '性別' || h.includes('性別'))

  let city = 0
  let zhongli = 0

  for (const raw of lines.slice(1)) {
    if (!raw.trim()) continue
    // Normalize simple quoted fields: "桃園區",1,123 → 桃園區,1,123
    const line = raw.replace(/"([^"]*)"/g, '$1')

    if (isAgeFormat) {
      // 區域別,性別,總計,...  (gender may be 1/2 or 男/女)
      const m = line.match(new RegExp(`^([^,]+),(${GENDER_RE}),(-?\\d+)`))
      if (!m) continue
      const area = stripQuotes(m[1])
      const pop = parseNum(m[3])
      // Guard: totals under 10k for a district are almost always a broken column layout
      if (pop > 0 && pop < 5000 && (area === '桃園區' || area === '中壢區')) continue
      city += pop
      if (area === '中壢區') zhongli += pop
      continue
    }

    // 動態：區域別,村里…,戶數,性別,人口數
    // e.g. 中壢區,,,,,,2,225737  or  桃園區,76,...,男,214093
    const m = line.match(new RegExp(`^([^,]+),(?:[^,]*,){5}(${GENDER_RE}),(-?\\d+)`))
    if (!m) continue
    const area = stripQuotes(m[1])
    const pop = parseNum(m[3])
    city += pop
    if (area === '中壢區') zhongli += pop
  }

  return { city, zhongli }
}

async function listResources(datasetId: string): Promise<ResourceMeta[]> {
  type ResourceInfoResponse = {
    success?: boolean
    payload?: Array<{
      rid: string
      pid?: string
      name?: string
      position?: number
      file_name?: string
    }>
  }

  const data = await fetchJson<ResourceInfoResponse>(
    `${API_BASE}/resource.info?pid=${datasetId}`,
    `resource.info ${datasetId}`
  )
  const list = Array.isArray(data.payload) ? data.payload : []
  const out: ResourceMeta[] = []

  for (const item of list) {
    if (!item?.rid) continue
    const name = item.name || item.file_name || ''
    const ym = parseRocYearMonth(name)
    if (!ym) continue
    out.push({
      rid: item.rid,
      pid: item.pid || datasetId,
      name,
      position: Number(item.position) || 0,
      rocYear: ym.rocYear,
      month: ym.month,
      key: monthKey(ym.rocYear, ym.month),
      label: monthLabel(ym.rocYear, ym.month)
    })
  }

  out.sort((a, b) => a.rocYear - b.rocYear || a.month - b.month)
  return out
}

function downloadUrl(pid: string, rid: string) {
  return `${API_BASE}/dataset/${pid}/resource/${rid}/download`
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }

  const n = Math.min(concurrency, Math.max(1, items.length))
  await Promise.all(Array.from({ length: n }, () => run()))
  return results
}

async function fetchTotals(resource: ResourceMeta): Promise<AreaTotals | null> {
  try {
    const csv = await fetchText(
      downloadUrl(resource.pid, resource.rid),
      `csv ${resource.label}`
    )
    const totals = parseAreaTotals(csv)
    if (totals.city <= 0) return null
    return totals
  } catch {
    return null
  }
}

function withChanges(
  points: Array<{ rocYear: number; month: number; label: string; population: number }>
): PopPoint[] {
  return points.map((p, i) => {
    const prev = i > 0 ? points[i - 1] : null
    const change =
      prev && Number.isFinite(prev.population) ? p.population - prev.population : null
    return {
      rocYear: p.rocYear,
      month: p.month,
      year: toGregorianYear(p.rocYear),
      label: p.label,
      population: p.population,
      change
    }
  })
}

function pickYearEndResources(resources: ResourceMeta[], years: number): ResourceMeta[] {
  // Prefer December of each ROC year; fallback to latest month available that year.
  const byYear = new Map<number, ResourceMeta[]>()
  for (const r of resources) {
    const list = byYear.get(r.rocYear) || []
    list.push(r)
    byYear.set(r.rocYear, list)
  }

  const rocYears = [...byYear.keys()].sort((a, b) => a - b)
  const pickedYears = rocYears.slice(-years)
  const out: ResourceMeta[] = []

  for (const y of pickedYears) {
    const list = byYear.get(y) || []
    const dec = list.find((r) => r.month === 12)
    out.push(dec || list[list.length - 1])
  }
  return out
}

function buildRegion(
  id: string,
  label: string,
  recent: Array<{ rocYear: number; month: number; label: string; population: number }>,
  yearly: Array<{ rocYear: number; month: number; label: string; population: number }>
): RegionStats {
  const recentWithChange = withChanges(recent)
  // Drop the leading bootstrap month used only for change calc when we fetched 4 months
  const recentMonths =
    recentWithChange.length > RECENT_MONTHS
      ? recentWithChange.slice(-RECENT_MONTHS)
      : recentWithChange

  const yearlyPoints = yearly.map((p) => ({
    rocYear: p.rocYear,
    month: p.month,
    year: toGregorianYear(p.rocYear),
    label: yearLabel(p.rocYear),
    population: p.population,
    change: null as number | null
  }))

  // year-over-year change on yearly series
  for (let i = 1; i < yearlyPoints.length; i++) {
    yearlyPoints[i].change = yearlyPoints[i].population - yearlyPoints[i - 1].population
  }

  const latest = recentMonths[recentMonths.length - 1] || null

  return {
    id,
    label,
    recentMonths,
    yearly: yearlyPoints,
    latestPopulation: latest?.population ?? null,
    latestChange: latest?.change ?? null,
    latestLabel: latest?.label ?? null
  }
}

async function buildPopulationPayload(): Promise<PopulationPayload> {
  const [newRes, oldRes, ageRes] = await Promise.all([
    listResources(DATASET_DYNAMIC_NEW),
    listResources(DATASET_DYNAMIC_OLD),
    listResources(DATASET_AGE)
  ])

  // Merge monthly resources (prefer dynamic datasets; fall back to age)
  const byKey = new Map<string, ResourceMeta>()
  for (const r of [...oldRes, ...newRes, ...ageRes]) {
    // Prefer dynamic (already inserted first for old/new); only fill missing from age
    if (!byKey.has(r.key)) byKey.set(r.key, r)
  }
  const allMonths = [...byKey.values()].sort(
    (a, b) => a.rocYear - b.rocYear || a.month - b.month
  )

  if (allMonths.length === 0) {
    throw new Error('找不到人口統計資源')
  }

  // Recent: last 4 months so we can compute 3 changes
  const recentNeed = Math.min(allMonths.length, RECENT_MONTHS + 1)
  const recentResources = allMonths.slice(-recentNeed)

  // Yearly: year-end samples spanning ~10 years
  const yearlyResources = pickYearEndResources(allMonths, YEARLY_YEARS)

  const needed = new Map<string, ResourceMeta>()
  for (const r of [...recentResources, ...yearlyResources]) {
    needed.set(r.key, r)
  }

  const fetches = [...needed.values()]
  const totalsList = await mapPool(fetches, 5, async (resource) => {
    const totals = await fetchTotals(resource)
    return { key: resource.key, resource, totals }
  })

  const totalsByKey = new Map<string, AreaTotals>()
  for (const item of totalsList) {
    if (item.totals) totalsByKey.set(item.key, item.totals)
  }

  const recentCity: Array<{ rocYear: number; month: number; label: string; population: number }> =
    []
  const recentZhongli: typeof recentCity = []
  for (const r of recentResources) {
    const t = totalsByKey.get(r.key)
    if (!t) continue
    recentCity.push({
      rocYear: r.rocYear,
      month: r.month,
      label: r.label,
      population: t.city
    })
    recentZhongli.push({
      rocYear: r.rocYear,
      month: r.month,
      label: r.label,
      population: t.zhongli
    })
  }

  const yearlyCity: typeof recentCity = []
  const yearlyZhongli: typeof recentCity = []
  for (const r of yearlyResources) {
    const t = totalsByKey.get(r.key)
    if (!t) continue
    yearlyCity.push({
      rocYear: r.rocYear,
      month: r.month,
      label: yearLabel(r.rocYear),
      population: t.city
    })
    yearlyZhongli.push({
      rocYear: r.rocYear,
      month: r.month,
      label: yearLabel(r.rocYear),
      population: t.zhongli
    })
  }

  const missingRecent = recentResources.filter((r) => !totalsByKey.has(r.key)).length
  const missingYearly = yearlyResources.filter((r) => !totalsByKey.has(r.key)).length
  const warnings: string[] = []
  if (missingRecent || missingYearly) {
    warnings.push(
      `部分月份資料讀取失敗（近月 ${missingRecent}、年度 ${missingYearly}），已顯示可用區間`
    )
  }

  return {
    sourceUrl: SOURCE_URL,
    sourceLabel: '桃園市政府資料開放平台 · 民政局人口統計',
    fetchedAt: new Date().toISOString(),
    live: true,
    warning: warnings.length ? warnings.join('；') : undefined,
    city: buildRegion('taoyuan-city', '桃園市', recentCity, yearlyCity),
    zhongli: buildRegion('zhongli', '中壢區', recentZhongli, yearlyZhongli)
  }
}

function emptyRegion(id: string, label: string): RegionStats {
  return {
    id,
    label,
    recentMonths: [],
    yearly: [],
    latestPopulation: null,
    latestChange: null,
    latestLabel: null
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const forceRefresh = query.refresh === '1' || query.refresh === 1

  if (!forceRefresh && memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.payload
  }

  try {
    const payload = await buildPopulationPayload()
    memoryCache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload
    }
    return payload
  } catch (error) {
    if (memoryCache?.payload) {
      return {
        ...memoryCache.payload,
        live: false,
        warning:
          error instanceof Error
            ? `即時更新失敗，顯示快取資料：${error.message}`
            : '即時更新失敗，顯示快取資料'
      }
    }

    return {
      sourceUrl: SOURCE_URL,
      sourceLabel: '桃園市政府資料開放平台 · 民政局人口統計',
      fetchedAt: new Date().toISOString(),
      live: false,
      warning:
        error instanceof Error
          ? `無法讀取人口統計：${error.message}`
          : '無法讀取人口統計',
      city: emptyRegion('taoyuan-city', '桃園市'),
      zhongli: emptyRegion('zhongli', '中壢區')
    } satisfies PopulationPayload
  }
})
