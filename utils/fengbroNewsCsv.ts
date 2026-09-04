/**
 * CSV export / import for 鋒兄新聞 site list (localStorage).
 *
 * Columns:
 * id,name,domain,homeUrl,adapter,searchUrlTemplate,locked
 */

import {
  fengbroNewsSiteKey,
  normalizeFengbroNewsSite,
  normalizeFengbroNewsSites,
  type FengbroNewsAdapter,
  type FengbroNewsSiteConfig,
} from './fengbroNewsSites.ts'

export const FENGBRO_NEWS_CSV_HEADERS = [
  'id',
  'name',
  'domain',
  'homeUrl',
  'adapter',
  'searchUrlTemplate',
  'locked',
] as const

export type FengbroNewsCsvHeader = (typeof FENGBRO_NEWS_CSV_HEADERS)[number]

const HEADER_ALIASES: Record<string, FengbroNewsCsvHeader> = {
  id: 'id',
  編號: 'id',
  name: 'name',
  名稱: 'name',
  網站名稱: 'name',
  domain: 'domain',
  網域: 'domain',
  homeurl: 'homeUrl',
  home_url: 'homeUrl',
  url: 'homeUrl',
  網址: 'homeUrl',
  首頁: 'homeUrl',
  adapter: 'adapter',
  適配器: 'adapter',
  類型: 'adapter',
  searchurltemplate: 'searchUrlTemplate',
  search_url_template: 'searchUrlTemplate',
  searchurl: 'searchUrlTemplate',
  搜尋模板: 'searchUrlTemplate',
  locked: 'locked',
  鎖定: 'locked',
}

const MAX_SITES = 80

function escapeNewsCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function parseLockedFlag(value: string | undefined): boolean {
  if (value == null || value.trim() === '') return true
  const v = value.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'n' || v === 'off' || v === '解鎖' || v === '否') {
    return false
  }
  return true
}

function parseFullCsv(text: string): string[][] {
  const rows: string[][] = []
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    if (inQuotes) {
      if (char === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      currentRow.push(currentField)
      currentField = ''
    } else if (char === '\n') {
      currentRow.push(currentField)
      if (currentRow.length > 0 && currentRow.some((field) => field.trim())) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else {
      currentField += char
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some((field) => field.trim())) rows.push(currentRow)
  }
  return rows
}

function normalizeHeaderKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '')
}

function mapHeader(raw: string): FengbroNewsCsvHeader | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  for (const header of FENGBRO_NEWS_CSV_HEADERS) {
    if (header.toLowerCase() === lower) return header
  }
  return HEADER_ALIASES[normalizeHeaderKey(trimmed)] ?? HEADER_ALIASES[trimmed] ?? null
}

export function toFengbroNewsCsvRow(site: FengbroNewsSiteConfig): string {
  return [
    escapeNewsCsvValue(site.id),
    escapeNewsCsvValue(site.name),
    escapeNewsCsvValue(site.domain),
    escapeNewsCsvValue(site.homeUrl),
    escapeNewsCsvValue(site.adapter),
    escapeNewsCsvValue(site.searchUrlTemplate || ''),
    escapeNewsCsvValue(site.locked ? '1' : '0'),
  ].join(',')
}

export function buildFengbroNewsCsv(sites: FengbroNewsSiteConfig[]): string {
  const rows = [FENGBRO_NEWS_CSV_HEADERS.join(',')]
  for (const site of sites) rows.push(toFengbroNewsCsvRow(site))
  return rows.join('\n')
}

export function mergeFengbroNewsSites(
  existing: FengbroNewsSiteConfig[],
  incoming: FengbroNewsSiteConfig[],
): FengbroNewsSiteConfig[] {
  const map = new Map<string, FengbroNewsSiteConfig>()
  const order: string[] = []

  for (const site of existing) {
    const key = fengbroNewsSiteKey(site)
    if (!map.has(key)) order.push(key)
    map.set(key, site)
  }
  for (const site of incoming) {
    const key = fengbroNewsSiteKey(site)
    if (!map.has(key)) order.push(key)
    const prev = map.get(key)
    map.set(key, {
      id: site.id || prev?.id || key,
      name: site.name || prev?.name || site.domain,
      domain: site.domain || prev?.domain || '',
      homeUrl: site.homeUrl || prev?.homeUrl || '',
      adapter: site.adapter || prev?.adapter || 'generic-keyword-url',
      searchUrlTemplate: site.searchUrlTemplate ?? prev?.searchUrlTemplate,
      locked: site.locked,
    })
  }

  return normalizeFengbroNewsSites(
    order
      .map((key) => map.get(key)!)
      .filter(Boolean)
      .slice(0, MAX_SITES),
  )
}

export function parseFengbroNewsCsv(text: string): {
  data: FengbroNewsSiteConfig[]
  errors: string[]
} {
  const errors: string[] = []
  const rows = parseFullCsv(text)
  if (rows.length < 2) {
    return { data: [], errors: ['CSV 檔案至少需要表頭和一行資料'] }
  }

  const columnIndex: Partial<Record<FengbroNewsCsvHeader, number>> = {}
  for (let i = 0; i < rows[0].length; i++) {
    const mapped = mapHeader(rows[0][i] || '')
    if (mapped && columnIndex[mapped] == null) columnIndex[mapped] = i
  }

  if (columnIndex.homeUrl == null && columnIndex.domain == null) {
    return { data: [], errors: ['表頭缺少 homeUrl 或 domain'] }
  }

  const data: FengbroNewsSiteConfig[] = []
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const cell = (header: FengbroNewsCsvHeader) => {
      const idx = columnIndex[header]
      if (idx == null) return ''
      return values[idx] ?? ''
    }
    const site = normalizeFengbroNewsSite({
      id: cell('id').trim(),
      name: cell('name').trim(),
      domain: cell('domain').trim(),
      homeUrl: cell('homeUrl').trim() || cell('domain').trim(),
      adapter: cell('adapter').trim() as FengbroNewsAdapter,
      searchUrlTemplate: cell('searchUrlTemplate').trim() || undefined,
      locked: parseLockedFlag(cell('locked')),
    })
    if (!site) {
      errors.push(`第 ${i + 1} 行: 無法辨識新聞來源`)
      continue
    }
    data.push(site)
  }
  return { data, errors }
}
